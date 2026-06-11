import { describe, it, expect, beforeEach } from 'vitest';
import {
  dailyDateKey, dailySeed, getDailyState, recordDailyResult, buildShareText,
} from '../dailyHand';

const KEY = '16bit-mahjong-daily';
const T0 = new Date('2026-06-10T15:00:00Z');

beforeEach(() => {
  window.localStorage.removeItem(KEY);
});

describe('daily seed', () => {
  it('derives a UTC date key so every player gets the same hand', () => {
    expect(dailyDateKey(T0)).toBe('2026-06-10');
    expect(dailySeed(T0)).toBe('daily-2026-06-10');
    // Late evening in any local zone still maps to the same UTC key
    expect(dailyDateKey(new Date('2026-06-10T23:59:59Z'))).toBe('2026-06-10');
  });
});

describe('streaks reward showing up', () => {
  it('extends the streak on consecutive days regardless of outcome', () => {
    recordDailyResult({ outcome: 'loss', fan: 0, points: 0, scoreChange: -64 }, new Date('2026-06-08T12:00:00Z'));
    recordDailyResult({ outcome: 'draw', fan: 0, points: 0, scoreChange: 0 }, new Date('2026-06-09T12:00:00Z'));
    const state = recordDailyResult({ outcome: 'win', fan: 4, points: 128, scoreChange: 256 }, T0);
    expect(state.streak).toBe(3);
    expect(state.bestStreak).toBe(3);
  });

  it('missing a day resets the count but keeps the best', () => {
    recordDailyResult({ outcome: 'win', fan: 3, points: 64, scoreChange: 128 }, new Date('2026-06-05T12:00:00Z'));
    recordDailyResult({ outcome: 'win', fan: 3, points: 64, scoreChange: 128 }, new Date('2026-06-06T12:00:00Z'));
    // skip the 7th
    const state = recordDailyResult({ outcome: 'win', fan: 3, points: 64, scoreChange: 128 }, new Date('2026-06-08T12:00:00Z'));
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(2);
  });

  it('an unplayed today keeps yesterday-anchored streak alive', () => {
    recordDailyResult({ outcome: 'win', fan: 3, points: 64, scoreChange: 128 }, new Date('2026-06-09T12:00:00Z'));
    const state = getDailyState(T0);
    expect(state.playedToday).toBe(false);
    expect(state.streak).toBe(1);
  });

  it('first play of the day wins; replays do not overwrite', () => {
    recordDailyResult({ outcome: 'win', fan: 6, points: 512, scoreChange: 1024 }, T0);
    const state = recordDailyResult({ outcome: 'loss', fan: 0, points: 0, scoreChange: -64 }, T0);
    expect(state.todayResult?.outcome).toBe('win');
    expect(state.todayResult?.fan).toBe(6);
  });
});

describe('share card', () => {
  it('is emoji-free and carries the result, faan bar, and streak', () => {
    recordDailyResult({ outcome: 'win', fan: 6, points: 512, scoreChange: 1024 }, T0);
    const text = buildShareText(getDailyState(T0));
    expect(text).toContain('Daily Hand 2026-06-10');
    expect(text).toContain('WIN  +6 faan (512 pts)');
    expect(text).toContain('FAAN [######....] 6/10');
    expect(text).toContain('Streak: 1 day');
    // No emoji or non-ASCII art: every char is printable ASCII
    expect([...text].every(c => c === '\n' || (c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127))).toBe(true);
  });
});
