import { describe, it, expect, beforeEach, vi } from 'vitest';
import { progressReducer } from '../progressReducer';
import {
  PROGRESS_QUIZ_COMPLETED,
  quizCompleted,
} from '../../actions/progressActions';
import { UserProgress, LearningLevel, LevelProgress } from '@/models/UserProgress';

function makeProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    userId: 'local_user',
    variant: 'Hong Kong Mahjong',
    levelProgress: {} as Record<LearningLevel, LevelProgress>,
    totalTimeSpent: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    quizzesCompleted: 0,
    achievements: [],
    lastUpdated: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Reducer behavior ────────────────────────────────────────────────────

describe('progressReducer — PROGRESS_QUIZ_COMPLETED', () => {
  it('replaces progress when a fresh UserProgress object is included', () => {
    const initial = {
      progress: makeProgress({ quizzesCompleted: 2 }),
      isLoading: false,
      errorMessage: null,
    };
    const updated = makeProgress({ quizzesCompleted: 3 });

    const next = progressReducer(initial, {
      type: PROGRESS_QUIZ_COMPLETED,
      payload: { progress: updated, quiz: { mode: 'tile-quiz', score: 8, best: 9 } },
    });

    expect(next.progress?.quizzesCompleted).toBe(3);
    expect(next.isLoading).toBe(false);
    expect(next.errorMessage).toBeNull();
  });

  it('leaves state untouched when no UserProgress is included (not initialized yet)', () => {
    const initial = {
      progress: null,
      isLoading: false,
      errorMessage: null,
    };

    const next = progressReducer(initial, {
      type: PROGRESS_QUIZ_COMPLETED,
      payload: { progress: null, quiz: { mode: 'scoring-quiz', score: 5, best: 5 } },
    });

    expect(next).toBe(initial);
  });

  it('is a no-op on unknown action types', () => {
    const initial = {
      progress: makeProgress(),
      isLoading: false,
      errorMessage: null,
    };
    expect(progressReducer(initial, { type: 'NOPE' })).toBe(initial);
  });
});

// ─── Thunk behavior ──────────────────────────────────────────────────────
// The thunk persists to localStorage via gameStats and dispatches the action.
// Validates the full wiring from quiz UI → Redux → localStorage.

describe('quizCompleted thunk', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('dispatches PROGRESS_QUIZ_COMPLETED and persists the score to localStorage', async () => {
    const dispatch = vi.fn();
    const initialProgress = makeProgress({ quizzesCompleted: 0 });
    const getState = () => ({ progress: { progress: initialProgress } });

    await quizCompleted({ mode: 'tile-quiz', score: 7 })(dispatch, getState);

    // Action dispatched
    expect(dispatch).toHaveBeenCalledTimes(1);
    const call = dispatch.mock.calls[0][0];
    expect(call.type).toBe(PROGRESS_QUIZ_COMPLETED);
    expect(call.payload.quiz).toEqual({ mode: 'tile-quiz', score: 7, best: 7 });
    expect(call.payload.progress.quizzesCompleted).toBe(1);

    // Persisted to gameStats localStorage
    const raw = localStorage.getItem('16bit-mahjong-stats');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.quizzes['tile-quiz'].best).toBe(7);
    expect(parsed.quizzes['tile-quiz'].played).toBe(1);
    expect(parsed.quizzes['tile-quiz'].lastScore).toBe(7);
  });

  it('keeps the running best when a later score is lower', async () => {
    const dispatch = vi.fn();
    const getState = () => ({ progress: { progress: makeProgress() } });

    await quizCompleted({ mode: 'scoring-quiz', score: 9 })(dispatch, getState);
    await quizCompleted({ mode: 'scoring-quiz', score: 4 })(dispatch, getState);

    const last = dispatch.mock.calls.at(-1)![0];
    expect(last.payload.quiz.best).toBe(9);
    expect(last.payload.quiz.score).toBe(4);

    const parsed = JSON.parse(localStorage.getItem('16bit-mahjong-stats')!);
    expect(parsed.quizzes['scoring-quiz'].best).toBe(9);
    expect(parsed.quizzes['scoring-quiz'].lastScore).toBe(4);
    expect(parsed.quizzes['scoring-quiz'].played).toBe(2);
  });

  it('still persists to localStorage when UserProgress has not been initialized', async () => {
    const dispatch = vi.fn();
    const getState = () => ({ progress: { progress: null } });

    await quizCompleted({ mode: 'hand-recognition', score: 6 })(dispatch, getState);

    const call = dispatch.mock.calls[0][0];
    expect(call.type).toBe(PROGRESS_QUIZ_COMPLETED);
    expect(call.payload.progress).toBeNull();
    expect(call.payload.quiz.best).toBe(6);

    const parsed = JSON.parse(localStorage.getItem('16bit-mahjong-stats')!);
    expect(parsed.quizzes['hand-recognition'].best).toBe(6);
  });
});
