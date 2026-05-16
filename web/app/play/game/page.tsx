'use client';

import { Suspense } from 'react';
import GameContent from './GameContent';

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="font-display text-info ds-text-glow text-sm">
          LOADING<span className="animate-blink">...</span>
        </div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
