'use client';

import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { loadStats, GameStats, QuizMode } from '@/lib/gameStats';

const QUIZ_LABELS: Record<QuizMode, string> = {
  'tile-quiz': 'Tile Quiz',
  'scoring-quiz': 'Scoring Quiz',
  'hand-recognition': 'Hand Recognition',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="ds-panel p-3 text-center">
      <div className="font-display text-[9px] text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-sm text-highlight ds-text-glow">{value}</div>
      {sub && <div className="font-sans text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function PlacementBar({ counts }: { counts: [number, number, number, number] }) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const colors = ['bg-highlight', 'bg-info', 'bg-foreground', 'bg-muted-foreground'];
  const labels = ['1st', '2nd', '3rd', '4th'];

  return (
    <div>
      <div className="flex h-4 rounded overflow-hidden mb-1">
        {counts.map((count, i) => {
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              className={`${colors[i]} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between font-sans text-xs text-muted-foreground">
        {labels.map((label, i) => (
          <span key={i}>{label}: {counts[i]}</span>
        ))}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [stats, setStats] = useState<GameStats | null>(null);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="font-display text-info ds-text-glow text-sm">LOADING...</div>
      </div>
    );
  }

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const avgPlacement = stats.gamesPlayed > 0
    ? (
        (stats.placementCounts[0] * 1 +
         stats.placementCounts[1] * 2 +
         stats.placementCounts[2] * 3 +
         stats.placementCounts[3] * 4) / stats.gamesPlayed
      ).toFixed(1)
    : '-';

  const hasPlayed = stats.gamesPlayed > 0;
  const quizEntries = (Object.entries(stats.quizzes ?? {}) as [QuizMode, { played: number; best: number; lastScore: number }][])
    .filter(([, s]) => s && s.played > 0);
  const hasQuizzed = quizEntries.length > 0;

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <TrendingUp size={32} className="text-highlight mx-auto mb-2" />
        <h1 className="font-display text-sm text-info ds-text-glow mb-1">YOUR PROGRESS</h1>
        <div className="font-sans text-xs text-muted-foreground">
          Track your mahjong journey
        </div>
      </div>

      {/* Practice quiz stats — shown whenever any quiz has been completed */}
      {hasQuizzed && (
        <div className="ds-panel p-3 mb-4" data-testid="quiz-stats">
          <div className="font-display text-[9px] text-info mb-2">PRACTICE QUIZZES</div>
          <div className="space-y-1">
            {quizEntries.map(([mode, s]) => (
              <div key={mode} className="flex justify-between font-sans text-sm">
                <span className="text-foreground">{QUIZ_LABELS[mode]}</span>
                <span className="text-muted-foreground">
                  <span className="text-highlight">{s.best}/10 best</span>
                  <span className="mx-1">&middot;</span>
                  {s.played} played
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasPlayed ? (
        <div className="ds-panel p-6 text-center">
          <div className="font-display text-xs text-highlight mb-2">NO GAMES YET</div>
          <p className="font-sans text-sm text-muted-foreground">
            Play your first game to start tracking stats!
          </p>
          <a
            href="/play"
            className="inline-block mt-4 ds-btn-success font-display text-xs"
          >
            [ PLAY NOW ]
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overview stats */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="GAMES" value={stats.gamesPlayed} />
            <StatCard label="WINS" value={stats.gamesWon} sub={`${winRate}% rate`} />
            <StatCard label="AVG PLACE" value={avgPlacement} sub="out of 4" />
          </div>

          {/* Placement distribution */}
          <div className="ds-panel p-3">
            <div className="font-display text-[9px] text-info mb-2">PLACEMENT DISTRIBUTION</div>
            <PlacementBar counts={stats.placementCounts} />
          </div>

          {/* Best hand */}
          {stats.bestFan > 0 && (
            <div className="ds-panel p-3 text-center">
              <div className="font-display text-[9px] text-highlight mb-1">BEST HAND</div>
              <div className="font-display text-sm text-accent ds-text-glow">
                {stats.bestHandName ?? `${stats.bestFan} Fan`}
              </div>
              <div className="font-sans text-xs text-muted-foreground mt-0.5">
                {stats.bestFan} fan
              </div>
            </div>
          )}

          {/* Difficulty breakdown */}
          <div className="ds-panel p-3">
            <div className="font-display text-[9px] text-info mb-2">BY DIFFICULTY</div>
            <div className="space-y-1">
              {(['easy', 'medium', 'hard'] as const).map(d => {
                const data = stats.byDifficulty[d];
                if (data.played === 0) return null;
                const rate = Math.round((data.won / data.played) * 100);
                return (
                  <div key={d} className="flex justify-between font-sans text-sm">
                    <span className="text-foreground capitalize">{d}</span>
                    <span className="text-muted-foreground">
                      {data.won}/{data.played} won ({rate}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mode breakdown */}
          <div className="ds-panel p-3">
            <div className="font-display text-[9px] text-info mb-2">BY MODE</div>
            <div className="space-y-1">
              {(['quick', 'full'] as const).map(m => {
                const data = stats.byMode[m];
                if (data.played === 0) return null;
                return (
                  <div key={m} className="flex justify-between font-sans text-sm">
                    <span className="text-foreground capitalize">{m} game</span>
                    <span className="text-muted-foreground">
                      {data.won}/{data.played} won
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total hands */}
          <div className="ds-panel p-3 text-center">
            <div className="font-display text-[9px] text-muted-foreground mb-1">TOTAL HANDS PLAYED</div>
            <div className="font-display text-sm text-info">{stats.totalHandsPlayed}</div>
          </div>
        </div>
      )}
    </div>
  );
}
