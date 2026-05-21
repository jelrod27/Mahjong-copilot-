'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import useGameController from '@/components/game/useGameController';
import GameBoard from '@/components/game/GameBoard';
import GameErrorBoundary from '@/components/game/GameErrorBoundary';
import HandResultScreen from '@/components/game/HandResultScreen';
import MatchOverScreen from '@/components/game/MatchOverScreen';
import VoiceSubtitle from '@/components/game/VoiceSubtitle';
import { TilePaletteProvider } from '@/components/game/TilePaletteContext';
import { GameMode } from '@/models/MatchState';
import { useAppSelector } from '@/store/hooks';

const URL_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const URL_MODES = ['quick', 'full'] as const;

export default function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawDifficulty = searchParams.get('difficulty');
  const difficulty: (typeof URL_DIFFICULTIES)[number] = (URL_DIFFICULTIES as readonly string[]).includes(
    rawDifficulty ?? '',
  )
    ? (rawDifficulty as (typeof URL_DIFFICULTIES)[number])
    : 'easy';
  const rawMode = searchParams.get('mode');
  const mode: GameMode = (URL_MODES as readonly string[]).includes(rawMode ?? '')
    ? (rawMode as GameMode)
    : 'quick';
  // `minFaan` URL param: only exact '0', '1', or '3' are valid. Strict string
  // match avoids `parseInt` quirks like '3abc' → 3 silently validating.
  const rawMinFaan = searchParams.get('minFaan');
  const minFaan = rawMinFaan === '0' || rawMinFaan === '1' || rawMinFaan === '3'
    ? Number(rawMinFaan)
    : undefined;
  const showTutor = useAppSelector((s) => s.settings.showTutor);
  const liveFaanMeter = useAppSelector((s) => s.settings.liveFaanMeter);
  const tileVoice = useAppSelector((s) => s.settings.tileVoice);

  const controller = useGameController(
    difficulty,
    mode,
    showTutor,
    liveFaanMeter,
    minFaan,
    tileVoice,
  );

  if (!controller.game) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-6">
        <div
          className="size-12 rounded-full border-2 border-info/30 border-t-info animate-spin"
          aria-hidden
        />
        <div className="text-center">
          <p className="font-display text-sm font-semibold tracking-wide text-foreground">Setting the table</p>
          <p className="mt-1 font-sans text-xs text-muted-foreground">Shuffling tiles and seating opponents…</p>
        </div>
      </div>
    );
  }

  return (
    <GameErrorBoundary>
      <TilePaletteProvider>
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
      </TilePaletteProvider>
    </GameErrorBoundary>
  );
}
