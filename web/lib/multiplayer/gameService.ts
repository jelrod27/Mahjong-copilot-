/**
 * Multiplayer game service — handles move submission and game state operations.
 * Communicates with Supabase Edge Functions for server-authoritative game logic.
 */

import { createClient } from '@/lib/supabase/client';
import { GameState, gameStateFromJson } from '@/models/GameState';

export interface SubmitMoveResult {
  success: boolean;
  error?: string;
  newState?: any; // Filtered game state JSON
  version?: number;
}

/**
 * Submit a game action to the server for validation and application.
 */
export async function submitMove(
  roomId: string,
  action: Record<string, any>,
): Promise<SubmitMoveResult> {
  const supabase = createClient();

  const { data, error } = await supabase.functions.invoke('submit-move', {
    body: { roomId, action },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    newState: data.state,
    version: data.version,
  };
}

/**
 * Request the server to start the game (called when room is full).
 */
export async function startGame(roomId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.functions.invoke('start-game', {
    body: { roomId },
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get the current game state for a room (filtered for the requesting player).
 */
export async function getGameState(roomId: string): Promise<{
  state: any | null;
  version: number;
  error?: string;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('game_states')
    .select('state, version')
    .eq('room_id', roomId)
    .single();

  if (error || !data) {
    return { state: null, version: 0, error: error?.message };
  }

  return { state: data.state, version: data.version };
}
