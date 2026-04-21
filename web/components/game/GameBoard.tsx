'use client';

import { useState, useEffect, useRef } from 'react';
import { GameState } from '@/models/GameState';
import { MatchState } from '@/models/MatchState';
import type { AvailableClaim } from '@/engine/types';
import type { Tile } from '@/models/Tile';
import PlayerHand from './PlayerHand';
import OpponentHand from './OpponentHand';
import DiscardPool from './DiscardPool';
import GameHUD from './GameHUD';
import ActionBar from './ActionBar';
import ExposedMelds from './ExposedMelds';
import TutorPanel from './TutorPanel';
import FaanMeter from './FaanMeter';
import DiscardReadingPanel from './DiscardReadingPanel';
import GameToast from './GameToast';
import { TutorAdvice } from '@/engine/types';
import { TenpaiStatus } from './useGameController';
import { FaanProjection } from '@/engine/faanProjection';

interface GameBoardProps {
  gameState: GameState;
  match?: MatchState | null;
  humanPlayerId: string;
  selectedTileId?: string;
  suggestedTileId?: string;
  tutorAdvice?: TutorAdvice | null;
  tenpaiStatus?: TenpaiStatus | null;
  tileClassifications?: Map<string, 'green' | 'orange' | 'red'>;
  faanProjection?: FaanProjection | null;
  onTileSelect: (tile: Tile) => void;
  onDiscard: () => void;
  onKong: () => void;
  onWin: () => void;
  onClaimBest: () => void;
  onSubmitChow: (tilesFromHand: Tile[]) => void;
  onPass: () => void;
  canDeclareKong?: boolean;
  canDeclareWin?: boolean;
  hasClaimOptions?: boolean;
  claimOptions?: AvailableClaim[];
  claimTimer?: number;
}

export default function GameBoard({
  gameState, match, humanPlayerId, selectedTileId, suggestedTileId, tutorAdvice,
  tenpaiStatus, tileClassifications, faanProjection,
  onTileSelect, onDiscard, onKong, onWin, onClaimBest, onSubmitChow, onPass,
  canDeclareKong: canKongProp, canDeclareWin: canWinProp,
  hasClaimOptions: hasClaimsProp, claimOptions = [], claimTimer,
}: GameBoardProps) {
  const humanIndex = gameState.players.findIndex(p => p.id === humanPlayerId);
  const humanPlayer = gameState.players[humanIndex];
  const isHumanTurn = gameState.currentPlayerIndex === humanIndex;

  // Toast system — track last discard for event messages
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const prevDiscardRef = useRef<string | undefined>();
  const prevMeldCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Track new discards
    const lastTileId = gameState.lastDiscardedTile?.id;
    if (lastTileId && lastTileId !== prevDiscardRef.current) {
      prevDiscardRef.current = lastTileId;
      const discarder = gameState.players.find(p => p.id === gameState.lastDiscardedBy);
      if (discarder && discarder.id !== humanPlayerId) {
        setToastMessage(`${discarder.name} discarded ${gameState.lastDiscardedTile?.nameEnglish}`);
      }
    }

    // Track new melds (claims) — check each player individually
    for (const player of gameState.players) {
      const prevCount = prevMeldCountsRef.current[player.id] ?? 0;
      if (player.melds.length > prevCount && player.id !== humanPlayerId) {
        const lastMeld = player.melds[player.melds.length - 1];
        const meldName = lastMeld.type.charAt(0).toUpperCase() + lastMeld.type.slice(1);
        setToastMessage(`${player.name} claimed ${meldName}`);
        break; // Only toast first new meld per render cycle
      }
    }
    // Update the ref with current counts
    prevMeldCountsRef.current = Object.fromEntries(
      gameState.players.map(p => [p.id, p.melds.length])
    );
  }, [gameState.lastDiscardedTile?.id, gameState.lastDiscardedBy, gameState.players, humanPlayerId]);

  // Map opponents to positions: right of human = right, across = top, left = left
  const getOpponent = (offset: number) => {
    const idx = (humanIndex + offset) % gameState.players.length;
    return gameState.players[idx];
  };

  const rightPlayer = getOpponent(1);
  const topPlayer = getOpponent(2);
  const leftPlayer = getOpponent(3);

  const canDiscard = isHumanTurn && gameState.turnPhase === 'discard' && !!selectedTileId;
  const canDeclareWin = canWinProp ?? false;
  const canDeclareKong = canKongProp ?? false;
  const hasClaimOptions = hasClaimsProp ?? false;
  const showClaimHighlight =
    gameState.turnPhase === 'claim' && hasClaimOptions && isHumanTurn;

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      data-testid="game-board-root"
      style={{
        background: 'radial-gradient(ellipse at center, #1e2a22 0%, #0f1610 50%, #110e1a 100%)',
      }}
    >
      <GameToast message={toastMessage} />

      {/* Top row: HUD + opponents (mobile: compact bar, desktop: full layout) */}
      <div className="flex items-start p-1 md:p-2 gap-1 md:gap-2" style={{ flex: '0 0 auto' }}>
        {/* Left HUD — hidden on mobile, shown on md+ */}
        <div className="hidden md:block w-48 shrink-0">
          <GameHUD
            wallCount={gameState.wall.length}
            prevailingWind={gameState.prevailingWind}
            currentPlayerIndex={gameState.currentPlayerIndex}
            players={gameState.players}
            turnPhase={gameState.turnPhase}
            handNumber={match?.handNumber}
            playerScores={match?.playerScores}
          />
        </div>

        {/* Mobile: compact top bar with all 3 opponents + minimal HUD */}
        <div className="flex md:hidden flex-1 items-center justify-between gap-1 px-1">
          <OpponentHand
            player={leftPlayer}
            position="left"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(leftPlayer)}
            compact
          />
          <OpponentHand
            player={topPlayer}
            position="top"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(topPlayer)}
            compact
          />
          <OpponentHand
            player={rightPlayer}
            position="right"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(rightPlayer)}
            compact
          />
        </div>

        {/* Desktop: Top opponent centered */}
        <div className="hidden md:flex flex-1 justify-center">
          <OpponentHand
            player={topPlayer}
            position="top"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(topPlayer)}
          />
        </div>

        {/* Right panel — faan meter + discard reading (desktop).
            min-h-0 + overflow-y-auto so an expanded reading scrolls inside
            the rail instead of inflating the top row and pushing the
            discard pool down. */}
        <div className="hidden md:flex md:flex-col md:gap-1 w-48 shrink-0 min-h-0 max-h-[calc(100vh-160px)] overflow-y-auto">
          {faanProjection && <FaanMeter projection={faanProjection} />}
          <DiscardReadingPanel game={gameState} humanPlayerId={humanPlayerId} />
        </div>
      </div>

      {/* Mobile: minimal HUD bar */}
      <div className="flex md:hidden items-center justify-between px-2 py-0.5" style={{ flex: '0 0 auto' }}>
        <GameHUD
          wallCount={gameState.wall.length}
          prevailingWind={gameState.prevailingWind}
          currentPlayerIndex={gameState.currentPlayerIndex}
          players={gameState.players}
          turnPhase={gameState.turnPhase}
          handNumber={match?.handNumber}
          playerScores={match?.playerScores}
          compact
        />
      </div>

      {/* Mobile: compact learning panels stacked */}
      <div className="flex md:hidden flex-col gap-0.5 px-2 py-0.5" style={{ flex: '0 0 auto' }}>
        {faanProjection && <FaanMeter projection={faanProjection} compact />}
        <DiscardReadingPanel game={gameState} humanPlayerId={humanPlayerId} compact />
      </div>

      {/* Middle row: Left opponent + Discard Pool + Right opponent */}
      <div className="flex-1 flex items-center px-1 md:px-2 gap-1 md:gap-2 min-h-0">
        {/* Left opponent — desktop only (mobile shows in top bar) */}
        <div className="hidden md:flex w-24 shrink-0 justify-center">
          <OpponentHand
            player={leftPlayer}
            position="left"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(leftPlayer)}
          />
        </div>

        {/* Center: Discard pool + wind indicator */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 md:gap-2 min-h-0">
          {/* Turn indicator */}
          <div className="text-center">
            <div className={`inline-block retro-panel px-2 py-0.5 md:px-3 md:py-1 transition-all duration-300 ${
              isHumanTurn ? 'ring-1 ring-retro-cyan/40' : ''
            }`}>
              <span className="text-retro-gold font-pixel text-[8px] md:text-xs retro-glow">
                {gameState.turnPhase === 'claim'
                  ? '⚡ CLAIM WINDOW'
                  : isHumanTurn
                    ? `► YOUR TURN — ${gameState.turnPhase === 'discard' ? 'Discard a tile' : 'Draw'}`
                    : `⏳ ${gameState.players[gameState.currentPlayerIndex]?.name ?? 'Opponent'}`}
              </span>
            </div>
          </div>

          {/* Discard pool */}
          <div className="w-full max-w-[280px] md:max-w-xs">
            <DiscardPool
              discards={gameState.discardPile}
              lastDiscardedTile={gameState.lastDiscardedTile}
              claimHighlight={showClaimHighlight}
              playerDiscards={gameState.playerDiscards}
              playerNames={Object.fromEntries(gameState.players.map(p => [p.id, p.name]))}
            />
          </div>

          {/* Tutor Advice */}
          {tutorAdvice && (
            <div className="w-full max-w-[280px] md:max-w-md">
              <TutorPanel advice={tutorAdvice} />
            </div>
          )}
        </div>

        {/* Right opponent — desktop only (mobile shows in top bar) */}
        <div className="hidden md:flex w-24 shrink-0 justify-center">
          <OpponentHand
            player={rightPlayer}
            position="right"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(rightPlayer)}
          />
        </div>
      </div>

      {/* Bottom row: Player hand + melds + actions */}
      <div className="p-1 md:p-2 space-y-0.5 md:space-y-1" style={{ flex: '0 0 auto' }}>
        {/* Action bar */}
        <ActionBar
          canDiscard={canDiscard}
          canDeclareKong={canDeclareKong}
          canDeclareWin={canDeclareWin}
          hasClaimOptions={hasClaimOptions}
          claimOptions={claimOptions}
          discardedTile={gameState.lastDiscardedTile}
          onDiscard={onDiscard}
          onKong={onKong}
          onWin={onWin}
          onClaimBest={onClaimBest}
          onSubmitChow={onSubmitChow}
          onPass={onPass}
          turnPhase={gameState.turnPhase}
          isHumanTurn={isHumanTurn}
          claimTimer={claimTimer}
        />

        {/* Player info bar */}
        <div className="flex items-center justify-between px-1 md:px-2">
          <div className="flex items-center gap-1 md:gap-2 font-pixel text-[8px] md:text-xs">
            <span className="text-retro-gold retro-glow">{humanPlayer.seatWind.toUpperCase()}</span>
            <span className="text-retro-text">{humanPlayer.name}</span>
            {humanPlayer.isDealer && <span className="text-retro-accent">★ DEALER</span>}
          </div>
          <div className="flex items-center gap-2 md:gap-3 font-retro text-xs md:text-sm">
            {humanPlayer.flowers.length > 0 && (
              <span className="text-retro-gold">🌸 ×{humanPlayer.flowers.length}</span>
            )}
            <span className="text-retro-cyan">Score: {humanPlayer.score}</span>
          </div>
        </div>

        {/* Tenpai badge — persistent across all phases in easy mode */}
        {tenpaiStatus?.isTenpai && (
          <div className="text-center">
            <span className="font-pixel text-[8px] md:text-xs text-retro-green retro-glow animate-pulse">
              TENPAI — ONE TILE AWAY
            </span>
            {tenpaiStatus.waits.length > 0 && tenpaiStatus.waits[0] !== 'Already winning!' && (
              <span className="font-retro text-[10px] md:text-xs text-retro-cyan ml-1 md:ml-2">
                Waiting: {tenpaiStatus.waits.slice(0, 3).join(', ')}
                {tenpaiStatus.waits.length > 3 && ` +${tenpaiStatus.waits.length - 3} more`}
              </span>
            )}
          </div>
        )}

        {/* Player hand */}
        <div className="flex justify-center">
          <PlayerHand
            tiles={humanPlayer.hand}
            selectedTileId={selectedTileId}
            suggestedTileId={suggestedTileId}
            onTileSelect={onTileSelect}
            lastDrawnTileId={gameState.lastDrawnTile?.id}
            disabled={!isHumanTurn || gameState.turnPhase !== 'discard'}
            tileClassifications={tileClassifications}
          />
        </div>

        {/* Player exposed melds */}
        {humanPlayer.melds.length > 0 && (
          <div className="flex justify-center">
            <ExposedMelds melds={humanPlayer.melds} size="md" />
          </div>
        )}
      </div>
    </div>
  );
}
