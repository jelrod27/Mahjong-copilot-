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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 md:p-4">
      {/* Title */}
      <div className="text-center mb-4 md:mb-8">
        <h1 className="font-pixel text-base md:text-xl text-retro-accent retro-glow-strong mb-1 md:mb-2">
          HONG KONG
        </h1>
        <h1 className="font-pixel text-xl md:text-2xl text-retro-gold retro-glow-strong mb-2 md:mb-4">
          MAHJONG
        </h1>
        <div className="font-retro text-retro-textDim text-sm md:text-lg">
          ╔════════════════════╗
        </div>
        <div className="font-retro text-retro-textDim text-sm md:text-lg">
          ║&nbsp; 4-Player &bull; HK Rules &nbsp;║
        </div>
        <div className="font-retro text-retro-textDim text-sm md:text-lg">
          ╚════════════════════╝
        </div>
      </div>

      {/* Game mode selector */}
      <div className="retro-panel p-3 md:p-4 mb-3 md:mb-4 w-full max-w-xs">
        <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">
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
      <div className="retro-panel p-3 md:p-4 mb-3 md:mb-4 w-full max-w-xs">
        <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">
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
      <div className="retro-panel p-3 md:p-4 mb-4 md:mb-6 w-full max-w-xs">
        <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">
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
        onClick={handleStart}
        className="retro-btn-green font-pixel text-xs md:text-sm px-6 md:px-8 py-3 min-h-[44px]"
      >
        [ START GAME ]
      </button>

      {canResume && (
        <button
          onClick={handleResume}
          className="retro-btn font-pixel text-xs md:text-sm px-6 md:px-8 py-3 mt-2 min-h-[44px] border-retro-amber text-retro-gold"
        >
          [ RESUME GAME ]
        </button>
      )}

      {/* Multiplayer */}
      <button
        onClick={() => router.push('/play/lobby')}
        className="retro-btn font-pixel text-xs md:text-sm px-6 md:px-8 py-3 mt-3 min-h-[44px] border-retro-cyan text-retro-cyan"
      >
        [ MULTIPLAYER ]
      </button>

      {/* Quick reference */}
      <div className="mt-4 md:mt-8 retro-panel p-3 w-full max-w-xs">
        <div className="font-pixel text-xs text-retro-gold mb-2">QUICK RULES</div>
        <div className="font-retro text-sm text-retro-textDim space-y-1">
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
      className={`retro-btn text-left w-full ${
        selected
          ? 'bg-retro-accent text-white border-retro-gold'
          : 'bg-retro-bgLight'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`font-pixel text-xs mt-0.5 shrink-0 ${
            selected ? 'text-retro-green' : 'text-retro-textDim'
          }`}
          aria-hidden
        >
          {selected ? '✓' : '►'}
        </span>
        <div className="flex-1 min-w-0">
          <div>{primary}</div>
          {secondary && (
            <div className="font-retro text-xs text-retro-textDim mt-0.5">{secondary}</div>
          )}
        </div>
        {selected && (
          <span
            className="font-pixel text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-retro-green/25 text-retro-green shrink-0"
            data-testid="selected-badge"
          >
            Selected
          </span>
        )}
      </div>
    </button>
  );
}
