/**
 * Tutor Engine — provides strategic advice and explanations to the user.
 */

import { Tile, TileType, tileKey } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { AvailableClaim, TutorAdvice } from './types';
import { calculateShanten, isWinningHand } from './winDetection';
import { tileDiscardPriority, tileDangerScore, isSafeTile } from './ai/aiUtils';

/**
 * Get the best move advice for the current player.
 */
export function getTutorAdvice(gameState: GameState, playerIndex: number, availableClaims: AvailableClaim[] = []): TutorAdvice | null {
  const player = gameState.players[playerIndex];
  
  // 1. Claim Phase Advice
  if (gameState.turnPhase === 'claim' && availableClaims.length > 0) {
    const winClaim = availableClaims.find(c => c.claimType === 'win');
    if (winClaim) {
      return {
        type: 'claim',
        message: "You can win! Claim this tile to complete your hand and end the game.",
      };
    }

    const pungClaim = availableClaims.find(c => c.claimType === 'pung');
    if (pungClaim) {
      return {
        type: 'claim',
        message: "Claiming this Pung will complete a set of three identical tiles. It's a fast way to build your hand.",
      };
    }

    const chowClaim = availableClaims.find(c => c.claimType === 'chow');
    if (chowClaim) {
      return {
        type: 'claim',
        message: "This Chow completes a sequence of three tiles. Chows are common but only allowed from the player on your left.",
      };
    }
  }

  // 2. Discard Phase Advice
  if (gameState.turnPhase === 'discard' && gameState.currentPlayerIndex === playerIndex) {
    const hand = player.hand;

    // Check if player can win
    if (isWinningHand(hand)) {
      return {
        type: 'general',
        message: "You have a winning hand! Press [ WIN! ] to claim victory.",
      };
    }

    const nonBonus = hand.filter(t => t.type !== TileType.BONUS);
    if (nonBonus.length === 0) return null;

    // Evaluate tiles for discard
    const currentShanten = calculateShanten(nonBonus.slice(0, 13));
    
    interface ScoredTile {
      tile: Tile;
      score: number;
      reason: string;
    }

    const scores: ScoredTile[] = nonBonus.map(tile => {
      const remaining = hand.filter(t => t.id !== tile.id);
      const testHand = remaining.filter(t => t.type !== TileType.BONUS).slice(0, 13);
      
      const shanten = testHand.length >= 13 ? calculateShanten(testHand) : 8;
      const danger = tileDangerScore(tile, gameState, playerIndex);
      const priority = tileDiscardPriority(tile);
      const safe = isSafeTile(tile, gameState, playerIndex);

      let score = shanten * 100 + danger * 5 - priority * 2;
      if (safe) score -= 20;

      let reason = "This tile is isolated and doesn't fit well with your other sets.";
      if (tile.type === TileType.HONOR) {
        reason = "Honor tiles (Winds/Dragons) are good to discard early if you don't have a pair.";
      } else if (safe) {
        reason = "This is a safe discard because many copies are already visible on the table.";
      } else if (shanten === currentShanten) {
        reason = "Discarding this tile keeps your hand close to winning (Shanten unchanged).";
      }

      return { tile, score, reason };
    });

    // Sort: lowest score is best to discard
    scores.sort((a, b) => a.score - b.score);
    const best = scores[0];

    return {
      type: 'discard',
      message: best.reason,
      suggestedTileId: best.tile.id,
    };
  }

  return null;
}
