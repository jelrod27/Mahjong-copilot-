/**
 * The Daily Hand — one seeded hand per UTC day, identical for every player
 * (the seedable engine guarantees the same wall and deal). Streaks reward
 * showing up: playing extends the streak, missing a day resets the count
 * but never takes anything away.
 */

export interface DailyResult {
  outcome: 'win' | 'draw' | 'loss';
  fan: number;
  points: number;
  /** Net score change for the human across the hand. */
  scoreChange: number;
}

export interface DailyState {
  /** UTC date key for today (YYYY-MM-DD). */
  today: string;
  playedToday: boolean;
  todayResult: DailyResult | null;
  /** Consecutive days played, counting today if played. */
  streak: number;
  bestStreak: number;
}

interface DailyStore {
  results: Record<string, DailyResult>;
  bestStreak: number;
}

const DAILY_KEY = '16bit-mahjong-daily';

/** UTC date key — every player worldwide gets the same hand per key. */
export function dailyDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function dailySeed(date: Date = new Date()): string {
  return `daily-${dailyDateKey(date)}`;
}

function loadStore(): DailyStore {
  if (typeof window === 'undefined') return { results: {}, bestStreak: 0 };
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    if (!raw) return { results: {}, bestStreak: 0 };
    const parsed = JSON.parse(raw) as Partial<DailyStore>;
    return {
      results: parsed.results && typeof parsed.results === 'object' ? parsed.results as Record<string, DailyResult> : {},
      bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
    };
  } catch {
    return { results: {}, bestStreak: 0 };
  }
}

function saveStore(store: DailyStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DAILY_KEY, JSON.stringify(store));
  } catch {
    // best effort
  }
}

/** Consecutive played days ending at `today` (or yesterday if today unplayed). */
function computeStreak(results: Record<string, DailyResult>, today: string): number {
  const day = new Date(`${today}T00:00:00Z`);
  let streak = 0;
  // If today is unplayed, the streak counts back from yesterday (still alive).
  if (!results[dailyDateKey(day)]) {
    day.setUTCDate(day.getUTCDate() - 1);
  }
  while (results[dailyDateKey(day)]) {
    streak++;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return streak;
}

export function getDailyState(now: Date = new Date()): DailyState {
  const today = dailyDateKey(now);
  const store = loadStore();
  return {
    today,
    playedToday: !!store.results[today],
    todayResult: store.results[today] ?? null,
    streak: computeStreak(store.results, today),
    bestStreak: store.bestStreak,
  };
}

/** Record today's result (first play of the day wins; replays don't overwrite). */
export function recordDailyResult(result: DailyResult, now: Date = new Date()): DailyState {
  const today = dailyDateKey(now);
  const store = loadStore();
  if (!store.results[today]) {
    store.results[today] = result;
  }
  const streak = computeStreak(store.results, today);
  store.bestStreak = Math.max(store.bestStreak, streak);
  saveStore(store);
  return getDailyState(now);
}

/** Mentor greeting for the current streak (story bible: Gam is the voice). */
export function gamStreakLine(state: DailyState): string {
  if (state.playedToday && state.streak >= 7) return `${state.streak} days straight. The regulars are asking about you.`;
  if (state.playedToday && state.streak >= 3) return `${state.streak} days running. The kettle is on for you now.`;
  if (state.playedToday) return 'Done for today. Same table tomorrow.';
  if (state.streak >= 7) return `A ${state.streak}-day streak on the line. The tiles are waiting.`;
  if (state.streak >= 1) return `Day ${state.streak + 1} of your streak, if you sit down now.`;
  return 'One hand a day keeps the rust away. Same hand as everyone else.';
}

/**
 * Emoji-free share card. The faan bar uses plain characters so it pastes
 * cleanly anywhere.
 */
export function buildShareText(state: DailyState): string {
  const r = state.todayResult;
  const lines = [`16 BIT MAHJONG - Daily Hand ${state.today}`];
  if (!r) {
    lines.push('Not played yet.');
    return lines.join('\n');
  }
  const outcome = r.outcome === 'win'
    ? `WIN  +${r.fan} faan (${r.points} pts)`
    : r.outcome === 'draw'
      ? 'DRAW  wall ran dry'
      : 'LOSS  the table ate this one';
  lines.push(outcome);
  const filled = Math.max(0, Math.min(10, r.fan));
  lines.push(`FAAN [${'#'.repeat(filled)}${'.'.repeat(10 - filled)}] ${r.fan}/10`);
  lines.push(`Streak: ${state.streak} day${state.streak === 1 ? '' : 's'}`);
  lines.push('16bitmahjong.co');
  return lines.join('\n');
}
