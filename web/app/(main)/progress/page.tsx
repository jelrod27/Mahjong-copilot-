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
    <div className="retro-panel p-3 text-center">
      <div className="font-pixel text-[9px] text-retro-textDim mb-1">{label}</div>
      <div className="font-pixel text-sm text-retro-gold retro-glow">{value}</div>
      {sub && <div className="font-retro text-xs text-retro-textDim mt-0.5">{sub}</div>}
    </div>
  );
}

function PlacementBar({ counts }: { counts: [number, number, number, number] }) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const colors = ['bg-retro-gold', 'bg-retro-cyan', 'bg-retro-text', 'bg-retro-textDim'];
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
      <div className="flex justify-between font-retro text-xs text-retro-textDim">
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
        <div className="font-pixel text-retro-cyan retro-glow text-sm">LOADING...</div>
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
        <TrendingUp size={32} className="text-retro-gold mx-auto mb-2" />
        <h1 className="font-pixel text-sm text-retro-cyan retro-glow mb-1">YOUR PROGRESS</h1>
        <div className="font-retro text-xs text-retro-textDim">
          Track your mahjong journey
        </div>
      </div>

      {/* Practice quiz stats — shown whenever any quiz has been completed */}
      {hasQuizzed && (
        <div className="retro-panel p-3 mb-4" data-testid="quiz-stats">
          <div className="font-pixel text-[9px] text-retro-cyan mb-2">PRACTICE QUIZZES</div>
          <div className="space-y-1">
            {quizEntries.map(([mode, s]) => (
              <div key={mode} className="flex justify-between font-retro text-sm">
                <span className="text-retro-text">{QUIZ_LABELS[mode]}</span>
                <span className="text-retro-textDim">
                  <span className="text-retro-gold">{s.best}/10 best</span>
                  <span className="mx-1">&middot;</span>
                  {s.played} played
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasPlayed ? (
        <div className="retro-panel p-6 text-center">
          <div className="font-pixel text-xs text-retro-gold mb-2">NO GAMES YET</div>
          <p className="font-retro text-sm text-retro-textDim">
            Play your first game to start tracking stats!
          </p>
          <a
            href="/play"
            className="inline-block mt-4 retro-btn-green font-pixel text-xs"
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
          <div className="retro-panel p-3">
            <div className="font-pixel text-[9px] text-retro-cyan mb-2">PLACEMENT DISTRIBUTION</div>
            <PlacementBar counts={stats.placementCounts} />
          </div>

          {/* Best hand */}
          {stats.bestFan > 0 && (
            <div className="retro-panel p-3 text-center">
              <div className="font-pixel text-[9px] text-retro-gold mb-1">BEST HAND</div>
              <div className="font-pixel text-sm text-retro-accent retro-glow">
                {stats.bestHandName ?? `${stats.bestFan} Fan`}
              </div>
              <div className="font-retro text-xs text-retro-textDim mt-0.5">
                {stats.bestFan} fan
              </div>
            </div>
          )}

          {/* Difficulty breakdown */}
          <div className="retro-panel p-3">
            <div className="font-pixel text-[9px] text-retro-cyan mb-2">BY DIFFICULTY</div>
            <div className="space-y-1">
              {(['easy', 'medium', 'hard'] as const).map(d => {
                const data = stats.byDifficulty[d];
                if (data.played === 0) return null;
                const rate = Math.round((data.won / data.played) * 100);
                return (
                  <div key={d} className="flex justify-between font-retro text-sm">
                    <span className="text-retro-text capitalize">{d}</span>
                    <span className="text-retro-textDim">
                      {data.won}/{data.played} won ({rate}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mode breakdown */}
          <div className="retro-panel p-3">
            <div className="font-pixel text-[9px] text-retro-cyan mb-2">BY MODE</div>
            <div className="space-y-1">
              {(['quick', 'full'] as const).map(m => {
                const data = stats.byMode[m];
                if (data.played === 0) return null;
                return (
                  <div key={m} className="flex justify-between font-retro text-sm">
                    <span className="text-retro-text capitalize">{m} game</span>
                    <span className="text-retro-textDim">
                      {data.won}/{data.played} won
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total hands */}
          <div className="retro-panel p-3 text-center">
            <div className="font-pixel text-[9px] text-retro-textDim mb-1">TOTAL HANDS PLAYED</div>
            <div className="font-pixel text-sm text-retro-cyan">{stats.totalHandsPlayed}</div>
          </div>
        </div>
      )}
    </div>
  );
}
