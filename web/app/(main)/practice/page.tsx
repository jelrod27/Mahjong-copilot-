'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useGameController from '@/components/game/useGameController';
import GameBoard from '@/components/game/GameBoard';
import GameOverScreen from '@/components/game/GameOverScreen';
import HintOverlay from '@/components/game/HintOverlay';
import TileQuiz from './TileQuiz';
import ScoringQuiz from './ScoringQuiz';
import HandRecognition from './HandRecognition';
import { loadStats, type GameStats, type QuizMode } from '@/lib/gameStats';
import { deriveMastery, getRecommendedQuiz, masteryLabel } from '@/lib/mastery';

type Mode = 'menu' | 'tile-quiz' | 'scoring-quiz' | 'hand-recognition' | 'practice-game';

export default function PracticePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('menu');
  const [showHints, setShowHints] = useState(true);

  if (mode === 'menu') {
    return <PracticeMenu onSelect={setMode} />;
  }

  if (mode === 'tile-quiz') {
    return <TileQuiz onBack={() => setMode('menu')} />;
  }

  if (mode === 'scoring-quiz') {
    return <ScoringQuiz onBack={() => setMode('menu')} />;
  }

  if (mode === 'hand-recognition') {
    return <HandRecognition onBack={() => setMode('menu')} />;
  }

  return (
    <PracticeGame
      showHints={showHints}
      onToggleHints={() => setShowHints(h => !h)}
      onBack={() => setMode('menu')}
    />
  );
}

/* ─────────────────────────────────────────
   Practice Menu
   ───────────────────────────────────────── */

interface ModeCard {
  key: Mode;
  title: string;
  desc: string;
  icon: string;
  color: string;
  meta: string;
  /** Quiz mode key for stats lookup, undefined for non-quiz modes (e.g. practice-game). */
  quizMode?: QuizMode;
}

const MODES: ModeCard[] = [
  {
    key: 'tile-quiz',
    title: 'Tile Quiz',
    desc: 'Identify tile types from descriptions, names, and images. 10 questions per round.',
    icon: '?',
    color: 'text-retro-cyan',
    meta: '10 questions · ~3 min',
    quizMode: 'tile-quiz',
  },
  {
    key: 'scoring-quiz',
    title: 'Scoring Quiz',
    desc: 'Calculate fan count for described hands. Test your scoring knowledge.',
    icon: '#',
    color: 'text-retro-gold',
    meta: '10 questions · fan practice',
    quizMode: 'scoring-quiz',
  },
  {
    key: 'hand-recognition',
    title: 'Hand Recognition',
    desc: 'Is this a valid winning hand? Yes or no. Quick-fire decisions.',
    icon: '!',
    color: 'text-retro-green',
    meta: 'Fast drill · pattern recognition',
    quizMode: 'hand-recognition',
  },
  {
    key: 'practice-game',
    title: 'Play with Hints',
    desc: 'Full game against Easy AI with shanten, safe tiles, and tutor advice.',
    icon: '>',
    color: 'text-retro-accent',
    meta: 'Guided game · beginner assist',
  },
];

const MASTERY_BADGE_CLASS: Record<ReturnType<typeof deriveMastery>, string> = {
  new: 'bg-retro-bgLight text-retro-textDim border border-retro-border/40',
  'needs-work': 'bg-retro-accent/15 text-retro-accent',
  improving: 'bg-retro-gold/15 text-retro-gold',
  mastered: 'bg-retro-green/20 text-retro-green',
};

function PracticeMenu({ onSelect }: { onSelect: (mode: Mode) => void }) {
  // Hydrate after mount so SSR and client agree on the initial render.
  const [stats, setStats] = useState<GameStats | null>(null);
  useEffect(() => {
    setStats(loadStats());
  }, []);

  const quizModes: QuizMode[] = MODES.flatMap(m => (m.quizMode ? [m.quizMode] : []));
  const recommendedMode = stats ? getRecommendedQuiz(stats, quizModes) : null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-retro-panel to-retro-bg px-6 pt-8 pb-6 rounded-b-2xl">
        <p className="font-pixel text-[10px] text-retro-cyan tracking-[1.5px] mb-1">
          PRACTICE
        </p>
        <h1 className="font-pixel text-lg text-retro-white mb-2">Sharpen Your Skills</h1>
        <p className="text-base text-retro-text/80 font-retro">
          Quizzes and guided play to reinforce what you&apos;ve learned.
        </p>
      </div>

      {/* Mode Cards */}
      <div className="p-4 space-y-3">
        {MODES.map(m => {
          const entry = m.quizMode ? stats?.quizzes?.[m.quizMode] : undefined;
          const mastery = m.quizMode ? deriveMastery(entry) : null;
          const isRecommended = m.quizMode != null && m.quizMode === recommendedMode;
          const hasAttempts = (entry?.played ?? 0) > 0;
          const ctaLabel = m.quizMode
            ? (hasAttempts ? 'CONTINUE' : 'START')
            : 'PLAY';

          return (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              data-testid={`practice-card-${m.key}`}
              className="w-full retro-card p-5 text-left hover:border-retro-cyan/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-retro-bgLight ${m.color}`}>
                  <span className="font-pixel text-lg">{m.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-[17px] font-retro text-retro-text">{m.title}</p>
                    {mastery && (
                      <span
                        className={`rounded px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider shrink-0 ${MASTERY_BADGE_CLASS[mastery]}`}
                        data-testid={`mastery-badge-${m.key}`}
                      >
                        {masteryLabel(mastery)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {isRecommended && (
                      <span
                        className="rounded bg-retro-cyan/15 px-2 py-0.5 font-pixel text-[8px] text-retro-cyan"
                        data-testid={`recommended-${m.key}`}
                      >
                        Recommended
                      </span>
                    )}
                    <span className="text-xs font-retro text-retro-gold">{m.meta}</span>
                  </div>
                  <p className="text-sm font-retro text-retro-textDim">{m.desc}</p>
                  {entry && entry.played > 0 && (
                    <p className="text-xs font-retro text-retro-gold mt-1">
                      Best: {entry.best}/10 · Last: {entry.lastScore}/10 ·{' '}
                      {entry.played} {entry.played === 1 ? 'attempt' : 'attempts'}
                    </p>
                  )}
                </div>
                <span className="font-pixel text-[10px] text-retro-cyan shrink-0">{ctaLabel} ›</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Practice Game (existing)
   ───────────────────────────────────────── */

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
