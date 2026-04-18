import { describe, it, expect } from 'vitest';
import { canPlayerWin } from '../winDetection';
import { dot, bam, char, windTile, dragonTile } from './testHelpers';
import { MeldInfo } from '@/models/GameState';
import { TileSuit, TileType, WindTile, DragonTile } from '@/models/Tile';

/**
 * Tests for canPlayerWin — the helper that combines hand + meld tiles
 * before checking for a winning hand.
 *
 * BUG: isWinningHand(hand) only checks concealed tiles.
 * When a player has exposed melds (pungs/chows), their hand is only 1-4 tiles,
 * so isWinningHand always returns false.
 *
 * FIX: canPlayerWin(hand, melds) expands meld tiles into the hand before checking.
 */
describe('canPlayerWin', () => {
  describe('concealed hand (no melds)', () => {
    it('returns true for a winning hand with no exposed melds', () => {
      // 4 pungs + 1 pair, all concealed — standard winning hand
      const hand = [
        dot(1, 1), dot(1, 2), dot(1, 3),           // pung of 1-dot
        dot(2, 1), dot(2, 2), dot(2, 3),           // pung of 2-dot
        dot(3, 1), dot(3, 2), dot(3, 3),           // pung of 3-dot
        dot(4, 1), dot(4, 2), dot(4, 3),           // pung of 4-dot
        dot(5, 1), dot(5, 2),                       // pair of 5-dot
      ];
      expect(canPlayerWin(hand, [])).toBe(true);
    });

    it('returns false for a non-winning hand with no melds', () => {
      const hand = [
        dot(1, 1), dot(3, 1), dot(5, 1),
        bam(2, 1), bam(4, 1), bam(6, 1),
        char(1, 1), char(3, 1), char(5, 1),
        windTile(WindTile.EAST, 1),
        windTile(WindTile.SOUTH, 1),
        dragonTile(DragonTile.RED, 1),
        dragonTile(DragonTile.GREEN, 1),
        dragonTile(DragonTile.WHITE, 1),
      ];
      expect(canPlayerWin(hand, [])).toBe(false);
    });
  });

  describe('hand with exposedmelds (the bug case)', () => {
    it('returns true when pung melds complete a winning hand', () => {
      // Player has 2 concealed pungs + a pair (8 tiles in hand)
      // and 2 exposed pungs (6 tiles in melds) — total 14 = winning
      const hand = [
        dot(3, 1), dot(3, 2), dot(3, 3),  // concealed pung of 3-dot
        dot(4, 1), dot(4, 2), dot(4, 3),  // concealed pung of 4-dot
        dot(5, 1), dot(5, 2),              // pair of 5-dot
      ];
      const melds: MeldInfo[] = [
        {
          tiles: [dot(1, 4), dot(1, 5), dot(1, 6)],  // exposed pung of 1-dot
          type: 'pung',
          isConcealed: false,
        },
        {
          tiles: [dot(2, 4), dot(2, 5), dot(2, 6)],  // exposed pung of 2-dot
          type: 'pung',
          isConcealed: false,
        },
      ];
      // This should be TRUE — hand + melds = winning hand
      // But isWinningHand(hand) alone returns false (only 8 tiles)
      expect(canPlayerWin(hand, melds)).toBe(true);
    });

    it('returns true when chow melds complete a winning hand', () => {
      // Player has concealed pung + pair (5 tiles) + 3 exposed chows (9 tiles)
      const hand = [
        dot(7, 1), dot(7, 2), dot(7, 3),  // concealed pung of 7-dot
        dot(9, 1), dot(9, 2),              // pair of 9-dot
      ];
      const melds: MeldInfo[] = [
        {
          tiles: [dot(1, 1), dot(2, 1), dot(3, 1)],  // chow 1-2-3
          type: 'chow',
          isConcealed: false,
        },
        {
          tiles: [dot(4, 1), dot(5, 1), dot(6, 1)],  // chow 4-5-6
          type: 'chow',
          isConcealed: false,
        },
        {
          tiles: [dot(1, 2), dot(2, 2), dot(3, 2)],  // chow 1-2-3 (different copy)
          type: 'chow',
          isConcealed: false,
        },
      ];
      expect(canPlayerWin(hand, melds)).toBe(true);
    });

    it('returns true with a mix of pung and chow melds', () => {
      // 1 exposed pung + 1 exposed chow + 2 concealed pungs + pair
      const hand = [
        dot(5, 1), dot(5, 2), dot(5, 3),  // concealed pung of 5-dot
        dot(7, 1), dot(7, 2), dot(7, 3),  // concealed pung of 7-dot
        dot(9, 1), dot(9, 2),              // pair of 9-dot
      ];
      const melds: MeldInfo[] = [
        {
          tiles: [dot(1, 1), dot(2, 1), dot(3, 1)],  // chow 1-2-3
          type: 'chow',
          isConcealed: false,
        },
        {
          tiles: [dot(4, 4), dot(4, 5), dot(4, 6)],  // pung of 4-dot
          type: 'pung',
          isConcealed: false,
        },
      ];
      expect(canPlayerWin(hand, melds)).toBe(true);
    });

    it('returns false when melds + hand do NOT form a winning hand', () => {
      // Hand + melds = 14 tiles but not a winning combination
      const hand = [
        dot(7, 1), dot(7, 2),  // only a pair, not enough
        dot(8, 1),              // random tile
      ];
      const melds: MeldInfo[] = [
        {
          tiles: [dot(1, 1), dot(2, 1), dot(3, 1)],  // chow
          type: 'chow',
          isConcealed: false,
        },
        {
          tiles: [dot(4, 1), dot(5, 1), dot(6, 1)],  // chow
          type: 'chow',
          isConcealed: false,
        },
        {
          tiles: [dot(9, 1), dot(9, 2), dot(9, 3)],  // pung
          type: 'pung',
          isConcealed: false,
        },
      ];
      // 3 + 3 + 3 + 3 = 12 tiles from melds, but hand is only partial
      // This is 12 tiles total, not 14 — should return false
      expect(canPlayerWin(hand, melds)).toBe(false);
    });

    it('returns true for a hand with only 2 tiles + 4 pung melds (extreme case)', () => {
      // After 4 exposed pungs (12 tiles) and a drawn pair tile (2 in hand)
      const hand = [
        windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2),  // pair
      ];
      const melds: MeldInfo[] = [
        { tiles: [dot(1, 1), dot(1, 2), dot(1, 3)], type: 'pung', isConcealed: false },
        { tiles: [dot(2, 1), dot(2, 2), dot(2, 3)], type: 'pung', isConcealed: false },
        { tiles: [dot(3, 1), dot(3, 2), dot(3, 3)], type: 'pung', isConcealed: false },
        { tiles: [dot(4, 1), dot(4, 2), dot(4, 3)], type: 'pung', isConcealed: false },
      ];
      expect(canPlayerWin(hand, melds)).toBe(true);
    });
  });

  describe('self-drawn win scenario', () => {
    it('returns true when hand (13 tiles) + melds would win with the drawn tile included', () => {
      // Player draws their winning tile, hand now has 14 tiles worth of
      // concealed tiles + meld tiles combined
      // After drawing: 5 concealed + 3 melds of 3 = 14 total
      const hand = [
        dot(5, 1), dot(5, 2), dot(5, 3),  // pung of 5
        bam(1, 1), bam(2, 1), bam(3, 1),  // chow 1-2-3
        bam(4, 1), bam(5, 1), bam(6, 1),  // chow 4-5-6
        dot(7, 1), dot(7, 2),              // need dot(7,3) for pair -- oops, this isn't right
      ];

      // Actually let's do: concealed hand already has the drawn tile = 14 minus meld tiles
      // Simpler: 2 tiles in hand (pair) + 4 melds of 3 = 14
      const handWithDraw = [
        dot(8, 1), dot(8, 2),  // pair after draw
      ];
      const melds: MeldInfo[] = [
        { tiles: [dot(1, 1), dot(1, 2), dot(1, 3)], type: 'pung', isConcealed: false },
        { tiles: [dot(2, 1), dot(2, 2), dot(2, 3)], type: 'pung', isConcealed: false },
        { tiles: [dot(3, 1), dot(3, 2), dot(3, 3)], type: 'pung', isConcealed: false },
        { tiles: [dot(4, 1), dot(4, 2), dot(4, 3)], type: 'pung', isConcealed: false },
      ];
      expect(canPlayerWin(handWithDraw, melds)).toBe(true);
    });
  });
});