'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { GameState } from '@/models/GameState';
import { ScoringResult } from '@/engine/types';
import RetroTile from './RetroTile';
import ExposedMelds from './ExposedMelds';
import { GameResultsOverlay, GameResultsSheet, GameResultsSectionLabel } from './GameResultsChrome';

interface GameOverScreenProps {
  gameState: GameState;
  scoringResult: ScoringResult | null;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export default function GameOverScreen({
  gameState, scoringResult, onPlayAgain, onBackToMenu,
}: GameOverScreenProps) {
  const winner = gameState.winnerId
    ? gameState.players.find(p => p.id === gameState.winnerId)
    : null;
  const isDraw = !winner;

  const [showContent, setShowContent] = useState(false);
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const targetPoints = scoringResult?.totalPoints ?? 0;

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showContent || targetPoints === 0) return;
    const duration = 1000;
    const steps = 20;
    const increment = targetPoints / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= targetPoints) {
        setDisplayedPoints(targetPoints);
        clearInterval(interval);
      } else {
        setDisplayedPoints(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [showContent, targetPoints]);

  return (
    <GameResultsOverlay>
      <GameResultsSheet
        className={showContent ? 'animate-slide-up' : 'pointer-events-none opacity-0'}
      >
        <div className="mb-6 text-center">
          {isDraw ? (
            <h2 className="font-display text-base text-highlight md:text-lg">Exhaustive draw</h2>
          ) : (
            <h2 className="font-display text-base text-success md:text-lg">
              {winner?.id === 'human-player' ? 'You win' : `${winner?.name} wins`}
            </h2>
          )}
          <p className="mt-2 font-sans text-xs text-muted-foreground md:text-sm">
            {isDraw
              ? 'Practice hand ended with no winner.'
              : 'Here is the scoring breakdown for this practice round.'}
          </p>
        </div>

        {isDraw && (
          <div className="mb-4 rounded-lg border border-border/30 bg-surface/40 p-3 text-center font-sans text-sm text-muted-foreground">
            Wall exhausted — no winner this round.
          </div>
        )}

        {winner && (
          <div className="mb-4">
            <GameResultsSectionLabel>Winning hand</GameResultsSectionLabel>
            <div className="flex flex-wrap justify-center gap-0.5">
              {winner.hand.map(tile => (
                <div key={tile.id} className="animate-tile-win">
                  <RetroTile tile={tile} size="sm" />
                </div>
              ))}
            </div>
            {winner.melds.length > 0 && (
              <div className="mt-2 flex justify-center">
                <ExposedMelds melds={winner.melds} size="sm" />
              </div>
            )}
            {gameState.winningTile && (
              <p className="mt-2 text-center font-sans text-xs text-muted-foreground md:text-sm">
                Winning tile: {gameState.winningTile.nameEnglish}
                {gameState.isSelfDrawn ? ' (self-drawn)' : ' (from discard)'}
              </p>
            )}
          </div>
        )}

        {scoringResult && (
          <div className="mb-4">
            <GameResultsSectionLabel>Scoring</GameResultsSectionLabel>
            <div className="space-y-1">
              {scoringResult.fans.map((fan, i) => (
                <div key={i} className="flex justify-between font-sans text-sm">
                  <span className="text-foreground">{fan.name}</span>
                  <span className="text-info">+{fan.fan} fan</span>
                </div>
              ))}
              <div className="my-1 border-t border-border" />
              <div className="flex justify-between font-sans text-sm">
                <span className="text-highlight">Total fan</span>
                <span className="text-highlight ds-text-glow">{scoringResult.totalFan}</span>
              </div>
              <div className="flex justify-between font-sans text-lg">
                <span className="text-success">Points</span>
                <span className="text-success ds-text-glow-strong">{displayedPoints}</span>
              </div>
              {scoringResult.handName && (
                <div className="mt-1 text-center font-display text-xs text-accent">{scoringResult.handName}</div>
              )}
            </div>
          </div>
        )}

        {scoringResult?.payment && scoringResult.payment.payments.length > 0 && (
          <div className="mb-4">
            <GameResultsSectionLabel>Payments</GameResultsSectionLabel>
            <div className="space-y-0.5">
              {scoringResult.payment.payments.map((p, i) => (
                <div key={i} className="flex justify-between font-sans text-sm">
                  <span className="text-muted-foreground">
                    {gameState.players[p.fromPlayerIndex]?.name ?? `Player ${p.fromPlayerIndex + 1}`}
                  </span>
                  <span className="text-red-400">-{p.amount} pts</span>
                </div>
              ))}
              <div className="my-1 border-t border-border" />
              <div className="flex justify-between font-sans text-sm">
                <span className="text-success">{winner?.name ?? 'Winner'} receives</span>
                <span className="text-success ds-text-glow">
                  +{scoringResult.payment.payments.reduce((sum, p) => sum + p.amount, 0)} pts
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <GameResultsSectionLabel>Players</GameResultsSectionLabel>
          {gameState.players.map(player => (
            <div
              key={player.id}
              className={`flex justify-between border-b border-border/15 py-1.5 font-sans text-sm last:border-0 ${
                player.id === gameState.winnerId ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              <span className="flex items-center gap-1">
                {player.id === gameState.winnerId && (
                  <Star className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} aria-hidden />
                )}
                {player.name} ({player.seatWind.toUpperCase()})
              </span>
              <span className="tabular-nums">{player.score}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <button type="button" className="ds-btn-success min-h-[44px] font-display text-xs md:text-sm" onClick={onPlayAgain}>
            Play again
          </button>
          <button type="button" className="ds-btn min-h-[44px] bg-surface/80 font-display text-xs md:text-sm" onClick={onBackToMenu}>
            Back to menu
          </button>
        </div>
      </GameResultsSheet>
    </GameResultsOverlay>
  );
}
