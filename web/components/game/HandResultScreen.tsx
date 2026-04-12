'use client';

import { useState, useEffect } from 'react';
import { GameState } from '@/models/GameState';
import { MatchState, HandResult } from '@/models/MatchState';
import { ScoringResult } from '@/engine/types';
import { analyzeHandPerformance, ReviewInsight } from '@/engine/reviewAnalyzer';
import RetroTile from './RetroTile';
import ExposedMelds from './ExposedMelds';

interface HandResultScreenProps {
  gameState: GameState;
  match: MatchState;
  scoringResult: ScoringResult | null;
  onContinue: () => void;
}

export default function HandResultScreen({
  gameState, match, scoringResult, onContinue,
}: HandResultScreenProps) {
  const lastResult = match.handResults[match.handResults.length - 1];
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

  const roundName = match.currentRound.toUpperCase();
  const handNum = lastResult?.handNumber ?? match.handNumber;

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
      <div className={`retro-panel p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto ${showContent ? 'animate-slide-up' : 'opacity-0'}`}>
        {/* Round + Hand header */}
        <div className="text-center mb-1">
          <span className="font-retro text-xs text-retro-textDim">
            {roundName} ROUND &mdash; Hand {handNum}
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="font-retro text-retro-accent text-sm">
            ╔════════════════════════╗
          </div>
          {isDraw ? (
            <h2 className="font-pixel text-lg text-retro-gold retro-glow my-2">
              DRAW GAME
            </h2>
          ) : (
            <h2 className="font-pixel text-lg text-retro-green retro-glow my-2">
              {winner?.id === 'human-player' ? 'YOU WIN!' : `${winner?.name} WINS`}
            </h2>
          )}
          <div className="font-retro text-retro-accent text-sm">
            ╚════════════════════════╝
          </div>
        </div>

        {isDraw && (
          <div className="text-center font-retro text-retro-textDim text-lg mb-4">
            Wall exhausted — no winner this hand.
          </div>
        )}

        {/* Winning hand */}
        {winner && (
          <div className="mb-4">
            <div className="font-pixel text-xs text-retro-cyan mb-2">WINNING HAND</div>
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
              <div className="text-center font-retro text-sm text-retro-textDim mt-1">
                Winning tile: {gameState.winningTile.nameEnglish}
                {gameState.isSelfDrawn ? ' (self-drawn)' : ' (claimed)'}
              </div>
            )}
          </div>
        )}

        {/* Scoring breakdown */}
        {scoringResult && (
          <div className="mb-4">
            <div className="font-pixel text-xs text-retro-gold mb-2">SCORING</div>
            <div className="space-y-1">
              {scoringResult.fans.map((fan, i) => (
                <div key={i} className="flex justify-between font-retro text-sm">
                  <span className="text-retro-text">{fan.name}</span>
                  <span className="text-retro-cyan">+{fan.fan} fan</span>
                </div>
              ))}
              <div className="border-t border-retro-border my-1" />
              <div className="flex justify-between font-retro text-sm">
                <span className="text-retro-gold">Total Fan</span>
                <span className="text-retro-gold retro-glow">{scoringResult.totalFan}</span>
              </div>
              <div className="flex justify-between font-retro text-lg">
                <span className="text-retro-green">Points</span>
                <span className="text-retro-green retro-glow-strong">{displayedPoints}</span>
              </div>
              {scoringResult.handName && (
                <div className="text-center font-pixel text-xs text-retro-accent mt-1">
                  {scoringResult.handName}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment breakdown */}
        {scoringResult?.payment && scoringResult.payment.payments.length > 0 && (
          <div className="mb-4">
            <div className="font-pixel text-xs text-retro-accent mb-2">PAYMENTS</div>
            <div className="space-y-0.5">
              {scoringResult.payment.payments.map((p, i) => (
                <div key={i} className="flex justify-between font-retro text-sm">
                  <span className="text-retro-textDim">
                    {gameState.players[p.fromPlayerIndex]?.name ?? `Player ${p.fromPlayerIndex + 1}`}
                  </span>
                  <span className="text-red-400">-{p.amount} pts</span>
                </div>
              ))}
              <div className="border-t border-retro-border my-1" />
              <div className="flex justify-between font-retro text-sm">
                <span className="text-retro-green">
                  {winner?.name ?? 'Winner'} receives
                </span>
                <span className="text-retro-green retro-glow">
                  +{scoringResult.payment.payments.reduce((sum, p) => sum + p.amount, 0)} pts
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Running scores */}
        <div className="mb-4">
          <div className="font-pixel text-xs text-retro-cyan mb-2">STANDINGS</div>
          {match.playerNames.map((name, i) => {
            const scoreChange = lastResult?.scoreChanges[i] ?? 0;
            const isWinner = gameState.players[i]?.id === gameState.winnerId;
            const isDealer = i === match.currentDealerIndex;
            return (
              <div
                key={i}
                className={`flex justify-between font-retro text-sm py-0.5 ${
                  isWinner ? 'text-retro-green' : 'text-retro-textDim'
                }`}
              >
                <span>
                  {isWinner && '\u2605 '}
                  {isDealer && '\u265B '}
                  {name}
                </span>
                <span className="flex gap-3">
                  {scoreChange !== 0 && (
                    <span className={scoreChange > 0 ? 'text-retro-green' : 'text-red-400'}>
                      {scoreChange > 0 ? '+' : ''}{scoreChange}
                    </span>
                  )}
                  <span className="text-retro-gold min-w-[4ch] text-right">
                    {match.playerScores[i]}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Post-hand review (easy mode only) */}
        {match.difficulty === 'easy' && (() => {
          const humanIndex = gameState.players.findIndex(p => p.id === match.humanPlayerId);
          if (humanIndex === -1) return null;
          const insights = analyzeHandPerformance(gameState, humanIndex);
          if (insights.length === 0) return null;
          return (
            <div className="mb-4">
              <div className="font-pixel text-xs text-retro-green mb-2">REVIEW</div>
              <div className="space-y-1">
                {insights.map((insight, i) => (
                  <div key={i} className="flex gap-2 font-retro text-xs">
                    <span className={
                      insight.type === 'good' ? 'text-retro-green' :
                      insight.type === 'mistake' ? 'text-red-400' :
                      'text-retro-textDim'
                    }>
                      {insight.type === 'good' ? '+' : insight.type === 'mistake' ? '!' : '-'}
                    </span>
                    <span className="text-retro-text">{insight.message}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Next hand info */}
        <div className="text-center mb-4 font-retro text-sm text-retro-textDim">
          Next: {match.currentRound.toUpperCase()} Round &mdash; Hand {match.handNumber}
          {lastResult && lastResult.dealerIndex === match.currentDealerIndex
            ? ' (dealer stays)'
            : ` (${match.playerNames[match.currentDealerIndex]} deals)`}
        </div>

        {/* Action */}
        <div className="flex justify-center">
          <button className="retro-btn-green font-pixel text-xs" onClick={onContinue}>
            [ NEXT HAND ]
          </button>
        </div>
      </div>
    </div>
  );
}
