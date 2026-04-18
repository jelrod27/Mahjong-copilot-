'use client';

/* Game-loop effects use narrow `game` fields in dependency arrays so full-state updates do not reset
 * AI timers or duplicate moves. Claim countdown avoids listing `claimTimer` to prevent interval churn. */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GamePhase, ClaimType } from '@/models/GameState';
import { MatchState, GameMode } from '@/models/MatchState';
import { Tile, TileType, TileFactory, tilesMatch } from '@/models/Tile';
import { initializeGame, applyAction } from '@/engine/turnManager';
import { initializeMatch, advanceMatch, startNextHand } from '@/engine/matchManager';
import { getAvailableClaims, getBestClaimSubmission } from '@/engine/claiming';
import { isWinningHand, canPlayerWin } from '@/engine/winDetection';
import { calculateScore } from '@/engine/scoring';
import { AvailableClaim, ScoringContext, ScoringResult, WinMethod, TileClassification } from '@/engine/types';
import { calculatePayment } from '@/engine/scoring';
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
const DEBOUNCE_MS = 200;

export interface TutorAdvice {
  message: string;
  type: 'discard' | 'claim' | 'general';
  suggestedTileId?: string;
}

export interface TenpaiStatus {
  isTenpai: boolean;
  waits: string[];
}

export interface GameController {
  game: GameState | null;
  match: MatchState | null;
  selectedTileId: string | undefined;
  suggestedTileId: string | undefined;
  tutorAdvice: TutorAdvice | null;
  tenpaiStatus: TenpaiStatus | null;
  tileClassifications: Map<string, 'green' | 'orange' | 'red'>;
  claimOptions: AvailableClaim[];
  claimTimer: number;
  isGameOver: boolean;
  isMatchOver: boolean;
  scoringResult: ScoringResult | null;
  selectTile: (tile: Tile) => void;
  discardSelected: () => void;
  declareKong: () => void;
  declareWin: () => void;
  submitClaim: (claimType: ClaimType, tilesFromHand: Tile[]) => void;
  /** Submit a specific chow combination (from ChowSelector). */
  submitChow: (tilesFromHand: Tile[]) => void;
  /** Recomputes best claim from live game state (avoids stale tile refs), then submits. */
  claimBest: () => void;
  pass: () => void;
  startNewGame: (difficulty: 'easy' | 'medium' | 'hard', mode?: GameMode) => void;
  continueToNextHand: () => void;
  canDeclareKong: boolean;
  canDeclareWin: boolean;
}

export default function useGameController(
  initialDifficulty: 'easy' | 'medium' | 'hard',
  initialMode: GameMode = 'quick',
): GameController {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialDifficulty);
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [game, setGame] = useState<GameState | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | undefined>();
  const [suggestedTileId, setSuggestedTileId] = useState<string | undefined>();
  const [tutorAdvice, setTutorAdvice] = useState<TutorAdvice | null>(null);
  const [tenpaiStatus, setTenpaiStatus] = useState<TenpaiStatus | null>(null);
  const [claimOptions, setClaimOptions] = useState<AvailableClaim[]>([]);
  const [claimTimer, setClaimTimer] = useState(0);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [tileClassifications, setTileClassifications] = useState<Map<string, 'green' | 'orange' | 'red'>>(new Map());
  const gameRef = useRef<GameState | null>(null);
  const matchRef = useRef<MatchState | null>(null);
  const processingRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  // Keep refs in sync
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { matchRef.current = match; }, [match]);

  const resetHandState = useCallback(() => {
    setSelectedTileId(undefined);
    setSuggestedTileId(undefined);
    setTutorAdvice(null);
    setTenpaiStatus(null);
    setClaimOptions([]);
    setClaimTimer(0);
    setScoringResult(null);
    setTileClassifications(new Map());
    processingRef.current = false;
  }, []);

  const startNewGame = useCallback((newDifficulty: 'easy' | 'medium' | 'hard', newMode?: GameMode) => {
    setDifficulty(newDifficulty);
    const gameMode = newMode ?? mode;
    setMode(gameMode);

    const newMatch = initializeMatch({
      mode: gameMode,
      difficulty: newDifficulty,
      playerNames: ['You', 'West AI', 'North AI', 'East AI'],
      humanPlayerId: HUMAN_ID,
    });

    setMatch(newMatch);
    setGame(newMatch.currentHand);
    resetHandState();
  }, [mode, resetHandState]);

  // Initialize game on mount
  useEffect(() => {
    startNewGame(initialDifficulty, initialMode);
  }, [initialDifficulty, initialMode]);

  const continueToNextHand = useCallback(() => {
    const currentMatch = matchRef.current;
    if (!currentMatch || currentMatch.phase !== 'betweenHands') return;

    const nextMatch = startNextHand(currentMatch);
    setMatch(nextMatch);
    setGame(nextMatch.currentHand);
    resetHandState();
  }, [resetHandState]);

  const currentDelays = DELAYS[difficulty];
  const humanIndex = game?.players.findIndex(p => p.id === HUMAN_ID) ?? 0;
  const isHumanTurn = game?.currentPlayerIndex === humanIndex;
  const isGameOver = game?.phase === GamePhase.FINISHED;
  const isMatchOver = match?.phase === 'finished';

  // Apply an action and update state (with rapid-click debouncing for human)
  const doAction = useCallback((playerId: string, action: any): GameState | null => {
    // Debounce human actions
    if (playerId === HUMAN_ID) {
      const now = Date.now();
      if (now - lastActionTimeRef.current < DEBOUNCE_MS) return null;
      lastActionTimeRef.current = now;
    }

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
    const hand = current.players[humanIndex].hand;

    // Check concealed kong (4 of a kind in hand)
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

    // Check add-to-pung (1 matching tile in hand + existing exposed pung)
    const melds = current.players[humanIndex].melds;
    for (const meld of melds) {
      if (meld.type === 'pung') {
        const match = hand.find(t => tilesMatch(t, meld.tiles[0]));
        if (match) {
          doAction(HUMAN_ID, { type: 'DECLARE_KONG', tile: match });
          return;
        }
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

  const submitChow = useCallback((tilesFromHand: Tile[]) => {
    const next = doAction(HUMAN_ID, { type: 'CLAIM', claimType: 'chow' as ClaimType, tilesFromHand });
    if (next) {
      setClaimOptions([]);
      setClaimTimer(0);
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      soundManager.play('claim');
    }
  }, [doAction]);

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
    return canPlayerWin(game.players[humanIndex].hand, game.players[humanIndex].melds);
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
      // Build tile classification map for teacher overlay
      if (advice?.tileClassifications) {
        const map = new Map<string, 'green' | 'orange' | 'red'>();
        for (const tc of advice.tileClassifications) {
          if (tc.color !== 'neutral') map.set(tc.tileId, tc.color);
        }
        setTileClassifications(map);
      } else {
        setTileClassifications(new Map());
      }
    } else {
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      setTileClassifications(new Map());
    }
  }, [game?.turnPhase, game?.currentPlayerIndex, game?.phase, claimOptions, difficulty, humanIndex]);

  // === Persistent tenpai badge (easy mode, all phases) ===
  useEffect(() => {
    if (difficulty !== 'easy' || !game || game.phase !== GamePhase.PLAYING) {
      setTenpaiStatus(null);
      return;
    }

    const humanPlayer = game.players[humanIndex];
    if (!humanPlayer) { setTenpaiStatus(null); return; }

    // Quick shanten check: compute if hand is tenpai
    // We check if removing any one tile makes the rest a winning hand
    const hand = humanPlayer.hand;
    const melds = humanPlayer.melds;
    const waits: string[] = [];
    // A hand is tenpai if it's one tile away from winning
    // For full combined hand+melds check
    if (canPlayerWin(hand, melds)) {
      setTenpaiStatus({ isTenpai: true, waits: ['Already winning!'] });
      return;
    }

    // Check which tiles, when added, make a winning hand
    // Use a set of tile keys we've already tested to avoid duplicates
    const tested = new Set<string>();
    const allTiles: Tile[] = TileFactory.getAllTiles();

    for (const tile of allTiles) {
      const key = `${tile.suit}_${tile.number ?? tile.wind ?? tile.dragon}`;
      if (tested.has(key)) continue;
      tested.add(key);

      if (canPlayerWin([...hand, tile], melds)) {
        waits.push(tile.nameEnglish);
      }
    }

    setTenpaiStatus(waits.length > 0 ? { isTenpai: true, waits } : null);
  }, [game?.players, game?.phase, difficulty, humanIndex]);

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

  // === Discard timeout — auto-discard if human takes too long ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (game.turnPhase !== 'discard' || game.currentPlayerIndex !== humanIndex) return;

    const timer = setTimeout(() => {
      const current = gameRef.current;
      if (!current || current.turnPhase !== 'discard' || current.currentPlayerIndex !== humanIndex) return;
      const hand = current.players[humanIndex].hand;
      // Auto-discard last drawn tile, or last tile in hand
      const autoTile = current.lastDrawnTile
        ? hand.find(t => t.id === current.lastDrawnTile?.id)
        : hand[hand.length - 1];
      if (autoTile) {
        doAction(HUMAN_ID, { type: 'DISCARD', tile: autoTile });
        setSelectedTileId(undefined);
      }
    }, (game.turnTimeLimit ?? 20) * 1000);
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

    // AI in claim phase — submit immediately (no inter-AI delay)
    if (game.turnPhase === 'claim' && game.lastDiscardedBy !== currentPlayer.id) {
      processingRef.current = true;
      // Brief delay so the claim phase is visible, then submit
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
      }, 150); // Fast: 150ms per AI instead of full claim delay
      return () => { clearTimeout(timer); processingRef.current = false; };
    }
  }, [game?.currentPlayerIndex, game?.turnPhase, game?.phase, doAction, currentDelays]);

  // === Claim detection: show options immediately when claim phase starts (don't wait for currentPlayerIndex) ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (game.turnPhase !== 'claim') {
      setClaimOptions([]);
      setClaimTimer(0);
      return;
    }

    // Don't show claim options if human was the discarder
    if (game.lastDiscardedBy === HUMAN_ID) {
      // Still need to auto-pass if it's our turn in the rotation
      if (game.currentPlayerIndex === humanIndex) {
        doAction(HUMAN_ID, { type: 'PASS' });
      }
      return;
    }

    // Check if human has already acted this claim round (passed or claimed)
    const humanId = game.players[humanIndex].id;
    const alreadyActed = game.passedPlayers.includes(humanId) ||
      game.pendingClaims.some(c => c.playerId === humanId);
    if (alreadyActed) {
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
      setClaimOptions(claims);
      // Only start timer if not already running
      setClaimTimer(prev => prev > 0 ? prev : CLAIM_TIMEOUT);
      soundManager.play('turnAlert');
    } else if (game.currentPlayerIndex === humanIndex) {
      // Human has no claims and it's their turn — auto-pass
      doAction(HUMAN_ID, { type: 'PASS' });
    }
  }, [
    game?.turnPhase,
    game?.lastDiscardedTile?.id,
    game?.lastDiscardedBy,
    game?.currentPlayerIndex,
    game?.passedPlayers?.length,
    game?.pendingClaims?.length,
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

  // === Scoring on hand over ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.FINISHED) return;

    const currentMatch = matchRef.current;
    if (!currentMatch || currentMatch.phase !== 'playing') return;

    let result: ScoringResult | null = null;

    if (game.winnerId) {
      const winner = game.players.find(p => p.id === game.winnerId);
      if (winner && game.winningTile) {
        soundManager.play('win');

        try {
          const isSelfDrawn = game.isSelfDrawn ?? false;
          let winMethod: WinMethod = isSelfDrawn ? 'selfDraw' : 'discard';
          if (game.isRobKongOpportunity && !isSelfDrawn) {
            winMethod = 'robKong';
          } else if (game.isKongReplacement && isSelfDrawn) {
            winMethod = 'kongReplacement';
          } else if (game.wall.length === 0) {
            winMethod = isSelfDrawn ? 'lastTileDraw' : 'lastTileClaim';
          }

          const winnerIndex = game.players.findIndex(p => p.id === game.winnerId);
          const discarderIndex = game.lastDiscardedBy
            ? game.players.findIndex(p => p.id === game.lastDiscardedBy)
            : undefined;

          const context: ScoringContext = {
            winningTile: game.winningTile,
            isSelfDrawn,
            seatWind: winner.seatWind,
            prevailingWind: game.prevailingWind,
            isConcealed: winner.melds.filter(m => !m.isConcealed).length === 0,
            flowers: winner.flowers,
            winMethod,
            isDealer: winner.isDealer,
            discarderIndex: !isSelfDrawn ? discarderIndex : undefined,
          };
          result = calculateScore(winner.hand, winner.melds, context);
          result.payment = calculatePayment(
            result, winnerIndex,
            !isSelfDrawn ? discarderIndex : undefined,
            isSelfDrawn,
          );
        } catch {
          // Scoring may fail on edge cases
        }
      }
    }

    setScoringResult(result);

    // Advance the match
    const advancedMatch = advanceMatch(currentMatch, game, result);
    setMatch(advancedMatch);
    matchRef.current = advancedMatch;
  }, [game?.phase, game?.winnerId]);

  return {
    game, match, selectedTileId, suggestedTileId, tutorAdvice, tenpaiStatus,
    tileClassifications, claimOptions, claimTimer, isGameOver, isMatchOver,
    scoringResult, selectTile, discardSelected, declareKong, declareWin,
    submitClaim, submitChow, claimBest, pass, startNewGame, continueToNextHand,
    canDeclareKong, canDeclareWin,
  };
}
