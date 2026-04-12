/**
 * Post-hand review analyzer for teacher mode.
 * Analyzes the turn history to identify good plays and mistakes.
 * Pure function — no side effects.
 */

import { GameState, GameTurn, PlayerAction, Player } from '@/models/GameState';
import { Tile, tilesMatch } from '@/models/Tile';
import { getAvailableClaims } from './claiming';

export interface ReviewInsight {
  type: 'good' | 'mistake' | 'info';
  message: string;
}

/**
 * Analyze a completed hand's performance for a specific player.
 * Returns up to 5 key insights.
 */
export function analyzeHandPerformance(
  gameState: GameState,
  playerIndex: number,
): ReviewInsight[] {
  const insights: ReviewInsight[] = [];
  const playerId = gameState.players[playerIndex].id;
  const history = gameState.turnHistory;

  // 1. Check if the player won
  if (gameState.winnerId === playerId) {
    const method = gameState.isSelfDrawn ? 'self-drawn win' : 'claimed discard win';
    insights.push({ type: 'good', message: `You won this hand with a ${method}!` });
  }

  // 2. Count successful claims
  const playerMelds = gameState.players[playerIndex].melds.filter(m => !m.isConcealed);
  if (playerMelds.length > 0) {
    insights.push({
      type: 'good',
      message: `You successfully claimed ${playerMelds.length} meld${playerMelds.length > 1 ? 's' : ''} from discards.`,
    });
  }

  // 3. Check if a discard fed the winning tile
  if (gameState.winnerId && gameState.winnerId !== playerId && !gameState.isSelfDrawn) {
    const winningTile = gameState.winningTile;
    if (winningTile && gameState.lastDiscardedBy === playerId) {
      insights.push({
        type: 'mistake',
        message: `Your discard of ${winningTile.nameEnglish} was claimed for the win. Watch for dangerous tiles!`,
      });
    }
  }

  // 4. Analyze discard patterns — count how many discards the player made
  const playerDiscards = gameState.playerDiscards[playerId] ?? [];
  if (playerDiscards.length > 0) {
    // Check for early honor discards (usually good in HK mahjong unless going for honor hands)
    const earlyDiscards = playerDiscards.slice(0, 4);
    const honorDiscards = earlyDiscards.filter(t => t.type === 'honor');
    if (honorDiscards.length >= 2) {
      insights.push({
        type: 'info',
        message: `You discarded ${honorDiscards.length} honors early — good for building suit-based hands.`,
      });
    }
  }

  // 5. Check if the hand was a draw
  if (!gameState.winnerId) {
    const flowers = gameState.players[playerIndex].flowers;
    if (flowers.length >= 2) {
      insights.push({
        type: 'info',
        message: `Draw game, but you collected ${flowers.length} bonus tiles for extra fan next time.`,
      });
    } else {
      insights.push({
        type: 'info',
        message: 'Draw game — the wall was exhausted before anyone could win.',
      });
    }
  }

  // Limit to 5 insights
  return insights.slice(0, 5);
}
