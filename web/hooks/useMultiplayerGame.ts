'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GamePhase, ClaimType, gameStateFromJson } from '@/models/GameState';
import { Tile, TileType, tileFromJson, tileKey } from '@/models/Tile';
import { AvailableClaim, ScoringContext, ScoringResult } from '@/engine/types';
import { getAvailableClaims } from '@/engine/claiming';
import { isWinningHand } from '@/engine/winDetection';
import { calculateScore } from '@/engine/scoring';
import { GameController, TutorAdvice } from '@/components/game/useGameController';
import { joinGameChannel, leaveChannel, GameEvent } from '@/lib/supabase/realtime';
import { submitMove, getGameState } from '@/lib/multiplayer/gameService';

const CLAIM_TIMEOUT = 15000; // 15 seconds for claims in multiplayer

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
  const [isGameOver, setIsGameOver] = useState(false);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');

  const channelRef = useRef<any>(null);
  const claimTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stateVersionRef = useRef(0);

  // Reconstruct game state from filtered server state
  const applyServerState = useCallback((serverState: any, version: number) => {
    if (version <= stateVersionRef.current) return; // Stale update
    stateVersionRef.current = version;

    // The server sends filtered state — other players' hands are { count: N }
    // We need to handle this gracefully in the UI
    const state = reconstructState(serverState, playerId);
    setGame(state);

    // Check game over
    if (state.phase === GamePhase.FINISHED) {
      setIsGameOver(true);
      if (state.winnerId && state.winningTile) {
        const winner = state.players.find(p => p.id === state.winnerId);
        if (winner) {
          const context: ScoringContext = {
            winningTile: state.winningTile,
            isSelfDrawn: state.isSelfDrawn || false,
            seatWind: winner.seatWind,
            prevailingWind: state.prevailingWind,
            isConcealed: winner.melds.every(m => m.isConcealed),
            flowers: winner.flowers,
          };
          const result = calculateScore(winner.hand, winner.melds, context);
          setScoringResult(result);
        }
      }
    }

    // Check for claim options if it's claim phase and we're not the current player
    if (state.turnPhase === 'claim' && state.lastDiscardedTile && state.lastDiscardedBy !== playerId) {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      const player = state.players[playerIndex];
      if (player && player.hand.length > 0) {
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
      }
    } else {
      setClaimOptions([]);
    }
  }, [playerId]);

  // Join game channel on mount
  useEffect(() => {
    const channel = joinGameChannel(
      roomId,
      (event: GameEvent) => {
        switch (event.type) {
          case 'game-state-update':
            applyServerState(event.state, event.version);
            break;
          case 'game-started':
            // Fetch initial state
            fetchLatestState();
            break;
          case 'game-finished':
            setIsGameOver(true);
            break;
        }
      },
      () => {
        setConnectionStatus('connected');
      },
    );

    channelRef.current = channel;
    setConnectionStatus('connecting');

    // Fetch current state on join
    fetchLatestState();

    return () => {
      if (channelRef.current) {
        leaveChannel(channelRef.current);
      }
      if (claimTimerRef.current) {
        clearInterval(claimTimerRef.current);
      }
    };
  }, [roomId, applyServerState]);

  const fetchLatestState = async () => {
    const result = await getGameState(roomId);
    if (result.state) {
      applyServerState(result.state, result.version);
      setConnectionStatus('connected');
    }
  };

  const startClaimTimer = () => {
    if (claimTimerRef.current) clearInterval(claimTimerRef.current);
    setClaimTimer(CLAIM_TIMEOUT);
    const startTime = Date.now();
    claimTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, CLAIM_TIMEOUT - elapsed);
      setClaimTimer(remaining);
      if (remaining <= 0) {
        if (claimTimerRef.current) clearInterval(claimTimerRef.current);
        // Auto-pass on timeout
        handlePass();
      }
    }, 100);
  };

  // === Player Actions (send to server) ===

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

    if (result.success) {
      setSelectedTileId(undefined);
    }
  }, [game, selectedTileId, playerId, roomId]);

  const declareKong = useCallback(async () => {
    if (!game) return;

    await submitMove(roomId, {
      type: 'DECLARE_KONG',
      playerId,
    });
  }, [game, playerId, roomId]);

  const declareWin = useCallback(async () => {
    if (!game) return;

    await submitMove(roomId, {
      type: 'DECLARE_WIN',
      playerId,
    });
  }, [game, playerId, roomId]);

  const submitClaimAction = useCallback(async (claimType: ClaimType, tilesFromHand: Tile[]) => {
    if (!game) return;

    if (claimTimerRef.current) clearInterval(claimTimerRef.current);
    setClaimOptions([]);
    setClaimTimer(0);

    await submitMove(roomId, {
      type: 'CLAIM',
      playerId,
      claimType,
      tilesFromHand: tilesFromHand.map(t => ({ id: t.id, tileKey: tileKey(t) })),
    });
  }, [game, playerId, roomId]);

  const handlePass = useCallback(async () => {
    if (claimTimerRef.current) clearInterval(claimTimerRef.current);
    setClaimOptions([]);
    setClaimTimer(0);

    await submitMove(roomId, {
      type: 'PASS',
      playerId,
    });
  }, [playerId, roomId]);

  const startNewGame = useCallback(() => {
    // In multiplayer, "new game" means going back to lobby
    // The host creates a new room
  }, []);

  // Compute derived state
  const humanPlayer = game?.players.find(p => p.id === playerId);
  const canDeclareKong = !!(game && humanPlayer &&
    game.currentPlayerIndex === game.players.indexOf(humanPlayer) &&
    game.turnPhase === 'discard' &&
    humanPlayer.hand.some(t => {
      const count = humanPlayer.hand.filter(h => tileKey(h) === tileKey(t)).length;
      return count >= 4;
    })
  );
  const canDeclareWin = !!(game && humanPlayer &&
    game.currentPlayerIndex === game.players.indexOf(humanPlayer) &&
    game.turnPhase === 'discard' &&
    isWinningHand(humanPlayer.hand)
  );

  return {
    game,
    selectedTileId,
    suggestedTileId: undefined, // No tutor in multiplayer
    tutorAdvice: null,
    claimOptions,
    claimTimer,
    isGameOver,
    scoringResult,
    selectTile,
    discardSelected,
    declareKong,
    declareWin,
    submitClaim: submitClaimAction,
    pass: handlePass,
    startNewGame,
    canDeclareKong,
    canDeclareWin,
    connectionStatus,
  };
}

/**
 * Reconstruct a GameState-like object from filtered server state.
 * Other players' hands come as { count: N } instead of tile arrays.
 * Wall comes as { count: N } instead of tile array.
 */
function reconstructState(serverState: any, myPlayerId: string): GameState {
  // For the requesting player, hand is full tiles
  // For others, hand is { count: N } — we create placeholder tiles
  const players = serverState.players.map((p: any) => {
    if (p.id === myPlayerId || Array.isArray(p.hand)) {
      // Full hand available — deserialize normally
      return {
        ...p,
        hand: Array.isArray(p.hand) ? p.hand.map((t: any) => tileFromJson(t)) : [],
        melds: (p.melds || []).map((m: any) => ({
          ...m,
          tiles: (m.tiles || []).map((t: any) => tileFromJson(t)),
        })),
        flowers: (p.flowers || []).map((t: any) => tileFromJson(t)),
      };
    }
    // Hidden hand — create empty array (UI shows tile backs based on count)
    return {
      ...p,
      hand: [], // GameBoard uses OpponentHand which shows tile backs
      _hiddenHandCount: p.hand?.count || 0,
      melds: (p.melds || []).map((m: any) => ({
        ...m,
        tiles: (m.tiles || []).map((t: any) => tileFromJson(t)),
      })),
      flowers: (p.flowers || []).map((t: any) => tileFromJson(t)),
    };
  });

  return {
    id: serverState.id,
    variant: serverState.variant || 'Hong Kong Mahjong',
    phase: serverState.phase as GamePhase,
    turnPhase: serverState.turnPhase || 'draw',
    players,
    currentPlayerIndex: serverState.currentPlayerIndex || 0,
    wall: [], // Hidden from client
    deadWall: [],
    discardPile: (serverState.discardPile || []).map((t: any) => tileFromJson(t)),
    playerDiscards: serverState.playerDiscards
      ? Object.fromEntries(
          Object.entries(serverState.playerDiscards as Record<string, any[]>).map(
            ([k, v]) => [k, v.map((t: any) => tileFromJson(t))]
          )
        )
      : {},
    lastDrawnTile: serverState.lastDrawnTile ? tileFromJson(serverState.lastDrawnTile) : undefined,
    lastDiscardedTile: serverState.lastDiscardedTile ? tileFromJson(serverState.lastDiscardedTile) : undefined,
    lastDiscardedBy: serverState.lastDiscardedBy,
    lastAction: serverState.lastAction,
    pendingClaims: (serverState.pendingClaims || []).map((c: any) => ({
      ...c,
      tiles: (c.tiles || []).map((t: any) => tileFromJson(t)),
    })),
    prevailingWind: serverState.prevailingWind,
    winnerId: serverState.winnerId,
    winningTile: serverState.winningTile ? tileFromJson(serverState.winningTile) : undefined,
    isSelfDrawn: serverState.isSelfDrawn,
    finalScores: serverState.finalScores || {},
    createdAt: new Date(serverState.createdAt),
    finishedAt: serverState.finishedAt ? new Date(serverState.finishedAt) : undefined,
    turnHistory: serverState.turnHistory || [],
    turnTimeLimit: serverState.turnTimeLimit || 20,
    turnStartedAt: serverState.turnStartedAt ? new Date(serverState.turnStartedAt) : undefined,
  };
}
