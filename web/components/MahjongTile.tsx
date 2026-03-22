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
    relative inline-flex flex-col overflow-hidden rounded-sm
    ${isSelected ? 'scale-105 z-10' : 'hover:scale-102'}
    transition-all duration-200 ease-out cursor-pointer group
  `;

  // 3D Block effect colors
  const tileFaceColor = '#f7f0e3'; // retro-white
  const tileSideColor = '#d3c9b5';
  const tileEdgeColor = '#ede4d3';

  const content = showBack ? (
    <div
      className="flex items-center justify-center bg-retro-green relative border-2 border-retro-green/30"
      style={{ 
        width, 
        height,
        boxShadow: `0 4px 0 0 #1a7a5a, 4px 4px 0 0 #125a42`
      }}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
      <span className="retro-glow-strong" style={{ fontSize: width * 0.4 }}>🀄</span>
    </div>
  ) : (
    <div
      className="flex flex-col relative"
      style={{ 
        width, 
        height,
        backgroundColor: tileFaceColor,
        boxShadow: isSelected 
          ? `0 6px 0 0 ${tileSideColor}, 6px 6px 0 0 rgba(0,0,0,0.4), 0 0 15px rgba(245, 183, 49, 0.4)`
          : `0 4px 0 0 ${tileSideColor}, 4px 4px 0 0 rgba(0,0,0,0.3)`,
        transform: isSelected ? 'translateY(-2px)' : 'none'
      }}
    >
      {/* Top highlighting edge */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: tileEdgeColor }} />
      
      {/* Gloss overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 pointer-events-none" />

      {/* Suit color indicator (refined) */}
      <div className="h-1.5 w-full opacity-80" style={{ backgroundColor: suitColor }} />

      {/* Tile content */}
      <div className="flex flex-1 flex-col items-center justify-center p-1.5 z-10">
        <span
          className="font-bold leading-none drop-shadow-sm"
          style={{ 
            fontSize: width * 0.38, 
            color: suitColor,
            fontFamily: 'system-ui' // Modern clean feel for the symbol itself
          }}
        >
          {buildTextSymbol(tile)}
        </span>
        {width > 50 && (
          <span
            className="mt-1.5 text-center text-retro-textDim font-retro leading-tight line-clamp-2 uppercase tracking-tighter"
            style={{ fontSize: width * 0.14, maxWidth: width - 12 }}
          >
            {tile.nameEnglish}
          </span>
        )}
      </div>

      {/* Selection border highlight */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-retro-gold/50 rounded-sm animate-pulse-gold pointer-events-none" />
      )}
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
