'use client';

import { Tile } from '@/models/Tile';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ClaimType } from '@/models/GameState';
import { AvailableClaim } from '@/engine/types';
import useGameController from '@/components/game/useGameController';
import GameBoard from '@/components/game/GameBoard';
import GameOverScreen from '@/components/game/GameOverScreen';
import ClaimChoiceModal from '@/components/game/ClaimChoiceModal';

export default function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const difficulty = (searchParams.get('difficulty') || 'easy') as 'easy' | 'medium' | 'hard';

  const controller = useGameController(difficulty);
  const [pendingClaim, setPendingClaim] = useState<AvailableClaim | null>(null);

  if (!controller.game) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="font-pixel text-retro-cyan retro-glow text-sm">
          DEALING TILES<span className="animate-blink">...</span>
        </div>
      </div>
    );
  }

  const handleClaim = (claimType: ClaimType) => {
    const claim = controller.claimOptions.find(c => c.claimType === claimType);
    if (!claim) return;

    // If there are multiple tile combinations, show picker
    if (claim.tilesFromHand.length > 1) {
      setPendingClaim(claim);
      return;
    }

    controller.submitClaim(
      claimType,
      claim.tilesFromHand[0] || []
    );
  };

  const handleClaimSelect = (claimType: ClaimType, tilesFromHand: Tile[]) => {
    controller.submitClaim(claimType, tilesFromHand);
    setPendingClaim(null);
  };

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
        onClaim={handleClaim}
        onPass={controller.pass}
        canDeclareKong={controller.canDeclareKong}
        canDeclareWin={controller.canDeclareWin}
        hasClaimOptions={controller.claimOptions.length > 0}
        availableClaimTypes={controller.claimOptions.map(c => c.claimType)}
        claimTimer={controller.claimTimer}
      />

      {/* Claim choice modal */}
      {pendingClaim && controller.game.lastDiscardedTile && (
        <ClaimChoiceModal
          claim={pendingClaim}
          discardedTile={controller.game.lastDiscardedTile}
          onSelect={handleClaimSelect}
          onCancel={() => { setPendingClaim(null); controller.pass(); }}
        />
      )}

      {/* Game over screen */}
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
