'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Player } from '@/models/GameState';
import { WindTile } from '@/models/Tile';
import { TurnPhase } from '@/models/GameState';
import soundManager from '@/lib/soundManager';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setShowTutor } from '@/store/actions/settingsActions';
import GlossaryTerm from './GlossaryTerm';

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
  const showTutor = useAppSelector(s => s.settings.showTutor);
  const dispatch = useAppDispatch();

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

  const toggleAssist = () => {
    dispatch(setShowTutor(!showTutor));
  };

  // Mobile compact mode: single-line bar
  if (compact) {
    return (
      <div className="flex items-center justify-between w-full gap-2 font-sans text-xs">
        <div className="flex items-center gap-2">
          <span className="text-highlight ds-text-glow font-display text-[8px]">
            {WIND_CHARS[prevailingWind]}
            {handNumber != null && <span className="text-muted-foreground ml-0.5">H{handNumber}</span>}
          </span>
          <GlossaryTerm term="Wall">
            <span className="text-info">W:{wallCount}</span>
          </GlossaryTerm>
          <span className="text-success text-[10px]">{PHASE_LABELS[turnPhase]}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleAssist}
            className={`font-display text-[7px] px-1.5 py-0.5 rounded-sm border min-h-[28px] transition-colors ${
              showTutor
                ? 'border-info/60 text-info'
                : 'border-border/40 text-muted-foreground hover:text-info'
            }`}
            aria-pressed={showTutor}
            aria-label={showTutor ? 'Hide Beginner Assist hints' : 'Show Beginner Assist hints'}
          >
            HINT
          </button>
          <button
            type="button"
            onClick={toggleSound}
            className="text-xs px-1 py-0.5 rounded-sm hover:text-info min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute game sounds' : 'Unmute game sounds'}
          >
            <span aria-hidden>{soundOn ? '🔊' : '🔇'}</span>
          </button>
          <button
            type="button"
            onClick={leaveToMenu}
            className="font-display text-[7px] px-1.5 py-0.5 rounded-sm border border-border/40 text-muted-foreground hover:text-info min-h-[28px]"
          >
            MENU
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-panel p-2 font-sans text-sm">
      {/* Title bar with sound toggle */}
      <div className="flex justify-between items-center gap-1 mb-1">
        <span className="text-accent text-xs font-display shrink-0">╔══ GAME ══╗</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={toggleAssist}
            className={`font-display text-[8px] px-1.5 py-0.5 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50 ${
              showTutor
                ? 'border-info/60 text-info'
                : 'border-border/40 text-muted-foreground hover:text-info hover:border-info/50'
            }`}
            aria-pressed={showTutor}
            aria-label={showTutor ? 'Hide Beginner Assist hints' : 'Show Beginner Assist hints'}
          >
            HINT
          </button>
          <button
            type="button"
            onClick={toggleSound}
            className="text-xs px-1.5 py-0.5 rounded-sm hover:text-info hover:bg-background/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50"
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute game sounds' : 'Unmute game sounds'}
          >
            <span aria-hidden>{soundOn ? '🔊' : '🔇'}</span>
          </button>
          <button
            type="button"
            onClick={leaveToMenu}
            className="font-display text-[8px] px-1.5 py-0.5 rounded-sm border border-border/40 text-muted-foreground hover:text-info hover:border-info/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50"
          >
            MENU
          </button>
        </div>
      </div>

      {/* Wind & Wall */}
      <div className="flex justify-between items-center mb-1">
        <GlossaryTerm term="Prevailing Wind">
          <span className="text-highlight ds-text-glow">
            {WIND_CHARS[prevailingWind]} Round
            {handNumber != null && <span className="text-muted-foreground text-xs ml-1">H{handNumber}</span>}
          </span>
        </GlossaryTerm>
        <GlossaryTerm term="Wall">
          <span className="text-info">Wall: {wallCount}</span>
        </GlossaryTerm>
      </div>

      {/* Phase */}
      <div className="text-center text-success text-xs mb-1">
        {PHASE_LABELS[turnPhase]}
      </div>

      {/* Players */}
      <div className="space-y-px text-xs">
        {players.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center gap-1 ${
              i === currentPlayerIndex ? 'text-info' : 'text-muted-foreground'
            }`}
          >
            {i === currentPlayerIndex && <span className="animate-blink text-success">▸</span>}
            {i !== currentPlayerIndex && <span className="w-2" />}
            <span className="text-highlight w-3">{WIND_CHARS[player.seatWind]}</span>
            <span className="flex-1 truncate">{player.name}</span>
            <span className="text-highlight">{playerScores ? playerScores[i] : player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
