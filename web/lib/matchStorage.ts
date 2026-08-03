/**
 * Persistent storage for in-progress matches.
 * Uses localStorage so the player can close the browser and resume later.
 */
import { MatchState, matchStateToJson, matchStateFromJson } from '@/models/MatchState';
import { GameState, gameStateToJson, gameStateFromJson } from '@/models/GameState';
import {
  validateSavedGamePayload,
  readPresentationLog,
  isSupportedSaveVersion,
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

/**
 * Write a migrated payload back so the record on disk stops being legacy. Called only
 * after the payload validated, and swallows its own errors: a failed write leaves the
 * original save readable, so a full quota must never cost the player their match.
 */
function persistMigration(migrated: Record<string, unknown>): void {
  try {
    localStorage.setItem(MATCH_KEY, JSON.stringify(migrated));
  } catch {
    // Quota exceeded or private mode — the in-memory migration still stands.
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

/**
 * Read the stored save. `persist` writes a migrated payload back, which only the
 * resume path wants — a screen merely asking whether a save exists should not pay
 * for a full serialise and write.
 */
function readSavedGame(persist: boolean): SavedGame | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);

    // Gate the version as stored — an unrecognised version never reaches the
    // migrator, and the shape rules below are only ever applied to a payload the
    // migrator has brought up to the current format.
    if (!isObject(parsed) || !isSupportedSaveVersion(parsed)) {
      clearSavedGame();
      return null;
    }

    const migrated = migrateSavedPayload(parsed);
    if (!migrated) {
      clearSavedGame();
      return null;
    }

    const validation = validateSavedGamePayload(migrated);
    if (!validation.ok) {
      clearSavedGame();
      return null;
    }

    if (persist && migrated !== parsed) persistMigration(migrated);

    // Deserialize dates and tile objects
    const rawMatch = migrated['match'];
    const rawGame = migrated['game'];
    const match = rawMatch ? matchStateFromJson(rawMatch as Record<string, any>) : null;
    const game = rawGame
      ? gameStateFromJson(rawGame as Record<string, any>)
      : match?.currentHand ?? null;

    // Read defensively: nothing reads savedAt, so a missing one may not cost a match.
    const savedAt = migrated['savedAt'];

    return {
      match,
      game,
      savedAt: typeof savedAt === 'string' ? savedAt : '',
      version: SAVE_VERSION,
      presentationLog: readPresentationLog(migrated),
    };
  } catch {
    clearSavedGame();
    return null;
  }
}

export function loadGame(): SavedGame | null {
  return readSavedGame(true);
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
  // Reads without persisting: this runs in a mount effect on the /play landing
  // screen, which only decides whether to offer Resume.
  const saved = readSavedGame(false);
  if (!saved || !saved.match) return false;
  if (saved.match.phase === 'finished') return false;
  return true;
}
