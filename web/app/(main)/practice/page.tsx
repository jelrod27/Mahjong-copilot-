'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useGameController from '@/components/game/useGameController';
import GameBoard from '@/components/game/GameBoard';
import GameOverScreen from '@/components/game/GameOverScreen';
import HintOverlay from '@/components/game/HintOverlay';

export default function PracticePage() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [showHints, setShowHints] = useState(true);

  if (!started) {
    return <PracticeSetup onStart={() => setStarted(true)} />;
  }

  return (
    <PracticeGame
      showHints={showHints}
      onToggleHints={() => setShowHints(h => !h)}
      onBack={() => router.push('/practice')}
    />
  );
}

function PracticeSetup({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="retro-card p-8 max-w-sm w-full text-center">
        <p className="font-pixel text-[10px] text-retro-cyan tracking-[1.5px] mb-2">
          PRACTICE MODE
        </p>
        <h1 className="font-pixel text-sm text-retro-gold retro-glow mb-4">
          Play with Hints
        </h1>
        <p className="text-retro-text/80 font-retro text-base mb-6 leading-relaxed">
          Play against Easy AI with a hint overlay that shows you safe tiles,
          how close you are to winning, and strategic advice.
        </p>
        <div className="space-y-3">
          <div className="retro-card p-3 text-left">
            <p className="text-sm font-retro text-retro-cyan mb-1">What you&apos;ll see:</p>
            <ul className="text-sm font-retro text-retro-textDim space-y-1">
              <li>&#8226; Shanten count (distance to win)</li>
              <li>&#8226; Safe tile indicators</li>
              <li>&#8226; Tutor advice on each turn</li>
            </ul>
          </div>
          <button
            className="retro-btn-green w-full py-4 text-lg"
            onClick={onStart}
          >
            Start Practice
          </button>
        </div>
      </div>
    </div>
  );
}

function PracticeGame({
  showHints,
  onToggleHints,
  onBack,
}: {
  showHints: boolean;
  onToggleHints: () => void;
  onBack: () => void;
}) {
  const controller = useGameController('easy');

  if (!controller.game) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="font-pixel text-retro-cyan retro-glow text-sm">
          DEALING TILES<span className="animate-blink">...</span>
        </div>
      </div>
    );
  }

  const humanIndex = controller.game.players.findIndex(p => p.id === 'human-player');

  return (
    <>
      <GameBoard
        gameState={controller.game}
        humanPlayerId="human-player"
        selectedTileId={controller.selectedTileId}
        suggestedTileId={controller.suggestedTileId}
        tutorAdvice={controller.tutorAdvice}
        onTileSelect={controller.selectTile}
        onDiscard={controller.discardSelected}
        onKong={controller.declareKong}
        onWin={controller.declareWin}
        onClaimBest={controller.claimBest}
        onSubmitChow={controller.submitChow}
        onPass={controller.pass}
        canDeclareKong={controller.canDeclareKong}
        canDeclareWin={controller.canDeclareWin}
        hasClaimOptions={controller.claimOptions.length > 0}
        claimOptions={controller.claimOptions}
        claimTimer={controller.claimTimer}
      />

      <HintOverlay
        game={controller.game}
        humanPlayerIndex={humanIndex >= 0 ? humanIndex : 0}
        showHints={showHints}
        onToggle={onToggleHints}
      />

      {controller.isGameOver && (
        <GameOverScreen
          gameState={controller.game}
          scoringResult={controller.scoringResult}
          onPlayAgain={() => controller.startNewGame('easy')}
          onBackToMenu={onBack}
        />
      )}
    </>
  );
}
