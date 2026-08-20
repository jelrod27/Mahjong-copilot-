'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Display options every tile needs but no tile can be told individually.
 *
 * RetroTile renders from a dozen call sites, so threading a prop to the leaf
 * would touch every one of them to deliver a value none of them care about.
 * Same reasoning as TilePaletteContext, kept separate from it because a
 * numeral is not a palette.
 *
 * Defaults to off, so a tile rendered outside a provider, in a test or a
 * cosmetics thumbnail, shows the plain face.
 */
interface TileDisplay {
  /** Print the rank as a numeral on suited tiles. */
  showNumerals: boolean;
}

const TileDisplayContext = createContext<TileDisplay>({ showNumerals: false });

export function useTileDisplay(): TileDisplay {
  return useContext(TileDisplayContext);
}

export function TileDisplayProvider({
  showNumerals,
  children,
}: {
  showNumerals: boolean;
  children: ReactNode;
}) {
  return (
    <TileDisplayContext.Provider value={{ showNumerals }}>
      {children}
    </TileDisplayContext.Provider>
  );
}
