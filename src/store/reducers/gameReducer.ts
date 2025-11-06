import {GameReduxState} from '../actions/gameActions';
import {GameState, GamePhase} from '../../models/GameState';
import {
  GAME_CREATE_START,
  GAME_CREATE_SUCCESS,
  GAME_CREATE_FAILURE,
  GAME_LOAD_START,
  GAME_LOAD_SUCCESS,
  GAME_LOAD_FAILURE,
  GAME_MAKE_MOVE,
  GAME_PAUSE,
  GAME_RESUME,
  GAME_CLEAR,
  GAME_CLEAR_ERROR,
} from '../actions/gameActions';

const initialState: GameReduxState = {
  currentGame: null,
  isLoading: false,
  errorMessage: null,
  isPaused: false,
};

export const gameReducer = (
  state: GameReduxState = initialState,
  action: any
): GameReduxState => {
  switch (action.type) {
    case GAME_CREATE_START:
    case GAME_LOAD_START:
      return {
        ...state,
        isLoading: true,
        errorMessage: null,
      };

    case GAME_CREATE_SUCCESS:
    case GAME_LOAD_SUCCESS:
    case GAME_MAKE_MOVE:
      return {
        ...state,
        currentGame: action.payload as GameState,
        isLoading: false,
        errorMessage: null,
        isPaused: action.payload.phase === GamePhase.PAUSED,
      };

    case GAME_CREATE_FAILURE:
    case GAME_LOAD_FAILURE:
      return {
        ...state,
        isLoading: false,
        errorMessage: action.payload,
      };

    case GAME_PAUSE:
      return {
        ...state,
        currentGame: action.payload as GameState,
        isPaused: true,
      };

    case GAME_RESUME:
      return {
        ...state,
        currentGame: action.payload as GameState,
        isPaused: false,
      };

    case GAME_CLEAR:
      return {
        ...initialState,
      };

    case GAME_CLEAR_ERROR:
      return {
        ...state,
        errorMessage: null,
      };

    default:
      return state;
  }
};

