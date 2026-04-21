'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import useGameController from '@/components/game/useGameController';
import GameBoard from '@/components/game/GameBoard';
import GameErrorBoundary from '@/components/game/GameErrorBoundary';
import HandResultScreen from '@/components/game/HandResultScreen';
import MatchOverScreen from '@/components/game/MatchOverScreen';
import VoiceSubtitle from '@/components/game/VoiceSubtitle';
import { GameMode } from '@/models/MatchState';
import { useAppSelector } from '@/store/hooks';

export default function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const difficulty = (searchParams.get('difficulty') || 'easy') as 'easy' | 'medium' | 'hard';
  const mode = (searchParams.get('mode') || 'quick') as GameMode;
  // `minFaan` URL param: only 0, 1, or 3 are valid UI choices. Anything else
  // falls through to the engine default (DEFAULT_MIN_FAAN = 3).
  const rawMinFaan = Number.parseInt(searchParams.get('minFaan') ?? '', 10);
  const minFaan = [0, 1, 3].includes(rawMinFaan) ? rawMinFaan : undefined;
  const showTutor = useAppSelector((s) => s.settings.showTutor);
  const liveFaanMeter = useAppSelector((s) => s.settings.liveFaanMeter);
  const tileVoice = useAppSelector((s) => s.settings.tileVoice);

  const controller = useGameController(
    difficulty,
    mode,
    showTutor,
    liveFaanMeter,
    minFaan,
    tileVoice === 'off' ? 'off' : tileVoice,
  );

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
    <GameErrorBoundary>
      <VoiceSubtitle />
      <GameBoard
        gameState={controller.game}
        match={controller.match}
        humanPlayerId="human-player"
        selectedTileId={controller.selectedTileId}
        suggestedTileId={controller.suggestedTileId}
        tutorAdvice={controller.tutorAdvice}
        tenpaiStatus={controller.tenpaiStatus}
        tileClassifications={controller.tileClassifications}
        faanProjection={controller.faanProjection}
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

      {/* Between hands — show hand result */}
      {controller.match?.phase === 'betweenHands' && controller.isGameOver && (
        <HandResultScreen
          gameState={controller.game}
          match={controller.match}
          scoringResult={controller.scoringResult}
          onContinue={controller.continueToNextHand}
        />
      )}

      {/* Match over — show final standings */}
      {controller.isMatchOver && controller.match && (
        <MatchOverScreen
          match={controller.match}
          onPlayAgain={() => controller.startNewGame(difficulty, mode)}
          onBackToMenu={() => router.push('/play')}
        />
      )}
    </GameErrorBoundary>
  );
}
