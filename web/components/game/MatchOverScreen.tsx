'use client';

import { useState, useEffect, useRef } from 'react';
import { Trophy, Flame } from 'lucide-react';
import { MatchState } from '@/models/MatchState';
import { computeFinalRankings } from '@/engine/matchManager';
import { recordMatchResult, type GameStats } from '@/lib/gameStats';
import { getGraduationStatus } from '@/lib/graduation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import Confetti from './Confetti';
import { GameResultsOverlay, GameResultsSheet, GameResultsSectionLabel } from './GameResultsChrome';

interface MatchOverScreenProps {
  match: MatchState;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

const DIFFICULTY_LABELS: Record<MatchState['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

function winRate(won: number, played: number): string {
  if (played === 0) return '—';
  return `${Math.round((won / played) * 100)}%`;
}

/** Slim progress bar for tier advancement. Pure presentation. */
function TierBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface/60" aria-hidden>
      <div
        className="h-full rounded-full bg-highlight transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function MatchOverScreen({
  match, onPlayAgain, onBackToMenu,
}: MatchOverScreenProps) {
  const [showContent, setShowContent] = useState(false);
  const [stats, setStats] = useState<GameStats | null>(null);
  const rankings = computeFinalRankings(match);
  const humanRank = rankings.find(r => r.playerIndex === 0)?.rank ?? 4;
  const statsSavedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (statsSavedRef.current) return;
    statsSavedRef.current = true;

    let bestFan = 0;
    let bestHandName: string | null = null;
    for (const hr of match.handResults) {
      if (hr.scoringResult && hr.scoringResult.totalFan > bestFan) {
        bestFan = hr.scoringResult.totalFan;
        bestHandName = hr.scoringResult.handName ?? null;
      }
    }

    // Single write path. Capture the post-match stats so the recap reports
    // against numbers that already include this match (streak, tiers, rates).
    setStats(recordMatchResult({
      difficulty: match.difficulty,
      mode: match.mode,
      humanPlacement: humanRank,
      totalHandsPlayed: match.totalHandsPlayed,
      bestFanThisMatch: bestFan,
      bestHandNameThisMatch: bestHandName,
    }));
  }, [match, humanRank]);

  const rankColors = ['text-highlight', 'text-info', 'text-foreground', 'text-muted-foreground'];
  const rankLabels = ['1st', '2nd', '3rd', '4th'];
  const isTop2 = humanRank <= 2;

  const graduation = stats ? getGraduationStatus(stats) : null;
  const diffStats = stats?.byDifficulty[match.difficulty];

  // Streak line: describe what this match did to the goal.
  let streakLine: string;
  if (!stats) {
    streakLine = '';
  } else if (isTop2 && stats.currentTop2Streak > 1) {
    streakLine = `Top-2 streak extended to ${stats.currentTop2Streak}`;
  } else if (isTop2) {
    streakLine = 'Top-2 streak started';
  } else if (stats.bestTop2Streak > 0) {
    streakLine = `Streak reset. Your best run is ${stats.bestTop2Streak}`;
  } else {
    streakLine = 'Finish top-2 to start a streak';
  }

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, showContent);

  return (
    <GameResultsOverlay>
      {humanRank === 1 && showContent && <Confetti />}
      <GameResultsSheet
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-over-heading"
        className={showContent ? 'animate-slide-up' : 'pointer-events-none opacity-0'}
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-highlight/30 bg-highlight/10">
            <Trophy className="h-6 w-6 text-highlight" strokeWidth={1.75} aria-hidden />
          </span>
          <h2 id="match-over-heading" className="font-display text-base text-foreground md:text-lg">
            Match complete
          </h2>
          {humanRank === 1 ? (
            <p className="font-sans text-sm text-success md:text-base">
              You finished first — table cleared.
            </p>
          ) : (
            <p className="font-sans text-sm text-muted-foreground md:text-base">
              You placed {rankLabels[humanRank - 1]}. Every match sharpens the next one.
            </p>
          )}
        </div>

        {/* Progress arc leads the screen: the "you got better" signal is the point. */}
        {graduation && (
          <div className="mb-5" data-testid="match-progress-arc">
            <GameResultsSectionLabel>Your progress</GameResultsSectionLabel>
            <div className="game-hud-surface space-y-3 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 font-sans text-sm text-foreground">
                  <Flame
                    className={isTop2 && stats!.currentTop2Streak > 0 ? 'h-4 w-4 text-accent' : 'h-4 w-4 text-muted-foreground'}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  Top-2 streak
                </span>
                <span className="font-display text-base text-highlight ds-text-glow tabular-nums" data-testid="streak-value">
                  {stats!.currentTop2Streak}
                </span>
              </div>
              <p className="font-sans text-xs text-muted-foreground">{streakLine}</p>

              {graduation.nextTier ? (
                <div data-testid="tier-progress">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-sans text-sm text-foreground">
                      Next: {graduation.nextTier.label}
                    </span>
                    <span className="font-sans text-xs tabular-nums text-muted-foreground">
                      {graduation.nextTier.current} / {graduation.nextTier.target}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-muted-foreground">
                    {graduation.nextTier.requirement}
                  </p>
                  <TierBar current={graduation.nextTier.current} target={graduation.nextTier.target} />
                </div>
              ) : (
                <p className="font-sans text-sm text-success" data-testid="tier-progress">
                  Every tier cleared. You are a Table Master.
                </p>
              )}

              {graduation.currentTier && (
                <p className="font-sans text-[11px] text-muted-foreground">
                  Tier {graduation.earnedCount} of {graduation.totalCount}: {graduation.currentTier.label}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <GameResultsSectionLabel>Final standings</GameResultsSectionLabel>
          {rankings.map(entry => (
            <div
              key={entry.playerIndex}
              className={`flex justify-between border-b border-border/15 py-2 font-sans text-sm last:border-0 ${rankColors[entry.rank - 1]}`}
            >
              <span>
                <span className="tabular-nums text-muted-foreground">{rankLabels[entry.rank - 1]}</span>
                {' · '}
                {entry.name}
                {entry.playerIndex === 0 && (
                  <span className="ml-1 rounded bg-info/15 px-1.5 py-0.5 text-[10px] font-medium text-info">
                    You
                  </span>
                )}
              </span>
              <span className="font-medium tabular-nums ds-text-glow">{entry.score} pts</span>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <GameResultsSectionLabel>Match stats</GameResultsSectionLabel>
          <div className="game-hud-surface space-y-2 rounded-lg p-3 font-sans text-sm text-muted-foreground">
            <div className="flex justify-between gap-4">
              <span>Mode</span>
              <span className="text-right text-foreground">
                {match.mode === 'full' ? 'Full game (four rounds)' : 'Quick game (East only)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Hands played</span>
              <span className="text-foreground">{match.totalHandsPlayed}</span>
            </div>
            {diffStats && (
              <div className="flex justify-between">
                <span>{DIFFICULTY_LABELS[match.difficulty]} win rate</span>
                <span className="text-foreground tabular-nums">
                  {winRate(diffStats.won, diffStats.played)}
                  <span className="ml-1 text-muted-foreground">({diffStats.won}/{diffStats.played})</span>
                </span>
              </div>
            )}
            {stats && stats.bestFan > 0 && (
              <div className="flex justify-between gap-4">
                <span>Biggest hand</span>
                <span className="text-right text-foreground">
                  {stats.bestFan} faan{stats.bestHandName ? ` · ${stats.bestHandName}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {match.handResults.length > 0 && (
          <div className="mb-6">
            <GameResultsSectionLabel>Hand history</GameResultsSectionLabel>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/20 bg-surface/30 p-2">
              {match.handResults.map((hr, i) => (
                <div key={i} className="flex justify-between font-sans text-[11px] text-muted-foreground md:text-xs">
                  <span>
                    {hr.round.toUpperCase()} · Hand {hr.handNumber}
                  </span>
                  <span className="max-w-[55%] truncate text-right text-foreground/90">
                    {hr.winnerId
                      ? `${match.playerNames[
                          hr.winnerId === 'human-player' ? 0 :
                          parseInt(hr.winnerId.replace('ai_', ''), 10) || 0
                        ]}${hr.isSelfDrawn ? ' (self-draw)' : ' (claim)'}`
                      : 'Draw'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <button
            type="button"
            className="ds-btn-success min-h-[44px] font-display text-xs md:text-sm"
            onClick={onPlayAgain}
          >
            Play again
          </button>
          <button
            type="button"
            className="ds-btn min-h-[44px] bg-surface/80 font-display text-xs md:text-sm"
            onClick={onBackToMenu}
          >
            Back to menu
          </button>
        </div>
      </GameResultsSheet>
    </GameResultsOverlay>
  );
}
