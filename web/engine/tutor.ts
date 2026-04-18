/**
 * Tutor Engine — provides strategic advice, tile classifications, and tenpai detection.
 */

import { Tile, TileType, TileSuit, WindTile, DragonTile, tileKey } from '@/models/Tile';
import { GameState, MeldInfo } from '@/models/GameState';
import { AvailableClaim, TutorAdvice, TileClassification, TileColor } from './types';
import { calculateShanten, isWinningHand, canPlayerWin } from './winDetection';
import { tileDiscardPriority, tileDangerScore, isSafeTile } from './ai/aiUtils';
import { getBestClaimSubmission } from './claiming';

/** All 34 unique tile types for tenpai wait calculation */
const ALL_TILE_TYPES: Tile[] = (() => {
  const tiles: Tile[] = [];
  let id = 0;
  // 9 dots, 9 bamboo, 9 characters
  for (const suit of [TileSuit.BAMBOO, TileSuit.CHARACTER, TileSuit.DOT]) {
    for (let n = 1; n <= 9; n++) {
      tiles.push({
        id: `wait_${id++}`, suit, type: TileType.SUIT, number: n,
        nameEnglish: `${n} ${suit}`, nameChinese: '', nameJapanese: '', assetPath: '',
      });
    }
  }
  // 4 winds
  for (const wind of [WindTile.EAST, WindTile.SOUTH, WindTile.WEST, WindTile.NORTH]) {
    tiles.push({
      id: `wait_${id++}`, suit: TileSuit.WIND, type: TileType.HONOR, wind,
      nameEnglish: `${wind} Wind`, nameChinese: '', nameJapanese: '', assetPath: '',
    });
  }
  // 3 dragons
  for (const dragon of [DragonTile.RED, DragonTile.GREEN, DragonTile.WHITE]) {
    tiles.push({
      id: `wait_${id++}`, suit: TileSuit.DRAGON, type: TileType.HONOR, dragon,
      nameEnglish: `${dragon} Dragon`, nameChinese: '', nameJapanese: '', assetPath: '',
    });
  }
  return tiles;
})();

/**
 * Get the best move advice for the current player.
 */
export function getTutorAdvice(
  gameState: GameState,
  playerIndex: number,
  availableClaims: AvailableClaim[] = [],
): TutorAdvice | null {
  const player = gameState.players[playerIndex];

  // 1. Claim Phase Advice
  if (gameState.turnPhase === 'claim' && availableClaims.length > 0) {
    return buildClaimAdvice(gameState, availableClaims);
  }

  // 2. Discard Phase Advice
  if (gameState.turnPhase === 'discard' && gameState.currentPlayerIndex === playerIndex) {
    return buildDiscardAdvice(gameState, player.hand, playerIndex);
  }

  return null;
}

function buildClaimAdvice(gameState: GameState, availableClaims: AvailableClaim[]): TutorAdvice {
  const best = getBestClaimSubmission(availableClaims);
  if (!best) {
    return { type: 'claim', message: 'No claims available — press PASS.' };
  }

  const tile = gameState.lastDiscardedTile;
  let message: string;

  switch (best.claimType) {
    case 'win':
      message = 'This tile completes your hand — declare Mahjong!';
      break;
    case 'kong':
      message = buildMeldAdviceMessage('Kong (four of a kind)', tile);
      break;
    case 'pung':
      message = buildMeldAdviceMessage('Pung (three of a kind)', tile);
      break;
    case 'chow':
      message = 'You can take this tile as a Chow (sequence). This will expose your meld.';
      break;
    default:
      message = 'Press CLAIM to take the highlighted discard.';
  }

  return { type: 'claim', message };
}

function buildMeldAdviceMessage(meldName: string, tile: Tile | undefined): string {
  if (!tile) return `You can claim this as a ${meldName}. Press CLAIM.`;

  if (tile.suit === TileSuit.DRAGON) {
    const name = tile.dragon === DragonTile.RED ? 'Red' : tile.dragon === DragonTile.GREEN ? 'Green' : 'White';
    return `Claim this ${name} Dragon as a ${meldName} — worth 1 faan!`;
  }
  if (tile.suit === TileSuit.WIND) {
    return `Claim this ${tile.wind} Wind as a ${meldName}. If it matches your seat wind, it's worth 1 faan!`;
  }
  return `You can take this as a ${meldName}. Press CLAIM.`;
}

interface ScoredTile {
  tile: Tile;
  score: number;
  reason: string;
}

function buildDiscardAdvice(
  gameState: GameState,
  hand: Tile[],
  playerIndex: number,
): TutorAdvice | null {
  // Check if player can win (accounting for exposed melds)
  const melds = gameState.players[playerIndex].melds;
  if (canPlayerWin(hand, melds)) {
    return {
      type: 'general',
      message: "You have a winning hand! Press [ WIN! ] to claim victory.",
    };
  }

  const nonBonus = hand.filter(t => t.type !== TileType.BONUS);
  if (nonBonus.length === 0) return null;

  // Evaluate tiles for discard
  const currentShanten = calculateShanten(nonBonus.slice(0, 13));

  const scores: ScoredTile[] = nonBonus.map(tile => {
    const remaining = hand.filter(t => t.id !== tile.id);
    const testHand = remaining.filter(t => t.type !== TileType.BONUS).slice(0, 13);

    const shanten = testHand.length >= 13 ? calculateShanten(testHand) : 8;
    const danger = tileDangerScore(tile, gameState, playerIndex);
    const priority = tileDiscardPriority(tile);
    const safe = isSafeTile(tile, gameState, playerIndex);

    let score = shanten * 100 + danger * 5 - priority * 2;
    if (safe) score -= 20;

    let reason = "This tile doesn't connect well with your other sets.";
    if (tile.type === TileType.HONOR) {
      const key = tileKey(tile);
      const count = hand.filter(t => tileKey(t) === key).length;
      if (count === 1) {
        reason = "This isolated honor tile is a safe discard.";
      } else {
        reason = "You have a pair of this honor — consider keeping it for a pung.";
      }
    } else if (safe) {
      reason = "Safe discard — many copies are already visible on the table.";
    } else if (shanten === currentShanten) {
      reason = "Discarding this keeps your hand at the same distance from winning.";
    }

    return { tile, score, reason };
  });

  // Sort: lowest score is best to discard
  scores.sort((a, b) => a.score - b.score);
  const best = scores[0];

  // Classify tiles
  const tileClassifications = classifyTiles(scores);

  // Check tenpai
  if (currentShanten === 0) {
    const waits = findTenpaiWaits(nonBonus.slice(0, 13), melds);
    const waitNames = waits.map(t => t.nameEnglish);
    return {
      type: 'discard',
      message: `TENPAI! One tile away from winning! Waiting for: ${waitNames.join(', ')}`,
      suggestedTileId: best.tile.id,
      tileClassifications,
      isTenpai: true,
      tenpaiWaits: waitNames,
    };
  }

  return {
    type: 'discard',
    message: best.reason,
    suggestedTileId: best.tile.id,
    tileClassifications,
  };
}

function classifyTiles(scores: ScoredTile[]): TileClassification[] {
  if (scores.length === 0) return [];

  const sorted = [...scores].sort((a, b) => a.score - b.score);
  const bestScore = sorted[0].score;
  const worstScore = sorted[sorted.length - 1].score;
  const range = worstScore - bestScore || 1;

  return scores.map(s => {
    const normalized = (s.score - bestScore) / range; // 0 = best discard, 1 = worst discard (keep)
    let color: TileColor;
    if (normalized < 0.25) color = 'red';       // recommended discard
    else if (normalized < 0.55) color = 'orange'; // consider discarding
    else color = 'green';                         // keep
    return { tileId: s.tile.id, color };
  });
}

function findTenpaiWaits(hand: Tile[], melds: MeldInfo[]): Tile[] {
  const waits: Tile[] = [];
  for (const testTile of ALL_TILE_TYPES) {
    const testHand = [...hand, testTile];
    if (canPlayerWin(testHand, melds)) {
      waits.push(testTile);
    }
  }
  return waits;
}
