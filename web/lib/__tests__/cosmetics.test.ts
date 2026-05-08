import { describe, expect, it } from 'vitest';
import {
  TILE_PALETTES,
  TABLE_FELTS,
  ROSTERS,
  DEFAULT_TILE_PALETTE,
  DEFAULT_TABLE_FELT,
  DEFAULT_ROSTER,
  getTilePalette,
  getTableFelt,
  getRoster,
} from '../cosmetics';
import { TileSuit } from '@/models/Tile';

describe('TILE_PALETTES', () => {
  it('exposes 4 palettes including the retro default', () => {
    expect(Object.keys(TILE_PALETTES).sort()).toEqual([
      'bone-wood',
      'ivory',
      'neon',
      'retro',
    ]);
    expect(DEFAULT_TILE_PALETTE).toBe('retro');
  });

  it('every palette covers all suit colors RetroTile needs', () => {
    const requiredSuits = [
      TileSuit.BAMBOO,
      TileSuit.CHARACTER,
      TileSuit.DOT,
      TileSuit.WIND,
      TileSuit.DRAGON,
      TileSuit.FLOWER,
      TileSuit.SEASON,
    ];
    for (const palette of Object.values(TILE_PALETTES)) {
      for (const suit of requiredSuits) {
        expect(palette.suitColors[suit], `${palette.id} missing ${suit} color`).toMatch(
          /^#[0-9a-f]{6}$/i,
        );
      }
      expect(palette.faceBg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.stripeHeight).toBeGreaterThan(0);
    }
  });
});

describe('TABLE_FELTS', () => {
  it('exposes 4 felts including the classic-green default', () => {
    expect(Object.keys(TABLE_FELTS).sort()).toEqual([
      'bamboo-mat',
      'casino-black',
      'classic-green',
      'tournament-red',
    ]);
    expect(DEFAULT_TABLE_FELT).toBe('classic-green');
  });

  it('every felt has a className that matches its id', () => {
    for (const felt of Object.values(TABLE_FELTS)) {
      expect(felt.className).toBe(`felt-${felt.id}`);
      expect(felt.label.length).toBeGreaterThan(0);
      expect(felt.description.length).toBeGreaterThan(0);
    }
  });
});

describe('ROSTERS', () => {
  it('exposes both the default and alternate rosters', () => {
    expect(Object.keys(ROSTERS).sort()).toEqual(['alt', 'default']);
    expect(DEFAULT_ROSTER).toBe('default');
  });

  it('default roster maps to Mei / Hana / Yuki', () => {
    expect(ROSTERS.default.seats).toEqual({ left: 'mei', top: 'hana', right: 'yuki' });
  });

  it('alt roster maps to Riko / Aki / Sora', () => {
    expect(ROSTERS.alt.seats).toEqual({ left: 'riko', top: 'aki', right: 'sora' });
  });
});

describe('lookup helpers fall back to defaults on bad input', () => {
  it('getTilePalette returns retro for unknown id', () => {
    expect(getTilePalette('not-a-real-palette' as never).id).toBe('retro');
    expect(getTilePalette(undefined).id).toBe('retro');
    expect(getTilePalette(null).id).toBe('retro');
  });

  it('getTableFelt returns classic-green for unknown id', () => {
    expect(getTableFelt('not-a-felt' as never).id).toBe('classic-green');
    expect(getTableFelt(undefined).id).toBe('classic-green');
  });

  it('getRoster returns default for unknown id', () => {
    expect(getRoster('not-a-roster' as never).id).toBe('default');
    expect(getRoster(undefined).id).toBe('default');
  });
});
