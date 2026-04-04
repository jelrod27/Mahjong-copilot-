'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import useGameController from '@/components/game/useGameController';
import useClaimHandler from '@/hooks/useClaimHandler';
import GameBoard from '@/components/game/GameBoard';
import GameOverScreen from '@/components/game/GameOverScreen';

export default function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const difficulty = (searchParams.get('difficulty') || 'easy') as 'easy' | 'medium' | 'hard';

  const controller = useGameController(difficulty);
  const { claimBest, pass } = useClaimHandler({
    claimOptions: controller.claimOptions,
    submitClaim: controller.submitClaim,
    pass: controller.pass,
  });

  if (!controller.game) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="font-pixel text-retro-cyan retro-glow text-sm">
          DEALING TILES<span className="animate-blink">...</span>
        </div>
      </div>
    );
  }

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
        onClaimBest={claimBest}
        onPass={pass}
        canDeclareKong={controller.canDeclareKong}
        canDeclareWin={controller.canDeclareWin}
        hasClaimOptions={controller.claimOptions.length > 0}
        claimOptions={controller.claimOptions}
        claimTimer={controller.claimTimer}
      />

      {controller.isGameOver && (
        <GameOverScreen
          gameState={controller.game}
          scoringResult={controller.scoringResult}
          onPlayAgain={() => controller.startNewGame(difficulty)}
          onBackToMenu={() => router.push('/play')}
        />
      )}
    </>
  );
}
