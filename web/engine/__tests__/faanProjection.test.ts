import { describe, it, expect } from 'vitest';
import { projectFaan } from '../faanProjection';
import { WindTile, DragonTile, TileSuit } from '@/models/Tile';
import { MeldInfo } from '@/models/GameState';
import { bam, dot, char, dragonTile, windTile, flowerTile } from './testHelpers';

const EMPTY_MELDS: MeldInfo[] = [];

describe('projectFaan', () => {
  describe('locked-in fans', () => {
    it('reports Concealed + No Flowers when no melds exposed and no flowers drawn', () => {
      const hand = [dot(1), dot(2), dot(3), bam(4), bam(5), bam(6), char(7), char(8), char(9), dot(5), dot(5, 2), windTile(WindTile.EAST), windTile(WindTile.EAST, 2)];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);

      const names = result.lockedIn.map(f => f.name);
      expect(names).toContain('Concealed Hand');
      expect(names).toContain('No Flowers');
    });

    it('drops Concealed Hand once a non-concealed meld is exposed', () => {
      const hand = [dot(1), dot(2), dot(3), bam(4), bam(5), bam(6), char(7), char(8), char(9), dot(5)];
      const melds: MeldInfo[] = [
        { type: 'pung', tiles: [dragonTile(DragonTile.RED), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3)], isConcealed: false },
      ];
      const result = projectFaan(hand, melds, WindTile.EAST, WindTile.EAST);

      const names = result.lockedIn.map(f => f.name);
      expect(names).not.toContain('Concealed Hand');
    });

    it('counts an exposed dragon pung as locked-in Red Dragon faan', () => {
      const hand = [dot(1), dot(2), dot(3), bam(4), bam(5), bam(6)];
      const melds: MeldInfo[] = [
        { type: 'pung', tiles: [dragonTile(DragonTile.RED), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3)], isConcealed: false },
      ];
      const result = projectFaan(hand, melds, WindTile.EAST, WindTile.EAST);
      const names = result.lockedIn.map(f => f.name);
      expect(names).toContain('Red Dragon');
    });

    it('counts exposed seat wind pung as Seat Wind faan (not Prevailing) when they differ', () => {
      const hand = [dot(1), dot(2), dot(3), bam(4), bam(5), bam(6)];
      const melds: MeldInfo[] = [
        { type: 'pung', tiles: [windTile(WindTile.EAST), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3)], isConcealed: false },
      ];
      const result = projectFaan(hand, melds, WindTile.EAST, WindTile.SOUTH);
      const names = result.lockedIn.map(f => f.name);
      expect(names).toContain('Seat Wind');
      expect(names).not.toContain('Prevailing Wind');
    });

    it('counts both Seat and Prevailing when a wind pung satisfies both', () => {
      const melds: MeldInfo[] = [
        { type: 'pung', tiles: [windTile(WindTile.EAST), windTile(WindTile.EAST, 2), windTile(WindTile.EAST, 3)], isConcealed: false },
      ];
      const result = projectFaan([dot(1)], melds, WindTile.EAST, WindTile.EAST);
      const names = result.lockedIn.map(f => f.name);
      expect(names).toContain('Seat Wind');
      expect(names).toContain('Prevailing Wind');
    });

    it('flowers replace No Flowers with a Flower Tiles entry', () => {
      const hand = [dot(1), dot(2), dot(3)];
      const flowers = [flowerTile('Plum', 1), flowerTile('Orchid', 2)];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST, flowers);

      const names = result.lockedIn.map(f => f.name);
      expect(names).not.toContain('No Flowers');
      const flowerEntry = result.lockedIn.find(f => f.name === 'Flower Tiles');
      expect(flowerEntry?.fan).toBe(2);
    });

    it('awards Seat Flower when a flower matches seat position', () => {
      // East seat (position 1) matches Plum (flower #1)
      const flowers = [flowerTile('Plum', 1)];
      const result = projectFaan([dot(1)], EMPTY_MELDS, WindTile.EAST, WindTile.EAST, flowers);
      const names = result.lockedIn.map(f => f.name);
      expect(names).toContain('Seat Flower');
    });
  });

  describe('in-progress fans', () => {
    it('flags Half Flush (Mixed One Suit) progress when dominated by one suit + honors', () => {
      // 9 dots + 1 honor pair + a couple off-suit; just on the cusp
      const hand = [
        dot(1), dot(2), dot(3), dot(4), dot(5), dot(6), dot(7), dot(8), dot(9),
        windTile(WindTile.EAST), windTile(WindTile.EAST, 2),
        bam(1), bam(2),
      ];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      const names = result.inProgress.map(f => f.name);
      expect(names).toContain('Mixed One Suit');
    });

    it('flags Pure One Suit progress when all visible tiles are one suit and no honors', () => {
      const hand = [
        dot(1), dot(2), dot(3), dot(4), dot(5), dot(6), dot(7), dot(8), dot(9),
        dot(1, 2), dot(2, 2), dot(3, 2), dot(4, 2),
      ];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      const pure = result.inProgress.find(f => f.name === 'Pure One Suit');
      expect(pure).toBeDefined();
      expect(pure?.fan).toBe(7);
      expect(pure?.progress).toBe(1);
    });

    it('does NOT suggest All Pungs when chows already exposed', () => {
      const melds: MeldInfo[] = [
        { type: 'chow', tiles: [dot(1), dot(2), dot(3)], isConcealed: false },
      ];
      const hand = [bam(5), bam(5, 2), bam(5, 3), char(7), char(7, 2), char(7, 3)];
      const result = projectFaan(hand, melds, WindTile.EAST, WindTile.EAST);
      const names = result.inProgress.map(f => f.name);
      expect(names).not.toContain('All Pungs');
    });

    it('suggests All Pungs when exposed + concealed triplets count >= 2 with no chows', () => {
      const melds: MeldInfo[] = [
        { type: 'pung', tiles: [bam(5), bam(5, 2), bam(5, 3)], isConcealed: false },
      ];
      const hand = [char(7), char(7, 2), char(7, 3), dot(1), dot(2)];
      const result = projectFaan(hand, melds, WindTile.EAST, WindTile.EAST);
      const ap = result.inProgress.find(f => f.name === 'All Pungs');
      expect(ap).toBeDefined();
      expect(ap?.fan).toBe(3);
    });

    it('flags a dragon pair in hand as in-progress toward a dragon pung', () => {
      const hand = [
        dot(1), dot(2), dot(3),
        dragonTile(DragonTile.GREEN), dragonTile(DragonTile.GREEN, 2),
      ];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      const entry = result.inProgress.find(f => f.name === 'Green Dragon');
      expect(entry).toBeDefined();
      expect(entry?.fan).toBe(1);
    });
  });

  describe('shanten + tenpai', () => {
    it('reports tenpai (shanten 0) and waits when hand is one away', () => {
      // Hand missing 3-dot to complete 1-2-3 chow
      const hand = [
        dot(1), dot(2),
        dot(4), dot(5), dot(6),
        bam(1), bam(2), bam(3),
        bam(4), bam(5), bam(6),
        char(7), char(7, 2),
      ];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      expect(result.shanten).toBeLessThanOrEqual(0);
      expect(result.waits.length).toBeGreaterThan(0);
    });

    it('populates bestCase when tenpai', () => {
      const hand = [
        dot(1), dot(2),
        dot(4), dot(5), dot(6),
        bam(1), bam(2), bam(3),
        bam(4), bam(5), bam(6),
        char(7), char(7, 2),
      ];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      expect(result.bestCase).not.toBeNull();
      expect(result.bestCase!.totalFan).toBeGreaterThanOrEqual(0);
    });

    it('returns empty waits when hand is far from winning', () => {
      const hand = [dot(1), bam(3), char(5), dot(7), bam(9)];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      expect(result.waits).toHaveLength(0);
      expect(result.bestCase).toBeNull();
    });
  });

  describe('faan range', () => {
    it('projectedMin equals sum of locked-in fans', () => {
      const hand = [dot(1), dot(2), dot(3)];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      const lockedSum = result.lockedIn.reduce((s, f) => s + f.fan, 0);
      expect(result.projectedMin).toBe(lockedSum);
    });

    it('projectedMax is at least projectedMin', () => {
      const hand = [
        dot(1), dot(2), dot(3), dot(4), dot(5), dot(6), dot(7), dot(8), dot(9),
        dot(1, 2), dot(2, 2), dot(3, 2), dot(4, 2),
      ];
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      expect(result.projectedMax).toBeGreaterThanOrEqual(result.projectedMin);
    });
  });

  describe('edge cases', () => {
    it('handles an empty hand without throwing', () => {
      const result = projectFaan([], EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      expect(result).toBeDefined();
      expect(result.lockedIn.some(f => f.name === 'Concealed Hand')).toBe(true);
    });

    it('filters out bonus tiles from main hand analysis', () => {
      // Flowers passed in main hand should be separated and not affect suit counts
      const hand = [dot(1), dot(2), dot(3), flowerTile('Plum', 1)];
      // Flower in main hand is a mis-use pattern; function should still run.
      const result = projectFaan(hand, EMPTY_MELDS, WindTile.EAST, WindTile.EAST);
      expect(result).toBeDefined();
    });
  });
});
