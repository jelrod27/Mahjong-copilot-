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
  buildWinScoringContext: vi.fn(() => null),
  // Delegate to the claiming mock so tests arm claims in one place
  getLegalClaims: (...args: unknown[]) => getAvailableClaimsMock(...args),
  // Win-availability gates — default to "no win offered" so timer tests that
  // don't exercise winning aren't forced to stub them.
  canDeclareSelfDrawnWin: vi.fn(() => false),
  scoreSelfDrawnHand: vi.fn(() => null),
  // Pure predicate mirrored from the real module so claim-window tests exercise
  // real eligibility rather than a blanket `true`.
  canActInClaimWindow: (
    state: { claimablePlayers: string[]; passedPlayers: string[]; pendingClaims: { playerId: string }[] },
    playerId: string,
  ) =>
    state.claimablePlayers.includes(playerId) &&
    !state.passedPlayers.includes(playerId) &&
    !state.pendingClaims.some(c => c.playerId === playerId),
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
  calculateShanten: vi.fn(() => 8),
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
const passesByHuman = () =>
  applyActionMock.mock.calls.filter(
    (c) => (c as ApplyCall)[1] === HUMAN_ID && (c as ApplyCall)[2].type === 'PASS',
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

  it('Plan 013: auto-pass retries when the first attempt is rejected', () => {
    // The human genuinely holds an unanswered claim, so the only thing that can
    // reject a PASS here is the debounce / a transient engine rejection —
    // exactly the scenario the original bug wedged on.
    const claimGame = makeGame({
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      lastDiscardedBy: 'ai1',
      lastDiscardedTile: makeTile('d1'),
      claimablePlayers: [HUMAN_ID],
    });
    initializeMatchMock.mockReturnValue(makeMatch(claimGame));
    getAvailableClaimsMock.mockReturnValue([
      { claimType: 'pung', tilesFromHand: [], priority: 2 },
    ]);

    let humanPassAttempts = 0;
    applyActionMock.mockImplementation(
      (state: GameState, playerId: string, action: { type: string }) => {
        if (playerId !== HUMAN_ID || action.type !== 'PASS') return state;
        humanPassAttempts += 1;
        // The first PASS is rejected (e.g. a race with another resolution).
        // Every attempt after succeeds and leaves the claim phase. Stay on
        // the human's own seat (turnPhase 'discard', currentPlayerIndex the
        // human) so this doesn't incidentally wake the AI-turn effect for
        // seats we aren't testing here.
        // Reject the first TWO attempts. The manual tap below consumes #1,
        // so the countdown's forced pass at the zero tick is #2 and is ALSO
        // rejected — meaning only a genuine RETRY on a later tick reaches #3
        // and succeeds. Rejecting just once would let the forced pass succeed
        // first try and the test would pass without any retry occurring.
        if (humanPassAttempts <= 2) return null;
        return { ...claimGame, turnPhase: 'discard' as const, currentPlayerIndex: 0 };
      },
    );

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current.claimTimer).toBeGreaterThan(0);

    // Drain the countdown to just short of expiry, then fire a human tap.
    // This sets the shared debounce timestamp to "now" — within DEBOUNCE_MS
    // of the interval's upcoming zero-tick — and the mock rejects it
    // (humanPassAttempts -> 1), leaving the claim window still armed.
    act(() => { vi.advanceTimersByTime(9_900); });
    act(() => { result.current.pass(); });

    // Advance past the zero tick. The retry (forcePass) bypasses the human
    // debounce, so the recent tap above must not be what blocks it — if the
    // countdown still called plain pass() here, this would wedge forever.
    act(() => { vi.advanceTimersByTime(500); });

    // >= 3 proves a real retry: #1 manual tap (rejected), #2 forced at the
    // zero tick (rejected), #3 forced on a LATER tick (accepted). A one-shot
    // countdown stops at #2 and wedges the hand forever.
    expect(humanPassAttempts).toBeGreaterThanOrEqual(3);
    expect(result.current.claimTimer).toBe(0);
    expect(result.current.game?.turnPhase).toBe('discard');
  });

  it('Plan 013: the forced auto-pass bypasses the human action debounce', () => {
    // A human tap immediately before the zero tick sets the shared debounce
    // timestamp. If the countdown used plain pass(), that 200ms window would
    // swallow the forced pass and the claim window would sit expired.
    const claimGame = makeGame({
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      lastDiscardedBy: 'ai1',
      lastDiscardedTile: makeTile('d1'),
      claimablePlayers: [HUMAN_ID],
    });
    initializeMatchMock.mockReturnValue(makeMatch(claimGame));
    getAvailableClaimsMock.mockReturnValue([
      { claimType: 'pung', tilesFromHand: [], priority: 2 },
    ]);

    let forcedPasses = 0;
    applyActionMock.mockImplementation(
      (state: GameState, playerId: string, action: { type: string }) => {
        if (playerId !== HUMAN_ID || action.type !== 'PASS') return state;
        forcedPasses += 1;
        // Reject only the manual tap, so the claim window stays armed and the
        // countdown still has work to do. After that the ONLY thing that can
        // block the forced pass is the debounce — which is what we're testing.
        if (forcedPasses === 1) return null;
        return { ...claimGame, turnPhase: 'discard' as const, currentPlayerIndex: 0 };
      },
    );

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    // Tap 50ms before expiry, then advance just past the zero tick — less
    // than DEBOUNCE_MS, so a non-bypassing pass would still be blocked.
    act(() => { vi.advanceTimersByTime(9_950); });
    act(() => { result.current.pass(); });
    // Advance only 150ms past the tap — still inside DEBOUNCE_MS (200ms), so a
    // non-bypassing pass would still be swallowed at both the 10_000 and
    // 10_100 ticks and the phase would remain 'claim'.
    act(() => { vi.advanceTimersByTime(150); });

    expect(forcedPasses).toBeGreaterThanOrEqual(2);
    expect(result.current.game?.turnPhase).toBe('discard');
  });

  it('Plan 013: does not spin when the human is not an eligible claimant', () => {
    // The engine's handlePass rejects whenever currentPlayerIndex is not this
    // player. If the countdown expires while the rotation is still at an AI
    // seat, retrying can NEVER succeed — and a 10Hz retry also refreshes the
    // human debounce window every tick, silently swallowing every tap the
    // player makes. Bounded retries are the fix; this pins it.
    const claimGame = makeGame({
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      claimablePlayers: ['ai2'], // the human holds no legal claim on this tile
      lastDiscardedBy: 'ai2',
      lastDiscardedTile: makeTile('d1'),
    });
    initializeMatchMock.mockReturnValue(makeMatch(claimGame));
    getAvailableClaimsMock.mockReturnValue([
      { claimType: 'pung', tilesFromHand: [], priority: 2 },
    ]);

    let humanPassAttempts = 0;
    applyActionMock.mockImplementation(
      (state: GameState, playerId: string, action: { type: string }) => {
        if (playerId !== HUMAN_ID || action.type !== 'PASS') return state;
        humanPassAttempts += 1;
        // Mirror the real engine: a PASS off our rotation turn is rejected.
        return null;
      },
    );

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });
    // Well past expiry, then a further 30s of ticks.
    act(() => { vi.advanceTimersByTime(10_500); });
    act(() => { vi.advanceTimersByTime(30_000); });

    // Unbounded retry produced ~300 attempts here before the rotation guard.
    expect(humanPassAttempts).toBeLessThan(5);
  });

  it('Plan 013: claim countdown stops once the claim phase ends (no infinite retry)', () => {
    const claimGame = makeGame({
      turnPhase: 'claim',
      currentPlayerIndex: 1,
      lastDiscardedBy: 'ai1',
      lastDiscardedTile: makeTile('d1'),
      claimablePlayers: [HUMAN_ID],
    });
    initializeMatchMock.mockReturnValue(makeMatch(claimGame));
    getAvailableClaimsMock.mockReturnValue([
      { claimType: 'pung', tilesFromHand: [], priority: 2 },
    ]);

    // Every human PASS attempt succeeds immediately and leaves the claim
    // phase, staying on the human's own seat so this doesn't incidentally
    // wake the AI-turn effect for seats we aren't testing here. If the
    // countdown's teardown condition were wrong (e.g. still gated on
    // claimTimer > 0 instead of turnPhase/claimOptions), the interval would
    // keep calling forcePass() every 100ms forever — a busy loop that this
    // test catches via a growing call count.
    applyActionMock.mockImplementation(
      (state: GameState, playerId: string, action: { type: string }) => {
        if (playerId !== HUMAN_ID || action.type !== 'PASS') return state;
        return { ...claimGame, turnPhase: 'discard' as const, currentPlayerIndex: 0 };
      },
    );

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current.claimTimer).toBeGreaterThan(0);

    // Run past expiry — the single forced pass should succeed and exit.
    act(() => { vi.advanceTimersByTime(10_100); });

    const passCallsAtExit = passesByHuman().length;
    expect(passCallsAtExit).toBe(1);
    expect(result.current.claimTimer).toBe(0);

    // Keep fake time running well past the original window. A broken
    // teardown would keep firing pass() every 100ms against a game that has
    // already left 'claim'; a correct one produces zero further attempts.
    act(() => { vi.advanceTimersByTime(20_000); });

    expect(passesByHuman().length).toBe(passCallsAtExit);
  });
});

describe('useGameController auto-discard respects player selection (Plan 012)', () => {
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

  it('auto-discard discards the selected tile', () => {
    // hand = [t1, t2]; lastDrawnTile defaults to t1 (hand[0]). Select t2 —
    // the tile that is NOT lastDrawnTile — so this only passes if the
    // selection, not the drawn-tile fallback, drives the auto-discard.
    const game = makeGame();
    initializeMatchMock.mockReturnValue(makeMatch(game));
    applyActionMock.mockReturnValue(game);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    act(() => { result.current.selectTile(game.players[0].hand[1]); }); // select t2
    act(() => { vi.advanceTimersByTime(20_000); });

    const discards = discardsByHuman();
    expect(discards).toHaveLength(1);
    expect((discards[0] as ApplyCall)[2]).toMatchObject({ type: 'DISCARD', tile: { id: 't2' } });
  });

  it('auto-discard falls back to the drawn tile when nothing is selected', () => {
    // Pins the pre-existing fallback: with no selection, lastDrawnTile is discarded.
    const game = makeGame(); // lastDrawnTile = hand[0] = t1
    initializeMatchMock.mockReturnValue(makeMatch(game));
    applyActionMock.mockReturnValue(game);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    // No selectTile() call.
    act(() => { vi.advanceTimersByTime(20_000); });

    const discards = discardsByHuman();
    expect(discards).toHaveLength(1);
    expect((discards[0] as ApplyCall)[2]).toMatchObject({
      type: 'DISCARD',
      tile: { id: game.lastDrawnTile!.id },
    });
  });

  it('changing the selection does not reset the turn timer', () => {
    // Regression guard for the ref-based read in the auto-discard effect: if
    // selectedTileId were in the effect's dependency array instead, re-selecting
    // a tile would tear down and restart the setTimeout, pushing the deadline
    // back by however long was already spent — silently defeating the 20s cap.
    const game = makeGame(); // hand = [t1, t2]
    initializeMatchMock.mockReturnValue(makeMatch(game));
    applyActionMock.mockReturnValue(game);

    const { result } = renderHook(() => useGameController('easy', 'quick'));
    act(() => { vi.advanceTimersByTime(0); });

    act(() => { result.current.selectTile(game.players[0].hand[0]); }); // select t1
    act(() => { vi.advanceTimersByTime(15_000); }); // 15s of the original 20s window elapse

    act(() => { result.current.selectTile(game.players[0].hand[1]); }); // change selection to t2

    // Advance 6s more (21s total). If the timer had been reset by the
    // re-selection above, a fresh 20s window starting at t=15s would not fire
    // until t=35s, and no discard would have happened yet.
    act(() => { vi.advanceTimersByTime(6_000); });

    expect(discardsByHuman()).toHaveLength(1);
  });
});
