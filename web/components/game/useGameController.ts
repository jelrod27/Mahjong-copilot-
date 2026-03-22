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
  const [preClaimPause, setPreClaimPause] = useState(false);
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
    setPreClaimPause(false);
    processingRef.current = false;
  }, []);

  // Initialize game on mount
  useEffect(() => {
    startNewGame(initialDifficulty);
  }, [initialDifficulty, startNewGame]);

  const currentDelays = DELAYS[difficulty];

  // ... (keep existing human action functions but update pass/submitClaim to clear tutor)

  const submitClaim = useCallback((claimType: ClaimType, tilesFromHand: Tile[]) => {
    doAction(HUMAN_ID, { type: 'CLAIM', claimType, tilesFromHand });
    setClaimOptions([]);
    setClaimTimer(0);
    setTutorAdvice(null);
    setSuggestedTileId(undefined);
    soundManager.play(claimType === 'win' ? 'win' : 'claim');
  }, [doAction]);

  const pass = useCallback(() => {
    doAction(HUMAN_ID, { type: 'PASS' });
    setClaimOptions([]);
    setClaimTimer(0);
    setTutorAdvice(null);
    setSuggestedTileId(undefined);
    soundManager.play('pass');
  }, [doAction]);

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

  // === Claim detection with Pre-Claim pause for Easy mode ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (game.turnPhase !== 'claim') {
      setPreClaimPause(false);
      return;
    }
    // Don't show claims if human was the discarder
    if (game.lastDiscardedBy === HUMAN_ID) return;

    const humanPlayer = game.players[humanIndex];
    const discarderIndex = game.players.findIndex(p => p.id === game.lastDiscardedBy);
    if (discarderIndex === -1 || !game.lastDiscardedTile) return;

    const claims = getAvailableClaims(
      game.lastDiscardedTile, humanPlayer, humanIndex, discarderIndex, game.players.length
    );

    if (claims.length > 0) {
      if (difficulty === 'easy' && !preClaimPause) {
        setPreClaimPause(true);
        const timer = setTimeout(() => {
          setClaimOptions(claims);
          setClaimTimer(CLAIM_TIMEOUT);
          soundManager.play('turnAlert');
        }, 1500); // 1.5s pause to process the opponent's discard
        return () => clearTimeout(timer);
      } else if (difficulty !== 'easy') {
        setClaimOptions(claims);
        setClaimTimer(CLAIM_TIMEOUT);
        soundManager.play('turnAlert');
      }
    } else {
      // Human has no claims — auto-pass
      doAction(HUMAN_ID, { type: 'PASS' });
    }
  }, [game?.turnPhase, game?.lastDiscardedTile?.id, game?.lastDiscardedBy, humanIndex, doAction, difficulty, preClaimPause]);

  return {
    game, selectedTileId, suggestedTileId, tutorAdvice, claimOptions, claimTimer,
    isGameOver, scoringResult,
    selectTile, discardSelected, declareKong, declareWin,
    submitClaim, pass, startNewGame,
    canDeclareKong, canDeclareWin,
  };
}

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
