/**
 * Type definitions for multiplayer game rooms, players, and real-time events.
 */

// ── Room ────────────────────────────────────────────────────────────────

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  difficulty: 'easy' | 'medium' | 'hard';
  mode: 'quick' | 'full';
  max_players: number;
  created_at: string;
  updated_at: string;
}

// ── Player ──────────────────────────────────────────────────────────────

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  seat_index: number;
  is_ready: boolean;
  joined_at: string;
}

// ── Real-time events (lobby) ────────────────────────────────────────────

export type LobbyEvent =
  | { type: 'room-updated'; room: GameRoom }
  | { type: 'player-joined'; player: RoomPlayer }
  | { type: 'player-left'; playerId: string }
  | { type: 'player-ready'; playerId: string; ready: boolean }
  | { type: 'game-starting'; roomId: string };

// ── Real-time events (game) ─────────────────────────────────────────────

export type MultiplayerGameEvent =
  | { type: 'state-update'; state: Record<string, unknown>; version: number }
  | { type: 'action-applied'; action: Record<string, unknown>; version: number }
  | { type: 'game-finished'; winnerId?: string };

// ── Helper ──────────────────────────────────────────────────────────────

/** Generate a random 6-character uppercase alphanumeric room code. */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous O/0/I/1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
