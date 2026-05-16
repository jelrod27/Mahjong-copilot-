'use client';


import Link from 'next/link';
import { AllLevels } from '@/content';
import useCompletedLessons from '@/hooks/useCompletedLessons';

/**
 * Top-level path visualization. Pulled from level data — order and titles
 * mirror what each level teaches so this stays in sync if levels are renamed.
 */
const PATH_STEPS: string[] = [
  'Tiles',
  'Sets',
  'Winning Hands',
  'Scoring',
  'Strategy',
  'Full Game',
];


export default function LearnPage() {
  const { completedLessons } = useCompletedLessons();


  const isLevelUnlocked = (levelIndex: number) => {
    if (levelIndex === 0) return true;
    const prevLevel = AllLevels[levelIndex - 1];
    return prevLevel.lessons.every(l => completedLessons.includes(l.id));
  };

  const getLevelProgress = (levelId: number) => {
    const level = AllLevels.find(l => l.id === levelId);
    if (!level) return { completed: 0, total: 0, percent: 0 };
    const completed = level.lessons.filter(l => completedLessons.includes(l.id)).length;
    return {
      completed,
      total: level.lessons.length,
      percent: (completed / level.lessons.length) * 100,
    };
  };

  const totalCompleted = completedLessons.length;
  const totalLessons = AllLevels.reduce((sum, l) => sum + l.lessons.length, 0);
  const overallProgress = (totalCompleted / totalLessons) * 100;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-surface to-background px-6 pt-8 pb-6 rounded-b-2xl">
        <p className="font-display text-[10px] text-info tracking-[1.5px] mb-1">
          LEARN MAHJONG
        </p>
        <h1 className="font-display text-lg text-foreground mb-2">Hong Kong Mahjong</h1>
        <p className="text-base text-foreground/80 font-sans mb-4">
          Master the game from tiles to strategy across 6 levels.
        </p>

        {/* Overall Progress */}
        <div className="mt-2">
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-highlight rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-foreground/80 font-sans">
            {totalCompleted}/{totalLessons} lessons completed
          </p>
        </div>
      </div>

      {/* Level Grid */}
      <div className="p-4 space-y-3">
        <div className="ds-card p-4 border-info/40 bg-info/5">
          <p className="font-display text-[10px] text-info tracking-wider mb-2">YOUR PATH</p>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {PATH_STEPS.join(' → ')}
          </p>
        </div>
        {AllLevels.map((level, index) => {
          const unlocked = isLevelUnlocked(index);
          const progress = getLevelProgress(level.id);
          const isComplete = progress.completed === progress.total;

          return unlocked ? (
            <Link
              key={level.id}
              href={`/learn/${level.id}`}
              data-testid="learn-level-card"
              className={`block ds-card p-5 transition-colors ${
                isComplete ? 'border-success/50' : 'hover:border-info/50'
              }`}
            >
              <LevelCard
                level={level}
                progress={progress}
                unlocked={unlocked}
                isComplete={isComplete}
                previousLevelTitle={index > 0 ? AllLevels[index - 1]?.title : undefined}
              />
            </Link>
          ) : (
            <div
              key={level.id}
              data-testid="learn-level-card"
              className="block ds-card p-5 opacity-50"
            >
              <LevelCard
                level={level}
                progress={progress}
                unlocked={unlocked}
                isComplete={false}
                previousLevelTitle={index > 0 ? AllLevels[index - 1]?.title : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* All Complete */}
      {totalCompleted === totalLessons && (
        <div className="mx-4 ds-card p-8 text-center mb-8 border-highlight">
          <p className="text-5xl mb-2">🏆</p>
          <p className="font-display text-sm text-highlight ds-text-glow mb-1">All Levels Complete!</p>
          <p className="text-base text-muted-foreground font-sans">
            You&apos;ve mastered Hong Kong Mahjong. Time to play!
          </p>
        </div>
      )}
    </div>
  );
}

function LevelCard({
  level,
  progress,
  unlocked,
  isComplete,
  previousLevelTitle,
}: {
  level: { id: number; title: string; description: string; lessons: { id: string }[]; recommendedAction?: string };
  progress: { completed: number; total: number; percent: number };
  unlocked: boolean;
  isComplete: boolean;
  previousLevelTitle?: string;
}) {
  const minutes = Math.max(level.lessons.length * 2, 5);
  return (
    <div className="flex items-center">
      {/* Level number */}
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 shrink-0 ${
          isComplete
            ? 'bg-success'
            : !unlocked
              ? 'bg-muted-foreground/30'
              : 'bg-info'
        }`}
      >
        {isComplete ? (
          <span className="text-xl font-bold text-black">✓</span>
        ) : (
          <span className={`font-display text-sm ${!unlocked ? 'text-muted-foreground' : 'text-black'}`}>
            {level.id}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[17px] font-sans mb-0.5 ${!unlocked ? 'text-muted-foreground' : 'text-foreground'}`}>
          {level.title}
        </p>
        <p className={`text-sm font-sans mb-1 ${!unlocked ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
          {level.description}
        </p>
        {unlocked && level.recommendedAction && (
          <p
            className="text-xs font-sans italic text-info mb-1.5"
            data-testid={`recommended-action-${level.id}`}
          >
            {level.recommendedAction}
          </p>
        )}
        <p className={`text-xs font-sans mb-2 ${!unlocked ? 'text-muted-foreground/50' : 'text-highlight'}`}>
          {unlocked
            ? `${level.lessons.length} lessons · ~${minutes} min`
            : `Locked — complete “${previousLevelTitle}” to unlock.`}
        </p>

        {/* Progress bar */}
        {unlocked && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-elevated rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete ? 'bg-success' : 'bg-info'
                }`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-sans shrink-0">
              {progress.completed}/{progress.total}
            </span>
          </div>
        )}
      </div>

      {/* Arrow / Lock */}
      <div className="ml-2">
        {unlocked ? (
          <span className="text-3xl text-info font-light">›</span>
        ) : (
          <span className="text-lg">🔒</span>
        )}
      </div>
    </div>
  );
}
