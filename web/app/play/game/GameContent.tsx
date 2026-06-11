'use client';

import { useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useGameController, { type TablePreset } from '@/components/game/useGameController';
import GameBoard from '@/components/game/GameBoard';
import GameErrorBoundary from '@/components/game/GameErrorBoundary';
import HandResultScreen from '@/components/game/HandResultScreen';
import MatchOverScreen from '@/components/game/MatchOverScreen';
import VoiceSubtitle from '@/components/game/VoiceSubtitle';
import PlayOnboardingDialog from '@/components/play/PlayOnboardingDialog';
import { TilePaletteProvider } from '@/components/game/TilePaletteContext';
import { GameMode } from '@/models/MatchState';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveMatchRoster } from '@/store/actions/settingsActions';
import { hasSeenPlayOnboarding } from '@/lib/playOnboarding';
import BootOverlay from '@/components/game/BootOverlay';
import FloorDialog from '@/components/parlour/FloorDialog';
import musicEngine from '@/lib/musicEngine';
import { GamePhase } from '@/models/GameState';
import { getFloor, floorSupportCast, recordFloorAttempt, recordFloorWin } from '@/lib/parlour';
import { computeFinalRankings } from '@/engine/matchManager';
import { useEffect, useRef } from 'react';

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
  // Parlour floor match: ?floor=N overrides difficulty/minFaan/seats
  const rawFloor = searchParams.get('floor');
  const floorDef = rawFloor && /^[1-9]$/.test(rawFloor) ? getFloor(Number(rawFloor)) : undefined;
  const tablePreset: TablePreset = searchParams.get('table') === 'training' ? 'training' : 'standard';
  const isTrainingTable = tablePreset === 'training';
  const effectiveDifficulty = isTrainingTable ? 'easy' : difficulty;
  const effectiveMinFaan = isTrainingTable ? 0 : minFaan;
  const showTutor = useAppSelector((s) => s.settings.showTutor);
  const liveFaanMeter = useAppSelector((s) => s.settings.liveFaanMeter);
  const tileVoice = useAppSelector((s) => s.settings.tileVoice);
  const npcRosterMode = useAppSelector((s) => s.settings.npcRosterMode);
  const npcRoster = useAppSelector((s) => s.settings.npcRoster);
  const dispatch = useAppDispatch();
  const [showOnboarding, setShowOnboarding] = useState(() => !floorDef && !hasSeenPlayOnboarding());
  const [showPreMatch, setShowPreMatch] = useState(() => !!floorDef);
  const [postMatchDialogDismissed, setPostMatchDialogDismissed] = useState(false);
  const floorResultRecordedRef = useRef(false);

  // Count the attempt once per floor-match mount
  useEffect(() => {
    if (floorDef) recordFloorAttempt(floorDef.floor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const musicEnabled = useAppSelector((s) => s.settings.musicEnabled);

  const onMatchRosterResolved = useCallback(
    (rosterId: typeof npcRoster) => {
      void dispatch(setActiveMatchRoster(rosterId));
    },
    [dispatch],
  );

  const controller = useGameController(
    effectiveDifficulty,
    mode,
    showTutor,
    liveFaanMeter,
    effectiveMinFaan,
    tileVoice,
    tablePreset,
    npcRosterMode,
    npcRoster,
    onMatchRosterResolved,
    floorDef?.floor,
  );

  // Floor match outcome: rank 1 in the quick match clears the floor.
  const floorMatchOver = !!floorDef && controller.isMatchOver && !!controller.match;
  const floorHumanWon = floorMatchOver
    ? computeFinalRankings(controller.match!).find(r => r.playerIndex === 0)?.rank === 1
    : false;
  useEffect(() => {
    if (!floorMatchOver || !floorDef || floorResultRecordedRef.current) return;
    floorResultRecordedRef.current = true;
    if (floorHumanWon) {
      const bestFan = Math.max(
        0,
        ...((controller.match?.handResults ?? [])
          .filter(h => h.winnerId === 'human-player')
          .map(h => h.scoringResult?.totalFan ?? 0)),
      );
      recordFloorWin(floorDef.floor, bestFan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorMatchOver, floorHumanWon]);

  // === Music: parlour theme during play, danger motif on the last stretch
  // of the wall; intensity rises with the Parlour wing. Stops on unmount.
  const gamePhase = controller.game?.phase;
  const wallLow = !!controller.game &&
    controller.game.phase === GamePhase.PLAYING &&
    controller.game.wall.length <= 8;
  useEffect(() => {
    musicEngine.setEnabled(musicEnabled);
    if (!musicEnabled) return;
    if (gamePhase !== GamePhase.PLAYING) return;
    const intensity = floorDef ? (floorDef.floor <= 3 ? 0 : floorDef.floor <= 6 ? 1 : 2) : 0;
    musicEngine.play(wallLow ? 'danger' : 'parlour', intensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicEnabled, wallLow, gamePhase]);
  useEffect(() => {
    // Browsers gate AudioContext on a user gesture: retry the loop on the
    // first interaction so music starts as soon as it is allowed to.
    const kick = () => {
      if (musicEnabled && controller.game?.phase === GamePhase.PLAYING) {
        musicEngine.play(wallLow ? 'danger' : 'parlour');
      }
    };
    window.addEventListener('pointerdown', kick, { once: true });
    return () => window.removeEventListener('pointerdown', kick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicEnabled]);
  useEffect(() => () => musicEngine.stop(), []);

  const floorSeats = floorDef
    ? (() => {
        const [castA, castB] = floorSupportCast(floorDef.floor);
        // Seat indices in the match: 1 = right, 2 = top (rival), 3 = left
        return { right: castA, top: floorDef.rival, left: castB } as const;
      })()
    : undefined;

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
      <BootOverlay />
      <VoiceSubtitle />
      {showOnboarding && (
        <PlayOnboardingDialog onDone={() => setShowOnboarding(false)} />
      )}
      {isTrainingTable && (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-[55] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
          aria-hidden
        >
          <span className="rounded-full border border-accent/40 bg-surface/90 px-3 py-1 font-sans text-[10px] text-accent backdrop-blur-sm">
            Training table — relaxed rules, longer claim window
          </span>
        </div>
      )}
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
        onSortHand={controller.sortHand}
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
        claimTimeoutMs={controller.claimTimeoutMs}
        npcSeatsOverride={floorSeats}
      />

      {/* Parlour: rival greets you before the first tile */}
      {floorDef && showPreMatch && !controller.isMatchOver && (
        <FloorDialog
          npcId={floorDef.rival}
          kind="preMatch"
          floorNumber={floorDef.floor}
          floorName={floorDef.name}
          actionLabel="Sit down"
          onAction={() => setShowPreMatch(false)}
        />
      )}

      {/* Parlour: post-match dialogue layers above the standings */}
      {floorDef && floorMatchOver && !postMatchDialogDismissed && (
        <FloorDialog
          npcId={floorDef.rival}
          kind={floorHumanWon ? 'winMatch' : 'loseMatch'}
          floorNumber={floorDef.floor}
          floorName={floorDef.name}
          actionLabel={
            floorHumanWon
              ? (floorDef.floor < 9 ? `Climb to floor ${floorDef.floor + 1}` : 'Return to the Parlour')
              : 'Challenge again'
          }
          onAction={() => {
            // Full navigation on purpose: same-route pushes would keep the
            // finished match's controller state alive.
            if (floorHumanWon && floorDef.floor >= 9) {
              router.push('/parlour');
            } else {
              const next = floorHumanWon ? floorDef.floor + 1 : floorDef.floor;
              window.location.href = `/play/game?floor=${next}`;
            }
          }}
          secondaryLabel={floorHumanWon ? 'See the table' : 'Back to the Parlour'}
          onSecondary={() => {
            if (floorHumanWon) {
              setPostMatchDialogDismissed(true);
            } else {
              router.push('/parlour');
            }
          }}
        />
      )}

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
      {controller.isMatchOver && controller.match && (!floorDef || postMatchDialogDismissed) && (
        <MatchOverScreen
          match={controller.match}
          onPlayAgain={() => {
            if (floorDef) {
              // Full navigation so the floor remount records attempts and
              // shows pre-match dialogue again
              window.location.href = `/play/game?floor=${floorDef.floor}`;
            } else {
              controller.startNewGame(effectiveDifficulty, mode);
            }
          }}
          onBackToMenu={() => router.push(floorDef ? '/parlour' : '/play')}
        />
      )}
      </TilePaletteProvider>
    </GameErrorBoundary>
  );
}
