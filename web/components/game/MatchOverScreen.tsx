'use client';

import { useState, useEffect, useRef } from 'react';
import { MatchState } from '@/models/MatchState';
import { computeFinalRankings } from '@/engine/matchManager';
import { recordMatchResult } from '@/lib/gameStats';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface MatchOverScreenProps {
  match: MatchState;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export default function MatchOverScreen({
  match, onPlayAgain, onBackToMenu,
}: MatchOverScreenProps) {
  const [showContent, setShowContent] = useState(false);
  const rankings = computeFinalRankings(match);
  const humanRank = rankings.find(r => r.playerIndex === 0)?.rank ?? 4;
  const statsSavedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Record stats once on mount
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

    recordMatchResult({
      difficulty: match.difficulty,
      mode: match.mode,
      humanPlacement: humanRank,
      totalHandsPlayed: match.totalHandsPlayed,
      bestFanThisMatch: bestFan,
      bestHandNameThisMatch: bestHandName,
    });
  }, [match, humanRank]);

  const rankColors = ['text-highlight', 'text-info', 'text-foreground', 'text-muted-foreground'];
  const rankLabels = ['1st', '2nd', '3rd', '4th'];

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, showContent);

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-2 md:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-over-heading"
        className={`ds-panel p-3 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto ${showContent ? 'animate-slide-up' : 'opacity-0'}`}
      >
        {/* Header */}
        <div className="text-center mb-3 md:mb-4">
          <div className="font-sans text-accent text-xs md:text-sm">
            ╔════════════════════════╗
          </div>
          <h2 id="match-over-heading" className="font-display text-sm md:text-lg text-highlight ds-text-glow-strong my-1 md:my-2">
            GAME OVER
          </h2>
          <div className="font-sans text-accent text-xs md:text-sm">
            ╚════════════════════════╝
          </div>
        </div>

        {/* Human placement */}
        <div className="text-center mb-4">
          {humanRank === 1 ? (
            <div className="font-display text-sm text-success ds-text-glow">
              YOU FINISHED 1st!
            </div>
          ) : (
            <div className="font-display text-sm text-muted-foreground">
              You finished {rankLabels[humanRank - 1]}
            </div>
          )}
        </div>

        {/* Rankings */}
        <div className="mb-4">
          <div className="font-display text-xs text-info mb-2">FINAL STANDINGS</div>
          {rankings.map((entry) => (
            <div
              key={entry.playerIndex}
              className={`flex justify-between font-sans text-sm py-1 ${rankColors[entry.rank - 1]}`}
            >
              <span>
                {rankLabels[entry.rank - 1]}
                {' '}
                {entry.name}
                {entry.playerIndex === 0 && ' (You)'}
              </span>
              <span className="ds-text-glow">{entry.score} pts</span>
            </div>
          ))}
        </div>

        {/* Match stats */}
        <div className="mb-4">
          <div className="font-display text-xs text-highlight mb-2">MATCH STATS</div>
          <div className="font-sans text-sm text-muted-foreground space-y-0.5">
            <div className="flex justify-between">
              <span>Mode</span>
              <span className="text-foreground">{match.mode === 'full' ? 'Full Game (4 rounds)' : 'Quick Game (East round)'}</span>
            </div>
            <div className="flex justify-between">
              <span>Hands Played</span>
              <span className="text-foreground">{match.totalHandsPlayed}</span>
            </div>
            <div className="flex justify-between">
              <span>Starting Score</span>
              <span className="text-foreground">{match.startingScore}</span>
            </div>
          </div>
        </div>

        {/* Hand history summary */}
        {match.handResults.length > 0 && (
          <div className="mb-4">
            <div className="font-display text-xs text-accent mb-2">HAND HISTORY</div>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {match.handResults.map((hr, i) => (
                <div key={i} className="flex justify-between font-sans text-xs text-muted-foreground">
                  <span>
                    {hr.round.toUpperCase()} R{hr.handNumber}
                  </span>
                  <span>
                    {hr.winnerId
                      ? match.playerNames[
                          hr.winnerId === 'human-player' ? 0 :
                          parseInt(hr.winnerId.replace('ai_', '')) || 0
                        ] + (hr.isSelfDrawn ? ' (self-drawn)' : ' (claim)')
                      : 'Draw'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 md:gap-3 justify-center">
          <button className="ds-btn-success font-display text-[10px] md:text-xs min-h-[44px] px-4 md:px-6" onClick={onPlayAgain}>
            [ PLAY AGAIN ]
          </button>
          <button className="ds-btn bg-elevated font-display text-[10px] md:text-xs min-h-[44px] px-4 md:px-6" onClick={onBackToMenu}>
            [ MENU ]
          </button>
        </div>
      </div>
    </div>
  );
}
