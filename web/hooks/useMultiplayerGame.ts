'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameState, GamePhase, ClaimType, gameStateFromJson } from '@/models/GameState';
import { Tile, TileType, tileKey } from '@/models/Tile';
import { AvailableClaim, ScoringContext, ScoringResult } from '@/engine/types';
import { getAvailableClaims, getBestClaimSubmission } from '@/engine/claiming';
import { isWinningHand, canPlayerWin } from '@/engine/winDetection';
import { calculateScore } from '@/engine/scoring';
import { GameController } from '@/components/game/useGameController';
import { joinGameChannel, leaveChannel, GameEvent } from '@/lib/supabase/realtime';
import { submitMove, getGameState } from '@/lib/multiplayer/gameService';

const CLAIM_TIMEOUT = 15000;

/**
 * Multiplayer game hook — matches the GameController interface
 * so GameBoard can be reused without changes.
 */
export default function useMultiplayerGame(
  roomId: string,
  playerId: string,
): GameController & { connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' } {
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | undefined>();
  const [claimOptions, setClaimOptions] = useState<AvailableClaim[]>([]);
  const [claimTimer, setClaimTimer] = useState(0);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');

  const channelRef = useRef<any>(null);
  const claimTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stateVersionRef = useRef(0);

  const clearClaimTimer = useCallback(() => {
    if (claimTimerRef.current) {
      clearInterval(claimTimerRef.current);
      claimTimerRef.current = null;
    }
    setClaimOptions([]);
    setClaimTimer(0);
  }, []);

  const startClaimTimer = useCallback(() => {
    clearClaimTimer();
    setClaimTimer(CLAIM_TIMEOUT);
    const startTime = Date.now();
    claimTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, CLAIM_TIMEOUT - (Date.now() - startTime));
      setClaimTimer(remaining);
      if (remaining <= 0) {
        clearClaimTimer();
        submitMove(roomId, { type: 'PASS', playerId });
      }
    }, 100);
  }, [roomId, playerId, clearClaimTimer]);

  const applyServerState = useCallback((serverState: any, version: number) => {
    if (version <= stateVersionRef.current) return;
    stateVersionRef.current = version;

    // Preprocess filtered state: replace hidden hands with empty arrays for gameStateFromJson
    const preprocessed = {
      ...serverState,
      wall: Array.isArray(serverState.wall) ? serverState.wall : [],
      deadWall: Array.isArray(serverState.deadWall) ? serverState.deadWall : [],
      players: (serverState.players || []).map((p: any) => ({
        ...p,
        hand: Array.isArray(p.hand) ? p.hand : [],
      })),
    };

    const state = gameStateFromJson(preprocessed);
    setGame(state);

    if (state.phase === GamePhase.FINISHED) {
      if (state.winnerId && state.winningTile) {
        const winner = state.players.find(p => p.id === state.winnerId);
        if (winner) {
          const result = calculateScore(winner.hand, winner.melds, {
            winningTile: state.winningTile,
            isSelfDrawn: state.isSelfDrawn || false,
            seatWind: winner.seatWind,
            prevailingWind: state.prevailingWind,
            isConcealed: winner.melds.every(m => m.isConcealed),
            flowers: winner.flowers,
          });
          setScoringResult(result);
        }
      }
    }

    if (state.turnPhase === 'claim' && state.lastDiscardedTile && state.lastDiscardedBy !== playerId) {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      const player = state.players[playerIndex];
      const isOurClaimTurn = state.currentPlayerIndex === playerIndex;
      if (isOurClaimTurn && player && player.hand.length > 0) {
        const lastDiscarderIndex = state.players.findIndex(p => p.id === state.lastDiscardedBy);
        const claims = getAvailableClaims(
          state.lastDiscardedTile,
          player,
          playerIndex,
          lastDiscarderIndex,
          state.players.length,
        );
        setClaimOptions(claims);
        startClaimTimer();
      } else {
        setClaimOptions([]);
      }
    } else {
      setClaimOptions([]);
    }
  }, [playerId, startClaimTimer, clearClaimTimer]);

  const fetchLatestState = useCallback(async () => {
    const result = await getGameState(roomId);
    if (result.state) {
      applyServerState(result.state, result.version);
      setConnectionStatus('connected');
    }
  }, [roomId, applyServerState]);

  useEffect(() => {
    const channel = joinGameChannel(
      roomId,
      (event: GameEvent) => {
        switch (event.type) {
          case 'game-state-update':
            applyServerState(event.state, event.version);
            break;
          case 'game-started':
            fetchLatestState();
            break;
          case 'game-finished':
            break;
        }
      },
      () => setConnectionStatus('connected'),
    );

    channelRef.current = channel;
    setConnectionStatus('connecting');
    fetchLatestState();

    return () => {
      if (channelRef.current) leaveChannel(channelRef.current);
      clearClaimTimer();
    };
  }, [roomId, applyServerState, fetchLatestState, clearClaimTimer]);

  const selectTile = useCallback((tile: Tile) => {
    setSelectedTileId(prev => prev === tile.id ? undefined : tile.id);
  }, []);

  const discardSelected = useCallback(async () => {
    if (!game || !selectedTileId) return;
    const tile = game.players.find(p => p.id === playerId)?.hand.find(t => t.id === selectedTileId);
    if (!tile) return;
    const result = await submitMove(roomId, {
      type: 'DISCARD',
      playerId,
      tile: { id: tile.id, tileKey: tileKey(tile) },
    });
    if (result.success) setSelectedTileId(undefined);
  }, [game, selectedTileId, playerId, roomId]);

  const declareKong = useCallback(async () => {
    if (!game) return;
    await submitMove(roomId, { type: 'DECLARE_KONG', playerId });
  }, [game, playerId, roomId]);

  const declareWin = useCallback(async () => {
    if (!game) return;
    await submitMove(roomId, { type: 'DECLARE_WIN', playerId });
  }, [game, playerId, roomId]);

  const submitClaimAction = useCallback(async (claimType: ClaimType, tilesFromHand: Tile[]) => {
    if (!game) return;
    clearClaimTimer();
    await submitMove(roomId, {
      type: 'CLAIM',
      playerId,
      claimType,
      tilesFromHand: tilesFromHand.map(t => ({ id: t.id, tileKey: tileKey(t) })),
    });
  }, [game, playerId, roomId, clearClaimTimer]);

  const claimBest = useCallback(async () => {
    if (!game || game.turnPhase !== 'claim') return;
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (game.currentPlayerIndex !== playerIndex) return;
    if (game.lastDiscardedBy === playerId) return;
    const me = game.players[playerIndex];
    const discarderIndex = game.players.findIndex(p => p.id === game.lastDiscardedBy);
    if (discarderIndex === -1 || !game.lastDiscardedTile) return;
    const claims = getAvailableClaims(
      game.lastDiscardedTile,
      me,
      playerIndex,
      discarderIndex,
      game.players.length,
    );
    const best = getBestClaimSubmission(claims);
    if (!best) return;
    await submitClaimAction(best.claimType, best.tilesFromHand);
  }, [game, playerId, submitClaimAction]);

  const handlePass = useCallback(async () => {
    clearClaimTimer();
    await submitMove(roomId, { type: 'PASS', playerId });
  }, [playerId, roomId, clearClaimTimer]);

  const startNewGame = useCallback(() => {
    // In multiplayer, return to lobby — host creates a new room
  }, []);

  // Derive game-over and computed state via useMemo
  const isGameOver = game?.phase === GamePhase.FINISHED;

  const humanPlayer = game?.players.find(p => p.id === playerId);

  const canDeclareKong = useMemo(() => {
    if (!game || !humanPlayer) return false;
    if (game.currentPlayerIndex !== game.players.indexOf(humanPlayer)) return false;
    if (game.turnPhase !== 'discard') return false;
    return humanPlayer.hand.some(t => {
      const count = humanPlayer.hand.filter(h => tileKey(h) === tileKey(t)).length;
      return count >= 4;
    });
  }, [game, humanPlayer]);

  const canDeclareWin = useMemo(() => {
    if (!game || !humanPlayer) return false;
    if (game.currentPlayerIndex !== game.players.indexOf(humanPlayer)) return false;
    if (game.turnPhase !== 'discard') return false;
    return canPlayerWin(humanPlayer.hand, humanPlayer.melds);
  }, [game, humanPlayer]);

  return {
    game,
    match: null,
    selectedTileId,
    suggestedTileId: undefined,
    tutorAdvice: null,
    tenpaiStatus: null,
    tileClassifications: new Map(),
    claimOptions,
    claimTimer,
    isGameOver,
    isMatchOver: isGameOver,
    scoringResult,
    selectTile,
    discardSelected,
    declareKong,
    declareWin,
    submitClaim: submitClaimAction,
    submitChow: (tilesFromHand: Tile[]) => submitClaimAction('chow', tilesFromHand),
    claimBest,
    pass: handlePass,
    startNewGame,
    continueToNextHand: () => {},
    resumeGame: () => false,
    clearSavedGame: () => {},
    canDeclareKong,
    canDeclareWin,
    connectionStatus,
  };
}
