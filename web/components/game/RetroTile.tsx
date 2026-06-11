'use client';

import { memo } from 'react';
import { Tile, TileType, TileSuit, WindTile, DragonTile } from '@/models/Tile';
import { useTilePalette } from './TilePaletteContext';
import { TilePalette } from '@/lib/cosmetics';

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
  /** Override the contextual palette (used by cosmetics preview thumbnails). */
  paletteOverride?: TilePalette;
}

function getSymbol(tile: Tile): string {
  if (tile.type === TileType.SUIT) return tile.number?.toString() || '';
  if (tile.type === TileType.HONOR) {
    if (tile.wind) {
      const symbols: Record<WindTile, string> = {
        [WindTile.EAST]: '東', [WindTile.SOUTH]: '南',
        [WindTile.WEST]: '西', [WindTile.NORTH]: '北',
      };
      return symbols[tile.wind] || '';
    }
    if (tile.dragon) {
      const symbols: Record<DragonTile, string> = {
        [DragonTile.RED]: '中', [DragonTile.GREEN]: '發', [DragonTile.WHITE]: '白',
      };
      return symbols[tile.dragon] || '';
    }
  }
  if (tile.type === TileType.BONUS) return tile.flower || tile.season || '';
  return '';
}

function getSuitLabel(tile: Tile): string {
  if (tile.type === TileType.SUIT) {
    const labels: Record<string, string> = {
      [TileSuit.BAMBOO]: '索', [TileSuit.CHARACTER]: '萬', [TileSuit.DOT]: '筒',
    };
    return labels[tile.suit] || '';
  }
  return '';
}

const TUTOR_COLORS: Record<string, string> = {
  green: '#5DAF6A',
  orange: '#C9A84C',
  red: '#C75B4A',
};

function RetroTile({
  tile, size = 'md', showBack = false, isSelected = false, isSuggested = false,
  isLastDiscarded = false, isNewlyDrawn = false, onClick, disabled = false,
  tutorColor, tutorLabel, paletteOverride,
}: RetroTileProps) {
  const ctxPalette = useTilePalette();
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
        <span className="text-muted-foreground text-[length:30%] min-w-[1em]" aria-hidden>?</span>
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
      style={faceStyle}
    >
      <div style={{ height: stripeHeight, width: '100%', backgroundColor: suitColor }} />
      {tutorColor && (
        <div
          className="h-[3px] w-full"
          style={{ backgroundColor: TUTOR_COLORS[tutorColor] }}
        />
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-0.5">
        <span
          className="mahjong-tile-symbol"
          style={{ fontSize: 'calc(var(--tile-w) * 0.42)', color: suitColor }}
        >
          {getSymbol(tile)}
        </span>
        {size !== 'sm' && size !== 'xs' && (
          <span
            className="mahjong-tile-symbol leading-none opacity-70"
            style={{ fontSize: 'calc(var(--tile-w) * 0.2)', color: suitColor }}
          >
            {getSuitLabel(tile)}
          </span>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        type="button"
        aria-label={tileAriaLabel}
        className="transition-transform duration-200 ease-ds-out hover:enabled:-translate-y-0.5 hover:enabled:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
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
