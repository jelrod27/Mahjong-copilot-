import { describe, it, expect } from 'vitest';
import {
  countVisibleTiles,
  isSafeTile,
  tileDangerScore,
  isOpponentDangerous,
  detectOpponentSuitFocus,
  resolvePlayerDiscards,
  tileDiscardPriority,
} from '../aiUtils';
import { Tile, TileType, TileSuit, WindTile, DragonTile } from '@/models/Tile';
import { GameState, GamePhase, MeldInfo, Player } from '@/models/GameState';
import { dot, bam, char, windTile, dragonTile, makePlayer } from '../../__tests__/testHelpers';

// Helper: build a minimal GameState for AI utility tests
function buildGameState(overrides: Partial<GameState> = {}): GameState {
  const defaults: GameState = {
    id: 'test-game',
    variant: 'Hong Kong Mahjong',
    phase: GamePhase.PLAYING,
    turnPhase: 'discard',
    currentPlayerIndex: 0,
    players: [],
    wall: [],
    deadWall: [],
    discardPile: [],
    playerDiscards: {},
    pendingClaims: [],
    prevailingWind: WindTile.EAST,
    finalScores: {},
    createdAt: new Date(),
    turnHistory: [],
    turnTimeLimit: 20,
    claimablePlayers: [],
    passedPlayers: [],
  };
  return { ...defaults, ...overrides } as GameState;
}

// =========================================================================
// MC-004: countVisibleTiles — no double-count for concealed kong
// =========================================================================
describe('countVisibleTiles — MC-004 double-count fix', () => {
  it('does not double-count concealed meld tiles that also appear in hand', () => {
    // Simulate: player has bamboo-1 in hand AND also in a concealed kong meld
    // (state invariant violation — the defensive filter should prevent double-count)
    const bamboo1_copy1 = bam(1, 1);
    const bamboo1_copy2 = bam(1, 2);
    const bamboo1_copy3 = bam(1, 3);
    const bamboo1_copy4 = bam(1, 4);

    const player: Player = {
      id: 'player_0',
      name: 'Player 0',
      isAI: false,
      hand: [bamboo1_copy1, bamboo1_copy2, bamboo1_copy3], // 3 copies in hand (kong tile still here)
      melds: [{
        tiles: [bamboo1_copy1, bamboo1_copy2, bamboo1_copy3, bamboo1_copy4],
        type: 'kong',
        isConcealed: true,
      }],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const state = buildGameState({ players: [player] });
    const counts = countVisibleTiles(state, 0);

    // Should count bamboo_1: 3 (from hand) + 1 (copy4 from meld, not in hand) = 4
    // Without the fix, it would be 3 (hand) + 4 (meld) = 7 (double-count)
    expect(counts.get('bamboo_1')).toBe(4);
  });

  it('counts exposed meld tiles separately even when same tile type is in hand', () => {
    const player: Player = {
      id: 'player_0',
      name: 'Player 0',
      isAI: false,
      hand: [dot(5, 1), dot(6, 1), dot(7, 1), dot(8, 1)], // 4 suit tiles in hand
      melds: [{
        tiles: [dot(1, 1), dot(1, 2), dot(1, 3)], // exposed pung of dot-1
        type: 'pung',
        isConcealed: false,
      }],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const state = buildGameState({ players: [player] });
    const counts = countVisibleTiles(state, 0);

    // dot_1: 3 from exposed pung (not in hand, so all counted)
    expect(counts.get('dot_1')).toBe(3);
  });

  it('counts own concealed pung tiles that are not in hand', () => {
    const player: Player = {
      id: 'player_0',
      name: 'Player 0',
      isAI: false,
      hand: [bam(5, 1), bam(6, 1), bam(7, 1), bam(8, 1), char(9, 1)],
      melds: [{
        // Concealed pung — tiles are ONLY in the meld, not in hand
        tiles: [windTile(WindTile.WEST, 1), windTile(WindTile.WEST, 2), windTile(WindTile.WEST, 3)],
        type: 'pung',
        isConcealed: true,
      }],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const state = buildGameState({ players: [player] });
    const counts = countVisibleTiles(state, 0);

    // West wind: 3 from concealed pung (none in hand, so all counted)
    expect(counts.get('wind_west')).toBe(3);
  });
});

// =========================================================================
// MC-005: isSafeTile — 2 discards is NOT safe
// =========================================================================
describe('isSafeTile — MC-005 safe-heuristic fix', () => {
  it('returns false when only 2 copies are in discard pile (2 copies remain)', () => {
    const player = makePlayer({ hand: [bam(1, 1)] });
    // 2 copies of dot-5 in the discard pile
    const discards = [dot(5, 1), dot(5, 2), bam(3, 1), char(7, 1)];
    const state = buildGameState({
      players: [player],
      discardPile: discards,
    });

    expect(isSafeTile(dot(5, 3), state, 0)).toBe(false);
  });

  it('returns true when 3 copies are in discard pile (1 remaining)', () => {
    const player = makePlayer({ hand: [bam(1, 1)] });
    // 3 copies of dot-5 in discard pile — only 1 can possibly remain
    const discards = [dot(5, 1), dot(5, 2), dot(5, 3), bam(3, 1)];
    const state = buildGameState({
      players: [player],
      discardPile: discards,
    });

    expect(isSafeTile(dot(5, 4), state, 0)).toBe(true);
  });

  it('returns true when all 4 copies are visible', () => {
    const player = makePlayer({ hand: [dot(5, 1)] });
    // 3 copies in discard + 1 in hand = all 4 visible
    const discards = [dot(5, 2), dot(5, 3), dot(5, 4), bam(3, 1)];
    const state = buildGameState({
      players: [player],
      discardPile: discards,
    });

    expect(isSafeTile(dot(5, 1), state, 0)).toBe(true);
  });

  it('returns false when only 1 copy is in discard pile', () => {
    const player = makePlayer({ hand: [bam(1, 1)] });
    const discards = [dot(5, 1), bam(3, 1)];
    const state = buildGameState({
      players: [player],
      discardPile: discards,
    });

    expect(isSafeTile(dot(5, 2), state, 0)).toBe(false);
  });
});

// =========================================================================
// MC-010: isOpponentDangerous — no info leak via hand.length
// =========================================================================
describe('isOpponentDangerous — MC-010 info leak fix', () => {
  it('derives hand size from public data, not opponent.hand.length', () => {
    // Opponent has 3 exposed melds = 9 tiles in melds, so estimated hand = 13 - 3*3 = 4
    const opponent: Player = {
      id: 'ai_1',
      name: 'AI 1',
      isAI: true,
      // In multiplayer, an AI wouldn't see this hand, but we simulate the info leak test
      // by providing a large hand — the function should NOT use hand.length
      hand: [bam(1, 1), bam(2, 1), bam(3, 1), bam(4, 1), bam(5, 1), bam(6, 1)],
      melds: [
        { tiles: [dot(1, 1), dot(1, 2), dot(1, 3)], type: 'pung' as const, isConcealed: false },
        { tiles: [dot(7, 1), dot(8, 1), dot(9, 1)], type: 'chow' as const, isConcealed: false },
        { tiles: [dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3)], type: 'pung' as const, isConcealed: false },
      ],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const state = buildGameState({
      players: [makePlayer({ hand: [bam(1, 1)] }), opponent],
    });

    // 3 exposed melds → always dangerous regardless of hand size
    expect(isOpponentDangerous(state, 1)).toBe(true);
  });

  it('does not incorrectly flag opponent as dangerous from leaked hand data', () => {
    // Opponent with 0 exposed melds but small hand (e.g. 2 tiles) via info leak
    // The old code would flag this: handSize <= 4 && exposedMelds >= 2
    // But with 0 exposed melds, they shouldn't be flagged just from small hand
    const opponent: Player = {
      id: 'ai_1',
      name: 'AI 1',
      isAI: true,
      hand: [bam(1, 1)], // only 1 tile — but no melds, so not dangerous
      melds: [],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const state = buildGameState({
      players: [makePlayer({ hand: [bam(1, 1)] }), opponent],
    });

    // 0 exposed melds and no melds at all → not dangerous
    expect(isOpponentDangerous(state, 1)).toBe(false);
  });

  it('flags late-game dangerous opponent with 2 exposed melds', () => {
    const opponent: Player = {
      id: 'ai_1',
      name: 'AI 1',
      isAI: true,
      hand: [bam(1, 1), bam(2, 1), bam(3, 1)],
      melds: [
        { tiles: [dot(1, 1), dot(1, 2), dot(1, 3)], type: 'pung' as const, isConcealed: false },
        { tiles: [dot(7, 1), dot(8, 1), dot(9, 1)], type: 'chow' as const, isConcealed: false },
      ],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    // Wall < 20 tiles = late game
    const wall = Array(10).fill(dot(9, 4));
    const state = buildGameState({
      players: [makePlayer({ hand: [bam(1, 1)] }), opponent],
      wall,
    });

    // 2 exposed melds + late game
    expect(isOpponentDangerous(state, 1)).toBe(true);
  });
});

// =========================================================================
// MC-011: Honor tile danger inflation
// =========================================================================
describe('tileDangerScore — MC-011 honor tile inflation fix', () => {
  it('does not add same-suit meld danger for dragon tiles', () => {
    const player = makePlayer({ hand: [dragonTile(DragonTile.RED, 1)] });
    const opponent: Player = {
      id: 'ai_1',
      name: 'Opponent',
      isAI: true,
      hand: [],
      melds: [
        // Opponent has a bamboo chow — dragon tiles should NOT get +2 danger
        // just because TileSuit.DRAGON !== TileSuit.BAMBOO
        { tiles: [bam(1, 1), bam(2, 1), bam(3, 1)], type: 'chow' as const, isConcealed: false },
      ],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const state = buildGameState({
      players: [player, opponent],
      playerDiscards: { 'player_1': [], [opponent.id]: [] },
    });

    const dragonDanger = tileDangerScore(dragonTile(DragonTile.RED, 1), state, 0);
    const bambooDanger = tileDangerScore(bam(4, 1), state, 0);

    // Bamboo tile should get +2 for the opponent's bamboo meld
    // Dragon tile should NOT get +2 from the bamboo meld
    expect(bambooDanger).toBeGreaterThan(dragonDanger);
  });

  it('does not add same-suit meld danger for wind tiles', () => {
    const player = makePlayer({ hand: [windTile(WindTile.NORTH, 1)] });
    const opponent: Player = {
      id: 'ai_1',
      name: 'Opponent',
      isAI: true,
      hand: [],
      melds: [
        { tiles: [char(3, 1), char(4, 1), char(5, 1)], type: 'chow' as const, isConcealed: false },
      ],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const state = buildGameState({
      players: [player, opponent],
      playerDiscards: { [opponent.id]: [] },
    });

    const windDanger = tileDangerScore(windTile(WindTile.NORTH, 1), state, 0);
    // Wind should not get +2 from a character suit meld
    // visibleCount includes our own hand — we hold 1 north wind, so (4-1)*2 = 6
    expect(windDanger).toBe(6);
  });

  it('adds same-suit meld danger for suit tiles correctly', () => {
    const player = makePlayer({ hand: [bam(4, 1)] });
    const opponent: Player = {
      id: 'ai_1',
      name: 'Opponent',
      isAI: true,
      hand: [],
      melds: [
        { tiles: [bam(1, 1), bam(2, 1), bam(3, 1)], type: 'chow' as const, isConcealed: false },
      ],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const state = buildGameState({
      players: [player, opponent],
      playerDiscards: { [opponent.id]: [] },
    });

    const bambooDanger = tileDangerScore(bam(8, 1), state, 0);
    // visibleCount for bam_8 = 0 (no bam(8) in hand, melds, or discards)
    // Opponent has bamboo meld → +2 same-suit bonus
    // danger = (4-0)*2 + 2 = 10
    expect(bambooDanger).toBe(10);
  });
});

// =========================================================================
// MC-012: playerDiscards key mismatch
// =========================================================================
describe('resolvePlayerDiscards — MC-012 key mismatch fix', () => {
  it('resolves discards by exact player ID match', () => {
    const player: Player = {
      id: 'player_0',
      name: 'Player 0',
      isAI: false,
      hand: [],
      melds: [],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const discards = [dot(1, 1), dot(2, 1)];
    const state = buildGameState({
      players: [player],
      playerDiscards: { 'player_0': discards },
    });

    const result = resolvePlayerDiscards(state, 'player_0', 0);
    expect(result).toEqual(discards);
  });

  it('falls back to index-based key when player ID does not match', () => {
    // Simulate a mismatch: player.id = 'player_0' but playerDiscards uses '0' as key
    const player: Player = {
      id: 'player_0',
      name: 'Player 0',
      isAI: false,
      hand: [],
      melds: [],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const discards = [dot(5, 1)];
    const state = buildGameState({
      players: [player],
      playerDiscards: { '0': discards }, // key is numeric-ish string
    });

    const result = resolvePlayerDiscards(state, 'player_0', 0);
    // Should find the discards via index-based fallback
    expect(result).toEqual(discards);
  });

  it('returns empty array when no matching key exists', () => {
    const player: Player = {
      id: 'player_99',
      name: 'Player 99',
      isAI: false,
      hand: [],
      melds: [],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    const state = buildGameState({
      players: [player],
      playerDiscards: { 'some_other_key': [dot(1, 1)] },
    });

    const result = resolvePlayerDiscards(state, 'player_99', 0);
    expect(result).toEqual([]);
  });
});

// =========================================================================
// detectOpponentSuitFocus uses resolvePlayerDiscards
// =========================================================================
describe('detectOpponentSuitFocus uses correct player discards', () => {
  it('detects suit focus when opponent avoids discarding a suit', () => {
    const opponent: Player = {
      id: 'ai_1',
      name: 'AI 1',
      isAI: true,
      hand: [],
      melds: [],
      score: 0,
      seatWind: WindTile.EAST,
      isDealer: false,
      flowers: [],
    };

    // Opponent has discarded lots of character and dot, but almost no bamboo
    const opponentDiscards = [
      char(1, 1), char(2, 1), char(3, 1), char(4, 1),
      dot(1, 1), dot(2, 1), dot(3, 1),
      bam(8, 1), // only 1 bamboo discard
    ];

    const state = buildGameState({
      players: [makePlayer({ hand: [bam(1, 1)] }), opponent],
      playerDiscards: { 'ai_1': opponentDiscards },
    });

    const focused = detectOpponentSuitFocus(state, 1);
    expect(focused.has(TileSuit.BAMBOO)).toBe(true);
    expect(focused.has(TileSuit.CHARACTER)).toBe(false);
  });
});