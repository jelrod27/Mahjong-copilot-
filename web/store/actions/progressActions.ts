import { UserProgress, LearningLevel, LevelProgress } from '@/models/UserProgress';
import { userProgressToJson } from '@/models/UserProgress';
import StorageService from '@/lib/storageService';

export interface ProgressState {
  progress: UserProgress | null;
  isLoading: boolean;
  errorMessage: string | null;
}

export const PROGRESS_INITIALIZE = 'PROGRESS_INITIALIZE';
export const PROGRESS_LOAD_START = 'PROGRESS_LOAD_START';
export const PROGRESS_LOAD_SUCCESS = 'PROGRESS_LOAD_SUCCESS';
export const PROGRESS_LOAD_FAILURE = 'PROGRESS_LOAD_FAILURE';
export const PROGRESS_UPDATE_LEVEL = 'PROGRESS_UPDATE_LEVEL';
export const PROGRESS_INCREMENT_GAMES = 'PROGRESS_INCREMENT_GAMES';
export const PROGRESS_INCREMENT_WINS = 'PROGRESS_INCREMENT_WINS';
export const PROGRESS_ADD_TIME = 'PROGRESS_ADD_TIME';
export const PROGRESS_ADD_ACHIEVEMENT = 'PROGRESS_ADD_ACHIEVEMENT';
export const PROGRESS_CLEAR_ERROR = 'PROGRESS_CLEAR_ERROR';

const DEFAULT_USER_ID = 'local_user';

export const initializeProgress = (userId: string = DEFAULT_USER_ID, variant: string = 'Hong Kong Mahjong') => async (dispatch: any) => {
  dispatch({ type: PROGRESS_LOAD_START });
  try {
    let progress = await StorageService.getProgress(userId);

    if (!progress) {
      progress = {
        userId,
        variant,
        levelProgress: {} as Record<LearningLevel, LevelProgress>,
        totalTimeSpent: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        quizzesCompleted: 0,
        achievements: [],
        lastUpdated: new Date(),
        createdAt: new Date(),
      };
      await StorageService.saveProgress(progress);
    }

    dispatch({ type: PROGRESS_LOAD_SUCCESS, payload: progress });
  } catch (error: any) {
    dispatch({ type: PROGRESS_LOAD_FAILURE, payload: error.message });
  }
};

export const updateLevelProgress = (level: LearningLevel, levelProgress: LevelProgress) => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.progress.progress) return;

  try {
    const updatedProgress: UserProgress = {
      ...state.progress.progress,
      levelProgress: {
        ...state.progress.progress.levelProgress,
        [level]: levelProgress,
      },
      lastUpdated: new Date(),
    };

    await StorageService.saveProgress(updatedProgress);
    dispatch({ type: PROGRESS_UPDATE_LEVEL, payload: updatedProgress });
  } catch (error: any) {
    dispatch({ type: PROGRESS_LOAD_FAILURE, payload: error.message });
  }
};

export const incrementGamesPlayed = () => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.progress.progress) return;

  const updatedProgress: UserProgress = {
    ...state.progress.progress,
    gamesPlayed: state.progress.progress.gamesPlayed + 1,
    lastUpdated: new Date(),
  };

  await StorageService.saveProgress(updatedProgress);
  dispatch({ type: PROGRESS_INCREMENT_GAMES, payload: updatedProgress });
};

export const incrementGamesWon = () => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.progress.progress) return;

  const updatedProgress: UserProgress = {
    ...state.progress.progress,
    gamesWon: state.progress.progress.gamesWon + 1,
    lastUpdated: new Date(),
  };

  await StorageService.saveProgress(updatedProgress);
  dispatch({ type: PROGRESS_INCREMENT_WINS, payload: updatedProgress });
};

export const addTimeSpent = (seconds: number) => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.progress.progress) return;

  const updatedProgress: UserProgress = {
    ...state.progress.progress,
    totalTimeSpent: state.progress.progress.totalTimeSpent + seconds,
    lastUpdated: new Date(),
  };

  await StorageService.saveProgress(updatedProgress);
  dispatch({ type: PROGRESS_ADD_TIME, payload: updatedProgress });
};

export const addAchievement = (achievementId: string) => async (dispatch: any, getState: any) => {
  const state = getState();
  if (!state.progress.progress) return;
  if (state.progress.progress.achievements.includes(achievementId)) return;

  const updatedProgress: UserProgress = {
    ...state.progress.progress,
    achievements: [...state.progress.progress.achievements, achievementId],
    lastUpdated: new Date(),
  };

  await StorageService.saveProgress(updatedProgress);
  dispatch({ type: PROGRESS_ADD_ACHIEVEMENT, payload: updatedProgress });
};

export const clearProgressError = () => ({
  type: PROGRESS_CLEAR_ERROR,
});
