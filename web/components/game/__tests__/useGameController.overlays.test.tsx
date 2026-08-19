/**
 * Characterisation tests for the display-overlay outputs of useGameController:
 * tutor advice, the suggested discard, tile classifications and the shanten
 * heatmap.
 *
 * These pin the mapping from (game, displayMode, showTutor, claimOptions) to
 * the four overlay fields, so the derivation can be moved out of an effect
 * without changing what the board renders.
 *
 * Mock strategy mirrors useGameController.flow.test.tsx.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { GamePhase } from '@/models/GameState';
import { TileSuit, TileType, WindTile, type Tile } from '@/models/Tile';
import type { GameState } from '@/models/GameState';
import type { MatchState } from '@/models/MatchState';

vi.mock('@/lib/soundManager', () => ({
  default: { play: vi.fn(), setEnabled: vi.fn(), isEnabled: () => false },
}));

vi.mock('@/engine/turnManager', () => ({
  initializeGame: vi.fn(),
  applyAction: vi.fn(),
  buildWinScoringContext: vi.fn(() => null),
  getLegalClaims: vi.fn(() => []),
  canDeclareSelfDrawnWin: vi.fn(() => false),
  scoreSelfDrawnHand: vi.fn(() => null),
}));

const initializeMatchMock = vi.fn();
vi.mock('@/engine/matchManager', () => ({
  initializeMatch: (...a: unknown[]) => initializeMatchMock(...a),
  advanceMatch: vi.fn((m: MatchState) => m),
  startNextHand: vi.fn((m: MatchState) => m),
}));

vi.mock('@/engine/claiming', () => ({
  getAvailableClaims: vi.fn(() => []),
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

const getTutorAdviceMock = vi.fn();
vi.mock('@/engine/tutor', () => ({
  getTutorAdvice: (...a: unknown[]) => getTutorAdviceMock(...a),
}));

const computeHeatOverlaysMock = vi.fn();
vi.mock('@/engine/shantenHeat', () => ({
  computeHeatOverlays: (...a: unknown[]) => computeHeatOverlaysMock(...a),
}));

vi.mock('@/models/Tile', async () => {
  const actual = await vi.importActual<typeof import('@/models/Tile')>('@/models/Tile');
  return { ...actual, TileFactory: { ...actual.TileFactory, getAllTiles: () => [] } };
});

vi.mock('@/lib/dailyHand', () => ({ dailySeed: vi.fn(() => 'daily-2026-08-19') }));

import useGameController from '../useGameController';

const HUMAN_ID = 'human-player';

function makeTile(id: string, num = 1): Tile {
  return {
    id, suit: TileSuit.DOT, type: TileType.SUIT, number: num,
    nameEnglish: `${num} Dot`, nameChinese: '', nameJapanese: '', assetPath: '',
  };
}

function makeGame(overrides: Partial<GameState> = {}): GameState {
  const hand = [makeTile('t1', 1), makeTile('t2', 2)];
  const base = {
    id: 'g1', variant: 'hk', phase: GamePhase.PLAYING, turnPhase: 'discard' as const,
    players: [
      { id: HUMAN_ID, name: 'You', isAI: false, hand, melds: [], score: 0, seatWind: WindTile.EAST, isDealer: true, flowers: [] },
      { id: 'ai1', name: 'AI 1', isAI: true, hand: [], melds: [], score: 0, seatWind: WindTile.SOUTH, isDealer: false, flowers: [] },
      { id: 'ai2', name: 'AI 2', isAI: true, hand: [], melds: [], score: 0, seatWind: WindTile.WEST, isDealer: false, flowers: [] },
      { id: 'ai3', name: 'AI 3', isAI: true, hand: [], melds: [], score: 0, seatWind: WindTile.NORTH, isDealer: false, flowers: [] },
    ],
    currentPlayerIndex: 0, wall: [], deadWall: [], discardPile: [], playerDiscards: {},
    pendingClaims: [], claimablePlayers: [], passedPlayers: [], prevailingWind: WindTile.EAST,
    lastDrawnTile: hand[0], turnTimeLimit: 20, finalScores: {}, createdAt: new Date(), turnHistory: [],
  } as unknown as GameState;
  return { ...base, ...overrides };
}

function makeMatch(game: GameState): MatchState {
  return {
    mode: 'quick', difficulty: 'easy', currentRound: WindTile.EAST, handNumber: 1,
    totalHandsPlayed: 0, initialDealerIndex: 0, currentDealerIndex: 0,
    initialDealerHasRotated: false, playerScores: [500, 500, 500, 500], startingScore: 500,
    handResults: [], currentHand: game, phase: 'playing',
    playerNames: ['You', 'AI 1', 'AI 2', 'AI 3'], humanPlayerId: HUMAN_ID,
  };
}

/** Renders the hook with the overlay-relevant arguments only. */
function render(opts: { showTutor?: boolean; displayMode?: 'tutor' | 'shantenHeat' | 'off'; game?: GameState } = {}) {
  const game = opts.game ?? makeGame();
  initializeMatchMock.mockReturnValue(makeMatch(game));
  const hook = renderHook(() =>
    useGameController(
      'easy', 'quick', opts.showTutor ?? true, false, undefined, 'off',
      'standard', 'auto', 'default', undefined, undefined, false,
      opts.displayMode ?? 'tutor', 'normal',
    ),
  );
  act(() => { vi.advanceTimersByTime(0); });
  return hook;
}

describe('display overlays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    initializeMatchMock.mockReset();
    getTutorAdviceMock.mockReset();
    getTutorAdviceMock.mockReturnValue(null);
    computeHeatOverlaysMock.mockReset();
    computeHeatOverlaysMock.mockReturnValue(new Map());
  });
  afterEach(() => { vi.useRealTimers(); });

  it('surfaces tutor advice on the human discard turn', () => {
    getTutorAdviceMock.mockReturnValue({
      suggestedTileId: 't2',
      tileClassifications: [
        { tileId: 't1', color: 'green' },
        { tileId: 't2', color: 'red' },
      ],
    });

    const { result } = render({ displayMode: 'tutor', showTutor: true });

    expect(result.current.tutorAdvice).not.toBeNull();
    expect(result.current.suggestedTileId).toBe('t2');
  });

  it('keeps only non-neutral tiles in the classification map', () => {
    getTutorAdviceMock.mockReturnValue({
      suggestedTileId: 't1',
      tileClassifications: [
        { tileId: 't1', color: 'green' },
        { tileId: 't2', color: 'neutral' },
      ],
    });

    const { result } = render({ displayMode: 'tutor', showTutor: true });

    expect(result.current.tileClassifications.get('t1')).toBe('green');
    expect(result.current.tileClassifications.has('t2')).toBe(false);
  });

  it('produces no tutor advice when the tutor is switched off', () => {
    getTutorAdviceMock.mockReturnValue({ suggestedTileId: 't2', tileClassifications: [] });

    const { result } = render({ displayMode: 'tutor', showTutor: false });

    expect(result.current.tutorAdvice).toBeNull();
    expect(result.current.suggestedTileId).toBeUndefined();
    expect(result.current.tileClassifications.size).toBe(0);
  });

  it('builds the heatmap instead of tutor advice in shantenHeat mode', () => {
    computeHeatOverlaysMock.mockReturnValue(new Map([['t1', { shanten: 1 }]]));
    getTutorAdviceMock.mockReturnValue({ suggestedTileId: 't2', tileClassifications: [] });

    const { result } = render({ displayMode: 'shantenHeat' });

    expect(result.current.heatOverlays.size).toBe(1);
    expect(result.current.tutorAdvice).toBeNull();
  });

  it('leaves every overlay empty in off mode', () => {
    getTutorAdviceMock.mockReturnValue({ suggestedTileId: 't2', tileClassifications: [] });

    const { result } = render({ displayMode: 'off' });

    expect(result.current.tutorAdvice).toBeNull();
    expect(result.current.suggestedTileId).toBeUndefined();
    expect(result.current.tileClassifications.size).toBe(0);
    expect(result.current.heatOverlays.size).toBe(0);
  });

  it('clears the overlays when the turn is not the human discard', () => {
    getTutorAdviceMock.mockReturnValue({ suggestedTileId: 't2', tileClassifications: [] });

    const { result } = render({
      displayMode: 'tutor',
      game: makeGame({ currentPlayerIndex: 1 }),
    });

    expect(result.current.tutorAdvice).toBeNull();
    expect(result.current.tileClassifications.size).toBe(0);
  });
});
