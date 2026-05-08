'use client';

import { useState, useEffect, useRef } from 'react';
import { GameState } from '@/models/GameState';
import { MatchState, HandResult } from '@/models/MatchState';
import { ScoringResult } from '@/engine/types';
import { analyzeHandPerformance, ReviewInsight } from '@/engine/reviewAnalyzer';
import RetroTile from './RetroTile';
import ExposedMelds from './ExposedMelds';
import HandReplayScrubber from './HandReplayScrubber';
import Confetti from './Confetti';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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
  const humanWon = winner?.id === match.humanPlayerId;

  const [showContent, setShowContent] = useState(false);
  const [displayedPoints, setDisplayedPoints] = useState(0);
  // Bumped each time the count finishes — used as the React key on the
  // score span so the punch animation replays on remount.
  const [punchKey, setPunchKey] = useState(0);
  const targetPoints = scoringResult?.totalPoints ?? 0;

  // Hold the modal back for ~750ms so the winner-spotlight cinematic plays
  // before the score panel slides in. On a draw we skip the spotlight beat.
  useEffect(() => {
    const delay = winner ? 800 : 250;
    const timer = setTimeout(() => setShowContent(true), delay);
    return () => clearTimeout(timer);
  }, [winner]);

  // Score counter animation — count up, then trigger one-shot punch on land.
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
        setPunchKey(k => k + 1);
        clearInterval(interval);
      } else {
        setDisplayedPoints(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [showContent, targetPoints]);

  const roundName = match.currentRound.toUpperCase();
  const handNum = lastResult?.handNumber ?? match.handNumber;

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, showContent);

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-2 md:p-4">
      {humanWon && showContent && <Confetti />}
      {winner && !showContent && (
        <WinnerSpotlight name={winner.name} isHuman={humanWon} />
      )}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hand-result-heading"
        className={`retro-panel p-3 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto ${showContent ? 'animate-slide-up' : 'opacity-0'}`}
      >
        {/* Round + Hand header */}
        <div className="text-center mb-1">
          <span className="font-retro text-xs text-retro-textDim">
            {roundName} ROUND &mdash; Hand {handNum}
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-3 md:mb-4">
          <div className="font-retro text-retro-accent text-xs md:text-sm">
            ╔════════════════════════╗
          </div>
          {isDraw ? (
            <h2 id="hand-result-heading" className="font-pixel text-sm md:text-lg text-retro-gold retro-glow my-1 md:my-2">
              DRAW GAME
            </h2>
          ) : (
            <h2 id="hand-result-heading" className="font-pixel text-sm md:text-lg text-retro-green retro-glow my-1 md:my-2">
              {winner?.id === 'human-player' ? 'YOU WIN!' : `${winner?.name} WINS`}
            </h2>
          )}
          <div className="font-retro text-retro-accent text-xs md:text-sm">
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

        {/* Scoring breakdown — fans stagger in one row at a time. */}
        {scoringResult && (
          <div className="mb-4">
            <div className="font-pixel text-xs text-retro-gold mb-2">SCORING</div>
            <div className="space-y-1">
              {scoringResult.fans.map((fan, i) => (
                <div
                  key={i}
                  className="flex justify-between font-retro text-sm animate-fan-row-in"
                  style={{ animationDelay: `${0.15 + i * 0.12}s` }}
                >
                  <span className="text-retro-text">{fan.name}</span>
                  <span className="text-retro-cyan">+{fan.fan} fan</span>
                </div>
              ))}
              <div className="border-t border-retro-border my-1" />
              <div
                className="flex justify-between font-retro text-sm animate-fan-row-in"
                style={{ animationDelay: `${0.15 + scoringResult.fans.length * 0.12}s` }}
              >
                <span className="text-retro-gold">Total Fan</span>
                <span className="text-retro-gold retro-glow">{scoringResult.totalFan}</span>
              </div>
              <div
                className="flex justify-between font-retro text-lg animate-fan-row-in"
                style={{ animationDelay: `${0.27 + scoringResult.fans.length * 0.12}s` }}
              >
                <span className="text-retro-green">Points</span>
                <span
                  key={punchKey}
                  className="text-retro-green retro-glow-strong animate-score-punch inline-block"
                  data-testid="score-punch"
                >
                  {displayedPoints}
                </span>
              </div>
              {scoringResult.handName && (
                <div
                  className="text-center font-pixel text-xs text-retro-accent mt-1 animate-fan-row-in"
                  style={{ animationDelay: `${0.4 + scoringResult.fans.length * 0.12}s` }}
                >
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

        {/* Hand replay — timeline of every turn */}
        <HandReplayScrubber gameState={gameState} />

        {/* Post-hand review — surfaced on every difficulty */}
        {(() => {
          const humanIndex = gameState.players.findIndex(p => p.id === match.humanPlayerId);
          if (humanIndex === -1) return null;
          const insights = analyzeHandPerformance(gameState, humanIndex).slice(0, 5);
          if (insights.length === 0) return null;
          return (
            <div className="mb-4" data-testid="hand-review">
              <div className="font-pixel text-xs text-retro-green mb-2">REVIEW</div>
              <ul className="space-y-1">
                {insights.map((insight, i) => {
                  const { symbol, cls, sr } = getInsightGlyph(insight.type);
                  return (
                    <li key={i} className="flex gap-2 font-retro text-xs items-start" data-insight-type={insight.type}>
                      <span className={`${cls} font-pixel shrink-0 leading-5`} aria-hidden>
                        {symbol}
                      </span>
                      <span className="sr-only">{sr}</span>
                      <span className="text-retro-text leading-snug">{insight.message}</span>
                    </li>
                  );
                })}
              </ul>
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

/**
 * Brief pre-modal winner cinematic. Big animated text overlay that holds
 * for ~800ms, then the score panel slides up over it. Cheaper than a portrait
 * pop since we don't have to map winner identity to an NpcId.
 */
function WinnerSpotlight({ name, isHuman }: { name: string; isHuman: boolean }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none px-4"
      data-testid="winner-spotlight"
      aria-hidden
    >
      <div className="animate-winner-spotlight text-center">
        <p
          className={`font-pixel text-3xl sm:text-5xl md:text-6xl retro-glow-strong ${
            isHuman ? 'text-retro-green' : 'text-retro-gold'
          }`}
        >
          {isHuman ? 'YOU WIN!' : `${name.toUpperCase()} WINS!`}
        </p>
      </div>
    </div>
  );
}

/** Per-insight visual treatment — green check, red x, cyan bullet. */
function getInsightGlyph(type: ReviewInsight['type']): { symbol: string; cls: string; sr: string } {
  switch (type) {
    case 'good':
      return { symbol: '\u2713', cls: 'text-retro-green', sr: 'Good play:' };
    case 'mistake':
      return { symbol: '\u2717', cls: 'text-red-400', sr: 'Mistake:' };
    default:
      return { symbol: '\u2022', cls: 'text-retro-cyan', sr: 'Note:' };
  }
}
