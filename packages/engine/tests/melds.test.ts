import { describe, it, expect } from 'vitest';
import {
  canCallChi,
  findValidChi,
  findValidPon,
  findValidOpenKan,
  findClosedKans,
  findAddedKans,
  resolveCallPriority,
  isValidMeld,
  isHandConcealed,
  countMelds,
  type PendingCall,
} from '../src/melds.js';
import type { Meld, PlayerId } from '../src/types.js';

// Helper: TileId = TileType * 4 + copyIndex
// 1m=0-3, 2m=4-7, 3m=8-11, 4m=12-15, 5m=16-19, 6m=20-23, 7m=24-27, 8m=28-31, 9m=32-35
// 1p=36-39, ..., 9p=68-71
// 1s=72-75, ..., 9s=104-107
// East=108-111, South=112-115, West=116-119, North=120-123
// Haku=124-127, Hatsu=128-131, Chun=132-135

describe('canCallChi', () => {
  it('allows chi from player to the left', () => {
    expect(canCallChi(1 as PlayerId, 0 as PlayerId)).toBe(true); // 1 is left of 0
    expect(canCallChi(2 as PlayerId, 1 as PlayerId)).toBe(true);
    expect(canCallChi(3 as PlayerId, 2 as PlayerId)).toBe(true);
    expect(canCallChi(0 as PlayerId, 3 as PlayerId)).toBe(true); // wraps around
  });

  it('disallows chi from other positions', () => {
    expect(canCallChi(2 as PlayerId, 0 as PlayerId)).toBe(false);
    expect(canCallChi(3 as PlayerId, 0 as PlayerId)).toBe(false);
    expect(canCallChi(0 as PlayerId, 1 as PlayerId)).toBe(false);
  });
});

describe('findValidChi', () => {
  it('finds chi when discard is LOW in sequence', () => {
    // Discard: 1m (TileId 0), hand has 2m (TileId 4) and 3m (TileId 8)
    const result = findValidChi(0, [4, 8, 36], 1 as PlayerId, 0 as PlayerId);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('chi');
    expect(result[0]!.tiles).toContain(0);
    expect(result[0]!.tiles).toContain(4);
    expect(result[0]!.tiles).toContain(8);
  });

  it('finds chi when discard is MIDDLE in sequence', () => {
    // Discard: 5m (TileId 16), hand has 4m (TileId 12) and 6m (TileId 20)
    const result = findValidChi(16, [12, 20], 1 as PlayerId, 0 as PlayerId);
    expect(result).toHaveLength(1);
  });

  it('finds chi when discard is HIGH in sequence', () => {
    // Discard: 9m (TileId 32), hand has 7m (TileId 24) and 8m (TileId 28)
    const result = findValidChi(32, [24, 28], 1 as PlayerId, 0 as PlayerId);
    expect(result).toHaveLength(1);
  });

  it('finds multiple chi options', () => {
    // Discard: 5m (TileId 16), hand has 3m, 4m, 6m, 7m
    const result = findValidChi(16, [8, 12, 20, 24], 1 as PlayerId, 0 as PlayerId);
    expect(result).toHaveLength(3); // 3-4-5, 4-5-6, 5-6-7
  });

  it('returns empty for honor tiles', () => {
    // Discard: East (TileId 108)
    const result = findValidChi(108, [112, 116], 1 as PlayerId, 0 as PlayerId);
    expect(result).toHaveLength(0);
  });

  it('returns empty for cross-suit sequences', () => {
    // Discard: 1m (TileId 0), hand has 2p (TileId 40) and 3s (TileId 80)
    const result = findValidChi(0, [40, 80], 1 as PlayerId, 0 as PlayerId);
    expect(result).toHaveLength(0);
  });

  it('returns empty when not to the left', () => {
    const result = findValidChi(0, [4, 8], 2 as PlayerId, 0 as PlayerId);
    expect(result).toHaveLength(0);
  });
});

describe('findValidPon', () => {
  it('finds pon when holding 2 matching tiles', () => {
    // Discard: 5m (TileId 16), hand has 5m copies 1 and 2 (TileId 17, 18)
    const result = findValidPon(16, [17, 18, 36], 2 as PlayerId, 0 as PlayerId);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('pon');
    expect(result!.tiles).toHaveLength(3);
  });

  it('any player can call pon (not just left)', () => {
    const result = findValidPon(16, [17, 18], 3 as PlayerId, 0 as PlayerId);
    expect(result).not.toBeNull();
  });

  it('returns null when only 1 matching tile', () => {
    const result = findValidPon(16, [17, 36], 2 as PlayerId, 0 as PlayerId);
    expect(result).toBeNull();
  });

  it('returns null when calling on own discard', () => {
    const result = findValidPon(16, [17, 18], 0 as PlayerId, 0 as PlayerId);
    expect(result).toBeNull();
  });
});

describe('findValidOpenKan', () => {
  it('finds open kan when holding 3 matching tiles', () => {
    const result = findValidOpenKan(16, [17, 18, 19], 2 as PlayerId, 0 as PlayerId);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('kan');
    expect(result!.tiles).toHaveLength(4);
  });

  it('returns null when only 2 matching tiles', () => {
    const result = findValidOpenKan(16, [17, 18], 2 as PlayerId, 0 as PlayerId);
    expect(result).toBeNull();
  });
});

describe('findClosedKans', () => {
  it('finds groups of 4 identical tiles', () => {
    // Hand has all 4 copies of 1m (0,1,2,3) + other tiles
    const result = findClosedKans([0, 1, 2, 3, 36, 40]);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('closedKan');
    expect(result[0]!.tiles).toHaveLength(4);
  });

  it('finds multiple closed kans', () => {
    const result = findClosedKans([0, 1, 2, 3, 108, 109, 110, 111]);
    expect(result).toHaveLength(2);
  });

  it('returns empty when no group of 4', () => {
    const result = findClosedKans([0, 1, 2, 36, 37, 38]);
    expect(result).toHaveLength(0);
  });
});

describe('findAddedKans', () => {
  it('finds added kan when drawn tile matches open pon', () => {
    const openMelds: Meld[] = [
      { type: 'pon', tiles: [16, 17, 18], calledFrom: 0 as PlayerId, calledTile: 16 },
    ];
    const result = findAddedKans(19, openMelds); // 5m copy 3
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('addedKan');
    expect(result[0]!.tiles).toHaveLength(4);
  });

  it('returns empty when drawn tile does not match any pon', () => {
    const openMelds: Meld[] = [
      { type: 'pon', tiles: [16, 17, 18], calledFrom: 0 as PlayerId, calledTile: 16 },
    ];
    const result = findAddedKans(0, openMelds); // 1m, not 5m
    expect(result).toHaveLength(0);
  });

  it('does not match chi melds', () => {
    const openMelds: Meld[] = [
      { type: 'chi', tiles: [0, 4, 8], calledFrom: 0 as PlayerId, calledTile: 0 },
    ];
    const result = findAddedKans(1, openMelds);
    expect(result).toHaveLength(0);
  });
});

describe('resolveCallPriority', () => {
  it('ron beats pon', () => {
    const calls: PendingCall[] = [
      { playerId: 1 as PlayerId, callType: 'pon' },
      { playerId: 2 as PlayerId, callType: 'ron' },
    ];
    const result = resolveCallPriority(calls, 0 as PlayerId);
    expect(result).toHaveLength(1);
    expect(result[0]!.callType).toBe('ron');
  });

  it('pon beats chi', () => {
    const calls: PendingCall[] = [
      { playerId: 1 as PlayerId, callType: 'chi' },
      { playerId: 2 as PlayerId, callType: 'pon' },
    ];
    const result = resolveCallPriority(calls, 0 as PlayerId);
    expect(result).toHaveLength(1);
    expect(result[0]!.callType).toBe('pon');
  });

  it('multiple ron returns all ron callers', () => {
    const calls: PendingCall[] = [
      { playerId: 1 as PlayerId, callType: 'ron' },
      { playerId: 2 as PlayerId, callType: 'ron' },
    ];
    const result = resolveCallPriority(calls, 0 as PlayerId);
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.callType === 'ron')).toBe(true);
  });

  it('among same priority, closest to discarder wins', () => {
    const calls: PendingCall[] = [
      { playerId: 3 as PlayerId, callType: 'pon' },
      { playerId: 1 as PlayerId, callType: 'pon' },
    ];
    const result = resolveCallPriority(calls, 0 as PlayerId);
    expect(result).toHaveLength(1);
    expect(result[0]!.playerId).toBe(1); // seat 1 is closer to seat 0
  });

  it('all passes returns empty', () => {
    const calls: PendingCall[] = [
      { playerId: 1 as PlayerId, callType: 'pass' },
      { playerId: 2 as PlayerId, callType: 'pass' },
    ];
    const result = resolveCallPriority(calls, 0 as PlayerId);
    expect(result).toHaveLength(0);
  });
});

describe('isValidMeld', () => {
  it('validates correct chi', () => {
    expect(isValidMeld({ type: 'chi', tiles: [0, 4, 8] })).toBe(true); // 1m-2m-3m
  });

  it('rejects cross-suit chi', () => {
    expect(isValidMeld({ type: 'chi', tiles: [0, 4, 72] })).toBe(false); // 1m-2m-1s
  });

  it('rejects non-consecutive chi', () => {
    expect(isValidMeld({ type: 'chi', tiles: [0, 4, 12] })).toBe(false); // 1m-2m-4m
  });

  it('validates correct pon', () => {
    expect(isValidMeld({ type: 'pon', tiles: [0, 1, 2] })).toBe(true); // 1m x3
  });

  it('rejects mismatched pon', () => {
    expect(isValidMeld({ type: 'pon', tiles: [0, 1, 4] })).toBe(false); // 1m, 1m, 2m
  });

  it('validates correct kan', () => {
    expect(isValidMeld({ type: 'kan', tiles: [0, 1, 2, 3] })).toBe(true); // 1m x4
  });

  it('validates closed kan', () => {
    expect(isValidMeld({ type: 'closedKan', tiles: [108, 109, 110, 111] })).toBe(true);
  });
});

describe('isHandConcealed', () => {
  it('returns true with no open melds', () => {
    expect(isHandConcealed([], [])).toBe(true);
  });

  it('returns true with only closed kans', () => {
    const closedKans: Meld[] = [{ type: 'closedKan', tiles: [0, 1, 2, 3] }];
    expect(isHandConcealed([], closedKans)).toBe(true);
  });

  it('returns false with open melds', () => {
    const openMelds: Meld[] = [{ type: 'pon', tiles: [0, 1, 2] }];
    expect(isHandConcealed(openMelds, [])).toBe(false);
  });
});

describe('countMelds', () => {
  it('counts open melds + closed kans', () => {
    const open: Meld[] = [{ type: 'pon', tiles: [0, 1, 2] }];
    const closed: Meld[] = [{ type: 'closedKan', tiles: [108, 109, 110, 111] }];
    expect(countMelds(open, closed)).toBe(2);
  });
});
