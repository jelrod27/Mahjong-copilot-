/**
 * Regression tests for the Phase 1 engine correctness fixes:
 * - seedable determinism (wall shuffle + AI noise)
 * - kong holders can win (canPlayerWin effective tile count)
 * - exposed-meld winners score real fans, not chicken hand
 * - exact tenpai for wall-exhaustion settlement
 * - last-tile / heavenly / earthly win methods and fans
 * - unified claim resolution
 */

import { describe, it, expect } from 'vitest';
import { initializeGame, applyAction, isPlayerTenpai, deriveWinMethod, buildWinScoringContext, GameOptions } from '../turnManager';
import { canPlayerWin, isTenpai, findDecompositionsWithMelds } from '../winDetection';
import { calculateScore, meetsMinFaan } from '../scoring';
import { getEasyDiscard } from '../ai/easyAI';
import { resolveClaimRequests } from '../claiming';
import { createRng, deterministicNoise } from '../rng';
import { Tile, TileSuit, TileType, WindTile } from '@/models/Tile';
import { GameState, MeldInfo, ClaimRequest } from '@/models/GameState';

let uid = 0;
function suit(s: TileSuit, n: number): Tile {
  uid++;
  return {
    id: `t${uid}_${s}${n}`, suit: s, number: n, type: TileType.SUIT,
    nameEnglish: `${n} ${s}`, nameChinese: '', nameJapanese: '', assetPath: '',
  } as Tile;
}

const baseOptions: GameOptions = {
  playerNames: ['You', 'A', 'B', 'C'],
  aiPlayers: [
    { index: 1, difficulty: 'easy' },
    { index: 2, difficulty: 'easy' },
    { index: 3, difficulty: 'easy' },
  ],
  humanPlayerId: 'human',
};

describe('seedable determinism', () => {
  it('same seed produces identical deal', () => {
    const a = initializeGame({ ...baseOptions, seed: 'daily-2026-06-10' });
    const b = initializeGame({ ...baseOptions, seed: 'daily-2026-06-10' });
    expect(a.wall.map(t => t.id)).toEqual(b.wall.map(t => t.id));
    expect(a.players[0].hand.map(t => t.id)).toEqual(b.players[0].hand.map(t => t.id));
    expect(a.deadWall.map(t => t.id)).toEqual(b.deadWall.map(t => t.id));
    expect(a.id).toBe(b.id);
  });

  it('different seeds produce different deals', () => {
    const a = initializeGame({ ...baseOptions, seed: 'seed-one' });
    const b = initializeGame({ ...baseOptions, seed: 'seed-two' });
    expect(a.wall.map(t => t.id)).not.toEqual(b.wall.map(t => t.id));
  });

  it('omitting the seed still seeds the state for replay', () => {
    const a = initializeGame(baseOptions);
    expect(a.seed).toBeTruthy();
    const replay = initializeGame({ ...baseOptions, seed: a.seed });
    expect(replay.wall.map(t => t.id)).toEqual(a.wall.map(t => t.id));
  });

  it('rng stream is stable for a given seed', () => {
    const r1 = createRng('x');
    const r2 = createRng('x');
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });

  it('easy AI decisions are deterministic for the same state', () => {
    const game = initializeGame({ ...baseOptions, seed: 'ai-determinism' });
    const d1 = getEasyDiscard(game, 1);
    const d2 = getEasyDiscard(game, 1);
    expect(d1.action).toEqual(d2.action);
  });

  it('deterministicNoise is stable and within [0, 1)', () => {
    const n = deterministicNoise('a', 1, 'b');
    expect(n).toBe(deterministicNoise('a', 1, 'b'));
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(1);
  });
});

describe('kong holders can win', () => {
  const kong: MeldInfo = {
    tiles: [suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 1)],
    type: 'kong', isConcealed: false,
  };
  const winningHand11 = [
    suit(TileSuit.BAMBOO, 2), suit(TileSuit.BAMBOO, 3), suit(TileSuit.BAMBOO, 4),
    suit(TileSuit.CHARACTER, 5), suit(TileSuit.CHARACTER, 6), suit(TileSuit.CHARACTER, 7),
    suit(TileSuit.DOT, 7), suit(TileSuit.DOT, 8), suit(TileSuit.DOT, 9),
    suit(TileSuit.BAMBOO, 9), suit(TileSuit.BAMBOO, 9),
  ];

  it('one exposed kong + complete hand wins', () => {
    expect(canPlayerWin(winningHand11, [kong])).toBe(true);
  });

  it('two kongs win with 8 concealed tiles', () => {
    const kong2: MeldInfo = {
      tiles: [suit(TileSuit.BAMBOO, 5), suit(TileSuit.BAMBOO, 5), suit(TileSuit.BAMBOO, 5), suit(TileSuit.BAMBOO, 5)],
      type: 'kong', isConcealed: true,
    };
    const hand8 = [
      suit(TileSuit.CHARACTER, 1), suit(TileSuit.CHARACTER, 2), suit(TileSuit.CHARACTER, 3),
      suit(TileSuit.DOT, 4), suit(TileSuit.DOT, 5), suit(TileSuit.DOT, 6),
      suit(TileSuit.DOT, 2), suit(TileSuit.DOT, 2),
    ];
    expect(canPlayerWin(hand8, [kong, kong2])).toBe(true);
  });

  it('kong holder one tile short does not win', () => {
    expect(canPlayerWin(winningHand11.slice(0, 10), [kong])).toBe(false);
  });

  it('kong holder is detected as tenpai', () => {
    // Drop one bamboo 9 from the pair: waiting on bamboo 9
    const tenpaiHand = winningHand11.slice(0, 10);
    expect(isTenpai(tenpaiHand, [kong])).toBe(true);
  });
});

describe('exposed-meld scoring', () => {
  const ctx = {
    isSelfDrawn: false,
    seatWind: WindTile.EAST,
    prevailingWind: WindTile.EAST,
    isConcealed: false,
    flowers: [],
  };

  it('claimed pung + pure one suit scores 7 fan, not chicken', () => {
    const pung: MeldInfo = {
      tiles: [suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 1)],
      type: 'pung', isConcealed: false,
    };
    const winning = suit(TileSuit.DOT, 9);
    const hand = [
      suit(TileSuit.DOT, 2), suit(TileSuit.DOT, 3), suit(TileSuit.DOT, 4),
      suit(TileSuit.DOT, 5), suit(TileSuit.DOT, 6), suit(TileSuit.DOT, 7),
      suit(TileSuit.DOT, 7), suit(TileSuit.DOT, 8), suit(TileSuit.DOT, 9),
      suit(TileSuit.DOT, 9),
    ];
    const result = calculateScore(hand, [pung], { ...ctx, winningTile: winning });
    expect(result.fans.map(f => f.name)).toContain('Pure One Suit');
    expect(result.totalFan).toBeGreaterThanOrEqual(7);
  });

  it('exposed-meld hand passes the 3-faan gate when it earns it', () => {
    const pung: MeldInfo = {
      tiles: [suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 1)],
      type: 'pung', isConcealed: false,
    };
    const winning = suit(TileSuit.DOT, 9);
    const hand = [
      suit(TileSuit.DOT, 2), suit(TileSuit.DOT, 3), suit(TileSuit.DOT, 4),
      suit(TileSuit.DOT, 5), suit(TileSuit.DOT, 6), suit(TileSuit.DOT, 7),
      suit(TileSuit.DOT, 7), suit(TileSuit.DOT, 8), suit(TileSuit.DOT, 9),
      suit(TileSuit.DOT, 9),
    ];
    expect(meetsMinFaan(hand, [pung], { ...ctx, winningTile: winning, minFaan: 3 })).toBe(true);
  });

  it('findDecompositionsWithMelds includes the exposed melds', () => {
    const pung: MeldInfo = {
      tiles: [suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 1)],
      type: 'pung', isConcealed: false,
    };
    const concealed = [
      suit(TileSuit.DOT, 2), suit(TileSuit.DOT, 3), suit(TileSuit.DOT, 4),
      suit(TileSuit.DOT, 5), suit(TileSuit.DOT, 6), suit(TileSuit.DOT, 7),
      suit(TileSuit.DOT, 7), suit(TileSuit.DOT, 8), suit(TileSuit.DOT, 9),
      suit(TileSuit.DOT, 9), suit(TileSuit.DOT, 9),
    ];
    const decomps = findDecompositionsWithMelds(concealed, [pung]);
    expect(decomps.length).toBeGreaterThan(0);
    expect(decomps[0].melds).toHaveLength(4);
  });
});

describe('win-method derivation and special hands', () => {
  function fakeState(partial: Partial<GameState>): GameState {
    const base = initializeGame({ ...baseOptions, seed: 'win-method' });
    return { ...base, ...partial };
  }

  it('derives lastTileDraw when the wall is empty on self-draw', () => {
    const s = fakeState({ wall: [], isKongReplacement: undefined });
    expect(deriveWinMethod(s, true)).toBe('lastTileDraw');
  });

  it('derives lastTileClaim when the wall is empty on discard win', () => {
    const s = fakeState({ wall: [] });
    expect(deriveWinMethod(s, false)).toBe('lastTileClaim');
  });

  it('kong replacement beats lastTileDraw in precedence', () => {
    const s = fakeState({ wall: [], isKongReplacement: true });
    expect(deriveWinMethod(s, true)).toBe('kongReplacement');
  });

  it('heavenly hand scores as a limit hand', () => {
    const winning = suit(TileSuit.DOT, 9);
    const result = calculateScore([], [], {
      winningTile: winning, isSelfDrawn: true,
      seatWind: WindTile.EAST, prevailingWind: WindTile.EAST,
      isConcealed: true, flowers: [], isHeavenly: true,
    });
    expect(result.handName).toBe('Heavenly Hand');
    expect(result.totalPoints).toBe(8192);
  });

  it('earthly hand scores as a limit hand', () => {
    const winning = suit(TileSuit.DOT, 9);
    const result = calculateScore([], [], {
      winningTile: winning, isSelfDrawn: false,
      seatWind: WindTile.SOUTH, prevailingWind: WindTile.EAST,
      isConcealed: true, flowers: [], isEarthly: true,
    });
    expect(result.handName).toBe('Earthly Hand');
    expect(result.totalPoints).toBe(8192);
  });

  it('buildWinScoringContext flags heavenly for dealer first-draw win', () => {
    const base = initializeGame({ ...baseOptions, seed: 'heavenly' });
    const dealer = base.players[base.currentPlayerIndex];
    const finished: GameState = {
      ...base,
      winnerId: dealer.id,
      winningTile: dealer.hand[0],
      isSelfDrawn: true,
    };
    const ctx = buildWinScoringContext(finished);
    expect(ctx).not.toBeNull();
    expect(ctx!.isHeavenly).toBe(true);
  });

  it('buildWinScoringContext returns null for a draw game', () => {
    const base = initializeGame({ ...baseOptions, seed: 'draw' });
    expect(buildWinScoringContext(base)).toBeNull();
  });
});

describe('exact tenpai (money path)', () => {
  it('thirteen orphans wait is tenpai', () => {
    const honors: Tile[] = [];
    let i = 0;
    const mk = (props: Partial<Tile>): Tile => ({
      id: `h${i++}`, nameEnglish: '', nameChinese: '', nameJapanese: '', assetPath: '',
      ...props,
    } as Tile);
    // 13 distinct terminals/honors — waiting on any duplicate
    honors.push(mk({ suit: TileSuit.DOT, number: 1, type: TileType.SUIT }));
    honors.push(mk({ suit: TileSuit.DOT, number: 9, type: TileType.SUIT }));
    honors.push(mk({ suit: TileSuit.BAMBOO, number: 1, type: TileType.SUIT }));
    honors.push(mk({ suit: TileSuit.BAMBOO, number: 9, type: TileType.SUIT }));
    honors.push(mk({ suit: TileSuit.CHARACTER, number: 1, type: TileType.SUIT }));
    honors.push(mk({ suit: TileSuit.CHARACTER, number: 9, type: TileType.SUIT }));
    honors.push(mk({ suit: TileSuit.WIND, wind: WindTile.EAST, type: TileType.HONOR }));
    honors.push(mk({ suit: TileSuit.WIND, wind: WindTile.SOUTH, type: TileType.HONOR }));
    honors.push(mk({ suit: TileSuit.WIND, wind: WindTile.WEST, type: TileType.HONOR }));
    honors.push(mk({ suit: TileSuit.WIND, wind: WindTile.NORTH, type: TileType.HONOR }));
    honors.push(mk({ suit: TileSuit.DRAGON, dragon: 'red' as Tile['dragon'], type: TileType.HONOR }));
    honors.push(mk({ suit: TileSuit.DRAGON, dragon: 'green' as Tile['dragon'], type: TileType.HONOR }));
    honors.push(mk({ suit: TileSuit.DRAGON, dragon: 'white' as Tile['dragon'], type: TileType.HONOR }));
    expect(isTenpai(honors, [])).toBe(true);
  });

  it('a hopeless hand is not tenpai', () => {
    const junk = [
      suit(TileSuit.DOT, 1), suit(TileSuit.DOT, 4), suit(TileSuit.DOT, 7),
      suit(TileSuit.BAMBOO, 2), suit(TileSuit.BAMBOO, 5), suit(TileSuit.BAMBOO, 8),
      suit(TileSuit.CHARACTER, 3), suit(TileSuit.CHARACTER, 6), suit(TileSuit.CHARACTER, 9),
      suit(TileSuit.DOT, 2), suit(TileSuit.BAMBOO, 3), suit(TileSuit.CHARACTER, 1),
      suit(TileSuit.DOT, 5),
    ];
    expect(isTenpai(junk, [])).toBe(false);
  });
});

describe('claim resolution priority (unified)', () => {
  const indexMap = { p0: 0, p1: 1, p2: 2, p3: 3 };

  it('win beats pung', () => {
    const claims: ClaimRequest[] = [
      { playerId: 'p2', claimType: 'pung', tiles: [] },
      { playerId: 'p3', claimType: 'win', tiles: [] },
    ];
    const winner = resolveClaimRequests(claims, 0, 4, indexMap);
    expect(winner?.playerId).toBe('p3');
  });

  it('tie goes to the claimant closest to the discarder', () => {
    const claims: ClaimRequest[] = [
      { playerId: 'p3', claimType: 'win', tiles: [] },
      { playerId: 'p1', claimType: 'win', tiles: [] },
    ];
    const winner = resolveClaimRequests(claims, 0, 4, indexMap);
    expect(winner?.playerId).toBe('p1');
  });
});
