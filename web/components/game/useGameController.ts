'use client';

/* Game-loop effects use narrow `game` fields in dependency arrays so full-state updates do not reset
 * AI timers or duplicate moves. Claim countdown avoids listing `claimTimer` to prevent interval churn. */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GamePhase, ClaimType } from '@/models/GameState';
import { MatchState, GameMode } from '@/models/MatchState';
import { Tile, TileType, TileFactory, tilesMatch } from '@/models/Tile';
import { applyAction, buildWinScoringContext, getLegalClaims, canDeclareSelfDrawnWin, scoreSelfDrawnHand } from '@/engine/turnManager';
import { advanceMatch, startNextHand } from '@/engine/matchManager';
import { getBestClaimSubmission } from '@/engine/claiming';
import { isWinningHand, canPlayerWin } from '@/engine/winDetection';
import { calculateScore } from '@/engine/scoring';
import { AvailableClaim, ScoringResult, TileClassification, DEFAULT_MIN_FAAN } from '@/engine/types';
import { calculatePayment } from '@/engine/scoring';
import { getTutorAdvice } from '@/engine/tutor';
import { computeHeatOverlays, type TileHeatOverlay } from '@/engine/shantenHeat';
import type { DisplayMode } from '@/store/actions/settingsActions';
import { projectFaan, FaanProjection } from '@/engine/faanProjection';
import soundManager from '@/lib/soundManager';
import { speakTile, TileVoiceLanguage } from '@/lib/tileVoice';
import { saveGame, loadGame, clearSavedGame, hasSavedGame, canResume } from '@/lib/matchStorage';
import { NpcRosterMode } from '@/lib/rosterRotation';
import { RosterId } from '@/lib/cosmetics';
import * as Sentry from '@sentry/nextjs';
import { startAiTurn } from './aiTurnRunner';
import { launchDailyMatch, launchParlourMatch, launchStandardMatch } from './matchLaunch';

const HUMAN_ID = 'human-player';

// Difficulty-based delays (ms) [DRAW, DISCARD]
const DELAYS = {
  easy: { draw: 1500, discard: 2000, claim: 800 },
  medium: { draw: 1000, discard: 1200, claim: 500 },
  hard: { draw: 600, discard: 800, claim: 400 },
};

const CLAIM_TIMEOUT_STANDARD = 10000;
const CLAIM_TIMEOUT_TRAINING = 20000;
const DEBOUNCE_MS = 200;
const TURN_TIMER_TICK_MS = 100;

export type TablePreset = 'standard' | 'training';

function claimTimeoutForPreset(preset: TablePreset): number {
  return preset === 'training' ? CLAIM_TIMEOUT_TRAINING : CLAIM_TIMEOUT_STANDARD;
}

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
  heatOverlays: Map<string, TileHeatOverlay>;
  claimOptions: AvailableClaim[];
  claimTimer: number;
  /**
   * True only once the sequential claim rotation has actually reached the
   * human — as opposed to `claimOptions` being populated the instant the
   * claim phase starts, before AI claimants ahead of the human have acted.
   */
  isMyClaimTurn: boolean;
  /** ms remaining on the human's discard-phase turn timer (0 when inactive). */
  turnTimer: number;
  /** Total ms for the human's discard-phase turn timer (0 when inactive). */
  turnTimeout: number;
  isGameOver: boolean;
  isMatchOver: boolean;
  scoringResult: ScoringResult | null;
  faanProjection: FaanProjection | null;
  claimTimeoutMs: number;
  tablePreset: TablePreset;
  selectTile: (tile: Tile) => void;
  /** Returns true when the discard was accepted, false when the engine/debounce rejected it. */
  discardSelected: () => boolean;
  /** Sort the human hand by suit and number (animated via FLIP in PlayerHand). */
  sortHand: () => void;
  declareKong: () => void;
  declareWin: () => void;
  /** Returns true when the claim was accepted, false when the engine rejected it. */
  submitClaim: (claimType: ClaimType, tilesFromHand: Tile[]) => boolean;
  /** Submit a specific chow combination (from ChowSelector). Returns true when accepted. */
  submitChow: (tilesFromHand: Tile[]) => boolean;
  /** Recomputes best claim from live game state (avoids stale tile refs), then submits. Returns true when accepted. */
  claimBest: () => boolean;
  /** Returns true when the pass was accepted, false when the engine rejected it. */
  pass: () => boolean;
  startNewGame: (difficulty: 'easy' | 'medium' | 'hard', mode?: GameMode) => void;
  continueToNextHand: () => void;
  /** Resume an in-progress match from localStorage. */
  resumeGame: () => boolean;
  /** Clear any saved match and reset to a fresh game. */
  clearSavedGame: () => void;
  canDeclareKong: boolean;
  canDeclareWin: boolean;
  /**
   * Set when the human's hand is a complete winning shape on their own turn but
   * scores below the table's faan minimum, so the engine won't accept the win
   * and no Mahjong button is shown. Drives the "complete but short" explainer.
   */
  winShortfall: WinShortfall | null;
}

/** Why a structurally-complete hand can't be declared: it's under the faan floor. */
export interface WinShortfall {
  /** Faan the completed hand is currently worth. */
  currentFaan: number;
  /** Faan minimum this table requires to win. */
  minFaan: number;
}

export default function useGameController(
  initialDifficulty: 'easy' | 'medium' | 'hard',
  initialMode: GameMode = 'quick',
  showTutor: boolean = true,
  liveFaanMeter: boolean = true,
  initialMinFaan?: number,
  tileVoice: 'off' | TileVoiceLanguage = 'off',
  tablePreset: TablePreset = 'standard',
  npcRosterMode: NpcRosterMode = 'auto',
  fixedNpcRoster: RosterId = 'default',
  onMatchRosterResolved?: (rosterId: RosterId) => void,
  parlourFloor?: number,
  dailyMode: boolean = false,
  displayMode: DisplayMode = 'tutor',
): GameController {
  const claimTimeoutMs = claimTimeoutForPreset(tablePreset);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialDifficulty);
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [game, setGame] = useState<GameState | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | undefined>();
  const [suggestedTileId, setSuggestedTileId] = useState<string | undefined>();
  const [tutorAdvice, setTutorAdvice] = useState<TutorAdvice | null>(null);
  const [tenpaiStatus, setTenpaiStatus] = useState<TenpaiStatus | null>(null);
  const [claimOptions, setClaimOptions] = useState<AvailableClaim[]>([]);
  // Mirrors claimOptions for the claim countdown below — read from a ref
  // (not React state) so a tick that fires within the same macrotask as a
  // just-accepted forcePass() sees the human's claim window as resolved
  // immediately, rather than waiting for a re-render to notice.
  const claimOptionsRef = useRef<AvailableClaim[]>([]);
  const updateClaimOptions = useCallback((value: AvailableClaim[]) => {
    claimOptionsRef.current = value;
    setClaimOptions(value);
  }, []);
  const [claimTimer, setClaimTimer] = useState(0);
  const claimTimerRef = useRef(0);
  const updateClaimTimer = useCallback((value: number) => {
    claimTimerRef.current = value;
    setClaimTimer(value);
  }, []);
  const [turnTimer, setTurnTimer] = useState(0);
  const turnTimerRef = useRef(0);
  const updateTurnTimer = useCallback((value: number) => {
    turnTimerRef.current = value;
    setTurnTimer(value);
  }, []);
  const [turnTimeout, setTurnTimeout] = useState(0);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [tileClassifications, setTileClassifications] = useState<Map<string, 'green' | 'orange' | 'red'>>(new Map());
  const [heatOverlays, setHeatOverlays] = useState<Map<string, TileHeatOverlay>>(new Map());
  const [faanProjection, setFaanProjection] = useState<FaanProjection | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const matchRef = useRef<MatchState | null>(null);
  const processingRef = useRef(false);
  const aiBusyRef = useRef(false);
  const aiCancelRef = useRef<(() => void) | null>(null);
  const [aiEpoch, setAiEpoch] = useState(0);
  // Mutex shared by human discard paths (manual click + auto-discard timer) so
  // whichever fires first wins and the other no-ops. Cleared after the hand
  // state transitions (resetHandState) or when phase leaves discard.
  const humanDiscardInFlightRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  // Mirrors selectedTileId for the auto-discard timeout below. Read from a ref
  // (not the dependency array) so the timeout is NOT torn down and restarted
  // every time the player taps a different tile — that would reset their clock.
  const selectedTileIdRef = useRef<string | undefined>(undefined);
  // Keep refs in sync
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { matchRef.current = match; }, [match]);
  useEffect(() => { selectedTileIdRef.current = selectedTileId; }, [selectedTileId]);

  const resetHandState = useCallback(() => {
    setSelectedTileId(undefined);
    setSuggestedTileId(undefined);
    setTutorAdvice(null);
    setTenpaiStatus(null);
    updateClaimOptions([]);
    updateClaimTimer(0);
    setScoringResult(null);
    setTileClassifications(new Map());
    setHeatOverlays(new Map());
    setFaanProjection(null);
    processingRef.current = false;
    humanDiscardInFlightRef.current = false;
  }, [updateClaimTimer]);

  const startNewGame = useCallback((newDifficulty: 'easy' | 'medium' | 'hard', newMode?: GameMode) => {
    if (dailyMode) {
      const launched = launchDailyMatch();
      setDifficulty(launched.difficulty);
      setMode(launched.mode);
      setMatch(launched.match);
      setGame(launched.match.currentHand);
      resetHandState();
      return;
    }

    if (parlourFloor) {
      const launched = launchParlourMatch(parlourFloor);
      if (launched) {
        setDifficulty(launched.difficulty);
        setMode(launched.mode);
        setMatch(launched.match);
        setGame(launched.match.currentHand);
        resetHandState();
        return;
      }
    }

    const gameMode = newMode ?? mode;
    const launched = launchStandardMatch({
      difficulty: newDifficulty,
      mode: gameMode,
      minFaan: initialMinFaan ?? DEFAULT_MIN_FAAN,
      npcRosterMode,
      fixedNpcRoster,
    });
    if (launched.resolvedRoster) onMatchRosterResolved?.(launched.resolvedRoster);
    setDifficulty(launched.difficulty);
    setMode(launched.mode);
    setMatch(launched.match);
    setGame(launched.match.currentHand);
    resetHandState();
  }, [mode, resetHandState, initialMinFaan, npcRosterMode, fixedNpcRoster, onMatchRosterResolved, parlourFloor, dailyMode]);

  // Initialize game on mount — resume saved match if one exists and is active.
  // Parlour floor matches always start fresh.
  useEffect(() => {
    const saved = (parlourFloor || dailyMode) ? null : loadGame();
    if (saved?.match && saved.match.phase !== 'finished') {
      setMatch(saved.match);
      setGame(saved.game ?? saved.match.currentHand ?? null);
      setDifficulty(saved.match.difficulty);
      setMode(saved.match.mode);
    } else {
      startNewGame(initialDifficulty, initialMode);
    }
  }, [initialDifficulty, initialMode, startNewGame, parlourFloor, dailyMode]);

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
  // True only once the sequential claim rotation has actually reached the
  // human — claimOptions/claimTimer are armed as soon as the claim phase
  // starts, before AI claimants ahead of the human have acted.
  const isMyClaimTurn =
    !!game &&
    game.phase === GamePhase.PLAYING &&
    game.turnPhase === 'claim' &&
    game.currentPlayerIndex === humanIndex;

  // Apply an action and update state (with rapid-click debouncing for human).
  // `bypassDebounce` is for the claim countdown's forced auto-pass retry — a
  // timer expiry is not a human double-tap, so it must not be swallowed by
  // the same guard that protects against one.
  const doAction = useCallback((playerId: string, action: any, opts?: { bypassDebounce?: boolean }): GameState | null => {
    // Debounce human actions
    if (playerId === HUMAN_ID) {
      const now = Date.now();
      if (!opts?.bypassDebounce && now - lastActionTimeRef.current < DEBOUNCE_MS) return null;
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

  const sortHand = useCallback(() => {
    const current = gameRef.current;
    if (!current) return;
    const idx = current.players.findIndex(p => p.id === HUMAN_ID);
    if (idx === -1) return;
    const suitOrder: Record<string, number> = { dot: 0, bamboo: 1, character: 2, wind: 3, dragon: 4 };
    const sorted = [...current.players[idx].hand].sort((a, b) => {
      const suitDiff = (suitOrder[a.suit] ?? 9) - (suitOrder[b.suit] ?? 9);
      if (suitDiff !== 0) return suitDiff;
      return (a.number ?? 0) - (b.number ?? 0);
    });
    if (sorted.every((t, i) => t.id === current.players[idx].hand[i].id)) return;
    const players = [...current.players];
    players[idx] = { ...players[idx], hand: sorted };
    const next = { ...current, players };
    setGame(next);
    gameRef.current = next;
    soundManager.play('tileDraw');
  }, []);

  const discardSelected = useCallback((): boolean => {
    const current = gameRef.current;
    if (!current || current.turnPhase !== 'discard' || current.currentPlayerIndex !== humanIndex) return false;
    // Bug #7: mutex against auto-discard timer — whichever fires first wins.
    if (humanDiscardInFlightRef.current) return false;
    const tile = current.players[humanIndex].hand.find(t => t.id === selectedTileId);
    if (!tile) return false;
    humanDiscardInFlightRef.current = true;
    const next = doAction(HUMAN_ID, { type: 'DISCARD', tile });
    if (!next) {
      // Debounce or engine rejection — release the mutex so a retry/auto can fire.
      humanDiscardInFlightRef.current = false;
      return false;
    }
    setSelectedTileId(undefined);
    soundManager.play('tilePlace');
    return true;
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

  const submitClaim = useCallback((claimType: ClaimType, tilesFromHand: Tile[]): boolean => {
    const next = doAction(HUMAN_ID, { type: 'CLAIM', claimType, tilesFromHand });
    if (next) {
      updateClaimOptions([]);
      updateClaimTimer(0);
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      soundManager.play(claimType === 'win' ? 'win' : 'claim');
    }
    return !!next;
  }, [doAction, updateClaimTimer]);

  const claimBest = useCallback((): boolean => {
    const current = gameRef.current;
    if (!current || current.phase !== GamePhase.PLAYING || current.turnPhase !== 'claim') return false;
    if (current.currentPlayerIndex !== humanIndex) return false;
    if (current.lastDiscardedBy === HUMAN_ID) return false;
    const claims = getLegalClaims(current, humanIndex);
    const best = getBestClaimSubmission(claims);
    if (!best) return false;
    const next = doAction(HUMAN_ID, { type: 'CLAIM', claimType: best.claimType, tilesFromHand: best.tilesFromHand });
    if (next) {
      updateClaimOptions([]);
      updateClaimTimer(0);
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      soundManager.play(best.claimType === 'win' ? 'win' : 'claim');
    }
    return !!next;
  }, [doAction, humanIndex, updateClaimTimer]);

  const submitChow = useCallback((tilesFromHand: Tile[]): boolean => {
    const next = doAction(HUMAN_ID, { type: 'CLAIM', claimType: 'chow' as ClaimType, tilesFromHand });
    if (next) {
      updateClaimOptions([]);
      updateClaimTimer(0);
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      soundManager.play('claim');
    }
    return !!next;
  }, [doAction, updateClaimTimer]);

  const pass = useCallback((): boolean => {
    const next = doAction(HUMAN_ID, { type: 'PASS' });
    if (next) {
      updateClaimOptions([]);
      updateClaimTimer(0);
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      soundManager.play('pass');
    }
    return !!next;
  }, [doAction, updateClaimTimer]);

  // Same effect as pass(), but bypasses the human double-tap debounce. Used
  // only by the claim countdown's expiry retry below: a timer firing is not
  // a double-tap, so the 200ms guard that protects against an accidental
  // repeat tap must not also be the thing that lets the auto-pass wedge the
  // hand forever (the original bug).
  const forcePass = useCallback((): boolean => {
    const next = doAction(HUMAN_ID, { type: 'PASS' }, { bypassDebounce: true });
    if (next) {
      updateClaimOptions([]);
      updateClaimTimer(0);
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      soundManager.play('pass');
    }
    return !!next;
  }, [doAction, updateClaimTimer]);

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

  // Delegate to the engine's authoritative self-draw gate (winning shape +
  // drawn tile in hand + minimum faan) rather than a bare structural check —
  // otherwise the button renders on hands the engine silently rejects (a dead
  // button). This mirrors how the claim path uses getLegalClaims and how every
  // AI tier already gates on canDeclareSelfDrawnWin.
  const canDeclareWin = game ? canDeclareSelfDrawnWin(game, humanIndex) : false;

  // A complete winning shape that the engine refuses purely because it's under
  // the faan floor. We don't show a dead Mahjong button for it (canDeclareWin
  // already excludes it) — instead we explain the shortfall so the rule teaches.
  const winShortfall: WinShortfall | null = (() => {
    if (!game || game.turnPhase !== 'discard' || game.currentPlayerIndex !== humanIndex) return null;
    if (canDeclareWin) return null;
    const player = game.players[humanIndex];
    if (!canPlayerWin(player.hand, player.melds)) return null;
    const result = scoreSelfDrawnHand(game, humanIndex);
    if (!result) return null;
    return { currentFaan: result.totalFan, minFaan: game.minFaan ?? DEFAULT_MIN_FAAN };
  })();

  // === Display overlay hook ===
  // Modes: tutor (beginner advice), shantenHeat (per-discard heatmap), off (none).
  // Tutor mode is also gated on `showTutor` for backward compatibility and the in-game HUD toggle.
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) {
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      setTileClassifications(new Map());
      setHeatOverlays(new Map());
      return;
    }

    const isHumanDiscardTurn = game.turnPhase === 'discard' && game.currentPlayerIndex === humanIndex;
    const isClaimPhase = game.turnPhase === 'claim' && claimOptions.length > 0;

    if (displayMode === 'shantenHeat') {
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      setTileClassifications(new Map());

      if (isHumanDiscardTurn) {
        const player = game.players[humanIndex];
        setHeatOverlays(computeHeatOverlays(player.hand, player.melds));
      } else {
        setHeatOverlays(new Map());
      }
      return;
    }

    setHeatOverlays(new Map());

    if (displayMode !== 'tutor' || !showTutor) {
      setTutorAdvice(null);
      setSuggestedTileId(undefined);
      setTileClassifications(new Map());
      return;
    }

    if (isHumanDiscardTurn || isClaimPhase) {
      const advice = getTutorAdvice(game, humanIndex, claimOptions);
      setTutorAdvice(advice);
      setSuggestedTileId(advice?.suggestedTileId);
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
  }, [game?.turnPhase, game?.currentPlayerIndex, game?.phase, claimOptions, showTutor, displayMode, humanIndex]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hand/meld signatures capture the inputs;
    // keying on game.players would re-run this 34-prototype scan on every opponent action
  }, [faanHandSig, faanMeldSig, game?.phase, difficulty, humanIndex]);

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
      // Auto-discard the player's selection, then the last drawn tile, then
      // fall back to the last tile in hand. Read the selection from a ref
      // (not the effect deps) so re-selecting a tile never restarts this timer.
      const selectedTileId = selectedTileIdRef.current;
      const selected = selectedTileId
        ? hand.find(t => t.id === selectedTileId)
        : undefined;
      const autoTile =
        selected ??
        (current.lastDrawnTile
          ? hand.find(t => t.id === current.lastDrawnTile?.id)
          : undefined) ??
        hand[hand.length - 1];
      if (autoTile) {
        humanDiscardInFlightRef.current = true;
        const next = doAction(HUMAN_ID, { type: 'DISCARD', tile: autoTile });
        if (!next) {
          humanDiscardInFlightRef.current = false;
          return;
        }
        soundManager.play('tilePlace');
        setSelectedTileId(undefined);
      }
    }, (game.turnTimeLimit ?? 20) * 1000);
    return () => clearTimeout(timer);
  }, [game?.turnPhase, game?.currentPlayerIndex, game?.phase, humanIndex, doAction]);

  // === Turn timer reset — (re)arm the discard countdown when a fresh human
  // discard phase begins; clear it once the phase moves on. ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) {
      updateTurnTimer(0);
      setTurnTimeout(0);
      return;
    }
    if (game.turnPhase !== 'discard' || game.currentPlayerIndex !== humanIndex) {
      updateTurnTimer(0);
      setTurnTimeout(0);
      return;
    }
    const total = (game.turnTimeLimit ?? 20) * 1000;
    setTurnTimeout(total);
    updateTurnTimer(total);
  }, [game?.turnPhase, game?.currentPlayerIndex, game?.phase, humanIndex]);

  // === Turn countdown tick — ticks turnTimer down every 100ms and plays a
  // warning sound once it crosses the 5s mark. Mirrors the claim countdown. ===
  useEffect(() => {
    if (turnTimer <= 0) return;
    if (!game || game.phase !== GamePhase.PLAYING || game.turnPhase !== 'discard' || game.currentPlayerIndex !== humanIndex) {
      if (turnTimer !== 0) updateTurnTimer(0);
      return;
    }
    const interval = setInterval(() => {
      const live = gameRef.current;
      if (!live || live.phase !== GamePhase.PLAYING || live.turnPhase !== 'discard' || live.currentPlayerIndex !== humanIndex) {
        updateTurnTimer(0);
        return;
      }
      const prev = turnTimerRef.current;
      const next = Math.max(0, prev - TURN_TIMER_TICK_MS);
      updateTurnTimer(next);
      if (next <= 5000 && prev > 5000) {
        soundManager.play('turnAlert');
      }
    }, TURN_TIMER_TICK_MS);
    return () => clearInterval(interval);
  }, [turnTimer > 0, game?.phase, game?.turnPhase, game?.currentPlayerIndex, humanIndex]);

  // === AI turn processing — single in-flight chain (no draw/discard race) ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) {
      aiCancelRef.current?.();
      aiCancelRef.current = null;
      processingRef.current = false;
      aiBusyRef.current = false;
      return;
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer.isAI) {
      aiCancelRef.current?.();
      aiCancelRef.current = null;
      processingRef.current = false;
      aiBusyRef.current = false;
      return;
    }

    // A chain is already owning this seat — ignore turnPhase churn from our own DRAW.
    if (aiBusyRef.current || processingRef.current) return;

    const needsAction =
      game.turnPhase === 'draw' ||
      game.turnPhase === 'discard' ||
      (game.turnPhase === 'claim' && game.lastDiscardedBy !== currentPlayer.id);
    if (!needsAction) return;

    processingRef.current = true;
    aiBusyRef.current = true;

    // Do not cancel from effect cleanup on turnPhase changes — that killed win/kong
    // follow-ups after DRAW. Cancel only when leaving AI play (branches above).
    aiCancelRef.current = startAiTurn(game, {
      delays: { draw: currentDelays.draw, discard: currentDelays.discard },
      claimDelayMs: 150,
      apply: (playerId, action) => doAction(playerId, action),
      getGame: () => gameRef.current,
      onComplete: () => {
        processingRef.current = false;
        aiBusyRef.current = false;
        aiCancelRef.current = null;
        setAiEpoch(n => n + 1);
      },
    });
  }, [game?.currentPlayerIndex, game?.turnPhase, game?.phase, doAction, currentDelays, aiEpoch]);

  // === Claim detection: show options immediately when claim phase starts (don't wait for currentPlayerIndex) ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (game.turnPhase !== 'claim') {
      updateClaimOptions([]);
      updateClaimTimer(0);
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
      updateClaimOptions([]);
      updateClaimTimer(0);
      return;
    }

    if (!game.lastDiscardedTile || !game.lastDiscardedBy) return;

    const claims = getLegalClaims(game, humanIndex);

    if (claims.length > 0) {
      updateClaimOptions(claims);
      // Only start timer if not already running
      if (claimTimerRef.current <= 0) updateClaimTimer(claimTimeoutMs);
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
    claimTimeoutMs,
  ]);

  // === Claim countdown ===
  useEffect(() => {
    // Bug #8: stop ticking as soon as the hand ends (robbing-the-kong win, wall
    // exhaustion, etc.) or the claim opportunity is gone — otherwise the
    // interval keeps calling pass() against a FINISHED state.
    if (claimOptions.length === 0) return;
    if (!game || game.phase !== GamePhase.PLAYING || game.turnPhase !== 'claim') {
      // Reset timer synchronously so lingering UI also clears.
      if (claimTimer !== 0) updateClaimTimer(0);
      return;
    }
    const interval = setInterval(() => {
      // Re-check inside the tick — phase may have flipped between scheduling
      // and firing. Also re-check claimOptionsRef: a forcePass() that just
      // succeeded on THIS same tick batch clears it synchronously, and the
      // human's own claim window is resolved at that point even if turnPhase
      // stays 'claim' for other claimants still deciding — retrying further
      // would just spam rejected PASS calls at the (already-moved-on) engine.
      const live = gameRef.current;
      if (!live || live.phase !== GamePhase.PLAYING || live.turnPhase !== 'claim' || claimOptionsRef.current.length === 0) {
        updateClaimTimer(0);
        return;
      }
      const prev = claimTimerRef.current;
      const next = Math.max(0, prev - 100);
      updateClaimTimer(next);
      if (next === 0) {
        // Time's up — retry every tick until it takes. This is intentionally
        // NOT one-shot (unlike a "the countdown just crossed zero" sound
        // would be): a single rejected forcePass() must not wedge the hand
        // forever, which is exactly the bug this replaces. The guard above —
        // turnPhase leaving 'claim' or claimOptionsRef going empty, both of
        // which follow a successful pass — is what stops the retries, not a
        // guard here.
        forcePass();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [claimOptions.length > 0 && game?.turnPhase === 'claim', game?.phase, forcePass]);

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
          const winnerIndex = game.players.findIndex(p => p.id === game.winnerId);

          const context = buildWinScoringContext(game);
          if (context) {
            result = calculateScore(winner.hand, winner.melds, context);
            result.payment = calculatePayment(
              result, winnerIndex,
              context.discarderIndex,
              isSelfDrawn,
            );
          }
        } catch (e) {
          Sentry.captureException(e);
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
    tileClassifications, heatOverlays, claimOptions, claimTimer, isMyClaimTurn, turnTimer, turnTimeout, isGameOver, isMatchOver,
    scoringResult, faanProjection, claimTimeoutMs, tablePreset,
    selectTile, discardSelected, sortHand, declareKong, declareWin,
    submitClaim, submitChow, claimBest, pass, startNewGame, continueToNextHand,
    resumeGame, clearSavedGame: clearSavedGameAndReset,
    canDeclareKong, canDeclareWin, winShortfall,
  };
}
