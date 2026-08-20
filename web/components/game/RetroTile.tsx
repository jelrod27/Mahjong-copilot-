'use client';

import { memo } from 'react';
import { Tile, TileType } from '@/models/Tile';
import { tileArtSrc } from '@/lib/tileArt';
import { useTilePalette } from './TilePaletteContext';
import { useTileDisplay } from './TileDisplayContext';
import { TilePalette } from '@/lib/cosmetics';
import type { TileHeatOverlay } from '@/engine/shantenHeat';

interface RetroTileProps {
  tile: Tile;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showBack?: boolean;
  isSelected?: boolean;
  isSuggested?: boolean;
  isLastDiscarded?: boolean;
  isNewlyDrawn?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  tutorColor?: 'green' | 'orange' | 'red';
  tutorLabel?: 'GOOD' | 'OK' | 'KEEP';
  heatOverlay?: TileHeatOverlay;
  /** Override the contextual palette (used by cosmetics preview thumbnails). */
  paletteOverride?: TilePalette;
}

// The tutor strip and the legend under the hand must name the same three
// colours, or the strip becomes unreadable. Both sides point at these tokens
// rather than at literals so they cannot drift apart.
const TUTOR_COLORS: Record<string, string> = {
  green: 'var(--color-success)',
  orange: 'var(--color-accent)',
  red: 'var(--color-destructive)',
};

function RetroTile({
  tile, size = 'md', showBack = false, isSelected = false, isSuggested = false,
  isLastDiscarded = false, isNewlyDrawn = false, onClick, disabled = false,
  tutorColor, tutorLabel, heatOverlay, paletteOverride,
}: RetroTileProps) {
  const ctxPalette = useTilePalette();
  const { showNumerals } = useTileDisplay();
  const palette = paletteOverride ?? ctxPalette;
  const suitColor = palette.suitColors[tile.suit] || '#5c4632';
  const faceStyle = palette.faceBg.startsWith('#')
    ? { background: `linear-gradient(145deg, ${palette.faceBg} 0%, ${palette.faceBg}dd 100%)` }
    : { backgroundColor: palette.faceBg };
  const stripeHeight = palette.stripeHeight;
  const accessibilityState = [
    isSelected ? 'selected' : null,
    isSuggested ? 'suggested discard' : null,
    tutorLabel ? `Beginner Assist: ${tutorLabel}` : null,
    heatOverlay?.ariaLabel ?? null,
  ].filter(Boolean).join(', ');
  const tileAriaLabel = `Mahjong tile: ${tile.nameEnglish}${accessibilityState ? `. ${accessibilityState}.` : ''}`;

  const scaleRootClass = `tile-scale-root tile-size-${size}`;

  if (showBack) {
    const backContent = (
      <div
        className={`${scaleRootClass} flex items-center justify-center rounded-sm border border-mahjong-wood/40`}
        style={{
          background: 'repeating-linear-gradient(45deg, #2a4538, #2a4538 3px, #1a2b1e 3px, #1a2b1e 6px)',
        }}
      >
        <span className="text-muted-foreground text-[30%] min-w-[1em]" aria-hidden>?</span>
      </div>
    );
    return onClick ? (
      <button
        onClick={onClick}
        disabled={disabled}
        type="button"
        aria-label="Face-down tile"
      >
        {backContent}
      </button>
    ) : backContent;
  }

  const tileContent = (
    <div
      className={`
        mahjong-tile-face tile-scale-root tile-size-${size}
        flex flex-col overflow-hidden transition-all duration-200 ease-ds-out
        ${isSelected ? 'is-selected -rotate-1 animate-select-pulse' : ''}
        ${isSuggested ? 'is-suggested' : 'border-tile-border'}
        ${isLastDiscarded ? 'animate-pulse-gold' : ''}
        ${isNewlyDrawn ? 'animate-tile-draw' : ''}
        ${isSuggested && !isSelected ? 'animate-pulse-gold' : ''}
      `}
      style={{
        ...faceStyle,
        ...(heatOverlay ? { boxShadow: `inset 0 0 0 3px ${heatOverlay.color}` } : {}),
      }}
    >
      <div style={{ height: stripeHeight, width: '100%', backgroundColor: suitColor }} />
      {tutorColor && (
        <div
          className="h-[3px] w-full"
          style={{ backgroundColor: TUTOR_COLORS[tutorColor] }}
        />
      )}

      {/* Rank as a numeral, for players still learning to count bamboo sticks
          at a glance. Suited tiles only: an honour has no rank to print, and
          a numeral on a dragon would be inventing information. Sized from
          --tile-w so it tracks every tile size, and parked in the top corner
          clear of the artwork, which is centred. aria-hidden because the
          tile's name already speaks the rank. */}
      {showNumerals && tile.type === TileType.SUIT && tile.number !== undefined && (
        <span className="mahjong-tile-numeral" style={{ color: suitColor }} aria-hidden>
          {tile.number}
        </span>
      )}

      <div className="flex flex-1 items-center justify-center p-[6%]">
        {/* Decorative: the tile is named on the element that carries the
            accessible name, so describing the drawing as well would announce
            every tile twice. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tileArtSrc(tile)}
          alt=""
          aria-hidden
          draggable={false}
          className="mahjong-tile-art"
        />
      </div>
    </div>
  );

  // A tile with no click handler is not a button, and until now it had no
  // accessible name either: its identity came from the Unicode glyph being
  // read as text. The artwork is decorative, so that content has gone, and
  // without this the whole discard sea and every exposed meld would announce
  // as nothing. Interactive tiles are left alone, because the button below
  // already carries the name and a second one inside would announce twice.
  if (!onClick) {
    return (
      <div role="img" aria-label={tileAriaLabel}>
        {tileContent}
      </div>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        type="button"
        aria-label={tileAriaLabel}
        className="transition-transform duration-200 ease-ds-out hover:enabled:-translate-y-0.5 hover:enabled:scale-[1.03] disabled:cursor-default disabled:opacity-[0.88]"
      >
        {tileContent}
      </button>
    );
  }

  return tileContent;
}

// Tiles re-render across the whole board on every action; the face itself
// only depends on these props, so memo keeps draw/discard frames cheap.
export default memo(RetroTile);
