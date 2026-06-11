'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, Crown } from 'lucide-react';
import { GameState } from '@/models/GameState';
import { MatchState } from '@/models/MatchState';
import { ScoringResult } from '@/engine/types';
import { analyzeHandPerformance, ReviewInsight } from '@/engine/reviewAnalyzer';
import RetroTile from './RetroTile';
import ExposedMelds from './ExposedMelds';
import HandReplayScrubber from './HandReplayScrubber';
import Confetti from './Confetti';
import soundManager from '@/lib/soundManager';
import musicEngine from '@/lib/musicEngine';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { GameResultsOverlay, GameResultsSheet, GameResultsSectionLabel } from './GameResultsChrome';

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
  const [punchKey, setPunchKey] = useState(0);
  const targetPoints = scoringResult?.totalPoints ?? 0;

  // Win magnitude tier: a 3-fan win and a 10-fan win must FEEL different.
  // 0 = draw/no result, 1 = standard (<6 fan), 2 = big (6-9), 3 = limit (10+).
  const totalFan = scoringResult?.totalFan ?? 0;
  const fanTier = !scoringResult || isDraw ? 0 : totalFan >= 10 ? 3 : totalFan >= 6 ? 2 : 1;

  useEffect(() => {
    const delay = winner ? 800 : 250;
    const timer = setTimeout(() => setShowContent(true), delay);
    // Music steps back while the win sequence takes the stage
    musicEngine.duck(winner ? 5000 : 2500, winner ? 0.12 : 0.4);
    return () => clearTimeout(timer);
  }, [winner]);

  // Fan-row reveal ticks rise in pitch as fans stack; limit hands cap the
  // sequence with a jackpot cascade.
  useEffect(() => {
    if (!showContent || !scoringResult || isDraw) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    scoringResult.fans.forEach((_, i) => {
      timers.push(setTimeout(() => soundManager.playFanTick(i), 150 + i * 120));
    });
    if (fanTier === 3) {
      timers.push(setTimeout(
        () => soundManager.playJackpot(),
        150 + scoringResult.fans.length * 120 + 250,
      ));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scoringResult/fanTier are set before showContent flips true and stay stable for the screen's lifetime
  }, [showContent]);

  useEffect(() => {
    if (!showContent || targetPoints === 0) return;
    const duration = fanTier >= 3 ? 2200 : fanTier === 2 ? 1500 : 1000;
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
  }, [showContent, targetPoints, fanTier]);

  const roundName = match.currentRound.toUpperCase();
  const handNum = lastResult?.handNumber ?? match.handNumber;

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, showContent);

  const confettiCount = fanTier >= 3 ? 170 : fanTier === 2 ? 90 : 40;
  const goldHeavy = fanTier >= 2;

  return (
    <GameResultsOverlay>
      {humanWon && showContent && <Confetti count={confettiCount} goldHeavy={goldHeavy} />}
      {fanTier >= 3 && showContent && <div className="animate-screen-flash" aria-hidden />}
      {winner && !showContent && (
        <WinnerSpotlight name={winner.name} isHuman={humanWon} />
      )}
      <GameResultsSheet
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hand-result-heading"
        className={showContent
          ? (fanTier >= 3 ? 'animate-slide-up animate-screen-shake' : 'animate-slide-up')
          : 'pointer-events-none opacity-0'}
      >
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center rounded-full border border-border/40 bg-surface/60 px-3 py-1 font-sans text-[11px] text-muted-foreground">
            {roundName} round · Hand {handNum}
          </span>
          {isDraw ? (
            <h2
              id="hand-result-heading"
              className="font-display text-base text-highlight md:text-lg"
            >
              Exhaustive draw
            </h2>
          ) : (
            <h2
              id="hand-result-heading"
              className="font-display text-base text-success md:text-lg"
            >
              {winner?.id === 'human-player' ? 'You win this hand' : `${winner?.name} wins`}
            </h2>
          )}
          <p className="max-w-sm font-sans text-xs text-muted-foreground md:text-sm">
            {isDraw
              ? 'The wall ran out with no winner. Scores stay put for this hand.'
              : humanWon
                ? 'Nice finish — here is how the table settled up.'
                : 'Hand is sealed. Review scoring and your coach notes below.'}
          </p>
        </div>

        {isDraw && (
          <div className="mb-4 rounded-lg border border-border/30 bg-surface/40 p-3 text-center font-sans text-sm text-muted-foreground">
            No winning hand was declared.
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
          <div className="mb-4" data-testid="fan-theater">
            <GameResultsSectionLabel>Scoring</GameResultsSectionLabel>
            <div className="space-y-1 rounded-lg border border-info/20 bg-info/5 p-3">
              {scoringResult.fans.map((fan, i) => (
                <div
                  key={i}
                  className="flex justify-between font-sans text-sm animate-fan-row-in"
                  style={{ animationDelay: `${0.15 + i * 0.12}s` }}
                >
                  <span className="text-foreground">{fan.name}</span>
                  <span className="text-info">+{fan.fan} fan</span>
                </div>
              ))}
              <div className="my-1 border-t border-border" />
              <div
                className="flex justify-between font-sans text-sm animate-fan-row-in"
                style={{ animationDelay: `${0.15 + scoringResult.fans.length * 0.12}s` }}
              >
                <span className="text-highlight">Total fan</span>
                <span className="text-highlight ds-text-glow">{scoringResult.totalFan}</span>
              </div>
              <div
                className="flex justify-between font-sans text-lg animate-fan-row-in"
                style={{ animationDelay: `${0.27 + scoringResult.fans.length * 0.12}s` }}
              >
                <span className="text-success">Points</span>
                <span
                  key={punchKey}
                  className="inline-block text-success ds-text-glow-strong animate-score-punch"
                  data-testid="score-punch"
                >
                  {displayedPoints}
                </span>
              </div>
              {scoringResult.handName && (
                <div
                  className="mt-1 text-center font-display text-xs text-accent animate-fan-row-in"
                  style={{ animationDelay: `${0.4 + scoringResult.fans.length * 0.12}s` }}
                >
                  {scoringResult.handName}
                </div>
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

        <div className="mb-4">
          <GameResultsSectionLabel>Standings</GameResultsSectionLabel>
          {match.playerNames.map((name, i) => {
            const scoreChange = lastResult?.scoreChanges[i] ?? 0;
            const isWinner = gameState.players[i]?.id === gameState.winnerId;
            const isDealer = i === match.currentDealerIndex;
            return (
              <div
                key={i}
                className={`flex justify-between font-sans text-sm py-1 ${
                  isWinner ? 'text-success' : 'text-muted-foreground'
                }`}
              >
                <span className="flex min-w-0 items-center gap-1">
                  {isWinner && (
                    <Star className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} aria-hidden />
                  )}
                  {isDealer && (
                    <Crown className="h-3.5 w-3.5 shrink-0 text-highlight" strokeWidth={2} aria-hidden />
                  )}
                  <span className="truncate">{name}</span>
                </span>
                <span className="flex shrink-0 gap-3">
                  {scoreChange !== 0 && (
                    <span className={scoreChange > 0 ? 'text-success' : 'text-red-400'}>
                      {scoreChange > 0 ? '+' : ''}
                      {scoreChange}
                    </span>
                  )}
                  <span className="min-w-[4ch] text-right text-highlight">{match.playerScores[i]}</span>
                </span>
              </div>
            );
          })}
        </div>

        {(() => {
          const humanIndex = gameState.players.findIndex(p => p.id === match.humanPlayerId);
          if (humanIndex === -1) return null;
          const insights = analyzeHandPerformance(gameState, humanIndex).slice(0, 5);
          if (insights.length === 0) return null;
          return (
            <div className="mb-4" data-testid="hand-review">
              <GameResultsSectionLabel>Hand review</GameResultsSectionLabel>
              <p className="mb-2 font-sans text-xs text-muted-foreground md:text-sm">
                What went well and what to try differently next hand.
              </p>
              <ul className="game-hud-surface space-y-2 rounded-lg border border-accent/25 p-3">
                {insights.map((insight, i) => {
                  const { symbol, cls, sr } = getInsightGlyph(insight.type);
                  return (
                    <li
                      key={i}
                      className="flex gap-2 font-sans text-xs items-start md:text-sm"
                      data-insight-type={insight.type}
                    >
                      <span className={`${cls} font-display shrink-0 leading-5`} aria-hidden>
                        {symbol}
                      </span>
                      <span className="sr-only">{sr}</span>
                      <span className="leading-snug text-foreground">{insight.message}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })()}

        <HandReplayScrubber gameState={gameState} />

        <div className="mb-5 rounded-lg border border-border/25 bg-surface/35 p-3 text-center font-sans text-xs text-muted-foreground md:text-sm">
          Next up: {match.currentRound.toUpperCase()} round, hand {match.handNumber}
          {lastResult && lastResult.dealerIndex === match.currentDealerIndex
            ? ' — same dealer.'
            : ` — ${match.playerNames[match.currentDealerIndex]} deals.`}
        </div>

        <div className="flex justify-center safe-area-pb">
          <button
            type="button"
            className="ds-btn-success min-h-[44px] px-8 font-display text-xs md:text-sm"
            onClick={onContinue}
          >
            Next hand
          </button>
        </div>
      </GameResultsSheet>
    </GameResultsOverlay>
  );
}

function WinnerSpotlight({ name, isHuman }: { name: string; isHuman: boolean }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[45] flex items-center justify-center px-4"
      data-testid="winner-spotlight"
      aria-hidden
    >
      <div className="animate-winner-spotlight text-center">
        <p
          className={`font-display text-3xl sm:text-5xl md:text-6xl ds-text-glow-strong ${
            isHuman ? 'text-success' : 'text-highlight'
          }`}
        >
          {isHuman ? 'You win!' : `${name} wins!`}
        </p>
      </div>
    </div>
  );
}

function getInsightGlyph(type: ReviewInsight['type']): { symbol: string; cls: string; sr: string } {
  switch (type) {
    case 'good':
      return { symbol: '\u2713', cls: 'text-success', sr: 'Good play:' };
    case 'mistake':
      return { symbol: '\u2717', cls: 'text-red-400', sr: 'Mistake:' };
    default:
      return { symbol: '\u2022', cls: 'text-info', sr: 'Note:' };
  }
}
