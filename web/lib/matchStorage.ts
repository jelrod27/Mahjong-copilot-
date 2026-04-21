/**
 * Persistent storage for in-progress matches.
 * Uses localStorage so the player can close the browser and resume later.
 */
import { MatchState, matchStateToJson, matchStateFromJson } from '@/models/MatchState';
import { GameState, gameStateToJson, gameStateFromJson } from '@/models/GameState';

const MATCH_KEY = 'mahjong_match_in_progress';

export interface SavedGame {
  match: MatchState | null;
  game: GameState | null;
  savedAt: string;
  version: number;
}

const SAVE_VERSION = 1;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function hasSavedGame(): boolean {
  if (!isBrowser()) return false;
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    return !!raw;
  } catch {
    return false;
  }
}

export function saveGame(match: MatchState | null, game: GameState | null): void {
  if (!isBrowser()) return;
  try {
    const payload: SavedGame = {
      match,
      game,
      savedAt: new Date().toISOString(),
      version: SAVE_VERSION,
    };
    localStorage.setItem(MATCH_KEY, JSON.stringify(payload));
  } catch {
    // Storage quota exceeded or private mode — silently ignore.
  }
}

export function loadGame(): SavedGame | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;

    if (parsed.version !== SAVE_VERSION) {
      clearSavedGame();
      return null;
    }

    // Deserialize dates and tile objects
    const match = parsed.match ? matchStateFromJson(parsed.match as Record<string, any>) : null;
    const game = parsed.game
      ? gameStateFromJson(parsed.game as Record<string, any>)
      : match?.currentHand ?? null;

    return { match, game, savedAt: parsed.savedAt, version: parsed.version };
  } catch {
    clearSavedGame();
    return null;
  }
}

export function clearSavedGame(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(MATCH_KEY);
  } catch {
    // ignore
  }
}

/**
 * Lightweight check — returns true only if a non-finished, non-between-hands game is stored.
 */
export function canResume(): boolean {
  const saved = loadGame();
  if (!saved || !saved.match) return false;
  if (saved.match.phase === 'finished') return false;
  return true;
}
