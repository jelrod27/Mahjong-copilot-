'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  TILE_PALETTES,
  TilePalette,
  DEFAULT_TILE_PALETTE,
  getTilePalette,
} from '@/lib/cosmetics';

/**
 * Active tile palette at the root of any subtree that should render tiles in
 * the player's chosen cosmetic. Falls back to the retro default whenever no
 * provider is present (so tests and isolated stories don't need to wrap).
 */
const TilePaletteContext = createContext<TilePalette>(TILE_PALETTES[DEFAULT_TILE_PALETTE]);

export function useTilePalette(): TilePalette {
  return useContext(TilePaletteContext);
}

/**
 * Provider that reads the active palette from Redux settings and exposes it
 * to descendants. Mount this at the top of routes that should respect the
 * player's cosmetic choice (e.g. /play/game, /reference).
 */
export function TilePaletteProvider({ children }: { children: ReactNode }) {
  const id = useAppSelector(s => s.settings.tilePalette);
  const palette = getTilePalette(id);
  return <TilePaletteContext.Provider value={palette}>{children}</TilePaletteContext.Provider>;
}
