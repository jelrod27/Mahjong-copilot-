'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GameMode } from '@/models/MatchState';
import { hasSavedGame } from '@/lib/matchStorage';

type Difficulty = 'easy' | 'medium' | 'hard';
type MinFaan = 0 | 1 | 3;

const MIN_FAAN_OPTIONS: { value: MinFaan; label: string; description: string }[] = [
  { value: 3, label: 'STANDARD (3 FAAN)', description: 'HK competition rules — 3-faan minimum to win' },
  { value: 1, label: 'FAMILY (1 FAAN)', description: 'Beginner-friendly — any scoring hand wins' },
  { value: 0, label: 'CASUAL (0 FAAN)', description: 'Chicken hands allowed — pure learning mode' },
];

export default function PlayPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [mode, setMode] = useState<GameMode>('quick');
  const [minFaan, setMinFaan] = useState<MinFaan>(3);
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    setCanResume(hasSavedGame());
  }, []);

  const handleStart = () => {
    localStorage.removeItem('mahjong_match_in_progress');
    router.push(`/play/game?difficulty=${difficulty}&mode=${mode}&minFaan=${minFaan}`);
  };

  const handleResume = () => {
    router.push('/play/game');
  };

  const handleTrainingTable = () => {
    localStorage.removeItem('mahjong_match_in_progress');
    router.push('/play/game?table=training&mode=quick&difficulty=easy&minFaan=0');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 md:p-4">
      {/* Title */}
      <div className="text-center mb-4 md:mb-8">
        <h1 className="font-display text-base md:text-xl text-accent ds-text-glow-strong mb-1 md:mb-2">
          HONG KONG
        </h1>
        <h1 className="font-display text-xl md:text-2xl text-highlight ds-text-glow-strong mb-2 md:mb-4">
          MAHJONG
        </h1>
        <div className="font-sans text-muted-foreground text-sm md:text-lg">
          ╔════════════════════╗
        </div>
        <div className="font-sans text-muted-foreground text-sm md:text-lg">
          ║&nbsp; 4-Player &bull; HK Rules &nbsp;║
        </div>
        <div className="font-sans text-muted-foreground text-sm md:text-lg">
          ╚════════════════════╝
        </div>
        <p className="mt-3 max-w-sm font-sans text-xs leading-relaxed text-muted-foreground md:text-sm">
          Learn and play real HK table mahjong — not tile-matching solitaire. Solo vs AI with coach hints and hand review after each hand.
        </p>
      </div>

      {/* Game mode selector */}
      <div className="ds-panel p-3 md:p-4 mb-3 md:mb-4 w-full max-w-xs">
        <div className="font-display text-xs text-info mb-3 text-center">
          GAME MODE
        </div>
        <div className="flex flex-col gap-2">
          <SelectableButton
            selected={mode === 'quick'}
            onClick={() => setMode('quick')}
            primary="QUICK GAME"
            secondary="East round only (~4 hands)"
          />
          <SelectableButton
            selected={mode === 'full'}
            onClick={() => setMode('full')}
            primary="FULL GAME"
            secondary="All 4 rounds (~16 hands)"
          />
        </div>
      </div>

      {/* Difficulty selector */}
      <div className="ds-panel p-3 md:p-4 mb-3 md:mb-4 w-full max-w-xs">
        <div className="font-display text-xs text-info mb-3 text-center">
          SELECT DIFFICULTY
        </div>
        <div className="flex flex-col gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
            const primary: Record<Difficulty, string> = {
              easy: 'EASY — Random AI',
              medium: 'MEDIUM — Smart AI',
              hard: 'HARD — Strategic AI',
            };
            return (
              <SelectableButton
                key={d}
                selected={difficulty === d}
                onClick={() => setDifficulty(d)}
                primary={primary[d]}
              />
            );
          })}
        </div>
      </div>

      {/* Faan minimum (table rule) selector */}
      <div className="ds-panel p-3 md:p-4 mb-4 md:mb-6 w-full max-w-xs">
        <div className="font-display text-xs text-info mb-3 text-center">
          TABLE RULE
        </div>
        <div className="flex flex-col gap-2">
          {MIN_FAAN_OPTIONS.map((opt) => (
            <SelectableButton
              key={opt.value}
              selected={minFaan === opt.value}
              onClick={() => setMinFaan(opt.value)}
              primary={opt.label}
              secondary={opt.description}
            />
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        type="button"
        data-testid="start-game-button"
        onClick={handleStart}
        className="ds-btn-success min-h-[48px] px-8 py-3 font-display text-sm font-bold tracking-wide md:text-base"
      >
        Start game
      </button>

      {canResume && (
        <button
          type="button"
          data-testid="resume-game-button"
          onClick={handleResume}
          className="ds-btn mt-2 min-h-[48px] border-highlight/50 px-8 py-3 font-display text-sm font-semibold text-highlight md:text-base"
        >
          Resume saved game
        </button>
      )}

      <button
        type="button"
        data-testid="training-table-button"
        onClick={handleTrainingTable}
        className="ds-btn mt-2 min-h-[48px] border-accent/40 px-8 py-3 font-display text-sm font-semibold text-accent md:text-base"
      >
        Training table
      </button>
      <p className="mt-1 max-w-xs text-center font-sans text-[11px] text-muted-foreground">
        Easy AI, 0-faan wins, 20s claim window — best for your first few hands.
      </p>

      {/* Multiplayer */}
      <button
        type="button"
        data-testid="multiplayer-lobby-button"
        onClick={() => router.push('/play/lobby')}
        className="ds-btn mt-3 min-h-[48px] border-info/50 px-8 py-3 font-display text-sm font-semibold text-info md:text-base"
      >
        Multiplayer lobby
      </button>

      {/* Quick reference */}
      <div className="mt-4 md:mt-8 ds-panel p-3 w-full max-w-xs">
        <div className="font-display text-xs text-highlight mb-2">QUICK RULES</div>
        <div className="font-sans text-sm text-muted-foreground space-y-1">
          <p>• Draw a tile, then discard one</p>
          <p>• Claim opponent discards: Chow/Pung/Kong</p>
          <p>• First to complete 4 melds + 1 pair wins</p>
          <p>• Score based on fan (bonus patterns)</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable selector button — distinguishes selected state with both color
 * AND a leading checkmark / arrow glyph + ARIA, satisfying PRD A11Y-02
 * (no color-only state). Used by all three Play-screen selectors.
 */
function SelectableButton({
  selected,
  onClick,
  primary,
  secondary,
}: {
  selected: boolean;
  onClick: () => void;
  primary: string;
  secondary?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`ds-btn text-left w-full ${
        selected
          ? 'bg-accent text-white border-highlight'
          : 'bg-elevated'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`font-display text-xs mt-0.5 shrink-0 ${
            selected ? 'text-success' : 'text-muted-foreground'
          }`}
          aria-hidden
        >
          {selected ? '✓' : '►'}
        </span>
        <div className="flex-1 min-w-0">
          <div>{primary}</div>
          {secondary && (
            <div className="font-sans text-xs text-muted-foreground mt-0.5">{secondary}</div>
          )}
        </div>
        {selected && (
          <span
            className="font-display text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/25 text-success shrink-0"
            data-testid="selected-badge"
          >
            Selected
          </span>
        )}
      </div>
    </button>
  );
}
