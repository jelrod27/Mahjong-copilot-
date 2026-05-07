import { describe, it, expect } from 'vitest';
import { getTutorAdvice } from '../tutor';
import { GamePhase, GameState, MeldInfo, Player } from '@/models/GameState';
import { DragonTile, Tile, WindTile } from '@/models/Tile';
import { AvailableClaim } from '../types';
import {
  bam,
  buildAllPungsHand,
  char,
  dot,
  dragonTile,
  makePlayer,
  windTile,
} from './testHelpers';

function makeGameState(
  overrides: Partial<GameState> & { players: Player[] },
): GameState {
  return {
    id: 'test-game',
    variant: 'hong-kong',
    phase: GamePhase.PLAYING,
    turnPhase: 'discard',
    currentPlayerIndex: 0,
    wall: [],
    deadWall: [],
    discardPile: [],
    playerDiscards: {},
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    prevailingWind: WindTile.EAST,
    finalScores: {},
    createdAt: new Date(),
    turnHistory: [],
    turnTimeLimit: 20,
    ...overrides,
  };
}

function claim(
  claimType: AvailableClaim['claimType'],
  priority: number,
  tilesFromHand: Tile[][] = [[]],
): AvailableClaim {
  return { playerId: 'p0', claimType, tilesFromHand, priority };
}

describe('getTutorAdvice — phase gating', () => {
  it('returns null when in draw phase', () => {
    const player = makePlayer({ hand: buildAllPungsHand() });
    const state = makeGameState({ players: [player], turnPhase: 'draw' });

    expect(getTutorAdvice(state, 0)).toBeNull();
  });

  it('returns null in discard phase when not the current player', () => {
    const me = makePlayer({ hand: [dot(1), dot(2), dot(3)] });
    const them = makePlayer({ hand: [bam(1), bam(2), bam(3)] });
    const state = makeGameState({
      players: [me, them],
      turnPhase: 'discard',
      currentPlayerIndex: 1,
    });

    expect(getTutorAdvice(state, 0)).toBeNull();
  });

  it('returns null in claim phase when no claims are available', () => {
    const player = makePlayer({ hand: buildAllPungsHand() });
    const state = makeGameState({
      players: [player],
      turnPhase: 'claim',
    });

    expect(getTutorAdvice(state, 0, [])).toBeNull();
  });
});

describe('getTutorAdvice — discard phase', () => {
  it('returns general-type advice when the hand is winning', () => {
    const player = makePlayer({ hand: buildAllPungsHand() });
    const state = makeGameState({ players: [player] });

    const advice = getTutorAdvice(state, 0);

    expect(advice).not.toBeNull();
    expect(advice!.type).toBe('general');
  });

  it('tells the player to declare when the hand is winning', () => {
    const player = makePlayer({ hand: buildAllPungsHand() });
    const state = makeGameState({ players: [player] });

    const advice = getTutorAdvice(state, 0);

    expect(advice!.message.toLowerCase()).toContain('win');
  });

  // Tenpai fixture: 4 pungs + a single 5-dot — needs another 5-dot to win.
  // 13 tiles (no draw yet) so we are evaluating "what to keep."
  const tenpaiHand = () => [
    dot(1, 1), dot(1, 2), dot(1, 3),
    dot(2, 1), dot(2, 2), dot(2, 3),
    dot(3, 1), dot(3, 2), dot(3, 3),
    dot(4, 1), dot(4, 2), dot(4, 3),
    dot(5, 1),
  ];

  it('flags isTenpai on a one-away hand', () => {
    const player = makePlayer({ hand: tenpaiHand() });
    const state = makeGameState({ players: [player] });

    const advice = getTutorAdvice(state, 0);

    expect(advice).not.toBeNull();
    expect(advice!.type).toBe('discard');
    expect(advice!.isTenpai).toBe(true);
  });

  it('lists the waiting tiles for a tenpai hand', () => {
    const player = makePlayer({ hand: tenpaiHand() });
    const state = makeGameState({ players: [player] });

    const advice = getTutorAdvice(state, 0);

    expect(advice!.tenpaiWaits).toBeDefined();
    expect(advice!.tenpaiWaits!.length).toBeGreaterThan(0);
    expect(advice!.tenpaiWaits!.join(' ').toLowerCase()).toContain('dot');
  });

  it('returns a suggested discard with classifications for non-tenpai hands', () => {
    // Random scrap hand far from a win
    const hand = [
      dot(1), dot(4), dot(7),
      bam(2), bam(5), bam(8),
      char(3), char(6), char(9),
      windTile(WindTile.EAST),
      windTile(WindTile.SOUTH),
      dragonTile(DragonTile.RED),
      dragonTile(DragonTile.GREEN),
    ];
    const player = makePlayer({ hand });
    const state = makeGameState({ players: [player] });

    const advice = getTutorAdvice(state, 0);

    expect(advice).not.toBeNull();
    expect(advice!.type).toBe('discard');
    expect(advice!.isTenpai).toBeFalsy();
    expect(advice!.suggestedTileId).toBeDefined();
    expect(hand.map(t => t.id)).toContain(advice!.suggestedTileId);
    expect(advice!.tileClassifications).toBeDefined();
  });

  it('classifies every non-bonus tile in the hand', () => {
    const hand = [
      dot(1), dot(4), dot(7),
      bam(2), bam(5), bam(8),
      char(3), char(6), char(9),
      windTile(WindTile.WEST),
      windTile(WindTile.NORTH),
      dragonTile(DragonTile.WHITE),
      dragonTile(DragonTile.RED),
    ];
    const player = makePlayer({ hand });
    const state = makeGameState({ players: [player] });

    const advice = getTutorAdvice(state, 0);

    expect(advice!.tileClassifications).toHaveLength(hand.length);
    const handIds = new Set(hand.map(t => t.id));
    for (const c of advice!.tileClassifications!) {
      expect(handIds.has(c.tileId)).toBe(true);
      expect(['red', 'orange', 'green']).toContain(c.color);
    }
  });

  it('produces a spread of red/orange/green classifications across a varied hand', () => {
    // Mix of clearly-bad isolated honors, partial sequences, and a strong pair —
    // the classifier should not collapse everything into one bucket.
    const hand = [
      dot(2), dot(3), dot(4),    // chow
      bam(5), bam(5),             // pair
      char(1), char(9),           // disconnected terminals
      windTile(WindTile.EAST),    // isolated honor
      dragonTile(DragonTile.RED), // isolated honor
      dragonTile(DragonTile.GREEN), // isolated honor
      dot(7), dot(8),             // partial chow
      bam(2),                      // floater
    ];
    const player = makePlayer({ hand });
    const state = makeGameState({ players: [player] });

    const advice = getTutorAdvice(state, 0);

    const colors = new Set(
      (advice!.tileClassifications ?? []).map(c => c.color),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('getTutorAdvice — claim phase', () => {
  const baseHand = [
    dot(1), dot(2), dot(3),
    bam(4), bam(5), bam(6),
    char(7), char(8), char(9),
    windTile(WindTile.EAST), windTile(WindTile.EAST),
    dragonTile(DragonTile.RED), dragonTile(DragonTile.RED),
  ];

  function claimState(lastDiscard: Tile, melds: MeldInfo[] = []): GameState {
    const player = makePlayer({ hand: baseHand, melds });
    return makeGameState({
      players: [player],
      turnPhase: 'claim',
      currentPlayerIndex: 1, // someone else's turn; we are claiming their discard
      lastDiscardedTile: lastDiscard,
      lastDiscardedBy: 'other',
    });
  }

  it('routes to the win message when win is the best claim', () => {
    const state = claimState(dot(5));
    const claims = [
      claim('chow', 1),
      claim('pung', 2),
      claim('win', 4),
    ];

    const advice = getTutorAdvice(state, 0, claims);

    expect(advice).not.toBeNull();
    expect(advice!.type).toBe('claim');
    expect(advice!.message.toLowerCase()).toMatch(/mahjong|win/);
  });

  it('routes to the kong message when kong is the best claim', () => {
    const state = claimState(bam(5));
    const claims = [claim('pung', 2), claim('kong', 3)];

    const advice = getTutorAdvice(state, 0, claims);

    expect(advice!.message.toLowerCase()).toContain('kong');
  });

  it('routes to the pung message when pung is the best claim', () => {
    const state = claimState(char(7));
    const claims = [claim('chow', 1), claim('pung', 2)];

    const advice = getTutorAdvice(state, 0, claims);

    expect(advice!.message.toLowerCase()).toContain('pung');
  });

  it('routes to the chow message when only chow is available', () => {
    const state = claimState(dot(4));
    const claims = [claim('chow', 1, [[dot(2), dot(3)]])];

    const advice = getTutorAdvice(state, 0, claims);

    expect(advice!.message.toLowerCase()).toContain('chow');
  });

  it('uses dragon-specific phrasing when claiming a dragon tile as a pung', () => {
    const state = claimState(dragonTile(DragonTile.RED, 3));
    const claims = [claim('pung', 2)];

    const advice = getTutorAdvice(state, 0, claims);

    expect(advice!.message.toLowerCase()).toMatch(/dragon|faan/);
  });
});
