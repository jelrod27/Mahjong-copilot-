import { GameState, GamePhase, PlayerAction, Player } from '@/models/GameState';
import { Tile } from '@/models/Tile';
import StorageService from '@/lib/storageService';
import { initializeGame, applyAction, GameAction } from '@/engine';

export interface GameReduxState {
  currentGame: GameState | null;
  isLoading: boolean;
  errorMessage: string | null;
  isPaused: boolean;
}

export const GAME_CREATE_START = 'GAME_CREATE_START' as const;
export const GAME_CREATE_SUCCESS = 'GAME_CREATE_SUCCESS' as const;
export const GAME_CREATE_FAILURE = 'GAME_CREATE_FAILURE' as const;
export const GAME_LOAD_START = 'GAME_LOAD_START' as const;
export const GAME_LOAD_SUCCESS = 'GAME_LOAD_SUCCESS' as const;
export const GAME_LOAD_FAILURE = 'GAME_LOAD_FAILURE' as const;
export const GAME_MAKE_MOVE = 'GAME_MAKE_MOVE' as const;
export const GAME_PAUSE = 'GAME_PAUSE' as const;
export const GAME_RESUME = 'GAME_RESUME' as const;
export const GAME_CLEAR = 'GAME_CLEAR' as const;
export const GAME_CLEAR_ERROR = 'GAME_CLEAR_ERROR' as const;

export type GameReduxAction =
  | { type: typeof GAME_CREATE_START }
  | { type: typeof GAME_CREATE_SUCCESS; payload: GameState }
  | { type: typeof GAME_CREATE_FAILURE; payload: string }
  | { type: typeof GAME_LOAD_START }
  | { type: typeof GAME_LOAD_SUCCESS; payload: GameState }
  | { type: typeof GAME_LOAD_FAILURE; payload: string }
  | { type: typeof GAME_MAKE_MOVE; payload: GameState }
  | { type: typeof GAME_PAUSE; payload: GameState }
  | { type: typeof GAME_RESUME; payload: GameState }
  | { type: typeof GAME_CLEAR }
  | { type: typeof GAME_CLEAR_ERROR };

export const createNewGame = (
  userId: string,
  variant: string,
  aiDifficulty: 'easy' | 'medium' | 'hard',
) => async (dispatch: any) => {
  dispatch({ type: GAME_CREATE_START });
  try {
    const gameState = initializeGame({
      variant,
      playerNames: ['You', 'AI Player 1', 'AI Player 2', 'AI Player 3'],
      aiPlayers: [
        { index: 1, difficulty: aiDifficulty },
        { index: 2, difficulty: aiDifficulty },
        { index: 3, difficulty: aiDifficulty },
      ],
      humanPlayerId: userId,
      turnTimeLimit: 20,
    });

    await StorageService.saveGame(gameState);
    dispatch({ type: GAME_CREATE_SUCCESS, payload: gameState });
  } catch (error: any) {
    dispatch({ type: GAME_CREATE_FAILURE, payload: error.message });
  }
};

export const loadGame = (gameId: string) => async (dispatch: any) => {
  dispatch({ type: GAME_LOAD_START });
  try {
    const gameState = await StorageService.getGame(gameId);
    if (gameState) {
      dispatch({ type: GAME_LOAD_SUCCESS, payload: gameState });
    } else {
      dispatch({ type: GAME_LOAD_FAILURE, payload: 'Game not found' });
    }
  } catch (error: any) {
    dispatch({ type: GAME_LOAD_FAILURE, payload: error.message });
  }
};

/**
 * Submit a player action through the engine.
 */
export const submitAction = (
  playerId: string,
  action: GameAction,
) => async (dispatch: any, getState: any) => {
  const state = getState();
  const game = state.game.currentGame;
  if (!game || game.phase !== GamePhase.PLAYING) return;

  try {
    const newState = applyAction(game, playerId, action);
    if (!newState) {
      console.warn('Invalid action:', action);
      return;
    }

    await StorageService.saveGame(newState);
    dispatch({ type: GAME_MAKE_MOVE, payload: newState });

    // If it's an AI's turn to draw, trigger AI after delay
    if (newState.phase === GamePhase.PLAYING) {
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      if (currentPlayer.isAI && newState.turnPhase === 'draw') {
        setTimeout(() => {
          dispatch(runAITurn());
        }, 800);
      }
    }
  } catch (error: any) {
    dispatch({ type: GAME_CLEAR_ERROR, payload: error.message });
  }
};

/**
 * Run a single AI turn: draw then discard.
 * Uses easy AI (random) for now — will be upgraded in Phase 3.
 */
export const runAITurn = () => async (dispatch: any, getState: any) => {
  const state = getState();
  const game: GameState = state.game.currentGame;
  if (!game || game.phase !== GamePhase.PLAYING) return;

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer.isAI) return;

  let currentState = game;

  // Step 1: Draw
  if (currentState.turnPhase === 'draw') {
    const afterDraw = applyAction(currentState, currentPlayer.id, { type: 'DRAW' });
    if (!afterDraw) return;
    currentState = afterDraw;
    dispatch({ type: GAME_MAKE_MOVE, payload: currentState });
  }

  if (currentState.phase === GamePhase.FINISHED) {
    await StorageService.saveGame(currentState);
    return;
  }

  // Step 2: Check for self-drawn win
  const updatedPlayer = currentState.players[currentState.currentPlayerIndex];
  // For now, AI won't declare win (Phase 3 will add this)

  // Step 3: Discard random tile (easy AI)
  if (currentState.turnPhase === 'discard') {
    await new Promise(resolve => setTimeout(resolve, 500));

    const hand = currentState.players[currentState.currentPlayerIndex].hand;
    const randomTile = hand[Math.floor(Math.random() * hand.length)];

    const afterDiscard = applyAction(currentState, currentPlayer.id, {
      type: 'DISCARD',
      tile: randomTile,
    });

    if (afterDiscard) {
      currentState = afterDiscard;
      await StorageService.saveGame(currentState);
      dispatch({ type: GAME_MAKE_MOVE, payload: currentState });

      // Chain to next AI if needed
      if (currentState.phase === GamePhase.PLAYING) {
        const nextPlayer = currentState.players[currentState.currentPlayerIndex];
        if (nextPlayer.isAI && currentState.turnPhase === 'draw') {
          setTimeout(() => {
            dispatch(runAITurn());
          }, 800);
        }
      }
    }
  }
};

export const pauseGame = () => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.game.currentGame) return;

  const updatedGame: GameState = {
    ...state.game.currentGame,
    phase: GamePhase.PAUSED,
  };

  await StorageService.saveGame(updatedGame);
  dispatch({ type: GAME_PAUSE, payload: updatedGame });
};

export const resumeGame = () => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.game.currentGame) return;

  const updatedGame: GameState = {
    ...state.game.currentGame,
    phase: GamePhase.PLAYING,
  };

  await StorageService.saveGame(updatedGame);
  dispatch({ type: GAME_RESUME, payload: updatedGame });
};

export const clearGame = () => ({ type: GAME_CLEAR });
export const clearGameError = () => ({ type: GAME_CLEAR_ERROR });