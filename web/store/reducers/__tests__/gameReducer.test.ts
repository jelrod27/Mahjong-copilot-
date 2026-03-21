import { describe, it, expect } from 'vitest';
import { gameReducer } from '../gameReducer';
import { GamePhase } from '@/models/GameState';
import {
  GAME_CREATE_START, GAME_CREATE_SUCCESS, GAME_CREATE_FAILURE,
  GAME_LOAD_START, GAME_LOAD_SUCCESS, GAME_LOAD_FAILURE,
  GAME_MAKE_MOVE, GAME_PAUSE, GAME_RESUME, GAME_CLEAR, GAME_CLEAR_ERROR,
} from '../../actions/gameActions';

const initialState = {
  currentGame: null,
  isLoading: false,
  errorMessage: null,
  isPaused: false,
};

const mockGame = {
  id: 'test-game',
  phase: GamePhase.PLAYING,
} as any;

describe('gameReducer', () => {
  it('returns initial state', () => {
    expect(gameReducer(undefined, { type: 'UNKNOWN' })).toEqual(initialState);
  });

  it('handles GAME_CREATE_START', () => {
    const state = gameReducer(initialState, { type: GAME_CREATE_START });
    expect(state.isLoading).toBe(true);
    expect(state.errorMessage).toBeNull();
  });

  it('handles GAME_CREATE_SUCCESS', () => {
    const loading = { ...initialState, isLoading: true };
    const state = gameReducer(loading, { type: GAME_CREATE_SUCCESS, payload: mockGame });
    expect(state.currentGame).toBe(mockGame);
    expect(state.isLoading).toBe(false);
    expect(state.isPaused).toBe(false);
  });

  it('handles GAME_CREATE_FAILURE', () => {
    const loading = { ...initialState, isLoading: true };
    const state = gameReducer(loading, { type: GAME_CREATE_FAILURE, payload: 'Error!' });
    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBe('Error!');
  });

  it('handles GAME_LOAD_START/SUCCESS/FAILURE same as CREATE', () => {
    expect(gameReducer(initialState, { type: GAME_LOAD_START }).isLoading).toBe(true);
    expect(gameReducer(initialState, { type: GAME_LOAD_SUCCESS, payload: mockGame }).currentGame).toBe(mockGame);
    expect(gameReducer(initialState, { type: GAME_LOAD_FAILURE, payload: 'err' }).errorMessage).toBe('err');
  });

  it('handles GAME_MAKE_MOVE', () => {
    const state = gameReducer(initialState, { type: GAME_MAKE_MOVE, payload: mockGame });
    expect(state.currentGame).toBe(mockGame);
  });

  it('handles GAME_PAUSE', () => {
    const pausedGame = { ...mockGame, phase: GamePhase.PAUSED };
    const state = gameReducer(initialState, { type: GAME_PAUSE, payload: pausedGame });
    expect(state.isPaused).toBe(true);
    expect(state.currentGame).toBe(pausedGame);
  });

  it('handles GAME_RESUME', () => {
    const paused = { ...initialState, isPaused: true };
    const state = gameReducer(paused, { type: GAME_RESUME, payload: mockGame });
    expect(state.isPaused).toBe(false);
  });

  it('handles GAME_CLEAR', () => {
    const withGame = { ...initialState, currentGame: mockGame };
    const state = gameReducer(withGame, { type: GAME_CLEAR });
    expect(state).toEqual(initialState);
  });

  it('handles GAME_CLEAR_ERROR', () => {
    const withError = { ...initialState, errorMessage: 'some error' };
    const state = gameReducer(withError, { type: GAME_CLEAR_ERROR });
    expect(state.errorMessage).toBeNull();
  });
});
