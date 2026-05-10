'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, LogOut, Volume2, VolumeX } from 'lucide-react';
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
  [WindTile.EAST]: '東',
  [WindTile.SOUTH]: '南',
  [WindTile.WEST]: '西',
  [WindTile.NORTH]: '北',
};

const PHASE_LABELS: Record<TurnPhase, string> = {
  draw: 'Drawing',
  discard: 'Discard',
  claim: 'Claims',
  endOfTurn: 'End of turn',
};

function IconToggle({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-fast ease-ds-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50 ${
        pressed
          ? 'border-info/50 bg-info/15 text-info'
          : 'border-border/40 bg-background/30 text-muted-foreground hover:border-info/35 hover:text-info'
      }`}
    >
      {children}
    </button>
  );
}

export default function GameHUD({
  wallCount,
  prevailingWind,
  currentPlayerIndex,
  players,
  turnPhase,
  handNumber,
  playerScores,
  compact = false,
}: GameHUDProps) {
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());
  const showTutor = useAppSelector((s) => s.settings.showTutor);
  const dispatch = useAppDispatch();

  const leaveToMenu = () => {
    if (
      typeof window !== 'undefined' &&
      window.confirm(
        'Leave this game and return to the play menu? Your progress in this hand will be lost.',
      )
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

  if (compact) {
    return (
      <div className="flex w-full items-center justify-between gap-2 font-sans text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md border border-highlight/30 bg-highlight/10 px-1.5 py-0.5 font-display text-[10px] font-semibold tracking-wide text-highlight">
            {WIND_CHARS[prevailingWind]}
            {handNumber != null && (
              <span className="ml-0.5 font-normal text-muted-foreground">· H{handNumber}</span>
            )}
          </span>
          <GlossaryTerm term="Wall">
            <span data-testid="wall-count-display" className="whitespace-nowrap text-info">
              Wall {wallCount}
            </span>
          </GlossaryTerm>
          <span className="hidden truncate text-[10px] text-muted-foreground sm:inline">
            {PHASE_LABELS[turnPhase]}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconToggle
            pressed={showTutor}
            onClick={toggleAssist}
            label={showTutor ? 'Hide Beginner Assist hints' : 'Show Beginner Assist hints'}
          >
            <Lightbulb className="size-3.5" strokeWidth={2} aria-hidden />
          </IconToggle>
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute game sounds' : 'Unmute game sounds'}
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50 ${
              soundOn
                ? 'border-border/40 bg-background/30 text-muted-foreground hover:border-info/35 hover:text-info'
                : 'border-info/40 bg-info/10 text-info'
            }`}
          >
            {soundOn ? (
              <Volume2 className="size-3.5" strokeWidth={2} aria-hidden />
            ) : (
              <VolumeX className="size-3.5" strokeWidth={2} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={leaveToMenu}
            aria-label="Leave game and return to play menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-background/30 text-muted-foreground transition-colors hover:border-info/35 hover:text-info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50"
          >
            <LogOut className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-hud-surface p-3 font-sans text-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Table
          </p>
          <p className="mt-0.5 text-xs text-foreground/90">Hong Kong · Solo</p>
        </div>
        <div className="flex items-center gap-1">
          <IconToggle
            pressed={showTutor}
            onClick={toggleAssist}
            label={showTutor ? 'Hide Beginner Assist hints' : 'Show Beginner Assist hints'}
          >
            <Lightbulb className="size-4" strokeWidth={2} aria-hidden />
          </IconToggle>
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute game sounds' : 'Unmute game sounds'}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50 ${
              soundOn
                ? 'border-border/40 bg-background/30 text-muted-foreground hover:border-info/35 hover:text-info'
                : 'border-info/40 bg-info/10 text-info'
            }`}
          >
            {soundOn ? (
              <Volume2 className="size-4" strokeWidth={2} aria-hidden />
            ) : (
              <VolumeX className="size-4" strokeWidth={2} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={leaveToMenu}
            aria-label="Leave game and return to play menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-background/30 text-muted-foreground transition-colors hover:border-info/35 hover:text-info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50"
          >
            <LogOut className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/30 pb-3">
        <GlossaryTerm term="Prevailing Wind">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl leading-none text-highlight ds-text-glow-strong">
              {WIND_CHARS[prevailingWind]}
            </span>
            <div>
              <p className="text-[11px] font-medium text-foreground">Prevailing wind</p>
              {handNumber != null && (
                <p className="text-[10px] text-muted-foreground">Hand {handNumber}</p>
              )}
            </div>
          </div>
        </GlossaryTerm>
        <GlossaryTerm term="Wall">
          <div data-testid="wall-count-display" className="text-right">
            <p className="text-[11px] font-medium text-info">Wall</p>
            <p className="font-display text-lg leading-none text-info">{wallCount}</p>
          </div>
        </GlossaryTerm>
      </div>

      <div className="mb-3 flex justify-center">
        <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-success">
          {PHASE_LABELS[turnPhase]}
        </span>
      </div>

      <div className="space-y-1">
        <p className="mb-1 font-display text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Players
        </p>
        {players.map((player, i) => {
          const active = i === currentPlayerIndex;
          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                active ? 'bg-info/12 ring-1 ring-info/25' : 'bg-background/20'
              }`}
            >
              {active ? (
                <span className="w-1.5 shrink-0 rounded-full bg-info shadow-[0_0_8px_rgb(56_189_248_/_0.6)]" aria-hidden />
              ) : (
                <span className="w-1.5 shrink-0" aria-hidden />
              )}
              <span className="w-5 shrink-0 text-center font-display text-highlight">
                {WIND_CHARS[player.seatWind]}
              </span>
              <span className={`min-w-0 flex-1 truncate ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {player.name}
              </span>
              <span className="shrink-0 font-display tabular-nums text-highlight">
                {playerScores ? playerScores[i] : player.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
