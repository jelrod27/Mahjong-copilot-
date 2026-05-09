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
    <div className="inline-block ds-panel px-3 py-1">
      <div className="flex items-center gap-2">
        <span className="text-highlight font-sans text-lg">{WIND_CHARS[currentWind]}</span>
        <span className={`font-display text-xs ds-text-glow ${
          isHumanTurn ? 'text-success' : turnPhase === 'claim' ? 'text-accent' : 'text-muted-foreground'
        }`}>
          {phaseText}
        </span>
      </div>
    </div>
  );
}
