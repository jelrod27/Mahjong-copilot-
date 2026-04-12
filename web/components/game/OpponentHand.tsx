'use client';

import { Player } from '@/models/GameState';
import { WindTile } from '@/models/Tile';
import RetroTile from './RetroTile';
import ExposedMelds from './ExposedMelds';

interface OpponentHandProps {
  player: Player;
  position: 'left' | 'top' | 'right';
  isCurrentTurn: boolean;
  /** Mobile compact mode: show tile count + wind badge instead of full tile bar */
  compact?: boolean;
}

const WIND_LABELS: Record<WindTile, string> = {
  [WindTile.EAST]: 'E', [WindTile.SOUTH]: 'S',
  [WindTile.WEST]: 'W', [WindTile.NORTH]: 'N',
};

export default function OpponentHand({ player, position, isCurrentTurn, compact = false }: OpponentHandProps) {
  const isVertical = position === 'left' || position === 'right';
  const tileCount = player.hand.length;

  // Compact mode for mobile: just wind badge, name, tile count
  if (compact) {
    return (
      <div className={`
        flex flex-col items-center gap-0.5 rounded-md px-2 py-1 transition-all duration-300
        ${isCurrentTurn ? 'ring-1 ring-retro-gold/50 bg-retro-gold/5' : ''}
      `}>
        <div className={`
          flex items-center gap-1 font-pixel text-[8px]
          ${isCurrentTurn ? 'text-retro-cyan retro-glow' : 'text-retro-textDim'}
        `}>
          <span className="text-retro-gold">{WIND_LABELS[player.seatWind]}</span>
          <span className="truncate max-w-[48px]">{player.name}</span>
          {isCurrentTurn && <span className="animate-blink">▸</span>}
        </div>
        <div className="font-retro text-[10px] text-retro-textDim">
          {tileCount} tiles
          {player.melds.length > 0 && ` · ${player.melds.length}m`}
          {player.flowers.length > 0 && ` · 🌸${player.flowers.length}`}
        </div>
      </div>
    );
  }

  // Create placeholder tiles for face-down display
  const placeholders = Array.from({ length: tileCount }, (_, i) => (
    <RetroTile
      key={`back-${i}`}
      tile={player.hand[i] || { id: `ph-${i}`, suit: 'dot' as any, type: 'suit' as any, nameEnglish: '', nameChinese: '', nameJapanese: '', assetPath: '' }}
      size="sm"
      showBack
    />
  ));

  return (
    <div className={`
      flex flex-col items-center gap-1 ${isVertical ? 'justify-center' : ''}
      rounded-lg p-1 transition-all duration-300
      ${isCurrentTurn ? 'ring-2 ring-retro-gold/50 shadow-[0_0_12px_rgba(245,183,49,0.3)]' : ''}
    `}>
      {/* Player info */}
      <div className={`
        flex items-center gap-1 text-xs font-pixel
        ${isCurrentTurn ? 'text-retro-cyan retro-glow' : 'text-retro-textDim'}
      `}>
        <span className="text-retro-gold">{WIND_LABELS[player.seatWind]}</span>
        <span>{player.name}</span>
        {isCurrentTurn && <span className="animate-blink">▸</span>}
      </div>

      {/* Tiles */}
      <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} gap-px`}>
        {placeholders}
      </div>

      {/* Exposed melds */}
      {player.melds.length > 0 && (
        <ExposedMelds melds={player.melds} size="sm" />
      )}

      {/* Flowers */}
      {player.flowers.length > 0 && (
        <div className="text-xs text-retro-gold font-retro">
          🌸 ×{player.flowers.length}
        </div>
      )}
    </div>
  );
}
