/**
 * Room management — CRUD operations for multiplayer rooms.
 * Calls Supabase directly (rooms table) and Edge Functions for game logic.
 */

import { createClient } from '@/lib/supabase/client';

export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished' | 'abandoned';
  room_type: 'casual' | 'ranked';
  max_players: number;
  turn_time_limit: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  player_count?: number;
  host_name?: string;
}

export interface RoomPlayer {
  id: string;
  player_id: string;
  seat_index: number;
  is_connected: boolean;
  display_name?: string;
}

export async function createRoom(options: {
  roomType?: 'casual' | 'ranked';
  turnTimeLimit?: number;
} = {}): Promise<{ room: Room; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { room: null as any, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      host_id: user.id,
      room_type: options.roomType || 'casual',
      turn_time_limit: options.turnTimeLimit || 20,
    })
    .select()
    .single();

  if (error) return { room: null as any, error: error.message };

  // Auto-join host to seat 0
  await supabase.from('player_rooms').insert({
    room_id: data.id,
    player_id: user.id,
    seat_index: 0,
  });

  return { room: data as Room, error: null };
}

export async function joinRoom(code: string): Promise<{ room: Room; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { room: null as any, error: 'Not authenticated' };

  // Find room by code
  const { data: room, error: findError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .single();

  if (findError || !room) return { room: null as any, error: 'Room not found or already started' };

  // Check if already in room
  const { data: existing } = await supabase
    .from('player_rooms')
    .select('*')
    .eq('room_id', room.id)
    .eq('player_id', user.id)
    .single();

  if (existing) return { room: room as Room, error: null };

  // Get current player count to assign seat
  const { count } = await supabase
    .from('player_rooms')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id);

  if ((count || 0) >= room.max_players) {
    return { room: null as any, error: 'Room is full' };
  }

  // Join at next available seat
  const { error: joinError } = await supabase
    .from('player_rooms')
    .insert({
      room_id: room.id,
      player_id: user.id,
      seat_index: count || 0,
    });

  if (joinError) return { room: null as any, error: joinError.message };

  return { room: room as Room, error: null };
}

export async function listOpenRooms(): Promise<Room[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      player_rooms(count),
      profiles!rooms_host_id_fkey(display_name)
    `)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((r: any) => ({
    ...r,
    player_count: r.player_rooms?.[0]?.count || 0,
    host_name: r.profiles?.display_name || 'Unknown',
  }));
}

export async function getRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('player_rooms')
    .select(`
      *,
      profiles(display_name)
    `)
    .eq('room_id', roomId)
    .order('seat_index');

  if (error || !data) return [];

  return data.map((pr: any) => ({
    ...pr,
    display_name: pr.profiles?.display_name || 'Player',
  }));
}

export async function leaveRoom(roomId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('player_rooms')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', user.id);
}
