'use client';

import { WindTile } from '@/models/Tile';
import { TurnPhase } from '@/models/GameState';

interface TurnIndicatorProps {
  currentWind: WindTile;
  turnPhase: TurnPhase;
  isHumanTurn: boolean;
}

const WIND_CHARS: Record<WindTile, string> = {
  [WindTile.EAST]: '東', [WindTile.SOUTH]: '南',
  [WindTile.WEST]: '西', [WindTile.NORTH]: '北',
};

export default function TurnIndicator({ currentWind, turnPhase, isHumanTurn }: TurnIndicatorProps) {
  const phaseText = turnPhase === 'claim' ? '⚡ CLAIM'
    : isHumanTurn ? '► YOUR TURN'
    : '⏳ OPPONENT';

  return (
    <div className="inline-block retro-panel px-3 py-1">
      <div className="flex items-center gap-2">
        <span className="text-retro-gold font-retro text-lg">{WIND_CHARS[currentWind]}</span>
        <span className={`font-pixel text-xs retro-glow ${
          isHumanTurn ? 'text-retro-green' : turnPhase === 'claim' ? 'text-retro-accent' : 'text-retro-textDim'
        }`}>
          {phaseText}
        </span>
      </div>
    </div>
  );
}
