/**
 * Game-flow integration tests for useGameController.
 *
 * Covers: initialization (fresh + daily), saved-game resume paths, claim
 * option arming / auto-pass timeout, scoring on hand-over, and the AI
 * special-action fallback that prevents game stalls.
 *
 * Mock strategy mirrors useGameController.timers.test.tsx — engine surface
 * is fully mocked; real models (Tile, GameState, MatchState) run as-is so
 * serialization round-trips work.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { GamePhase } from '@/models/GameState';
import { TileSuit, TileType, WindTile, type Tile } from '@/models/Tile';
import type { GameState } from '@/models/GameState';
import type { MatchState } from '@/models/MatchState';

// ---- Mocks ----------------------------------------------------------------

vi.mock('@/lib/soundManager', () => ({
  default: { play: vi.fn(), setEnabled: vi.fn(), isEnabled: () => false },
}));

const applyActionMock = vi.fn();
vi.mock('@/engine/turnManager', () => ({
  initializeGame: vi.fn(),
  applyAction: (...args: unknown[]) => applyActionMock(...args),
  buildWinScoringContext: (...args: unknown[]) => buildWinScoringContextMock(...args),
  // Delegate to the claiming mock so tests arm claims in one place
  getLegalClaims: (...args: unknown[]) => getAvailableClaimsMock(...args),
}));

const buildWinScoringContextMock = vi.fn(() => null);

const advanceMatchMock = vi.fn((m: MatchState) => m);
const startNextHandMock = vi.fn((m: MatchState) => m);
const initializeMatchMock = vi.fn();
vi.mock('@/engine/matchManager', () => ({
  initializeMatch: (...args: unknown[]) => initializeMatchMock(...args),
  advanceMatch: (...args: unknown[]) =>
    advanceMatchMock(...(args as [MatchState, GameState, never])),
  startNextHand: (...args: unknown[]) => startNextHandMock(...(args as [MatchState])),
}));

const getAvailableClaimsMock = vi.fn(() => [] as unknown[]);
vi.mock('@/engine/claiming', () => ({
  getAvailableClaims: (...args: unknown[]) => getAvailableClaimsMock(...args),
  getBestClaimSubmission: vi.fn(() => null),
}));

vi.mock('@/engine/winDetection', () => ({
  isWinningHand: vi.fn(() => false),
  canPlayerWin: vi.fn(() => false),
  calculateShanten: vi.fn(() => 8),
}));

const calculateScoreMock = vi.fn(() => ({ fan: 0, faans: [], totalFan: 0 }));
vi.mock('@/engine/scoring', () => ({
  calculateScore: (...args: unknown[]) => calculateScoreMock(...args),
  calculatePayment: vi.fn(() => ({ winner: 0, losers: [0, 0, 0] })),
}));

const getAIDecisionMock = vi.fn(() => ({ action: { type: 'PASS' } }));
vi.mock('@/engine/ai', () => ({
  getAIDecision: (...args: unknown[]) => getAIDecisionMock(...args),
  getAIClaimDecision: vi.fn(() => ({ action: { type: 'PASS' } })),
}));

vi.mock('@/engine/tutor', () => ({
  getTutorAdvice: vi.fn(() => null),
}));

// The tenpai effect calls TileFactory.getAllTiles — make it a no-op.
vi.mock('@/models/Tile', async () => {
  const actual = await vi.importActual<typeof import('@/models/Tile')>('@/models/Tile');
  return {
    ...actual,
    TileFactory: { ...actual.TileFactory, getAllTiles: () => [] },
  };
});

vi.mock('@/lib/dailyHand', () => ({ dailySeed: vi.fn(() => 'daily-2026-06-11') }));

// Import after mocks so the module picks up the mocked deps.
import useGameController from '../useGameController';

// ---- Test fixtures --------------------------------------------------------

const HUMAN_ID = 'human-player';

function makeTile(id: string, num = 1): Tile {
  return {
    id,
    suit: TileSuit.DOT,
    type: TileType.SUIT,
    number: num,
    nameEnglish: `${num} Dot`,
    nameChinese: '',
    nameJapanese: '',
    assetPath: '',
  };
}

function makeGame(overrides: Partial<GameState> = {}): GameState {
  const hand = [makeTile('t1', 1), makeTile('t2', 2)];
  const base = {
    id: 'g1',
    variant: 'hk',
    phase: GamePhase.PLAYING,
    turnPhase: 'discard' as const,
    players: [
      {
        id: HUMAN_ID, name: 'You', isAI: false, hand, melds: [], score: 0,
        seatWind: WindTile.EAST, isDealer: true, flowers: [],
      },
      {
        id: 'ai1', name: 'AI 1', isAI: true, hand: [], melds: [], score: 0,
        seatWind: WindTile.SOUTH, isDealer: false, flowers: [],
      },
      {
        id: 'ai2', name: 'AI 2', isAI: true, hand: [], melds: [], score: 0,
        seatWind: WindTile.WEST, isDealer: false, flowers: [],
      },
      {
        id: 'ai3', name: 'AI 3', isAI: true, hand: [], melds: [], score: 0,
        seatWind: WindTile.NORTH, isDealer: false, flowers: [],
      },
    ],
    currentPlayerIndex: 0,
    wall: [],
    deadWall: [],
    discardPile: [],
    playerDiscards: {},
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    prevailingWind: WindTile.EAST,
    lastDrawnTile: hand[0],
    turnTimeLimit: 20,
    finalScores: {},
    createdAt: new Date(),
    turnHistory: [],
  } as unknown as GameState;
  return { ...base, ...overrides };
}

function makeMatch(game: GameState): MatchState {
  return {
    mode: 'quick', difficulty: 'easy', currentRound: WindTile.EAST,
    handNumber: 1, totalHandsPlayed: 0, initialDealerIndex: 0,
    currentDealerIndex: 0, initialDealerHasRotated: false,
    playerScores: [500, 500, 500, 500], startingScore: 500,
    handResults: [], currentHand: game, phase: 'playing',
    playerNames: ['You', 'AI 1', 'AI 2', 'AI 3'], humanPlayerId: HUMAN_ID,
  };
}

// ---- Tests ----------------------------------------------------------------

describe('initialization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    applyActionMock.mockReset();
    advanceMatchMock.mockClear();
    initializeMatchMock.mockReset();
    getAvailableClaimsMock.mockReset();
    getAvailableClaimsMock.mockReturnValue([]);
    buildWinScoringContextMock.mockReset();
    buildWinScoringContextMock.mockReturnValue(null);
    calculateScoreMock.mockReset();
    calculateScoreMock.mockReturnValue({ fan: 0, faans: [], totalFan: 0 });
    getAIDecisionMock.mockReset();
    getAIDecisionMock.mockReturnValue({ action: { type: 'PASS' } });
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('fresh start: calls initializeMatch with correct mode and difficulty', () => {
    const game = makeGame();
    const match = makeMatch(game);
    initializeMatchMock.mockReturnValue(match);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    expect(initializeMatchMock).toHaveBeenCalledTimes(1);
    const opts = initializeMatchMock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.mode).toBe('quick');
    expect(opts.difficulty).toBe('easy');
    expect(result.current.game).not.toBeNull();
    expect(result.current.match).not.toBeNull();
  });

  it('daily mode: calls initializeMatch with seed, mode=single, difficulty=medium', () => {
    const game = makeGame();
    const dailyMatch: MatchState = {
      ...makeMatch(game),
      mode: 'single',
      difficulty: 'medium',
    };
    initializeMatchMock.mockReturnValue(dailyMatch);

    renderHook(() => useGameController(
      'easy', 'quick', true, true, undefined, 'off', 'standard', 'auto', 'default',
      undefined, undefined, true,
    ));
    act(() => { vi.advanceTimersByTime(0); });

    // initializeMatch may be called more than once due to React effect re-runs when
    // setMode/setDifficulty cause startNewGame to re-create; verify every call used
    // the daily config.
    expect(initializeMatchMock).toHaveBeenCalled();
    for (const call of initializeMatchMock.mock.calls) {
      const opts = call[0] as Record<string, unknown>;
      expect(opts.seed).toBe('daily-2026-06-11');
      expect(opts.mode).toBe('single');
      expect(opts.difficulty).toBe('medium');
    }
  });
});

describe('saved-game resume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    applyActionMock.mockReset();
    advanceMatchMock.mockClear();
    initializeMatchMock.mockReset();
    getAvailableClaimsMock.mockReset();
    getAvailableClaimsMock.mockReturnValue([]);
    buildWinScoringContextMock.mockReset();
    buildWinScoringContextMock.mockReturnValue(null);
    calculateScoreMock.mockReset();
    calculateScoreMock.mockReturnValue({ fan: 0, faans: [], totalFan: 0 });
    getAIDecisionMock.mockReset();
    getAIDecisionMock.mockReturnValue({ action: { type: 'PASS' } });
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function seedLocalStorage(matchOverrides: Partial<MatchState> = {}) {
    const game = makeGame();
    const match = { ...makeMatch(game), ...matchOverrides };
    localStorage.setItem('mahjong_match_in_progress', JSON.stringify({
      match, game: match.currentHand, savedAt: new Date().toISOString(), version: 1,
    }));
    return { match, game };
  }

  it('resumes a saved match without calling initializeMatch', () => {
    const { match } = seedLocalStorage();
    // Normally initializeMatch returns a fresh match; it must NOT be called on resume.
    initializeMatchMock.mockReturnValue(match);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    expect(initializeMatchMock).not.toHaveBeenCalled();
    expect(result.current.match).not.toBeNull();
    expect(result.current.match?.mode).toBe('quick');
  });

  it('skips resume when parlourFloor is set and calls initializeMatch fresh', () => {
    const game = makeGame();
    const match = makeMatch(game);
    seedLocalStorage();
    initializeMatchMock.mockReturnValue(match);

    renderHook(() => useGameController(
      'easy', 'quick', true, true, undefined, 'off', 'standard', 'auto', 'default',
      undefined, 1,
    ));
    act(() => { vi.advanceTimersByTime(0); });

    expect(initializeMatchMock).toHaveBeenCalled();
  });

  it('skips resume when saved match is finished', () => {
    const game = makeGame();
    const match = makeMatch(game);
    seedLocalStorage({ phase: 'finished' });
    initializeMatchMock.mockReturnValue(match);

    const { } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    expect(initializeMatchMock).toHaveBeenCalled();
  });

  it('auto-saves after init: localStorage contains version=1 and non-null match', () => {
    const game = makeGame();
    const match = makeMatch(game);
    initializeMatchMock.mockReturnValue(match);

    renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    const raw = localStorage.getItem('mahjong_match_in_progress');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
    expect(parsed.match).not.toBeNull();
  });
});

describe('claim flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    applyActionMock.mockReset();
    advanceMatchMock.mockClear();
    initializeMatchMock.mockReset();
    getAvailableClaimsMock.mockReset();
    getAvailableClaimsMock.mockReturnValue([]);
    buildWinScoringContextMock.mockReset();
    buildWinScoringContextMock.mockReturnValue(null);
    calculateScoreMock.mockReset();
    calculateScoreMock.mockReturnValue({ fan: 0, faans: [], totalFan: 0 });
    getAIDecisionMock.mockReset();
    getAIDecisionMock.mockReturnValue({ action: { type: 'PASS' } });
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function makeClaimGame() {
    return makeGame({
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      lastDiscardedBy: 'ai1',
      lastDiscardedTile: makeTile('d1'),
    });
  }

  it('arms claimOptions and claimTimer when human has legal claims', () => {
    const claimGame = makeClaimGame();
    initializeMatchMock.mockReturnValue(makeMatch(claimGame));
    getAvailableClaimsMock.mockReturnValue([
      { claimType: 'pung', tilesFromHand: [], priority: 2 },
    ]);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    expect(result.current.claimOptions).toHaveLength(1);
    expect(result.current.claimTimer).toBe(10000);
  });

  it('claim timeout auto-passes exactly once after 11s', () => {
    const claimGame = makeClaimGame();
    initializeMatchMock.mockReturnValue(makeMatch(claimGame));
    getAvailableClaimsMock.mockReturnValue([
      { claimType: 'pung', tilesFromHand: [], priority: 2 },
    ]);
    // pass() calls applyAction; return the same PLAYING state to avoid triggering scoring
    applyActionMock.mockReturnValue(claimGame);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    expect(result.current.claimTimer).toBeGreaterThan(0);

    act(() => { vi.advanceTimersByTime(11_000); });

    const passCalls = applyActionMock.mock.calls.filter(
      (c) => (c as [GameState, string, { type: string }])[1] === HUMAN_ID &&
              (c as [GameState, string, { type: string }])[2].type === 'PASS',
    );
    expect(passCalls).toHaveLength(1);
    expect(result.current.claimTimer).toBe(0);
  });

  it('expiry fires PASS exactly once even when ticks continue', () => {
    const claimGame = makeClaimGame();
    // After pass() the engine returns a state where human has already passed,
    // so the claim-detection effect cannot re-arm the timer.
    const postPassGame = makeGame({
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      lastDiscardedBy: 'ai1',
      lastDiscardedTile: makeTile('d1'),
      passedPlayers: [HUMAN_ID],
    });
    initializeMatchMock.mockReturnValue(makeMatch(claimGame));
    getAvailableClaimsMock.mockReturnValue([
      { claimType: 'pung', tilesFromHand: [], priority: 2 },
    ]);
    // Return postPassGame on pass so the claim-detection effect sees human already passed.
    applyActionMock.mockReturnValue(postPassGame);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    expect(result.current.claimTimer).toBeGreaterThan(0);

    // Advance 3× the timeout to verify no duplicate fires.
    act(() => { vi.advanceTimersByTime(30_000); });

    const passCalls = applyActionMock.mock.calls.filter(
      (c) => (c as [GameState, string, { type: string }])[1] === HUMAN_ID &&
              (c as [GameState, string, { type: string }])[2].type === 'PASS',
    );
    expect(passCalls).toHaveLength(1);
    expect(result.current.claimTimer).toBe(0);
  });

  it('no claim options when human already passed', () => {
    const claimGame = makeGame({
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      lastDiscardedBy: 'ai1',
      lastDiscardedTile: makeTile('d1'),
      passedPlayers: [HUMAN_ID],
    });
    initializeMatchMock.mockReturnValue(makeMatch(claimGame));
    getAvailableClaimsMock.mockReturnValue([
      { claimType: 'pung', tilesFromHand: [], priority: 2 },
    ]);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    expect(result.current.claimOptions).toHaveLength(0);
    expect(result.current.claimTimer).toBe(0);
  });
});

describe('scoring and AI fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    applyActionMock.mockReset();
    advanceMatchMock.mockClear();
    initializeMatchMock.mockReset();
    getAvailableClaimsMock.mockReset();
    getAvailableClaimsMock.mockReturnValue([]);
    buildWinScoringContextMock.mockReset();
    buildWinScoringContextMock.mockReturnValue(null);
    calculateScoreMock.mockReset();
    calculateScoreMock.mockReturnValue({ fan: 0, faans: [], totalFan: 0 });
    getAIDecisionMock.mockReset();
    getAIDecisionMock.mockReturnValue({ action: { type: 'PASS' } });
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('scoring on win: sets scoringResult and calls advanceMatch', () => {
    const game = makeGame();
    const match = makeMatch(game);
    initializeMatchMock.mockReturnValue(match);

    const winningTile = makeTile('w1');
    const finishedGame: GameState = {
      ...game,
      phase: GamePhase.FINISHED,
      winnerId: HUMAN_ID,
      winningTile,
      isSelfDrawn: false,
    } as unknown as GameState;

    // pass() triggers applyAction which returns the FINISHED state
    applyActionMock.mockReturnValue(finishedGame);
    buildWinScoringContextMock.mockReturnValue({ discarderIndex: 1 });
    calculateScoreMock.mockReturnValue({ totalFan: 3, faans: [], handName: undefined });

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    act(() => { result.current.pass(); });

    expect(advanceMatchMock).toHaveBeenCalled();
    expect(result.current.scoringResult).not.toBeNull();
    expect(result.current.scoringResult?.totalFan).toBe(3);
  });

  it('AI special-action fallback: discards a tile when DECLARE_WIN is rejected', () => {
    const aiHand = [makeTile('s1', 1), makeTile('s2', 2)];
    const aiGame = makeGame({
      currentPlayerIndex: 1,
      turnPhase: 'discard',
      players: [
        {
          id: HUMAN_ID, name: 'You', isAI: false,
          hand: [makeTile('t1', 1)], melds: [], score: 0,
          seatWind: WindTile.EAST, isDealer: true, flowers: [],
        },
        {
          id: 'ai1', name: 'AI 1', isAI: true,
          hand: aiHand, melds: [], score: 0,
          seatWind: WindTile.SOUTH, isDealer: false, flowers: [],
        },
        {
          id: 'ai2', name: 'AI 2', isAI: true, hand: [], melds: [], score: 0,
          seatWind: WindTile.WEST, isDealer: false, flowers: [],
        },
        {
          id: 'ai3', name: 'AI 3', isAI: true, hand: [], melds: [], score: 0,
          seatWind: WindTile.NORTH, isDealer: false, flowers: [],
        },
      ],
    });
    initializeMatchMock.mockReturnValue(makeMatch(aiGame));

    // AI returns a DECLARE_WIN — engine rejects it (returns null), fallback must DISCARD
    getAIDecisionMock.mockReturnValue({ action: { type: 'DECLARE_WIN' } });
    applyActionMock.mockImplementation(
      (_state: GameState, _pid: string, action: { type: string }) => {
        if (action.type === 'DECLARE_WIN') return null;
        // Return a valid state for any other action
        return { ...aiGame, turnPhase: 'claim' };
      },
    );

    renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    // Advance past easy discard delay (2000ms)
    act(() => { vi.advanceTimersByTime(2500); });

    const discardCalls = applyActionMock.mock.calls.filter(
      (c) => (c as [GameState, string, { type: string }])[1] === 'ai1' &&
              (c as [GameState, string, { type: string }])[2].type === 'DISCARD',
    );
    expect(discardCalls.length).toBeGreaterThanOrEqual(1);
  });
});
