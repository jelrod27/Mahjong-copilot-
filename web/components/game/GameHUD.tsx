'use client';

import { useState } from 'react';
import { Player } from '@/models/GameState';
import { WindTile } from '@/models/Tile';
import { TurnPhase } from '@/models/GameState';
import soundManager from '@/lib/soundManager';

interface GameHUDProps {
  wallCount: number;
  prevailingWind: WindTile;
  currentPlayerIndex: number;
  players: Player[];
  turnPhase: TurnPhase;
}

const WIND_CHARS: Record<WindTile, string> = {
  [WindTile.EAST]: '東', [WindTile.SOUTH]: '南',
  [WindTile.WEST]: '西', [WindTile.NORTH]: '北',
};

const PHASE_LABELS: Record<TurnPhase, string> = {
  draw: 'DRAWING', discard: 'DISCARD', claim: 'CLAIMING', endOfTurn: 'END',
};

export default function GameHUD({
  wallCount, prevailingWind, currentPlayerIndex, players, turnPhase,
}: GameHUDProps) {
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundManager.setEnabled(next);
    if (next) soundManager.play('tilePlace');
  };

  return (
    <div className="retro-panel p-2 font-retro text-sm">
      {/* Title bar with sound toggle */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-retro-accent text-xs font-pixel">╔══ GAME ══╗</span>
        <button
          onClick={toggleSound}
          className="text-xs px-1 hover:text-retro-cyan transition-colors"
          title={soundOn ? 'Mute' : 'Unmute'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Wind & Wall */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-retro-gold retro-glow">
          {WIND_CHARS[prevailingWind]} Round
        </span>
        <span className="text-retro-cyan">
          Wall: {wallCount}
        </span>
      </div>

      {/* Phase */}
      <div className="text-center text-retro-green text-xs mb-1">
        {PHASE_LABELS[turnPhase]}
      </div>

      {/* Players */}
      <div className="space-y-px text-xs">
        {players.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center gap-1 ${
              i === currentPlayerIndex ? 'text-retro-cyan' : 'text-retro-textDim'
            }`}
          >
            {i === currentPlayerIndex && <span className="animate-blink text-retro-green">▸</span>}
            {i !== currentPlayerIndex && <span className="w-2" />}
            <span className="text-retro-gold w-3">{WIND_CHARS[player.seatWind]}</span>
            <span className="flex-1 truncate">{player.name}</span>
            <span className="text-retro-gold">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
