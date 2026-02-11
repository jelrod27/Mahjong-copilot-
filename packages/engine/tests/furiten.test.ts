import { describe, it, expect } from 'vitest';
import {
  checkStaticFuriten,
  isTileInDiscards,
  wouldCompleteFuriten,
  checkRiichiFuriten,
  isFuritenForRon,
  getWinningTileTypes,
} from '../src/furiten.js';
import type { TileId, DiscardInfo } from '../src/types.js';

// ── Helpers ──

// Build a tenpai hand as TileId[]:
// 1m2m3m 4m5m6m 1p1p1p 7s8s_ pair:East
// Types: 0,1,2, 3,4,5, 9,9,9, 24,25, 27,27 (waiting on 6s=23 or 9s=26)
function makeTenpaiHand(): TileId[] {
  return [
    0, 4, 8,     // 1m, 2m, 3m (copies 0)
    12, 16, 20,  // 4m, 5m, 6m (copies 0)
    36, 37, 38,  // 1p, 1p, 1p (copies 0,1,2)
    96, 100,     // 7s, 8s (copies 0)
    108, 109,    // East, East (copies 0,1)
  ]; // 13 tiles, waiting on 6s (type 23) or 9s (type 26)
}

// Make a simple discard
function makeDiscard(tileId: TileId, turn = 1): DiscardInfo {
  return {
    tile: tileId,
    turnNumber: turn,
    isRiichiDiscard: false,
    isTsumogiri: false,
  };
}

// ── Static Furiten ──

describe('checkStaticFuriten', () => {
  it('detects static furiten when winning tile is in discards', () => {
    const hand = makeTenpaiHand(); // waiting on type 23 (6s) or 26 (9s)
    const discards = [
      makeDiscard(92), // TileId 92 -> type 23 (6s) -- is a wait!
    ];
    expect(checkStaticFuriten(hand, discards)).toBe(true);
  });

  it('detects static furiten with other winning tile in discards', () => {
    const hand = makeTenpaiHand(); // waiting on type 23 or 26
    const discards = [
      makeDiscard(104), // TileId 104 -> type 26 (9s)
    ];
    expect(checkStaticFuriten(hand, discards)).toBe(true);
  });

  it('returns false when no winning tiles in discards', () => {
    const hand = makeTenpaiHand();
    const discards = [
      makeDiscard(44), // TileId 44 -> type 11 (3p), not a wait
      makeDiscard(48), // TileId 48 -> type 12 (4p), not a wait
    ];
    expect(checkStaticFuriten(hand, discards)).toBe(false);
  });

  it('returns false with empty discards', () => {
    const hand = makeTenpaiHand();
    expect(checkStaticFuriten(hand, [])).toBe(false);
  });

  it('returns false for non-tenpai hand', () => {
    // Not tenpai: random 13 tiles
    const hand: TileId[] = [0, 8, 16, 24, 36, 48, 60, 72, 80, 88, 108, 112, 116];
    expect(checkStaticFuriten(hand, [makeDiscard(4)])).toBe(false);
  });
});

// ── isTileInDiscards ──

describe('isTileInDiscards', () => {
  it('finds tile type in discards', () => {
    const discards = [makeDiscard(0), makeDiscard(4)]; // types 0 and 1
    expect(isTileInDiscards(0, discards)).toBe(true);
    expect(isTileInDiscards(1, discards)).toBe(true);
  });

  it('returns false for tile type not in discards', () => {
    const discards = [makeDiscard(0), makeDiscard(4)];
    expect(isTileInDiscards(2, discards)).toBe(false);
  });

  it('handles empty discards', () => {
    expect(isTileInDiscards(0, [])).toBe(false);
  });

  it('matches different copies of same type', () => {
    const discards = [makeDiscard(1)]; // TileId 1 -> type 0
    expect(isTileInDiscards(0, discards)).toBe(true); // type 0
  });
});

// ── wouldCompleteFuriten ──

describe('wouldCompleteFuriten', () => {
  it('returns true when discarded tile completes the hand', () => {
    const hand = makeTenpaiHand(); // waiting on type 23 or 26
    expect(wouldCompleteFuriten(hand, 23)).toBe(true);
    expect(wouldCompleteFuriten(hand, 26)).toBe(true);
  });

  it('returns false when discarded tile does not complete hand', () => {
    const hand = makeTenpaiHand();
    expect(wouldCompleteFuriten(hand, 0)).toBe(false);
    expect(wouldCompleteFuriten(hand, 15)).toBe(false);
  });
});

// ── checkRiichiFuriten ──

describe('checkRiichiFuriten', () => {
  it('returns true when riichi player could win on discarded tile', () => {
    const hand = makeTenpaiHand();
    expect(checkRiichiFuriten(hand, 23)).toBe(true);
  });

  it('returns false when tile does not complete hand', () => {
    const hand = makeTenpaiHand();
    expect(checkRiichiFuriten(hand, 0)).toBe(false);
  });
});

// ── isFuritenForRon (comprehensive) ──

describe('isFuritenForRon', () => {
  it('returns true for static furiten', () => {
    const hand = makeTenpaiHand();
    const discards = [makeDiscard(92)]; // type 23 in discards
    expect(isFuritenForRon(hand, discards, false, false)).toBe(true);
  });

  it('returns true for temporary furiten', () => {
    const hand = makeTenpaiHand();
    expect(isFuritenForRon(hand, [], true, false)).toBe(true);
  });

  it('returns true for riichi furiten', () => {
    const hand = makeTenpaiHand();
    expect(isFuritenForRon(hand, [], false, true)).toBe(true);
  });

  it('returns false when not furiten', () => {
    const hand = makeTenpaiHand();
    const discards = [makeDiscard(44)]; // type 11, not a wait
    expect(isFuritenForRon(hand, discards, false, false)).toBe(false);
  });

  it('returns true when both static and temporary furiten', () => {
    const hand = makeTenpaiHand();
    const discards = [makeDiscard(92)]; // type 23
    expect(isFuritenForRon(hand, discards, true, false)).toBe(true);
  });

  it('returns true when all three furiten types active', () => {
    const hand = makeTenpaiHand();
    const discards = [makeDiscard(92)];
    expect(isFuritenForRon(hand, discards, true, true)).toBe(true);
  });
});

// ── getWinningTileTypes ──

describe('getWinningTileTypes', () => {
  it('returns all winning tile types for tenpai hand', () => {
    const hand = makeTenpaiHand();
    const waits = getWinningTileTypes(hand);
    expect(waits).toContain(23); // 6s
    expect(waits).toContain(26); // 9s
    expect(waits).toHaveLength(2);
  });

  it('returns empty for non-tenpai hand', () => {
    const hand: TileId[] = [0, 8, 16, 24, 36, 48, 60, 72, 80, 88, 108, 112, 116];
    const waits = getWinningTileTypes(hand);
    expect(waits).toHaveLength(0);
  });
});

// ── Integration: Furiten + Tsumo ──

describe('Furiten and Tsumo interaction', () => {
  it('furiten only blocks ron, tsumo is always allowed (conceptual)', () => {
    // This is a design rule test:
    // isFuritenForRon returns true, but the game engine should still allow tsumo.
    // We test that the function correctly identifies the furiten state.
    const hand = makeTenpaiHand();
    const discards = [makeDiscard(92)]; // type 23 in discards

    // Player is in static furiten
    expect(isFuritenForRon(hand, discards, false, false)).toBe(true);

    // The function name itself says "ForRon" - tsumo check is a separate path
    // The winning tile types still exist (player can win by tsumo)
    const waits = getWinningTileTypes(hand);
    expect(waits.length).toBeGreaterThan(0);
  });
});
