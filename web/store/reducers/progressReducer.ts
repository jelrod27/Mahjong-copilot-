import { ProgressState } from '../actions/progressActions';
import { UserProgress } from '@/models/UserProgress';
import {
  PROGRESS_LOAD_START,
  PROGRESS_LOAD_SUCCESS,
  PROGRESS_LOAD_FAILURE,
  PROGRESS_UPDATE_LEVEL,
  PROGRESS_INCREMENT_GAMES,
  PROGRESS_INCREMENT_WINS,
  PROGRESS_ADD_TIME,
  PROGRESS_ADD_ACHIEVEMENT,
  PROGRESS_CLEAR_ERROR,
} from '../actions/progressActions';

const initialState: ProgressState = {
  progress: null,
  isLoading: false,
  errorMessage: null,
};

export const progressReducer = (
  state: ProgressState = initialState,
  action: any
): ProgressState => {
  switch (action.type) {
    case PROGRESS_LOAD_START:
      return { ...state, isLoading: true, errorMessage: null };

    case PROGRESS_LOAD_SUCCESS:
    case PROGRESS_UPDATE_LEVEL:
    case PROGRESS_INCREMENT_GAMES:
    case PROGRESS_INCREMENT_WINS:
    case PROGRESS_ADD_TIME:
    case PROGRESS_ADD_ACHIEVEMENT:
      return {
        ...state,
        progress: action.payload as UserProgress,
        isLoading: false,
        errorMessage: null,
      };

    case PROGRESS_LOAD_FAILURE:
      return { ...state, isLoading: false, errorMessage: action.payload };

    case PROGRESS_CLEAR_ERROR:
      return { ...state, errorMessage: null };

    default:
      return state;
  }
};
