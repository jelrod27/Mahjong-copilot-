import { describe, it, expect } from 'vitest';
import { isSameTile, isPung, isChow, isKong, isPair, getAvailableClaims, resolveClaims } from '../claiming';
import { dot, bam, char, windTile, dragonTile, makePlayer, buildAllPungsHand } from './testHelpers';
import { WindTile, DragonTile } from '@/models/Tile';

describe('isSameTile', () => {
  it('returns true for same type different copies', () => {
    expect(isSameTile(dot(5, 1), dot(5, 2))).toBe(true);
  });

  it('returns false for different tiles', () => {
    expect(isSameTile(dot(5, 1), dot(6, 1))).toBe(false);
  });
});

describe('isPung', () => {
  it('returns true for 3 identical tiles', () => {
    expect(isPung([dot(1, 1), dot(1, 2), dot(1, 3)])).toBe(true);
  });

  it('returns false for 3 non-identical tiles', () => {
    expect(isPung([dot(1, 1), dot(1, 2), dot(2, 1)])).toBe(false);
  });

  it('returns false for wrong count', () => {
    expect(isPung([dot(1, 1), dot(1, 2)])).toBe(false);
    expect(isPung([dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4)])).toBe(false);
  });
});

describe('isChow', () => {
  it('returns true for 3 consecutive same-suit tiles', () => {
    expect(isChow([dot(1, 1), dot(2, 1), dot(3, 1)])).toBe(true);
  });

  it('returns true regardless of order', () => {
    expect(isChow([dot(3, 1), dot(1, 1), dot(2, 1)])).toBe(true);
  });

  it('returns false for non-consecutive tiles', () => {
    expect(isChow([dot(1, 1), dot(2, 1), dot(4, 1)])).toBe(false);
  });

  it('returns false for mixed suits', () => {
    expect(isChow([dot(1, 1), bam(2, 1), dot(3, 1)])).toBe(false);
  });

  it('returns false for honor tiles', () => {
    expect(isChow([
      windTile(WindTile.EAST, 1),
      windTile(WindTile.SOUTH, 1),
      windTile(WindTile.WEST, 1),
    ])).toBe(false);
  });
});

describe('isKong', () => {
  it('returns true for 4 identical tiles', () => {
    expect(isKong([dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4)])).toBe(true);
  });

  it('returns false for 3 tiles', () => {
    expect(isKong([dot(1, 1), dot(1, 2), dot(1, 3)])).toBe(false);
  });
});

describe('isPair', () => {
  it('returns true for 2 identical tiles', () => {
    expect(isPair([dot(1, 1), dot(1, 2)])).toBe(true);
  });

  it('returns false for 2 different tiles', () => {
    expect(isPair([dot(1, 1), dot(2, 1)])).toBe(false);
  });
});

describe('getAvailableClaims', () => {
  it('returns pung claim when player has 2 matching tiles', () => {
    const player = makePlayer({ hand: [dot(5, 1), dot(5, 2), bam(1, 1)] });
    const claims = getAvailableClaims(dot(5, 3), player, 2, 0, 4);
    expect(claims.some(c => c.claimType === 'pung')).toBe(true);
  });

  it('returns both pung and kong when player has 3 matching tiles', () => {
    const player = makePlayer({ hand: [dot(5, 1), dot(5, 2), dot(5, 3), bam(1, 1)] });
    const claims = getAvailableClaims(dot(5, 4), player, 2, 0, 4);
    expect(claims.some(c => c.claimType === 'kong')).toBe(true);
    expect(claims.some(c => c.claimType === 'pung')).toBe(true);
  });

  it('returns chow claim only for player to the right of discarder', () => {
    const player = makePlayer({ hand: [dot(4, 1), dot(6, 1), bam(1, 1)] });
    // Player at index 1, discarder at index 0 → left player = (0+1)%4 = 1 ✓
    const claims = getAvailableClaims(dot(5, 1), player, 1, 0, 4);
    expect(claims.some(c => c.claimType === 'chow')).toBe(true);
  });

  it('does not return chow for non-adjacent player', () => {
    const player = makePlayer({ hand: [dot(4, 1), dot(6, 1), bam(1, 1)] });
    // Player at index 2, discarder at index 0 → left player would be 1, not 2
    const claims = getAvailableClaims(dot(5, 1), player, 2, 0, 4);
    expect(claims.some(c => c.claimType === 'chow')).toBe(false);
  });

  it('returns win claim when hand + discard forms winning hand', () => {
    // 13-tile hand that needs one more tile to win (remove last pair tile)
    const fullHand = buildAllPungsHand();
    const hand = fullHand.slice(0, 13); // 4 pungs (12) + first of pair (1) = 13
    const missingTile = dot(5, 4); // the tile that completes the pair
    const player = makePlayer({ hand });
    const claims = getAvailableClaims(missingTile, player, 2, 0, 4);
    expect(claims.some(c => c.claimType === 'win')).toBe(true);
  });
});

describe('resolveClaims', () => {
  const playerIndexMap: Record<string, number> = { p1: 1, p2: 2, p3: 3 };

  it('win beats pung', () => {
    const claims = [
      { playerId: 'p1', claimType: 'pung' as const, tilesFromHand: [], priority: 2 },
      { playerId: 'p2', claimType: 'win' as const, tilesFromHand: [], priority: 4 },
    ];
    const result = resolveClaims(claims, 0, 4, playerIndexMap);
    expect(result?.claimType).toBe('win');
  });

  it('pung beats chow', () => {
    const claims = [
      { playerId: 'p1', claimType: 'chow' as const, tilesFromHand: [], priority: 1 },
      { playerId: 'p2', claimType: 'pung' as const, tilesFromHand: [], priority: 2 },
    ];
    const result = resolveClaims(claims, 0, 4, playerIndexMap);
    expect(result?.claimType).toBe('pung');
  });

  it('on same priority, closer to discarder wins', () => {
    const claims = [
      { playerId: 'p3', claimType: 'pung' as const, tilesFromHand: [], priority: 2 },
      { playerId: 'p1', claimType: 'pung' as const, tilesFromHand: [], priority: 2 },
    ];
    const result = resolveClaims(claims, 0, 4, playerIndexMap);
    expect(result?.playerId).toBe('p1'); // closer to discarder (index 0)
  });

  it('returns null for empty claims', () => {
    expect(resolveClaims([], 0, 4, playerIndexMap)).toBeNull();
  });
});
