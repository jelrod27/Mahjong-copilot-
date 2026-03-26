/**
 * Filters game state for a specific player, hiding private information.
 * Used before broadcasting state to prevent cheating.
 */

import { gameStateToJson } from '@/models/GameState';
import { GameState } from '@/models/GameState';
import { tileToJson } from '@/models/Tile';

export interface FilteredGameState {
  [key: string]: any;
}

/**
 * Create a filtered view of the game state for a specific player.
 * Hides other players' hands and wall contents.
 */
export function filterStateForPlayer(state: GameState, playerId: string): FilteredGameState {
  const json = gameStateToJson(state);

  return {
    ...json,
    // Replace wall with count only
    wall: { count: state.wall.length },
    deadWall: { count: state.deadWall.length },
    // Filter player hands — only show the requesting player's hand
    players: state.players.map(p => {
      const playerJson = json.players.find((pj: any) => pj.id === p.id);
      if (p.id === playerId) {
        return playerJson; // Full hand visible
      }
      return {
        ...playerJson,
        hand: { count: p.hand.length }, // Hide hand, show count
      };
    }),
  };
}
