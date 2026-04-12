'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameRoom,
  RoomPlayer,
  RoomStatus,
  generateRoomCode,
} from '@/models/MultiplayerTypes';

// ── Lazy Supabase import (build-safe when env vars are missing) ─────────

function getSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@/lib/supabase/client') as typeof import('@/lib/supabase/client');
  return createClient();
}

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ── Hook interface ──────────────────────────────────────────────────────

export interface UseGameRoom {
  room: GameRoom | null;
  players: RoomPlayer[];
  isHost: boolean;
  error: string | null;
  loading: boolean;
  createRoom: (difficulty: string, mode: string) => Promise<string>;
  joinRoom: (code: string, displayName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setReady: (ready: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  fillWithAI: () => Promise<void>;
  retry: () => Promise<void>;
}

// ── Hook ────────────────────────────────────────────────────────────────

export default function useGameRoom(): UseGameRoom {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roomChannelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);
  const userIdRef = useRef<string | null>(null);

  // ── Subscribe to room & player changes via Realtime ─────────────────

  const subscribeToRoom = useCallback((roomId: string) => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();

    // Clean up old subscription
    if (roomChannelRef.current) {
      supabase.removeChannel(roomChannelRef.current);
    }

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload: { new: Record<string, unknown> }) => {
          if (payload.new) setRoom(payload.new as unknown as GameRoom);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => {
          // Refetch full player list on any change
          refreshPlayers(roomId);
        },
      )
      .subscribe();

    roomChannelRef.current = channel;
  }, []);

  const refreshPlayers = useCallback(async (roomId: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = getSupabase();
      const { data, error: fetchErr } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('seat_index');
      if (fetchErr) {
        setError(`Failed to load players: ${fetchErr.message}`);
        return;
      }
      if (data) setPlayers(data as RoomPlayer[]);
    } catch {
      setError('Network error while loading players. Please try again.');
    }
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (roomChannelRef.current && isSupabaseConfigured()) {
        const supabase = getSupabase();
        supabase.removeChannel(roomChannelRef.current);
      }
    };
  }, []);

  // ── Create room ─────────────────────────────────────────────────────

  const createRoom = useCallback(async (difficulty: string, mode: string): Promise<string> => {
    if (!isSupabaseConfigured()) {
      setError('Multiplayer requires a Supabase connection.');
      return '';
    }
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to create a room.');
        return '';
      }
      userIdRef.current = user.id;

      const code = generateRoomCode();

      const { data: roomData, error: insertErr } = await supabase
        .from('game_rooms')
        .insert({
          code,
          host_id: user.id,
          difficulty,
          mode,
          status: 'waiting' as RoomStatus,
        })
        .select()
        .single();

      if (insertErr || !roomData) {
        setError(insertErr?.message || 'Failed to create room.');
        return '';
      }

      const newRoom = roomData as GameRoom;

      // Host auto-joins at seat 0
      const { error: joinErr } = await supabase.from('room_players').insert({
        room_id: newRoom.id,
        user_id: user.id,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Host',
        seat_index: 0,
        is_ready: true,
      });

      if (joinErr) {
        setError(joinErr.message);
        return '';
      }

      setRoom(newRoom);
      setIsHost(true);
      subscribeToRoom(newRoom.id);
      await refreshPlayers(newRoom.id);

      return code;
    } finally {
      setLoading(false);
    }
  }, [subscribeToRoom, refreshPlayers]);

  // ── Join room ───────────────────────────────────────────────────────

  const joinRoom = useCallback(async (code: string, displayName: string) => {
    if (!isSupabaseConfigured()) {
      setError('Multiplayer requires a Supabase connection.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to join a room.');
        return;
      }
      userIdRef.current = user.id;

      // Find room by code
      const { data: roomData, error: findErr } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('status', 'waiting')
        .single();

      if (findErr || !roomData) {
        setError('Room not found or game already started.');
        return;
      }

      const foundRoom = roomData as GameRoom;

      // Check capacity
      const { count } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', foundRoom.id);

      if ((count || 0) >= foundRoom.max_players) {
        setError('Room is full.');
        return;
      }

      // Find next available seat
      const { data: existingPlayers } = await supabase
        .from('room_players')
        .select('seat_index')
        .eq('room_id', foundRoom.id)
        .order('seat_index');

      const takenSeats = new Set((existingPlayers || []).map((p: { seat_index: number }) => p.seat_index));
      let nextSeat = 0;
      while (takenSeats.has(nextSeat) && nextSeat < foundRoom.max_players) nextSeat++;

      const { error: joinErr } = await supabase.from('room_players').insert({
        room_id: foundRoom.id,
        user_id: user.id,
        display_name: displayName || user.user_metadata?.display_name || 'Player',
        seat_index: nextSeat,
        is_ready: false,
      });

      if (joinErr) {
        // Might be duplicate — check unique constraint
        if (joinErr.message.includes('duplicate') || joinErr.message.includes('unique')) {
          // Already in room, just load it
        } else {
          setError(joinErr.message);
          return;
        }
      }

      setRoom(foundRoom);
      setIsHost(foundRoom.host_id === user.id);
      subscribeToRoom(foundRoom.id);
      await refreshPlayers(foundRoom.id);
    } finally {
      setLoading(false);
    }
  }, [subscribeToRoom, refreshPlayers]);

  // ── Leave room ──────────────────────────────────────────────────────

  const leaveRoom = useCallback(async () => {
    if (!room || !isSupabaseConfigured()) return;
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: delErr } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', user.id);

      if (delErr) {
        setError(`Failed to leave room: ${delErr.message}`);
        return;
      }

      if (roomChannelRef.current) {
        supabase.removeChannel(roomChannelRef.current);
        roomChannelRef.current = null;
      }

      setRoom(null);
      setPlayers([]);
      setIsHost(false);
    } catch {
      setError('Network error while leaving room. Please try again.');
    }
  }, [room]);

  // ── Set ready ───────────────────────────────────────────────────────

  const setReady = useCallback(async (ready: boolean) => {
    if (!room || !isSupabaseConfigured()) return;
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateErr } = await supabase
        .from('room_players')
        .update({ is_ready: ready })
        .eq('room_id', room.id)
        .eq('user_id', user.id);

      if (updateErr) {
        setError(`Failed to update ready status: ${updateErr.message}`);
      }
    } catch {
      setError('Network error while updating ready status. Please try again.');
    }
  }, [room]);

  // ── Start game (host only) ─────────────────────────────────────────

  const startGame = useCallback(async () => {
    if (!room || !isHost || !isSupabaseConfigured()) return;
    setError(null);

    try {
      const supabase = getSupabase();

      // Verify all human players are ready
      const humanPlayers = players.filter(p => !p.user_id.startsWith('ai-'));
      const allReady = humanPlayers.every(p => p.is_ready);
      if (!allReady) {
        setError('All players must be ready before starting.');
        return;
      }

      // Update room status
      const { error: updateErr } = await supabase
        .from('game_rooms')
        .update({ status: 'playing', updated_at: new Date().toISOString() })
        .eq('id', room.id);

      if (updateErr) {
        setError(`Failed to start game: ${updateErr.message}`);
      }
    } catch {
      setError('Network error while starting game. Please try again.');
    }
  }, [room, isHost, players]);

  // ── Fill empty seats with AI ───────────────────────────────────────

  const fillWithAI = useCallback(async () => {
    if (!room || !isHost || !isSupabaseConfigured()) return;
    try {
      const supabase = getSupabase();

      const takenSeats = new Set(players.map(p => p.seat_index));
      const aiNames = ['AI East', 'AI South', 'AI West', 'AI North'];

      for (let seat = 0; seat < room.max_players; seat++) {
        if (takenSeats.has(seat)) continue;

        const { error: insertErr } = await supabase.from('room_players').insert({
          room_id: room.id,
          user_id: `ai-${seat}-${room.id}`, // synthetic ID for AI
          display_name: aiNames[seat] || `AI ${seat + 1}`,
          seat_index: seat,
          is_ready: true,
        });

        if (insertErr) {
          setError(`Failed to add AI player: ${insertErr.message}`);
          return;
        }
      }

      await refreshPlayers(room.id);
    } catch {
      setError('Network error while adding AI players. Please try again.');
    }
  }, [room, isHost, players, refreshPlayers]);

  // ── Retry (clear error + re-fetch room state) ─────────────────────

  const retry = useCallback(async () => {
    setError(null);
    if (room) {
      await refreshPlayers(room.id);
    }
  }, [room, refreshPlayers]);

  return {
    room,
    players,
    isHost,
    error,
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    fillWithAI,
    retry,
  };
}
