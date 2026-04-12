import type { SettingsState } from '@/store/actions/settingsActions';

const REDUX_SETTINGS_KEY = '16bit-mahjong-redux-settings';
const GAME_SETTINGS_KEY = '16bit-mahjong-settings';

// ── Redux settings persistence ──────────────────────────────────────────

export function loadSettings(): Partial<SettingsState> | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(REDUX_SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<SettingsState>;
  } catch {
    return null;
  }
}

export function saveSettings(settings: SettingsState): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REDUX_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // silently fail
  }
}

// ── Game-specific localStorage settings ─────────────────────────────────

export interface GamePreferences {
  turnTimer: number; // seconds (10, 20, 30, 0 = no limit)
  autoPass: boolean;
}

const defaultGamePrefs: GamePreferences = {
  turnTimer: 20,
  autoPass: false,
};

export function loadGamePreferences(): GamePreferences {
  try {
    if (typeof window === 'undefined') return defaultGamePrefs;
    const raw = localStorage.getItem(GAME_SETTINGS_KEY);
    if (!raw) return defaultGamePrefs;
    return { ...defaultGamePrefs, ...JSON.parse(raw) };
  } catch {
    return defaultGamePrefs;
  }
}

export function saveGamePreferences(prefs: GamePreferences): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(prefs));
  } catch {
    // silently fail
  }
}

export function clearGameStats(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('16bit-mahjong-stats');
  } catch {
    // silently fail
  }
}
