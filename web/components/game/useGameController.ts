'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GamePhase, ClaimType } from '@/models/GameState';
import { Tile, TileType, tilesMatch } from '@/models/Tile';
import { initializeGame, applyAction, GameOptions } from '@/engine/turnManager';
import { getAvailableClaims } from '@/engine/claiming';
import { isWinningHand } from '@/engine/winDetection';
import { calculateScore } from '@/engine/scoring';
import { AvailableClaim, ScoringContext, ScoringResult } from '@/engine/types';
import { getAIDecision, getAIClaimDecision } from '@/engine/ai';
import soundManager from '@/lib/soundManager';

const HUMAN_ID = 'human-player';
const AI_DRAW_DELAY = 600;
const AI_DISCARD_DELAY = 800;
const CLAIM_TIMEOUT = 10000;

export interface GameController {
  game: GameState | null;
  selectedTileId: string | undefined;
  claimOptions: AvailableClaim[];
  claimTimer: number;
  isGameOver: boolean;
  scoringResult: ScoringResult | null;
  selectTile: (tile: Tile) => void;
  discardSelected: () => void;
  declareKong: () => void;
  declareWin: () => void;
  submitClaim: (claimType: ClaimType, tilesFromHand: Tile[]) => void;
  pass: () => void;
  startNewGame: (difficulty: 'easy' | 'medium' | 'hard') => void;
  canDeclareKong: boolean;
  canDeclareWin: boolean;
}

export default function useGameController(initialDifficulty: 'easy' | 'medium' | 'hard'): GameController {
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | undefined>();
  const [claimOptions, setClaimOptions] = useState<AvailableClaim[]>([]);
  const [claimTimer, setClaimTimer] = useState(0);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const processingRef = useRef(false);

  // Keep ref in sync
  useEffect(() => { gameRef.current = game; }, [game]);

  const startNewGame = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    const state = initializeGame({
      playerNames: ['You', 'West AI', 'North AI', 'East AI'],
      aiPlayers: [
        { index: 1, difficulty },
        { index: 2, difficulty },
        { index: 3, difficulty },
      ],
      humanPlayerId: HUMAN_ID,
    });
    setGame(state);
    setSelectedTileId(undefined);
    setClaimOptions([]);
    setClaimTimer(0);
    setScoringResult(null);
    processingRef.current = false;
  }, []);

  // Initialize game on mount
  useEffect(() => {
    startNewGame(initialDifficulty);
  }, [initialDifficulty, startNewGame]);

  const humanIndex = game?.players.findIndex(p => p.id === HUMAN_ID) ?? 0;
  const isHumanTurn = game?.currentPlayerIndex === humanIndex;
  const isGameOver = game?.phase === GamePhase.FINISHED;

  // Apply an action and update state
  const doAction = useCallback((playerId: string, action: any): GameState | null => {
    const current = gameRef.current;
    if (!current || current.phase !== GamePhase.PLAYING) return null;
    const next = applyAction(current, playerId, action);
    if (next) {
      setGame(next);
      gameRef.current = next;
    }
    return next;
  }, []);

  // === Human actions ===

  const selectTile = useCallback((tile: Tile) => {
    setSelectedTileId(prev => prev === tile.id ? undefined : tile.id);
  }, []);

  const discardSelected = useCallback(() => {
    const current = gameRef.current;
    if (!current || current.turnPhase !== 'discard' || current.currentPlayerIndex !== humanIndex) return;
    const tile = current.players[humanIndex].hand.find(t => t.id === selectedTileId);
    if (!tile) return;
    doAction(HUMAN_ID, { type: 'DISCARD', tile });
    setSelectedTileId(undefined);
    soundManager.play('tilePlace');
  }, [selectedTileId, humanIndex, doAction]);

  const declareKong = useCallback(() => {
    const current = gameRef.current;
    if (!current || current.turnPhase !== 'discard' || current.currentPlayerIndex !== humanIndex) return;
    // Find a tile the player has 4 of
    const hand = current.players[humanIndex].hand;
    const counts = new Map<string, Tile[]>();
    for (const t of hand) {
      const key = `${t.suit}_${t.number ?? t.wind ?? t.dragon}`;
      const arr = counts.get(key) || [];
      arr.push(t);
      counts.set(key, arr);
    }
    const entries = Array.from(counts.values());
    for (const tiles of entries) {
      if (tiles.length === 4) {
        doAction(HUMAN_ID, { type: 'DECLARE_KONG', tile: tiles[0] });
        return;
      }
    }
  }, [humanIndex, doAction]);

  const declareWin = useCallback(() => {
    doAction(HUMAN_ID, { type: 'DECLARE_WIN' });
  }, [doAction]);

  const submitClaim = useCallback((claimType: ClaimType, tilesFromHand: Tile[]) => {
    doAction(HUMAN_ID, { type: 'CLAIM', claimType, tilesFromHand });
    setClaimOptions([]);
    setClaimTimer(0);
    soundManager.play(claimType === 'win' ? 'win' : 'claim');
  }, [doAction]);

  const pass = useCallback(() => {
    doAction(HUMAN_ID, { type: 'PASS' });
    setClaimOptions([]);
    setClaimTimer(0);
    soundManager.play('pass');
  }, [doAction]);

  // === Computed state ===

  const canDeclareKong = (() => {
    if (!game || game.turnPhase !== 'discard' || game.currentPlayerIndex !== humanIndex) return false;
    const hand = game.players[humanIndex].hand;
    const counts = new Map<string, number>();
    for (const t of hand) {
      const key = `${t.suit}_${t.number ?? t.wind ?? t.dragon}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const vals = Array.from(counts.values());
    for (const c of vals) {
      if (c === 4) return true;
    }
    // Check add-to-pung
    const melds = game.players[humanIndex].melds;
    for (const meld of melds) {
      if (meld.type === 'pung') {
        if (hand.some(t => tilesMatch(t, meld.tiles[0]))) return true;
      }
    }
    return false;
  })();

  const canDeclareWin = (() => {
    if (!game || game.turnPhase !== 'discard' || game.currentPlayerIndex !== humanIndex) return false;
    return isWinningHand(game.players[humanIndex].hand);
  })();

  // === Auto-draw for human ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (game.currentPlayerIndex !== humanIndex) return;
    if (game.turnPhase !== 'draw') return;

    const timer = setTimeout(() => {
      doAction(HUMAN_ID, { type: 'DRAW' });
      soundManager.play('tileDraw');
    }, 300);
    return () => clearTimeout(timer);
  }, [game?.turnPhase, game?.currentPlayerIndex, game?.phase, humanIndex, doAction]);

  // === Claim detection when opponent discards ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (game.turnPhase !== 'claim') return;
    // Don't show claims if human was the discarder
    if (game.lastDiscardedBy === HUMAN_ID) return;

    const humanPlayer = game.players[humanIndex];
    const discarderIndex = game.players.findIndex(p => p.id === game.lastDiscardedBy);
    if (discarderIndex === -1 || !game.lastDiscardedTile) return;

    const claims = getAvailableClaims(
      game.lastDiscardedTile, humanPlayer, humanIndex, discarderIndex, game.players.length
    );

    if (claims.length > 0) {
      setClaimOptions(claims);
      setClaimTimer(CLAIM_TIMEOUT);
      soundManager.play('turnAlert');
    } else {
      // Human has no claims — auto-pass
      doAction(HUMAN_ID, { type: 'PASS' });
    }
  }, [game?.turnPhase, game?.lastDiscardedTile?.id, game?.lastDiscardedBy, humanIndex, doAction]);

  // === Claim countdown ===
  useEffect(() => {
    if (claimTimer <= 0 || claimOptions.length === 0) return;
    const interval = setInterval(() => {
      setClaimTimer(prev => {
        if (prev <= 100) {
          // Time's up — auto-pass
          pass();
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [claimTimer > 0, claimOptions.length, pass]);

  // === AI turn processing ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (processingRef.current) return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer.isAI) return;

    // AI needs to draw
    if (game.turnPhase === 'draw') {
      processingRef.current = true;
      const timer = setTimeout(() => {
        const afterDraw = doAction(currentPlayer.id, { type: 'DRAW' });
        processingRef.current = false;
        if (!afterDraw) return;

        // After draw, use AI decision (may declare win, kong, or proceed to discard)
        if (afterDraw.phase === GamePhase.PLAYING && afterDraw.turnPhase === 'discard') {
          const decision = getAIDecision(afterDraw, afterDraw.currentPlayerIndex);
          if (decision.action.type === 'DECLARE_WIN' || decision.action.type === 'DECLARE_KONG') {
            setTimeout(() => {
              doAction(currentPlayer.id, decision.action);
            }, 300);
            return;
          }
        }
      }, AI_DRAW_DELAY);
      return () => { clearTimeout(timer); processingRef.current = false; };
    }

    // AI needs to discard — use AI decision engine
    if (game.turnPhase === 'discard') {
      processingRef.current = true;
      const timer = setTimeout(() => {
        const decision = getAIDecision(game, game.currentPlayerIndex);
        doAction(currentPlayer.id, decision.action);
        processingRef.current = false;
      }, AI_DISCARD_DELAY);
      return () => { clearTimeout(timer); processingRef.current = false; };
    }

    // AI in claim phase — use AI claim decision
    if (game.turnPhase === 'claim' && game.lastDiscardedBy !== currentPlayer.id) {
      processingRef.current = true;
      const timer = setTimeout(() => {
        const discarderIndex = game.players.findIndex(p => p.id === game.lastDiscardedBy);
        if (game.lastDiscardedTile && discarderIndex !== -1) {
          const claims = getAvailableClaims(
            game.lastDiscardedTile, currentPlayer, game.currentPlayerIndex,
            discarderIndex, game.players.length
          );
          const decision = getAIClaimDecision(game, game.currentPlayerIndex, claims);
          doAction(currentPlayer.id, decision.action);
        } else {
          doAction(currentPlayer.id, { type: 'PASS' });
        }
        processingRef.current = false;
      }, 400);
      return () => { clearTimeout(timer); processingRef.current = false; };
    }
  }, [game?.currentPlayerIndex, game?.turnPhase, game?.phase, doAction]);

  // === Scoring on game over ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.FINISHED || !game.winnerId) return;

    const winner = game.players.find(p => p.id === game.winnerId);
    if (!winner || !game.winningTile) return;

    soundManager.play('win');

    try {
      const context: ScoringContext = {
        winningTile: game.winningTile,
        isSelfDrawn: game.isSelfDrawn ?? false,
        seatWind: winner.seatWind,
        prevailingWind: game.prevailingWind,
        isConcealed: winner.melds.filter(m => !m.isConcealed).length === 0,
        flowers: winner.flowers,
      };
      const result = calculateScore(winner.hand, winner.melds, context);
      setScoringResult(result);
    } catch {
      // Scoring may fail on edge cases
    }
  }, [game?.phase, game?.winnerId]);

  return {
    game, selectedTileId, claimOptions, claimTimer,
    isGameOver, scoringResult,
    selectTile, discardSelected, declareKong, declareWin,
    submitClaim, pass, startNewGame,
    canDeclareKong, canDeclareWin,
  };
}
