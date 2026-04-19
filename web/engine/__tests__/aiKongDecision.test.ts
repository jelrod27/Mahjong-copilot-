import { describe, it, expect } from 'vitest';
import { GameState, GamePhase } from '@/models/GameState';
import { Tile, WindTile, DragonTile, tilesMatch } from '@/models/Tile';
import { getMediumDiscard } from '../ai/mediumAI';
import { getHardDiscard } from '../ai/hardAI';
import {
  dot, bam, char, dragonTile, makePlayer,
} from './testHelpers';

/**
 * Regression: calculateShanten only returns a real number for 13-tile non-bonus
 * input. Medium and Hard AI previously passed the ~10-tile "hand without the
 * quad" into calculateShanten, which fell through to the worst-case 8, so the
 * `shantenWithout <= shantenWith` kong-declaration guard was almost never true.
 * With the fix, both sides of the comparison are structurally-equivalent 13-tile
 * hands, so the AI correctly declares a concealed kong when it does not hurt
 * the hand.
 */

function buildGameState(hand: Tile[]): GameState {
  return {
    id: 'kong-decision-test',
    variant: 'Hong Kong Mahjong',
    phase: GamePhase.PLAYING,
    turnPhase: 'discard',
    currentPlayerIndex: 0,
    players: [
      makePlayer({
        id: 'ai_subject', name: 'AI Subject', isAI: true, seatWind: WindTile.EAST,
        hand,
      }),
      makePlayer({
        id: 'opp_1', name: 'Opp 1', isAI: true, seatWind: WindTile.SOUTH,
        hand: [dot(1, 4), dot(2, 4), dot(3, 4), dot(4, 4), dot(5, 4), dot(6, 4),
               dot(7, 4), dot(8, 4), dot(9, 4), bam(1, 4), bam(2, 4), bam(3, 4), bam(4, 4)],
      }),
      makePlayer({
        id: 'opp_2', name: 'Opp 2', isAI: true, seatWind: WindTile.WEST,
        hand: [char(1, 4), char(2, 4), char(3, 4), char(4, 4), char(5, 4), char(6, 4),
               char(7, 4), char(8, 4), char(9, 4), bam(5, 4), bam(6, 4), bam(7, 4), bam(8, 4)],
      }),
      makePlayer({
        id: 'opp_3', name: 'Opp 3', isAI: true, seatWind: WindTile.NORTH,
        hand: [bam(9, 4), dot(1, 3), dot(2, 3), dot(3, 3), dot(4, 3), dot(5, 3),
               dot(6, 3), dot(7, 3), dot(8, 3), dot(9, 3), char(1, 3), char(2, 3), char(3, 3)],
      }),
    ],
    wall: Array.from({ length: 40 }, (_, i) => bam(1, 200 + i)),
    deadWall: Array.from({ length: 14 }, (_, i) => char(1, 200 + i)),
    discardPile: [],
    playerDiscards: { ai_subject: [], opp_1: [], opp_2: [], opp_3: [] },
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    prevailingWind: WindTile.EAST,
    finalScores: {},
    createdAt: new Date(),
    turnHistory: [],
    turnTimeLimit: 20,
  };
}

describe('AI concealed kong decision', () => {
  // Favourable kong: 4 red dragons + two chows + a pair + a 2-tile partial (14 tiles).
  // Declaring the kong locks in a guaranteed fan (dragon pung) without reducing
  // the remaining hand's progress toward a standard win.
  const goodKongHand = () => [
    dragonTile(DragonTile.RED, 1),
    dragonTile(DragonTile.RED, 2),
    dragonTile(DragonTile.RED, 3),
    dragonTile(DragonTile.RED, 4),
    bam(1, 1), bam(2, 1), bam(3, 1), // chow
    dot(4, 1), dot(5, 1), dot(6, 1), // chow
    char(5, 1), char(5, 2),          // pair
    char(7, 1), char(8, 1),          // 2-tile partial waiting on 6 or 9
  ];

  it('medium AI declares concealed kong when it does not hurt shanten', () => {
    const state = buildGameState(goodKongHand());
    const decision = getMediumDiscard(state, 0);

    expect(decision.action.type).toBe('DECLARE_KONG');
    if (decision.action.type === 'DECLARE_KONG') {
      expect(decision.action.tile.suit).toBe('dragon');
      expect(decision.action.tile.dragon).toBe(DragonTile.RED);
    }
  });

  it('hard AI declares concealed kong when it does not hurt shanten', () => {
    const state = buildGameState(goodKongHand());
    const decision = getHardDiscard(state, 0);

    expect(decision.action.type).toBe('DECLARE_KONG');
    if (decision.action.type === 'DECLARE_KONG') {
      expect(decision.action.tile.suit).toBe('dragon');
      expect(decision.action.tile.dragon).toBe(DragonTile.RED);
    }
  });

  // Unfavourable kong: declaring the kong would destroy a near-complete seven
  // pairs hand. With 4-of-a-kind as 2 pairs plus 5 other pairs, the hand is
  // 1-shanten toward seven pairs. Declaring kong converts the 2 pairs into a
  // single pung meld, losing the seven-pairs shape entirely.
  const sevenPairsHand = () => [
    dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4), // 4-of-a-kind = 2 pairs in 7-pairs
    dot(3, 1), dot(3, 2),                         // pair
    dot(5, 1), dot(5, 2),                         // pair
    bam(2, 1), bam(2, 2),                         // pair
    bam(6, 1), bam(6, 2),                         // pair
    char(4, 1), char(7, 1),                       // 2 singletons, need 1 more pair
  ];

  it('medium AI does not declare kong when it wrecks seven-pairs progress', () => {
    const state = buildGameState(sevenPairsHand());
    const decision = getMediumDiscard(state, 0);

    // The dot-1 quad gives the AI two pairs toward seven pairs; declaring kong
    // collapses that into a single pung meld, so the AI should discard instead.
    expect(decision.action.type).not.toBe('DECLARE_KONG');
    if (decision.action.type === 'DECLARE_KONG') {
      // If this ever flips, surface it clearly.
      expect(tilesMatch(decision.action.tile, dot(1, 1))).toBe(false);
    }
  });
});
