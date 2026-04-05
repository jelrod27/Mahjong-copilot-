'use client';

/* Game-loop effects use narrow `game` fields in dependency arrays so full-state updates do not reset
 * AI timers or duplicate moves. Claim countdown avoids listing `claimTimer` to prevent interval churn. */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GamePhase, ClaimType } from '@/models/GameState';
import { Tile, TileType, tilesMatch } from '@/models/Tile';
import { initializeGame, applyAction } from '@/engine/turnManager';
import { getAvailableClaims, getBestClaimSubmission } from '@/engine/claiming';
import { isWinningHand } from '@/engine/winDetection';
import { calculateScore } from '@/engine/scoring';
import { AvailableClaim, ScoringContext, ScoringResult } from '@/engine/types';
import { getAIDecision, getAIClaimDecision } from '@/engine/ai';
import { getTutorAdvice } from '@/engine/tutor';
import soundManager from '@/lib/soundManager';

const HUMAN_ID = 'human-player';

// Difficulty-based delays (ms) [DRAW, DISCARD]
const DELAYS = {
  easy: { draw: 1500, discard: 2000, claim: 800 },
  medium: { draw: 1000, discard: 1200, claim: 500 },
  hard: { draw: 600, discard: 800, claim: 400 },
};

const CLAIM_TIMEOUT = 10000;

export interface TutorAdvice {
  message: string;
  type: 'discard' | 'claim' | 'general';
  suggestedTileId?: string;
}

export interface GameController {
  game: GameState | null;
  selectedTileId: string | undefined;
  suggestedTileId: string | undefined;
  tutorAdvice: TutorAdvice | null;
  claimOptions: AvailableClaim[];
  claimTimer: number;
  isGameOver: boolean;
  scoringResult: ScoringResult | null;
  selectTile: (tile: Tile) => void;
  discardSelected: () => void;
  declareKong: () => void;
  declareWin: () => void;
  submitClaim: (claimType: ClaimType, tilesFromHand: Tile[]) => void;
  /** Recomputes best claim from live game state (avoids stale tile refs), then submits. */
  claimBest: () => void;
  pass: () => void;
  startNewGame: (difficulty: 'easy' | 'medium' | 'hard') => void;
  canDeclareKong: boolean;
  canDeclareWin: boolean;
}

export default function useGameController(initialDifficulty: 'easy' | 'medium' | 'hard'): GameController {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialDifficulty);
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | undefined>();
  const [suggestedTileId, setSuggestedTileId] = useState<string | undefined>();
  const [tutorAdvice, setTutorAdvice] = useState<TutorAdvice | null>(null);
  const [claimOptions, setClaimOptions] = useState<AvailableClaim[]>([]);
  const [claimTimer, setClaimTimer] = useState(0);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const processingRef = useRef(false);
  // Keep ref in sync
  useEffect(() => { gameRef.current = game; }, [game]);

  const startNewGame = useCallback((newDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(newDifficulty);
    const state = initializeGame({
      playerNames: ['You', 'West AI', 'North AI', 'East AI'],
      aiPlayers: [
        { index: 1, difficulty: newDifficulty },
        { index: 2, difficulty: newDifficulty },
        { index: 3, difficulty: newDifficulty },
      ],
      humanPlayerId: HUMAN_ID,
    });
    setGame(state);
    setSelectedTileId(undefined);
    setSuggestedTileId(undefined);
    setTutorAdvice(null);
    setClaimOptions([]);
    setClaimTimer(0);
    setScoringResult(null);
    processingRef.current = false;
  }, []);

  // Initialize game on mount
  useEffect(() => {
    startNewGame(initialDifficulty);
  }, [initialDifficulty, startNewGame]);

  const currentDelays = DELAYS[difficulty];
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
    const next = doAction(HUMAN_ID, { type: 'CLAIM', claimType, tilesFromHand });
    if (next) {
      setClaimOptions([]);
      setClaimTimer(0);
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      soundManager.play(claimType === 'win' ? 'win' : 'claim');
    }
  }, [doAction]);

  const claimBest = useCallback(() => {
    const current = gameRef.current;
    if (!current || current.phase !== GamePhase.PLAYING || current.turnPhase !== 'claim') return;
    if (current.currentPlayerIndex !== humanIndex) return;
    if (current.lastDiscardedBy === HUMAN_ID) return;
    const humanPlayer = current.players[humanIndex];
    const discarderIndex = current.players.findIndex(p => p.id === current.lastDiscardedBy);
    if (discarderIndex === -1 || !current.lastDiscardedTile) return;
    const claims = getAvailableClaims(
      current.lastDiscardedTile,
      humanPlayer,
      humanIndex,
      discarderIndex,
      current.players.length,
    );
    const best = getBestClaimSubmission(claims);
    if (!best) return;
    const next = doAction(HUMAN_ID, { type: 'CLAIM', claimType: best.claimType, tilesFromHand: best.tilesFromHand });
    if (next) {
      setClaimOptions([]);
      setClaimTimer(0);
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      soundManager.play(best.claimType === 'win' ? 'win' : 'claim');
    }
  }, [doAction, humanIndex]);

  const pass = useCallback(() => {
    const next = doAction(HUMAN_ID, { type: 'PASS' });
    if (next) {
      setClaimOptions([]);
      setClaimTimer(0);
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      soundManager.play('pass');
    }
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

  // === Tutor Calculation Hook ===
  useEffect(() => {
    if (difficulty !== 'easy' || !game || game.phase !== GamePhase.PLAYING) {
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      return;
    }

    // Only provide advice when it's the human's turn to discard OR a claim is possible
    const isHumanDiscardTurn = game.turnPhase === 'discard' && game.currentPlayerIndex === humanIndex;
    const isClaimPhase = game.turnPhase === 'claim' && claimOptions.length > 0;

    if (isHumanDiscardTurn || isClaimPhase) {
      const advice = getTutorAdvice(game, humanIndex, claimOptions);
      setTutorAdvice(advice);
      setSuggestedTileId(advice?.suggestedTileId);
    } else {
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
    }
  }, [game?.turnPhase, game?.currentPlayerIndex, game?.phase, claimOptions, difficulty, humanIndex]);

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

  // === AI turn processing with dynamic delays ===
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

        // After draw, use AI decision
        if (afterDraw.phase === GamePhase.PLAYING && afterDraw.turnPhase === 'discard') {
          const decision = getAIDecision(afterDraw, afterDraw.currentPlayerIndex);
          if (decision.action.type === 'DECLARE_WIN' || decision.action.type === 'DECLARE_KONG') {
            setTimeout(() => {
              doAction(currentPlayer.id, decision.action);
            }, 500); // 500ms between draw and special action
            return;
          }
        }
      }, currentDelays.draw);
      return () => { clearTimeout(timer); processingRef.current = false; };
    }

    // AI needs to discard
    if (game.turnPhase === 'discard') {
      processingRef.current = true;
      const timer = setTimeout(() => {
        const decision = getAIDecision(game, game.currentPlayerIndex);
        doAction(currentPlayer.id, decision.action);
        processingRef.current = false;
      }, currentDelays.discard);
      return () => { clearTimeout(timer); processingRef.current = false; };
    }

    // AI in claim phase
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
      }, currentDelays.claim);
      return () => { clearTimeout(timer); processingRef.current = false; };
    }
  }, [game?.currentPlayerIndex, game?.turnPhase, game?.phase, doAction, currentDelays]);

  // === Claim detection (solo): show options only on the human's claim turn; keep in sync with currentPlayerIndex ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (game.turnPhase !== 'claim') {
      setClaimOptions([]);
      setClaimTimer(0);
      return;
    }

    const notHumanClaimTurn =
      game.currentPlayerIndex !== humanIndex || game.lastDiscardedBy === HUMAN_ID;
    if (notHumanClaimTurn) {
      setClaimOptions([]);
      setClaimTimer(0);
      return;
    }

    const humanPlayer = game.players[humanIndex];
    const discarderIndex = game.players.findIndex(p => p.id === game.lastDiscardedBy);
    if (discarderIndex === -1 || !game.lastDiscardedTile) return;

    const claims = getAvailableClaims(
      game.lastDiscardedTile, humanPlayer, humanIndex, discarderIndex, game.players.length
    );

    if (claims.length > 0) {
      // No delay: a 1.5s easy-mode wait left claimOptions out of sync with the live hand/tutor.
      setClaimOptions(claims);
      setClaimTimer(CLAIM_TIMEOUT);
      soundManager.play('turnAlert');
    } else {
      // Human has no claims — auto-pass
      doAction(HUMAN_ID, { type: 'PASS' });
    }
  }, [
    game?.turnPhase,
    game?.lastDiscardedTile?.id,
    game?.lastDiscardedBy,
    game?.currentPlayerIndex,
    humanIndex,
    doAction,
  ]);

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
    game, selectedTileId, suggestedTileId, tutorAdvice, claimOptions, claimTimer,
    isGameOver, scoringResult,
    selectTile, discardSelected, declareKong, declareWin,
    submitClaim, claimBest, pass, startNewGame,
    canDeclareKong, canDeclareWin,
  };
}
