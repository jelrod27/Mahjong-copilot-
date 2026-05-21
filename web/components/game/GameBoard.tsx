'use client';

import { useState, useEffect, useRef } from 'react';
import { GameState } from '@/models/GameState';
import { MatchState } from '@/models/MatchState';
import type { AvailableClaim } from '@/engine/types';
import type { Tile } from '@/models/Tile';
import PlayerHand from './PlayerHand';
import OpponentSeat from './OpponentSeat';
import { useAppSelector } from '@/store/hooks';
import { getRoster, getTableFelt } from '@/lib/cosmetics';
import { NpcId } from '@/content/npcs';
import DiscardPool from './DiscardPool';
import GameHUD from './GameHUD';
import ActionBar from './ActionBar';
import ExposedMelds from './ExposedMelds';
import TutorPanel from './TutorPanel';
import GlossaryTerm from './GlossaryTerm';
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
  }, [
    gameState.lastDiscardedTile?.id,
    gameState.lastDiscardedTile?.nameEnglish,
    gameState.lastDiscardedBy,
    gameState.players,
    humanPlayerId,
  ]);

  // Map opponents to positions: right of human = right, across = top, left = left
  const getOpponent = (offset: number) => {
    const idx = (humanIndex + offset) % gameState.players.length;
    return gameState.players[idx];
  };

  const rightPlayer = getOpponent(1);
  const topPlayer = getOpponent(2);
  const leftPlayer = getOpponent(3);

  const canDiscard = isHumanTurn && gameState.turnPhase === 'discard' && !!selectedTileId;
  const selectedTile = humanPlayer.hand.find(tile => tile.id === selectedTileId);
  const canDeclareWin = canWinProp ?? false;
  const canDeclareKong = canKongProp ?? false;
  const hasClaimOptions = hasClaimsProp ?? false;
  const showClaimHighlight =
    gameState.turnPhase === 'claim' && hasClaimOptions && isHumanTurn;

  // Cosmetic preferences: which roster fills the seats, which felt paints the
  // table. Both fall back to defaults if settings aren't yet hydrated.
  const rosterId = useAppSelector(s => s.settings.npcRoster);
  const feltId = useAppSelector(s => s.settings.tableFelt);
  const roster = getRoster(rosterId);
  const felt = getTableFelt(feltId);
  const NPC_BY_POSITION: Record<'left' | 'top' | 'right', NpcId> = {
    left: roster.seats.left,
    top: roster.seats.top,
    right: roster.seats.right,
  };

  const currentActor = gameState.players[gameState.currentPlayerIndex];
  const phaseHeadline =
    gameState.turnPhase === 'claim'
      ? 'Claims open'
      : isHumanTurn
        ? 'Your turn'
        : `${currentActor?.name ?? 'Opponent'}'s turn`;
  const phaseSubline =
    gameState.turnPhase === 'claim'
      ? 'Call chow, pung, kong, or mahjong — or pass.'
      : isHumanTurn && gameState.turnPhase === 'discard'
        ? 'Select a tile, then tap Discard.'
        : isHumanTurn
          ? 'Draw from the wall when you are ready.'
          : 'Sit tight while they choose their move.';

  return (
    <div
      className={`game-board-root relative flex h-screen w-full flex-col overflow-hidden game-table-felt ${felt.className}`}
      data-testid="game-board-root"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_42%,transparent_0%,rgb(0_0_0_/_0.18)_78%,rgb(0_0_0_/_0.42)_100%)]"
        aria-hidden
      />

      <div className="game-board-scene relative z-10 mx-auto flex h-full w-full max-w-[min(100%,72rem)] min-h-0 flex-col">
      <GameToast message={toastMessage} />

      {/* Top row: HUD + opponents (mobile: compact bar, desktop: full layout) */}
      <div className="relative z-10 flex items-start p-1 md:p-2 gap-1 md:gap-2" style={{ flex: '0 0 auto' }}>
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
          <OpponentSeat
            player={leftPlayer}
            position="left"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(leftPlayer)}
            npcId={NPC_BY_POSITION.left}
            gameState={gameState}
            playerIndex={gameState.players.indexOf(leftPlayer)}
            compact
          />
          <OpponentSeat
            player={topPlayer}
            position="top"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(topPlayer)}
            npcId={NPC_BY_POSITION.top}
            gameState={gameState}
            playerIndex={gameState.players.indexOf(topPlayer)}
            compact
          />
          <OpponentSeat
            player={rightPlayer}
            position="right"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(rightPlayer)}
            npcId={NPC_BY_POSITION.right}
            gameState={gameState}
            playerIndex={gameState.players.indexOf(rightPlayer)}
            compact
          />
        </div>

        {/* Desktop: Top opponent centered */}
        <div className="hidden md:flex flex-1 justify-center">
          <OpponentSeat
            player={topPlayer}
            position="top"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(topPlayer)}
            npcId={NPC_BY_POSITION.top}
            gameState={gameState}
            playerIndex={gameState.players.indexOf(topPlayer)}
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
      <div className="relative z-10 flex md:hidden items-center justify-between px-2 py-0.5" style={{ flex: '0 0 auto' }}>
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
      <div className="relative z-10 flex md:hidden flex-col gap-0.5 px-2 py-0.5" style={{ flex: '0 0 auto' }}>
        {faanProjection && <FaanMeter projection={faanProjection} compact />}
        <DiscardReadingPanel game={gameState} humanPlayerId={humanPlayerId} compact />
      </div>

      {/* Middle row: Left opponent + Discard Pool + Right opponent */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center gap-1 px-1 md:gap-2 md:px-2">
        {/* Left opponent — desktop only (mobile shows in top bar) */}
        <div className="hidden md:flex w-32 shrink-0 justify-center">
          <OpponentSeat
            player={leftPlayer}
            position="left"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(leftPlayer)}
            npcId={NPC_BY_POSITION.left}
            gameState={gameState}
            playerIndex={gameState.players.indexOf(leftPlayer)}
          />
        </div>

        {/* Center: Discard pool + wind indicator */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 md:gap-2 min-h-0">
          {/* Turn indicator — stable test id for e2e */}
          <div className="text-center">
            <div
              data-testid="game-phase-banner"
              role="status"
              aria-live="polite"
              className={`game-phase-pill max-w-[min(100%,20rem)] transition-all duration-normal ease-ds-out ${
                isHumanTurn ? 'ring-2 ring-info/35 ring-offset-2 ring-offset-transparent' : ''
              }`}
            >
              <span className="font-display text-[10px] font-semibold text-highlight md:text-sm">
                {phaseHeadline}
              </span>
              <span className="mt-1 max-w-[18rem] font-sans text-[10px] leading-snug text-muted-foreground md:text-xs">
                {phaseSubline}
              </span>
            </div>
          </div>

          {/* Discard pool */}
          <div className="w-full max-w-[min(100%,22rem)] md:max-w-md">
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
        <div className="hidden md:flex w-32 shrink-0 justify-center">
          <OpponentSeat
            player={rightPlayer}
            position="right"
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(rightPlayer)}
            npcId={NPC_BY_POSITION.right}
            gameState={gameState}
            playerIndex={gameState.players.indexOf(rightPlayer)}
          />
        </div>
      </div>

      {/* Bottom dock: actions, identity, hand */}
      <div className="relative z-10 mt-auto px-1 pb-[env(safe-area-inset-bottom,0px)] md:px-3" style={{ flex: '0 0 auto' }}>
        <div className="game-dock space-y-2 md:space-y-3">
        {/* Action bar */}
        <ActionBar
          canDiscard={canDiscard}
          canDeclareKong={canDeclareKong}
          canDeclareWin={canDeclareWin}
          hasClaimOptions={hasClaimOptions}
          claimOptions={claimOptions}
          discardedTile={gameState.lastDiscardedTile}
          selectedTileName={selectedTile?.nameEnglish}
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
        <div className="flex items-center justify-between border-b border-border/25 px-1 pb-2 md:px-2">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <span className="shrink-0 rounded-md border border-highlight/35 bg-highlight/10 px-1.5 py-0.5 font-display text-[9px] font-bold text-highlight md:text-[10px]">
              {humanPlayer.seatWind.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-semibold text-foreground md:text-base">{humanPlayer.name}</p>
              {humanPlayer.isDealer && (
                <p className="font-display text-[9px] font-semibold text-accent">Dealer</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-4 font-sans text-xs md:text-sm">
            {humanPlayer.flowers.length > 0 && (
              <GlossaryTerm term="Bonus Tile">
                <span className="rounded-full border border-highlight/25 bg-highlight/10 px-2 py-0.5 text-highlight">
                  Bonus ×{humanPlayer.flowers.length}
                </span>
              </GlossaryTerm>
            )}
            <span className="rounded-full border border-info/25 bg-info/10 px-2.5 py-0.5 font-display tabular-nums text-info">
              {humanPlayer.score}
            </span>
          </div>
        </div>

        {/* Beginner Assist legend */}
        {tileClassifications && tileClassifications.size > 0 && (
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-1 text-center font-sans text-[9px] text-muted-foreground md:text-xs">
            <span>
              <span className="font-semibold text-success">Good</span> strong discard
            </span>
            <span className="text-border">·</span>
            <span>
              <span className="font-semibold text-highlight">OK</span> neutral
            </span>
            <span className="text-border">·</span>
            <span>
              <span className="font-semibold text-accent">Keep</span> useful tile
            </span>
          </div>
        )}

        {/* Tenpai badge — persistent across all phases in easy mode */}
        {tenpaiStatus?.isTenpai && (
          <div className="text-center">
            <GlossaryTerm term="Tenpai">
              <span className="inline-flex items-center gap-1 rounded-full border border-success/35 bg-success/10 px-3 py-1 font-display text-[9px] font-semibold text-success md:text-[10px]">
                Tenpai · one tile away
              </span>
            </GlossaryTerm>
            {tenpaiStatus.waits.length > 0 && tenpaiStatus.waits[0] !== 'Already winning!' && (
              <span className="mt-1 block font-sans text-[10px] text-info md:text-xs">
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
      </div>
    </div>
  );
}
