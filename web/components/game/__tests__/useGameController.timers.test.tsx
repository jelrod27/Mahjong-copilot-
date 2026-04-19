/**
 * Regression tests for timer races and leaks in useGameController.
 *
 * Bug #7 — Auto-discard timer races manual discard: both the setTimeout
 * callback and discardSelected() called applyAction() without mutual
 * exclusion; the fix adds a humanDiscardInFlightRef guard.
 *
 * Bug #8 — Claim countdown interval keeps firing after the hand ends: the
 * effect's guard only watched claimTimer, so a phase transition (e.g. robbing
 * the kong) while the countdown was live left the interval calling pass()
 * against a FINISHED state. The fix watches game.phase / game.turnPhase.
 *
 * These tests mock the engine surface so the hook runs against a fully
 * deterministic, controllable game state. We count invocations of
 * applyAction rather than inspecting rendered output.
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
}));

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
}));

vi.mock('@/engine/scoring', () => ({
  calculateScore: vi.fn(() => ({ fan: 0, faans: [], totalFan: 0 })),
  calculatePayment: vi.fn(() => ({ winner: 0, losers: [0, 0, 0] })),
}));

vi.mock('@/engine/ai', () => ({
  getAIDecision: vi.fn(() => ({ action: { type: 'PASS' } })),
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

type ApplyCall = [GameState, string, { type: string }];
const discardsByHuman = () =>
  applyActionMock.mock.calls.filter(
    (c) => (c as ApplyCall)[1] === HUMAN_ID && (c as ApplyCall)[2].type === 'DISCARD',
  );

// ---- Tests ----------------------------------------------------------------

describe('useGameController timer race / leak fixes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    applyActionMock.mockReset();
    advanceMatchMock.mockClear();
    initializeMatchMock.mockReset();
    getAvailableClaimsMock.mockReset();
    getAvailableClaimsMock.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('Bug #7: two rapid discardSelected() calls only produce one applyAction', () => {
    const game = makeGame();
    initializeMatchMock.mockReturnValue(makeMatch(game));
    // Return a state still in discard phase — this forces the mutex to be
    // the ONLY barrier against a double discard (the turnPhase guard alone
    // would let the second call through if the engine's returned state
    // hadn't yet transitioned).
    applyActionMock.mockReturnValue(game);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    act(() => { result.current.selectTile(game.players[0].hand[0]); });
    act(() => {
      result.current.discardSelected();
      result.current.discardSelected();
    });

    expect(discardsByHuman()).toHaveLength(1);
  });

  it('Bug #7: after manual discard, the auto-discard timeout is a no-op', () => {
    const game = makeGame();
    initializeMatchMock.mockReturnValue(makeMatch(game));
    const afterDiscard: GameState = { ...game, turnPhase: 'claim', lastDiscardedBy: HUMAN_ID };
    applyActionMock.mockReturnValue(afterDiscard);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    act(() => { result.current.selectTile(game.players[0].hand[0]); });
    act(() => { result.current.discardSelected(); });

    const discardsBefore = discardsByHuman().length;
    // Advance past the 20s auto-discard timeout.
    act(() => { vi.advanceTimersByTime(25_000); });
    const discardsAfter = discardsByHuman().length;

    expect(discardsAfter).toBe(discardsBefore);
  });

  it('Bug #8: claim countdown stops once game.phase becomes FINISHED', () => {
    const claimGame = makeGame({
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      lastDiscardedBy: 'ai1',
      lastDiscardedTile: makeTile('d1'),
    });
    initializeMatchMock.mockReturnValue(makeMatch(claimGame));

    // Arm the countdown: expose a pung claim option to the human.
    getAvailableClaimsMock.mockReturnValue([
      { claimType: 'pung', tilesFromHand: [], priority: 2 },
    ]);

    // When pass() runs, the engine returns a FINISHED state — simulating a
    // concurrent hand-end (e.g. robbing-the-kong resolved elsewhere).
    const finishedGame: GameState = { ...claimGame, phase: GamePhase.FINISHED };
    applyActionMock.mockReturnValue(finishedGame);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    // The countdown armed.
    expect(result.current.claimTimer).toBeGreaterThan(0);

    // Simulate the hand ending mid-countdown.
    act(() => { result.current.pass(); });

    const callsAfterPass = applyActionMock.mock.calls.length;
    // Run the full countdown window — the interval should NOT fire again.
    act(() => { vi.advanceTimersByTime(11_000); });

    expect(applyActionMock.mock.calls.length).toBe(callsAfterPass);
    expect(result.current.claimTimer).toBe(0);
  });
});
