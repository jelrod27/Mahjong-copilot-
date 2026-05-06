import { UserProgress, LearningLevel, LevelProgress } from '@/models/UserProgress';
import { userProgressToJson } from '@/models/UserProgress';
import StorageService from '@/lib/storageService';
import { recordQuizCompletion, QuizMode } from '@/lib/gameStats';

export interface ProgressState {
  progress: UserProgress | null;
  isLoading: boolean;
  errorMessage: string | null;
}

export const PROGRESS_INITIALIZE = 'PROGRESS_INITIALIZE' as const;
export const PROGRESS_LOAD_START = 'PROGRESS_LOAD_START' as const;
export const PROGRESS_LOAD_SUCCESS = 'PROGRESS_LOAD_SUCCESS' as const;
export const PROGRESS_LOAD_FAILURE = 'PROGRESS_LOAD_FAILURE' as const;
export const PROGRESS_UPDATE_LEVEL = 'PROGRESS_UPDATE_LEVEL' as const;
export const PROGRESS_INCREMENT_GAMES = 'PROGRESS_INCREMENT_GAMES' as const;
export const PROGRESS_INCREMENT_WINS = 'PROGRESS_INCREMENT_WINS' as const;
export const PROGRESS_ADD_TIME = 'PROGRESS_ADD_TIME' as const;
export const PROGRESS_ADD_ACHIEVEMENT = 'PROGRESS_ADD_ACHIEVEMENT' as const;
export const PROGRESS_QUIZ_COMPLETED = 'PROGRESS_QUIZ_COMPLETED' as const;
export const PROGRESS_CLEAR_ERROR = 'PROGRESS_CLEAR_ERROR' as const;

export interface QuizCompletedPayload {
  mode: QuizMode;
  score: number;
  best: number;
}

export type ProgressAction =
  | { type: typeof PROGRESS_INITIALIZE }
  | { type: typeof PROGRESS_LOAD_START }
  | { type: typeof PROGRESS_LOAD_SUCCESS; payload: UserProgress }
  | { type: typeof PROGRESS_LOAD_FAILURE; payload: string }
  | { type: typeof PROGRESS_UPDATE_LEVEL; payload: UserProgress }
  | { type: typeof PROGRESS_INCREMENT_GAMES; payload: UserProgress }
  | { type: typeof PROGRESS_INCREMENT_WINS; payload: UserProgress }
  | { type: typeof PROGRESS_ADD_TIME; payload: UserProgress }
  | { type: typeof PROGRESS_ADD_ACHIEVEMENT; payload: UserProgress }
  | { type: typeof PROGRESS_QUIZ_COMPLETED; payload: { progress: UserProgress | null; quiz: QuizCompletedPayload } }
  | { type: typeof PROGRESS_CLEAR_ERROR };

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

/**
 * Record that the user finished a practice quiz. Persists the running best/last score
 * to localStorage via `recordQuizCompletion` and bumps `quizzesCompleted` on the Redux
 * UserProgress object. Works whether or not UserProgress has been initialized —
 * the quiz stat still lands in localStorage, and `getState().progress.progress`
 * is only updated when present.
 */
export const quizCompleted = (payload: { mode: QuizMode; score: number }) =>
  async (dispatch: any, getState: any) => {
    const updatedStats = recordQuizCompletion({ mode: payload.mode, score: payload.score });
    const best = updatedStats.quizzes?.[payload.mode]?.best ?? payload.score;

    const state = getState();
    const current: UserProgress | null = state.progress?.progress ?? null;

    if (current) {
      const updatedProgress: UserProgress = {
        ...current,
        quizzesCompleted: current.quizzesCompleted + 1,
        lastUpdated: new Date(),
      };
      await StorageService.saveProgress(updatedProgress);
      dispatch({
        type: PROGRESS_QUIZ_COMPLETED,
        payload: { progress: updatedProgress, quiz: { mode: payload.mode, score: payload.score, best } },
      });
      return;
    }

    // No UserProgress yet — still surface the quiz event so any listener can react.
    dispatch({
      type: PROGRESS_QUIZ_COMPLETED,
      payload: { progress: null, quiz: { mode: payload.mode, score: payload.score, best } },
    });
  };

export const clearProgressError = () => ({
  type: PROGRESS_CLEAR_ERROR,
});