'use client';

import { Tile, TileType, TileSuit, WindTile, DragonTile } from '@/models/Tile';

interface MahjongTileProps {
  tile: Tile;
  width?: number;
  height?: number;
  showBack?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  borderColor?: string;
}

const SUIT_COLORS: Record<string, string> = {
  [TileSuit.BAMBOO]: '#4CAF50',
  [TileSuit.CHARACTER]: '#B71C1C',
  [TileSuit.DOT]: '#2196F3',
  [TileSuit.WIND]: '#9E9E9E',
  [TileSuit.DRAGON]: '#9E9E9E',
  [TileSuit.FLOWER]: '#D4AF37',
  [TileSuit.SEASON]: '#D4AF37',
};

function getSuitColor(suit: TileSuit): string {
  return SUIT_COLORS[suit] || '#424242';
}

function buildTextSymbol(tile: Tile): string {
  switch (tile.type) {
    case TileType.SUIT:
      return tile.number?.toString() || '';
    case TileType.HONOR:
      if (tile.wind) {
        const windSymbols: Record<WindTile, string> = {
          [WindTile.EAST]: '東',
          [WindTile.SOUTH]: '南',
          [WindTile.WEST]: '西',
          [WindTile.NORTH]: '北',
        };
        return windSymbols[tile.wind] || '';
      } else if (tile.dragon) {
        const dragonSymbols: Record<DragonTile, string> = {
          [DragonTile.RED]: '中',
          [DragonTile.GREEN]: '發',
          [DragonTile.WHITE]: '白',
        };
        return dragonSymbols[tile.dragon] || '';
      }
      return '';
    case TileType.BONUS:
      return tile.flower || tile.season || '';
    default:
      return '';
  }
}

export const MahjongTile: React.FC<MahjongTileProps> = ({
  tile,
  width = 60,
  height = 90,
  showBack = false,
  isSelected = false,
  onPress,
}) => {
  const suitColor = getSuitColor(tile.suit);

  const containerClass = `
    inline-flex flex-col overflow-hidden rounded-md
    ${isSelected ? 'ring-2 ring-mahjong-green shadow-lg shadow-mahjong-green/30' : ''}
    border-2 ${isSelected ? 'border-mahjong-green' : 'border-tile-border'}
    transition-all duration-150
  `;

  const content = showBack ? (
    <div
      className="flex items-center justify-center bg-mahjong-green"
      style={{ width, height }}
    >
      <span style={{ fontSize: width * 0.4 }}>🀄</span>
    </div>
  ) : (
    <div
      className="flex flex-col bg-tile-bg"
      style={{ width, height }}
    >
      {/* Suit color indicator */}
      <div className="h-1 w-full" style={{ backgroundColor: suitColor }} />

      {/* Tile content */}
      <div className="flex flex-1 flex-col items-center justify-center p-1">
        <span
          className="font-bold leading-none"
          style={{ fontSize: width * 0.35, color: suitColor }}
        >
          {buildTextSymbol(tile)}
        </span>
        {width > 50 && (
          <span
            className="mt-1 text-center text-gray-500 leading-tight line-clamp-2"
            style={{ fontSize: width * 0.12, maxWidth: width - 8 }}
          >
            {tile.nameEnglish}
          </span>
        )}
      </div>
    </div>
  );

  if (onPress) {
    return (
      <button onClick={onPress} className={containerClass} type="button">
        {content}
      </button>
    );
  }

  return <div className={containerClass}>{content}</div>;
};

interface TileHandProps {
  tiles: Tile[];
  tileWidth?: number;
  tileHeight?: number;
  onTilePress?: (tile: Tile) => void;
  selectedTile?: Tile;
}

export const TileHand: React.FC<TileHandProps> = ({
  tiles,
  tileWidth = 50,
  tileHeight = 75,
  onTilePress,
  selectedTile,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {tiles.map((tile) => (
        <MahjongTile
          key={tile.id}
          tile={tile}
          width={tileWidth}
          height={tileHeight}
          isSelected={selectedTile?.id === tile.id}
          onPress={onTilePress ? () => onTilePress(tile) : undefined}
        />
      ))}
    </div>
  );
};

interface CompactTileProps {
  tile: Tile;
  size?: number;
}

export const CompactTile: React.FC<CompactTileProps> = ({ tile, size = 40 }) => {
  return <MahjongTile tile={tile} width={size} height={size * 1.5} />;
};

export default MahjongTile;
