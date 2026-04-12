'use client';

import { Tile, TileType, TileSuit, WindTile, DragonTile } from '@/models/Tile';

interface RetroTileProps {
  tile: Tile;
  size?: 'sm' | 'md' | 'lg';
  showBack?: boolean;
  isSelected?: boolean;
  isSuggested?: boolean;
  isLastDiscarded?: boolean;
  isNewlyDrawn?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  tutorColor?: 'green' | 'orange' | 'red';
}

const SIZES = {
  sm: { w: 32, h: 48 },
  md: { w: 44, h: 66 },
  lg: { w: 56, h: 84 },
};

const SUIT_COLORS: Record<string, string> = {
  [TileSuit.BAMBOO]: '#4CAF50',
  [TileSuit.CHARACTER]: '#ef4444',
  [TileSuit.DOT]: '#3b82f6',
  [TileSuit.WIND]: '#a1a1aa',
  [TileSuit.DRAGON]: '#a1a1aa',
  [TileSuit.FLOWER]: '#f5b731',
  [TileSuit.SEASON]: '#f5b731',
};

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
  green: '#4CAF50',
  orange: '#FF9800',
  red: '#ef4444',
};

export default function RetroTile({
  tile, size = 'md', showBack = false, isSelected = false, isSuggested = false,
  isLastDiscarded = false, isNewlyDrawn = false, onClick, disabled = false,
  tutorColor,
}: RetroTileProps) {
  const { w, h } = SIZES[size];
  const suitColor = SUIT_COLORS[tile.suit] || '#a1a1aa';

  if (showBack) {
    const backContent = (
      <div
        className="flex items-center justify-center border-2 border-retro-textDim rounded-sm"
        style={{
          width: w, height: h,
          background: 'repeating-linear-gradient(45deg, #2a2240, #2a2240 3px, #1c1829 3px, #1c1829 6px)',
        }}
      >
        <span className="text-retro-textDim" style={{ fontSize: w * 0.3 }} aria-hidden>?</span>
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
        flex flex-col rounded-sm border-2 overflow-hidden transition-all duration-100
        ${isSelected ? 'border-retro-cyan -translate-y-2 shadow-[0_0_10px_#45b7d160]' : isSuggested ? 'border-retro-gold shadow-[0_0_10px_#f5b73160]' : 'border-retro-textDim'}
        ${isLastDiscarded ? 'animate-pulse-gold' : ''}
        ${isNewlyDrawn ? 'animate-tile-draw' : ''}
        ${isSuggested && !isSelected ? 'animate-pulse-gold' : ''}
      `}
      style={{ width: w, height: h, backgroundColor: '#FFF8E1' }}
    >
      {/* Suit color bar + tutor indicator */}
      <div className="h-1 w-full" style={{ backgroundColor: suitColor }} />
      {tutorColor && (
        <div
          className="h-[3px] w-full"
          style={{ backgroundColor: TUTOR_COLORS[tutorColor] }}
        />
      )}

      {/* Symbol */}
      <div className="flex flex-col flex-1 items-center justify-center">
        <span
          className="font-bold leading-none"
          style={{ fontSize: w * 0.4, color: suitColor }}
        >
          {getSymbol(tile)}
        </span>
        {size !== 'sm' && (
          <span
            className="leading-none text-gray-500"
            style={{ fontSize: w * 0.22 }}
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
        aria-label={`Mahjong tile: ${tile.nameEnglish}`}
        className="transition-transform duration-100 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:scale-105 hover:enabled:-translate-y-0.5"
      >
        {tileContent}
      </button>
    );
  }

  return tileContent;
}
