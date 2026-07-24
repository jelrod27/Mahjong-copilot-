import { describe, it, expect } from 'vitest';
import {
  computeShantenHeat,
  shantenToHeatColor,
  computeHeatOverlays,
  shantenToHeatMeaning,
} from '../shantenHeat';
import { dot, windTile, buildAllPungsHand } from './testHelpers';
import { MeldInfo } from '@/models/GameState';
import { type Tile, WindTile } from '@/models/Tile';

/** 14-tile hand with varying discard quality (not winning). */
function buildOneAwayHand(): Tile[] {
  return [
    dot(1, 1), dot(1, 2), dot(1, 3),
    dot(2, 1), dot(2, 2), dot(2, 3),
    dot(3, 1), dot(4, 1), dot(5, 1),
    dot(7, 1),
    dot(8, 1),
    dot(9, 1),
    windTile(WindTile.EAST, 1), windTile(WindTile.EAST, 2),
  ];
}

describe('computeShantenHeat', () => {
  it('returns entries for all non-bonus tiles in a 14-tile hand', () => {
    const hand = buildAllPungsHand();
    const result = computeShantenHeat(hand, []);
    expect(result.entries.length).toBe(14);
  });

  it('returns empty entries for a hand that is not 14 tiles', () => {
    const hand = buildAllPungsHand().slice(0, 10);
    const result = computeShantenHeat(hand, []);
    expect(result.entries).toEqual([]);
  });

  it('bestShanten is 0 when discarding from a winning hand', () => {
    const hand = buildAllPungsHand();
    const result = computeShantenHeat(hand, []);
    expect(result.bestShanten).toBe(0);
  });

  it('computes varying discard quality for a 14-tile hand', () => {
    const hand = buildOneAwayHand();
    expect(hand.length).toBe(14);
    const result = computeShantenHeat(hand, []);
    expect(result.entries.length).toBe(14);
    expect(result.worstShanten).toBeGreaterThanOrEqual(result.bestShanten);
    expect(result.worstShanten).toBeGreaterThan(result.bestShanten);
  });

  it('handles hands with melds', () => {
    const meld: MeldInfo = {
      tiles: [dot(1, 1), dot(1, 2), dot(1, 3)],
      type: 'pung',
      isConcealed: false,
      fromPlayerId: 'ai-1',
    };
    const hand = [
      dot(2, 1), dot(2, 2), dot(2, 3),
      dot(3, 1), dot(3, 2), dot(3, 3),
      dot(4, 1), dot(5, 1), dot(6, 1),
      dot(7, 1), windTile(WindTile.EAST, 1),
    ];
    const result = computeShantenHeat(hand, [meld]);
    expect(result.entries.length).toBe(11);
  });

  it('handles exposed kongs by treating melds as three-tile sets', () => {
    const meld: MeldInfo = {
      tiles: [dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4)],
      type: 'kong',
      isConcealed: false,
      fromPlayerId: 'ai-1',
    };
    const hand = [
      dot(2, 1), dot(2, 2), dot(2, 3),
      dot(3, 1), dot(3, 2), dot(3, 3),
      dot(4, 1), dot(5, 1), dot(6, 1),
      dot(7, 1), windTile(WindTile.EAST, 1),
    ];
    const result = computeShantenHeat(hand, [meld]);
    expect(result.entries.length).toBe(11);
    expect(result.bestShanten).toBeGreaterThanOrEqual(0);
  });
});

describe('shantenToHeatColor', () => {
  it('returns gray when all tiles have the same shanten', () => {
    expect(shantenToHeatColor(2, 2, 2)).toBe('#808080');
  });

  it('returns blue for tenpai shanten', () => {
    expect(shantenToHeatColor(0, 0, 4)).toContain('240');
  });

  it('does not return blue when best discard is shanten 2', () => {
    const color = shantenToHeatColor(2, 2, 4);
    expect(color).not.toContain('240');
  });

  it('returns red for far shanten', () => {
    expect(shantenToHeatColor(4, 0, 4)).toContain('0');
  });
});

describe('shantenToHeatMeaning', () => {
  it('classifies shanten values', () => {
    expect(shantenToHeatMeaning(0)).toBe('tenpai');
    expect(shantenToHeatMeaning(1)).toBe('close');
    expect(shantenToHeatMeaning(3)).toBe('far');
  });
});

describe('computeHeatOverlays', () => {
  it('returns overlays with semantic labels for each tile', () => {
    const hand = buildOneAwayHand();
    const overlays = computeHeatOverlays(hand, []);
    expect(overlays.size).toBe(14);
    for (const overlay of overlays.values()) {
      expect(overlay.color.startsWith('hsl(') || overlay.color.startsWith('#')).toBe(true);
      expect(overlay.ariaLabel).toContain('Shanten heat');
    }
  });

  it('returns empty map for invalid hand size', () => {
    expect(computeHeatOverlays([dot(1, 1)], []).size).toBe(0);
  });
});
