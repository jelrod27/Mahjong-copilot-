/**
 * Persistent storage for in-progress matches.
 * Uses localStorage so the player can close the browser and resume later.
 */
import { MatchState, matchStateToJson, matchStateFromJson } from '@/models/MatchState';
import { GameState, gameStateToJson, gameStateFromJson } from '@/models/GameState';
import {
  validateSavedGamePayload,
  readPresentationLog,
  isObject,
  SAVE_VERSION,
  PresentationLog,
} from './savedGameValidator';

const MATCH_KEY = 'mahjong_match_in_progress';

export interface SavedGame {
  match: MatchState | null;
  game: GameState | null;
  savedAt: string;
  version: number;
  /** Present only when the stored payload carried a well-formed log. Never written by saveGame yet. */
  presentationLog?: PresentationLog;
}

/**
 * Bring a stored payload up to SAVE_VERSION so a player mid-match keeps their game
 * across a format change. Null when the version is unknown — a newer build wrote it,
 * or it is not a save at all — and the caller discards it.
 */
function migrateSavedPayload(parsed: unknown): Record<string, unknown> | null {
  if (!isObject(parsed)) return null;
  const payload = parsed;

  switch (payload['version']) {
    case SAVE_VERSION:
      return payload;
    // v1 → v2: the presentation log added in v2 is optional, so an absent key
    // is already a valid v2 payload and nothing needs moving.
    case 1:
      return { ...payload, version: SAVE_VERSION };
    default:
      return null;
  }
}

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
    const migrated = migrateSavedPayload(JSON.parse(raw));
    if (!migrated) {
      clearSavedGame();
      return null;
    }

    const validation = validateSavedGamePayload(migrated);
    if (!validation.ok) {
      clearSavedGame();
      return null;
    }

    // Deserialize dates and tile objects
    const rawMatch = migrated['match'];
    const rawGame = migrated['game'];
    const match = rawMatch ? matchStateFromJson(rawMatch as Record<string, any>) : null;
    const game = rawGame
      ? gameStateFromJson(rawGame as Record<string, any>)
      : match?.currentHand ?? null;

    return {
      match,
      game,
      savedAt: migrated['savedAt'] as string,
      version: SAVE_VERSION,
      presentationLog: readPresentationLog(migrated),
    };
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
