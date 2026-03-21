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
      <div className={`retro-panel p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto ${showContent ? 'animate-slide-up' : 'opacity-0'}`}>
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
            Wall exhausted — no winner this round.
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

        {/* Player scores */}
        <div className="mb-4">
          <div className="font-pixel text-xs text-retro-cyan mb-2">PLAYERS</div>
          {gameState.players.map(player => (
            <div
              key={player.id}
              className={`flex justify-between font-retro text-sm py-0.5 ${
                player.id === gameState.winnerId ? 'text-retro-green' : 'text-retro-textDim'
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
          <button className="retro-btn-green font-pixel text-xs" onClick={onPlayAgain}>
            [ PLAY AGAIN ]
          </button>
          <button className="retro-btn bg-retro-bgLight font-pixel text-xs" onClick={onBackToMenu}>
            [ MENU ]
          </button>
        </div>
      </div>
    </div>
  );
}
