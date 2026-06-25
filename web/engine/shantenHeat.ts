/**
 * Shanten Heat: per-discard shanten overlay for intermediate players.
 *
 * For each discard candidate, simulates removing that tile and computes the
 * resulting shanten on the remaining 13 tiles (including exposed melds).
 * The UI maps absolute shanten values to a color scale.
 */

import { Tile, TileType } from '@/models/Tile';
import { MeldInfo } from '@/models/GameState';
import { calculateShanten } from './winDetection';

export interface ShantenHeatEntry {
  tileId: string;
  shantenAfterDiscard: number;
}

export interface ShantenHeatResult {
  entries: ShantenHeatEntry[];
  currentShanten: number;
  bestShanten: number;
  worstShanten: number;
}

export type HeatMeaning = 'tenpai' | 'close' | 'far' | 'same';

export interface TileHeatOverlay {
  color: string;
  meaning: HeatMeaning;
  ariaLabel: string;
}

/** Completed melds count as three tiles for shanten projection, even kongs. */
function meldTilesForShanten(melds: MeldInfo[]): Tile[] {
  return melds.flatMap(m => m.tiles.slice(0, 3));
}

/**
 * Compute the shanten number that results from discarding each non-bonus tile
 * in the player's concealed hand during the 14-tile discard phase.
 */
export function computeShantenHeat(
  hand: Tile[],
  melds: MeldInfo[],
): ShantenHeatResult {
  const concealed = hand.filter(t => t.type !== TileType.BONUS);

  if (concealed.length + melds.length * 3 !== 14) {
    return { entries: [], currentShanten: -1, bestShanten: -1, worstShanten: -1 };
  }

  const meldTiles = meldTilesForShanten(melds);
  const entries: ShantenHeatEntry[] = [];

  for (let i = 0; i < concealed.length; i++) {
    const remaining = [...concealed.slice(0, i), ...concealed.slice(i + 1)];
    const thirteenTiles = [...remaining, ...meldTiles];
    if (thirteenTiles.length !== 13) continue;

    entries.push({
      tileId: concealed[i].id,
      shantenAfterDiscard: calculateShanten(thirteenTiles),
    });
  }

  if (entries.length === 0) {
    return { entries: [], currentShanten: -1, bestShanten: -1, worstShanten: -1 };
  }

  const shantenValues = entries.map(e => e.shantenAfterDiscard);
  const bestShanten = Math.min(...shantenValues);
  const worstShanten = Math.max(...shantenValues);

  return {
    entries,
    currentShanten: bestShanten,
    bestShanten,
    worstShanten,
  };
}

export function shantenToHeatMeaning(shanten: number): HeatMeaning {
  if (shanten <= 0) return 'tenpai';
  if (shanten <= 2) return 'close';
  return 'far';
}

export function heatMeaningAriaLabel(meaning: HeatMeaning): string {
  switch (meaning) {
    case 'tenpai':
      return 'Shanten heat: tenpai after discard';
    case 'close':
      return 'Shanten heat: close to winning';
    case 'far':
      return 'Shanten heat: far from winning';
    case 'same':
      return 'Shanten heat: all discards equal';
  }
}

/**
 * Map an absolute shanten value to a heat color.
 * Blue = tenpai (0), green mid-range, red = far (4+).
 * When every discard yields the same shanten, returns neutral grey.
 */
export function shantenToHeatColor(
  shanten: number,
  bestShanten: number,
  worstShanten: number,
): string {
  if (worstShanten === bestShanten) {
    return '#808080';
  }

  const clamped = Math.max(0, Math.min(shanten, 4));
  const normalized = clamped / 4;
  const hue = 240 - normalized * 240;
  return `hsl(${Math.round(hue)}, 70%, 50%)`;
}

export function computeHeatOverlays(
  hand: Tile[],
  melds: MeldInfo[],
): Map<string, TileHeatOverlay> {
  const result = computeShantenHeat(hand, melds);
  if (result.entries.length === 0) return new Map();

  const allSame = result.worstShanten === result.bestShanten;
  const overlays = new Map<string, TileHeatOverlay>();

  for (const entry of result.entries) {
    const meaning: HeatMeaning = allSame ? 'same' : shantenToHeatMeaning(entry.shantenAfterDiscard);
    overlays.set(entry.tileId, {
      color: shantenToHeatColor(entry.shantenAfterDiscard, result.bestShanten, result.worstShanten),
      meaning,
      ariaLabel: heatMeaningAriaLabel(meaning),
    });
  }

  return overlays;
}
