/**
 * NPC roster rotation — alternates opponent cast each new solo match when
 * `npcRosterMode` is `auto`. Fixed mode uses the roster the player picked
 * on the cosmetics page.
 */

import { AppConstants } from '@/constants/appConstants';
import { DEFAULT_ROSTER, RosterId, ROSTERS } from '@/lib/cosmetics';

export type NpcRosterMode = 'auto' | 'fixed';

/** Order used when auto-rotating between the two cosmetic rosters. */
export const ROSTER_ROTATION_ORDER: readonly RosterId[] = ['default', 'alt'] as const;

export function rosterForMatchIndex(index: number): RosterId {
  const i = Math.max(0, Math.floor(index));
  return ROSTER_ROTATION_ORDER[i % ROSTER_ROTATION_ORDER.length];
}

function readMatchCounter(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(AppConstants.MATCH_ROSTER_COUNTER_KEY);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeMatchCounter(value: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AppConstants.MATCH_ROSTER_COUNTER_KEY, String(Math.max(0, value)));
  } catch {
    // Best-effort — rotation still works in-memory for this session.
  }
}

/**
 * Resolve which roster fills opponent seats for a new match.
 * In auto mode, advances the persisted counter and returns the next roster.
 */
export function resolveMatchRoster(mode: NpcRosterMode, fixedRoster: RosterId): RosterId {
  const safeFixed = fixedRoster in ROSTERS ? fixedRoster : DEFAULT_ROSTER;
  if (mode === 'fixed') return safeFixed;

  const counter = readMatchCounter();
  const roster = rosterForMatchIndex(counter);
  writeMatchCounter(counter + 1);
  return roster;
}

export function isNpcRosterMode(value: string | null | undefined): value is NpcRosterMode {
  return value === 'auto' || value === 'fixed';
}
