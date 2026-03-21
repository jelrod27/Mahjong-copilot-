'use client';

import { GameState } from '@/models/GameState';
import { Tile } from '@/models/Tile';
import PlayerHand from './PlayerHand';
import OpponentHand from './OpponentHand';
import DiscardPool from './DiscardPool';
import GameHUD from './GameHUD';
import ActionBar from './ActionBar';
import ExposedMelds from './ExposedMelds';

interface GameBoardProps {
  gameState: GameState;
  humanPlayerId: string;
  selectedTileId?: string;
  onTileSelect: (tile: Tile) => void;
  onDiscard: () => void;
  onKong: () => void;
  onWin: () => void;
  onClaim: (claimType: string) => void;
  onPass: () => void;
  canDeclareKong?: boolean;
  canDeclareWin?: boolean;
  hasClaimOptions?: boolean;
  claimTimer?: number;
}

export default function GameBoard({
  gameState, humanPlayerId, selectedTileId,
  onTileSelect, onDiscard, onKong, onWin, onClaim, onPass,
  canDeclareKong: canKongProp, canDeclareWin: canWinProp,
  hasClaimOptions: hasClaimsProp, claimTimer,
}: GameBoardProps) {
  const humanIndex = gameState.players.findIndex(p => p.id === humanPlayerId);
  const humanPlayer = gameState.players[humanIndex];
  const isHumanTurn = gameState.currentPlayerIndex === humanIndex;

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

  return (
    <div
      className="h-screen w-full flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at center, #1e2a22 0%, #0f1610 50%, #110e1a 100%)',
      }}
    >
      {/* Top row: HUD + Top opponent */}
      <div className="flex items-start p-2 gap-2" style={{ flex: '0 0 auto' }}>
        {/* Left HUD */}
        <div className="w-48 shrink-0">
          <GameHUD
            wallCount={gameState.wall.length}
            prevailingWind={gameState.prevailingWind}
            currentPlayerIndex={gameState.currentPlayerIndex}
            players={gameState.players}
            turnPhase={gameState.turnPhase}
          />
        </div>

        {/* Top opponent */}
        <div className="flex-1 flex justify-center">
          <OpponentHand
            player={topPlayer}
            position="top"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(topPlayer)}
          />
        </div>

        {/* Right spacer */}
        <div className="w-48 shrink-0" />
      </div>

      {/* Middle row: Left opponent + Discard Pool + Right opponent */}
      <div className="flex-1 flex items-center px-2 gap-2 min-h-0">
        {/* Left opponent */}
        <div className="w-24 shrink-0 flex justify-center">
          <OpponentHand
            player={leftPlayer}
            position="left"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(leftPlayer)}
          />
        </div>

        {/* Center: Discard pool + wind indicator */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0">
          {/* Wind compass */}
          <div className="text-center">
            <div className="inline-block retro-panel px-3 py-1">
              <span className="text-retro-gold font-pixel text-xs retro-glow">
                {gameState.turnPhase === 'claim' ? '⚡ CLAIM' :
                 isHumanTurn ? '► YOUR TURN' : '⏳ OPPONENT'}
              </span>
            </div>
          </div>

          {/* Discard pool */}
          <div className="w-full max-w-xs">
            <DiscardPool
              discards={gameState.discardPile}
              lastDiscardedTile={gameState.lastDiscardedTile}
            />
          </div>
        </div>

        {/* Right opponent */}
        <div className="w-24 shrink-0 flex justify-center">
          <OpponentHand
            player={rightPlayer}
            position="right"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(rightPlayer)}
          />
        </div>
      </div>

      {/* Bottom row: Player hand + melds + actions */}
      <div className="p-2 space-y-1" style={{ flex: '0 0 auto' }}>
        {/* Action bar */}
        <ActionBar
          canDiscard={canDiscard}
          canDeclareKong={canDeclareKong}
          canDeclareWin={canDeclareWin}
          hasClaimOptions={hasClaimOptions}
          onDiscard={onDiscard}
          onKong={onKong}
          onWin={onWin}
          onClaim={onClaim}
          onPass={onPass}
          turnPhase={gameState.turnPhase}
          isHumanTurn={isHumanTurn}
          claimTimer={claimTimer}
        />

        {/* Player info bar */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 font-pixel text-xs">
            <span className="text-retro-gold retro-glow">{humanPlayer.seatWind.toUpperCase()}</span>
            <span className="text-retro-text">{humanPlayer.name}</span>
            {humanPlayer.isDealer && <span className="text-retro-accent">★ DEALER</span>}
          </div>
          <div className="flex items-center gap-3 font-retro text-sm">
            {humanPlayer.flowers.length > 0 && (
              <span className="text-retro-gold">🌸 ×{humanPlayer.flowers.length}</span>
            )}
            <span className="text-retro-cyan">Score: {humanPlayer.score}</span>
          </div>
        </div>

        {/* Player hand */}
        <div className="flex justify-center">
          <PlayerHand
            tiles={humanPlayer.hand}
            selectedTileId={selectedTileId}
            onTileSelect={onTileSelect}
            lastDrawnTileId={gameState.lastDrawnTile?.id}
            disabled={!isHumanTurn || gameState.turnPhase !== 'discard'}
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
