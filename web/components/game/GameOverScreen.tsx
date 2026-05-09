'use client';

import { useState, useEffect } from 'react';
import { GameState } from '@/models/GameState';
import { ScoringResult } from '@/engine/types';
import RetroTile from './RetroTile';
import ExposedMelds from './ExposedMelds';

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

  // Score counter animation
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
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
      <div className={`ds-panel p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto ${showContent ? 'animate-slide-up' : 'opacity-0'}`}>
        {/* Header */}
        <div className="text-center mb-4">
          <div className="font-sans text-accent text-sm">
            ╔════════════════════════╗
          </div>
          {isDraw ? (
            <h2 className="font-display text-lg text-highlight ds-text-glow my-2">
              DRAW GAME
            </h2>
          ) : (
            <h2 className="font-display text-lg text-success ds-text-glow my-2">
              {winner?.id === 'human-player' ? 'YOU WIN!' : `${winner?.name} WINS`}
            </h2>
          )}
          <div className="font-sans text-accent text-sm">
            ╚════════════════════════╝
          </div>
        </div>

        {isDraw && (
          <div className="text-center font-sans text-muted-foreground text-lg mb-4">
            Wall exhausted — no winner this round.
          </div>
        )}

        {/* Winning hand */}
        {winner && (
          <div className="mb-4">
            <div className="font-display text-xs text-info mb-2">WINNING HAND</div>
            <div className="flex flex-wrap gap-0.5 justify-center mb-2">
              {winner.hand.map(tile => (
                <div key={tile.id} className="animate-tile-win">
                  <RetroTile tile={tile} size="sm" />
                </div>
              ))}
            </div>
            {winner.melds.length > 0 && (
              <div className="flex justify-center mt-1">
                <ExposedMelds melds={winner.melds} size="sm" />
              </div>
            )}
            {gameState.winningTile && (
              <div className="text-center font-sans text-sm text-muted-foreground mt-1">
                Winning tile: {gameState.winningTile.nameEnglish}
                {gameState.isSelfDrawn ? ' (self-drawn)' : ' (claimed)'}
              </div>
            )}
          </div>
        )}

        {/* Scoring breakdown */}
        {scoringResult && (
          <div className="mb-4">
            <div className="font-display text-xs text-highlight mb-2">SCORING</div>
            <div className="space-y-1">
              {scoringResult.fans.map((fan, i) => (
                <div key={i} className="flex justify-between font-sans text-sm">
                  <span className="text-foreground">{fan.name}</span>
                  <span className="text-info">+{fan.fan} fan</span>
                </div>
              ))}
              <div className="border-t border-border my-1" />
              <div className="flex justify-between font-sans text-sm">
                <span className="text-highlight">Total Fan</span>
                <span className="text-highlight ds-text-glow">{scoringResult.totalFan}</span>
              </div>
              <div className="flex justify-between font-sans text-lg">
                <span className="text-success">Points</span>
                <span className="text-success ds-text-glow-strong">{displayedPoints}</span>
              </div>
              {scoringResult.handName && (
                <div className="text-center font-display text-xs text-accent mt-1">
                  {scoringResult.handName}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment breakdown */}
        {scoringResult?.payment && scoringResult.payment.payments.length > 0 && (
          <div className="mb-4">
            <div className="font-display text-xs text-accent mb-2">PAYMENTS</div>
            <div className="space-y-0.5">
              {scoringResult.payment.payments.map((p, i) => (
                <div key={i} className="flex justify-between font-sans text-sm">
                  <span className="text-muted-foreground">
                    {gameState.players[p.fromPlayerIndex]?.name ?? `Player ${p.fromPlayerIndex + 1}`}
                  </span>
                  <span className="text-red-400">-{p.amount} pts</span>
                </div>
              ))}
              <div className="border-t border-border my-1" />
              <div className="flex justify-between font-sans text-sm">
                <span className="text-success">
                  {winner?.name ?? 'Winner'} receives
                </span>
                <span className="text-success ds-text-glow">
                  +{scoringResult.payment.payments.reduce((sum, p) => sum + p.amount, 0)} pts
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Player scores */}
        <div className="mb-4">
          <div className="font-display text-xs text-info mb-2">PLAYERS</div>
          {gameState.players.map(player => (
            <div
              key={player.id}
              className={`flex justify-between font-sans text-sm py-0.5 ${
                player.id === gameState.winnerId ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              <span>
                {player.id === gameState.winnerId && '★ '}
                {player.name} ({player.seatWind.toUpperCase()})
              </span>
              <span>{player.score}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button className="ds-btn-success font-display text-xs" onClick={onPlayAgain}>
            [ PLAY AGAIN ]
          </button>
          <button className="ds-btn bg-elevated font-display text-xs" onClick={onBackToMenu}>
            [ MENU ]
          </button>
        </div>
      </div>
    </div>
  );
}
