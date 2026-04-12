'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GameMode } from '@/models/MatchState';

type Difficulty = 'easy' | 'medium' | 'hard';

export default function PlayPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [mode, setMode] = useState<GameMode>('quick');

  const handleStart = () => {
    router.push(`/play/game?difficulty=${difficulty}&mode=${mode}`);
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
          <button
            onClick={() => setMode('quick')}
            className={`retro-btn text-center w-full text-left ${
              mode === 'quick'
                ? 'bg-retro-accent text-white border-retro-gold'
                : 'bg-retro-bgLight'
            }`}
          >
            <div>► QUICK GAME</div>
            <div className="font-retro text-xs text-retro-textDim mt-0.5">East round only (~4 hands)</div>
          </button>
          <button
            onClick={() => setMode('full')}
            className={`retro-btn text-center w-full text-left ${
              mode === 'full'
                ? 'bg-retro-accent text-white border-retro-gold'
                : 'bg-retro-bgLight'
            }`}
          >
            <div>► FULL GAME</div>
            <div className="font-retro text-xs text-retro-textDim mt-0.5">All 4 rounds (~16 hands)</div>
          </button>
        </div>
      </div>

      {/* Difficulty selector */}
      <div className="retro-panel p-3 md:p-4 mb-4 md:mb-6 w-full max-w-xs">
        <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">
          SELECT DIFFICULTY
        </div>
        <div className="flex flex-col gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`retro-btn text-center w-full ${
                difficulty === d
                  ? 'bg-retro-accent text-white border-retro-gold'
                  : 'bg-retro-bgLight'
              }`}
            >
              {d === 'easy' && '► EASY — Random AI'}
              {d === 'medium' && '► MEDIUM — Smart AI'}
              {d === 'hard' && '► HARD — Strategic AI'}
            </button>
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
