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
import { projectFaan, FaanProjection } from '@/engine/faanProjection';
import soundManager from '@/lib/soundManager';
import { speakTile, TileVoiceLanguage } from '@/lib/tileVoice';
import { saveGame, loadGame, clearSavedGame, hasSavedGame, canResume } from '@/lib/matchStorage';

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
  faanProjection: FaanProjection | null;
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
  /** Resume an in-progress match from localStorage. */
  resumeGame: () => boolean;
  /** Clear any saved match and reset to a fresh game. */
  clearSavedGame: () => void;
  canDeclareKong: boolean;
  canDeclareWin: boolean;
}

export default function useGameController(
  initialDifficulty: 'easy' | 'medium' | 'hard',
  initialMode: GameMode = 'quick',
  showTutor: boolean = true,
  liveFaanMeter: boolean = true,
  initialMinFaan?: number,
  tileVoice: 'off' | TileVoiceLanguage = 'off',
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
  const [faanProjection, setFaanProjection] = useState<FaanProjection | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const matchRef = useRef<MatchState | null>(null);
  const processingRef = useRef(false);
  // Mutex shared by human discard paths (manual click + auto-discard timer) so
  // whichever fires first wins and the other no-ops. Cleared after the hand
  // state transitions (resetHandState) or when phase leaves discard.
  const humanDiscardInFlightRef = useRef(false);
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
    setFaanProjection(null);
    processingRef.current = false;
    humanDiscardInFlightRef.current = false;
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
      minFaan: initialMinFaan,
    });

    setMatch(newMatch);
    setGame(newMatch.currentHand);
    resetHandState();
  }, [mode, resetHandState, initialMinFaan]);

  // Initialize game on mount — resume saved match if one exists and is active
  useEffect(() => {
    const saved = loadGame();
    if (saved?.match && saved.match.phase !== 'finished') {
      setMatch(saved.match);
      setGame(saved.game ?? saved.match.currentHand ?? null);
      setDifficulty(saved.match.difficulty);
      setMode(saved.match.mode);
    } else {
      startNewGame(initialDifficulty, initialMode);
    }
  }, [initialDifficulty, initialMode, startNewGame]);

  /** Try to resume a saved match from localStorage. Returns true on success. */
  const resumeGame = useCallback((): boolean => {
    const saved = loadGame();
    if (!saved || !saved.match) return false;

    setMatch(saved.match);
    setGame(saved.game ?? saved.match.currentHand ?? null);

    // Carry over difficulty/mode from the saved match
    setDifficulty(saved.match.difficulty);
    setMode(saved.match.mode);

    return true;
  }, []);

  /** Clear any saved match and reset to a fresh game. */
  const clearSavedGameAndReset = useCallback(() => {
    clearSavedGame();
    startNewGame(initialDifficulty, initialMode);
  }, [initialDifficulty, initialMode, startNewGame]);

  // Auto-save match + game after every state change
  useEffect(() => {
    if (match) {
      saveGame(match, game);
    }
  }, [match, game]);

  // Clear saved game when match ends (win, draw, or abort)
  useEffect(() => {
    if (match?.phase === 'finished') {
      clearSavedGame();
    }
  }, [match?.phase]);

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
    // Bug #7: mutex against auto-discard timer — whichever fires first wins.
    if (humanDiscardInFlightRef.current) return;
    const tile = current.players[humanIndex].hand.find(t => t.id === selectedTileId);
    if (!tile) return;
    humanDiscardInFlightRef.current = true;
    const next = doAction(HUMAN_ID, { type: 'DISCARD', tile });
    if (!next) {
      // Debounce or engine rejection — release the mutex so a retry/auto can fire.
      humanDiscardInFlightRef.current = false;
      return;
    }
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
        const next = doAction(HUMAN_ID, { type: 'DECLARE_KONG', tile: tiles[0] });
        if (next) soundManager.play('kong');
        return;
      }
    }

    // Check add-to-pung (1 matching tile in hand + existing exposed pung)
    const melds = current.players[humanIndex].melds;
    for (const meld of melds) {
      if (meld.type === 'pung') {
        const match = hand.find(t => tilesMatch(t, meld.tiles[0]));
        if (match) {
          const next = doAction(HUMAN_ID, { type: 'DECLARE_KONG', tile: match });
          if (next) soundManager.play('kong');
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
  // Tutor is gated on the user-controlled `showTutor` setting (defaults on) so learners can
  // keep the teacher overlay across all difficulties. Previously this was hard-gated to easy,
  // silently discarding computed advice on medium/hard.
  useEffect(() => {
    if (!showTutor || !game || game.phase !== GamePhase.PLAYING) {
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      setTileClassifications(new Map());
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
  }, [game?.turnPhase, game?.currentPlayerIndex, game?.phase, claimOptions, showTutor, humanIndex]);

  // === Voice callouts on discard ===
  // When a tile is discarded (by any player), optionally speak it in the
  // user's chosen language and emit a subtitle so learners see Chinese +
  // English side by side. `lastDiscardedTile.id` debounces duplicate fires.
  const lastSpokenDiscardIdRef = useRef<string | undefined>();
  useEffect(() => {
    if (tileVoice === 'off' || !game) return;
    const tile = game.lastDiscardedTile;
    const discarderId = game.lastDiscardedBy;
    if (!tile || !discarderId) return;
    if (lastSpokenDiscardIdRef.current === tile.id) return;
    lastSpokenDiscardIdRef.current = tile.id;
    const discarder = game.players.find(p => p.id === discarderId);
    const speakerLabel = discarder
      ? (discarder.id === HUMAN_ID ? 'You discarded' : `${discarder.name} discarded`)
      : undefined;
    speakTile(tile, tileVoice, speakerLabel);
  }, [game?.lastDiscardedTile?.id, game?.lastDiscardedBy, tileVoice]);

  // === Live faan projection ===
  // Recomputes whenever the human's visible hand changes. Gated on the
  // user-controlled `liveFaanMeter` setting (default on) so learners can
  // see which scoring patterns they're building toward in real time.
  //
  // Dep array keys on stable signatures of the human's tiles/melds/flowers
  // rather than `game.players` — otherwise the effect fires on every
  // opponent draw/discard/claim/kong and recomputes identical projections.
  // projectFaan iterates all 34 tile prototypes with canPlayerWin when
  // tenpai, so this matters for perf.
  const humanPlayerForFaan = game?.players[humanIndex];
  const faanHandSig = humanPlayerForFaan?.hand.map(t => t.id).join(',') ?? '';
  const faanMeldSig = humanPlayerForFaan?.melds
    .map(m => `${m.type}:${m.tiles.map(t => t.id).join('.')}`)
    .join('|') ?? '';
  const faanFlowerSig = humanPlayerForFaan?.flowers.map(t => t.id).join(',') ?? '';
  useEffect(() => {
    if (!liveFaanMeter || !game || game.phase !== GamePhase.PLAYING) {
      setFaanProjection(null);
      return;
    }
    const humanPlayer = game.players[humanIndex];
    if (!humanPlayer) {
      setFaanProjection(null);
      return;
    }
    try {
      const projection = projectFaan(
        humanPlayer.hand,
        humanPlayer.melds,
        humanPlayer.seatWind,
        game.prevailingWind,
        humanPlayer.flowers,
      );
      setFaanProjection(projection);
    } catch (err) {
      // Projection is a learning aid — never block the game on a compute error.
      // In dev, surface the failure so a regression in shanten/pattern detection
      // doesn't silently ship.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[faanProjection] compute failed', err);
      }
      setFaanProjection(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signatures below capture all inputs
  }, [faanHandSig, faanMeldSig, faanFlowerSig, game?.phase, game?.prevailingWind, humanIndex, liveFaanMeter]);

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

    // Release any stale mutex when a fresh discard phase begins (next hand, new turn).
    humanDiscardInFlightRef.current = false;

    const timer = setTimeout(() => {
      // Bug #7: mutex against manual discardSelected() — whichever fires first wins.
      if (humanDiscardInFlightRef.current) return;
      const current = gameRef.current;
      if (!current || current.turnPhase !== 'discard' || current.currentPlayerIndex !== humanIndex) return;
      const hand = current.players[humanIndex].hand;
      // Auto-discard last drawn tile, or last tile in hand
      const autoTile = current.lastDrawnTile
        ? hand.find(t => t.id === current.lastDrawnTile?.id)
        : hand[hand.length - 1];
      if (autoTile) {
        humanDiscardInFlightRef.current = true;
        const next = doAction(HUMAN_ID, { type: 'DISCARD', tile: autoTile });
        if (!next) {
          humanDiscardInFlightRef.current = false;
          return;
        }
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
    // Bug #8: stop ticking as soon as the hand ends (robbing-the-kong win, wall
    // exhaustion, etc.) or the claim opportunity is gone — otherwise the
    // interval keeps calling pass() against a FINISHED state.
    if (claimTimer <= 0 || claimOptions.length === 0) return;
    if (!game || game.phase !== GamePhase.PLAYING || game.turnPhase !== 'claim') {
      // Reset timer synchronously so lingering UI also clears.
      if (claimTimer !== 0) setClaimTimer(0);
      return;
    }
    const interval = setInterval(() => {
      // Re-check inside the tick — phase may have flipped between scheduling
      // and firing.
      const live = gameRef.current;
      if (!live || live.phase !== GamePhase.PLAYING || live.turnPhase !== 'claim') {
        setClaimTimer(0);
        return;
      }
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
  }, [claimTimer > 0, claimOptions.length, game?.phase, game?.turnPhase, pass]);

  // === Scoring on hand over ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.FINISHED) return;

    const currentMatch = matchRef.current;
    if (!currentMatch || currentMatch.phase !== 'playing') return;

    let result: ScoringResult | null = null;

    if (game.winnerId) {
      const winner = game.players.find(p => p.id === game.winnerId);
      if (winner && game.winningTile) {
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

        // Pick the win sound after scoring so we know if it was a limit hand.
        // Limit hands or anything 10+ fan get the bigger fanfare; self-draws
        // get a triumphant fifth on top of the standard win arpeggio.
        const isLimitHand = result?.handName !== undefined || (result?.totalFan ?? 0) >= 10;
        const isSelfDrawnFinal = game.isSelfDrawn ?? false;
        soundManager.play(
          isLimitHand ? 'winLimitHand' : isSelfDrawnFinal ? 'winSelfDraw' : 'win',
        );
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
    scoringResult, faanProjection,
    selectTile, discardSelected, declareKong, declareWin,
    submitClaim, submitChow, claimBest, pass, startNewGame, continueToNextHand,
    resumeGame, clearSavedGame: clearSavedGameAndReset,
    canDeclareKong, canDeclareWin,
  };
}
