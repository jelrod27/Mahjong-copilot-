'use client';

import { Suspense } from 'react';
import GameContent from './GameContent';

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-retro-bg">
        <div className="font-pixel text-retro-cyan retro-glow text-sm">
          LOADING<span className="animate-blink">...</span>
        </div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
