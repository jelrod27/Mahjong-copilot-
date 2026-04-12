'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  handNumber?: number;
  playerScores?: number[];
  /** Compact single-line mode for mobile */
  compact?: boolean;
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
  handNumber, playerScores, compact = false,
}: GameHUDProps) {
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());

  const leaveToMenu = () => {
    if (
      typeof window !== 'undefined' &&
      window.confirm('Leave this game and return to the play menu? Your progress in this hand will be lost.')
    ) {
      router.push('/play');
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundManager.setEnabled(next);
    if (next) soundManager.play('tilePlace');
  };

  // Mobile compact mode: single-line bar
  if (compact) {
    return (
      <div className="flex items-center justify-between w-full gap-2 font-retro text-xs">
        <div className="flex items-center gap-2">
          <span className="text-retro-gold retro-glow font-pixel text-[8px]">
            {WIND_CHARS[prevailingWind]}
            {handNumber != null && <span className="text-retro-textDim ml-0.5">H{handNumber}</span>}
          </span>
          <span className="text-retro-cyan">W:{wallCount}</span>
          <span className="text-retro-green text-[10px]">{PHASE_LABELS[turnPhase]}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSound}
            className="text-xs px-1 py-0.5 rounded-sm hover:text-retro-cyan min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute game sounds' : 'Unmute game sounds'}
          >
            <span aria-hidden>{soundOn ? '🔊' : '🔇'}</span>
          </button>
          <button
            type="button"
            onClick={leaveToMenu}
            className="font-pixel text-[7px] px-1.5 py-0.5 rounded-sm border border-retro-border/40 text-retro-textDim hover:text-retro-cyan min-h-[28px]"
          >
            MENU
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="retro-panel p-2 font-retro text-sm">
      {/* Title bar with sound toggle */}
      <div className="flex justify-between items-center gap-1 mb-1">
        <span className="text-retro-accent text-xs font-pixel shrink-0">╔══ GAME ══╗</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            className="text-xs px-1.5 py-0.5 rounded-sm hover:text-retro-cyan hover:bg-retro-bg/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/50"
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute game sounds' : 'Unmute game sounds'}
          >
            <span aria-hidden>{soundOn ? '🔊' : '🔇'}</span>
          </button>
          <button
            type="button"
            onClick={leaveToMenu}
            className="font-pixel text-[8px] px-1.5 py-0.5 rounded-sm border border-retro-border/40 text-retro-textDim hover:text-retro-cyan hover:border-retro-cyan/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/50"
          >
            MENU
          </button>
        </div>
      </div>

      {/* Wind & Wall */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-retro-gold retro-glow">
          {WIND_CHARS[prevailingWind]} Round
          {handNumber != null && <span className="text-retro-textDim text-xs ml-1">H{handNumber}</span>}
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
            <span className="text-retro-gold">{playerScores ? playerScores[i] : player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
