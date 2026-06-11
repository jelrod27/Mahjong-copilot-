/**
 * The Jade Parlour — story-mode floor ladder. Each floor is a rival with a
 * personality-tuned AI; beat the floor to light it and unlock the next.
 * Design: docs/design/story-bible.md and docs/design/npcs.md.
 */

import { NpcId, NPCS } from '@/content/npcs';

export interface ParlourFloor {
  floor: number;
  name: string;
  rival: NpcId;
  /** AI tier for the rival's seat. */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Table minimum faan for this floor. Novice wing ramps gently. */
  minFaan: 0 | 1 | 3;
  /** One-line floor description for the ladder screen. */
  tagline: string;
  /** What this floor teaches (shown on the floor card). */
  teaches: string;
}

export const PARLOUR_FLOORS: ParlourFloor[] = [
  {
    floor: 1, name: 'The Open Table', rival: 'mei', difficulty: 'easy', minFaan: 0,
    tagline: 'Where everyone starts.',
    teaches: 'Basic play: draw, discard, and your first win',
  },
  {
    floor: 2, name: 'The Sprint Room', rival: 'riko', difficulty: 'easy', minFaan: 0,
    tagline: 'No slow hands past this point.',
    teaches: 'Tempo: chows, cheap hands, and punishing recklessness',
  },
  {
    floor: 3, name: "The Builder's Den", rival: 'bo', difficulty: 'easy', minFaan: 1,
    tagline: 'Pungs hold. Chows bend.',
    teaches: 'Claiming with purpose: pungs, kongs, All Pungs',
  },
  {
    floor: 4, name: 'The Counting House', rival: 'hana', difficulty: 'medium', minFaan: 1,
    tagline: 'Every tile is accounted for.',
    teaches: 'Efficiency: shanten thinking and tile counting',
  },
  {
    floor: 5, name: 'The Quiet Table', rival: 'pearl', difficulty: 'medium', minFaan: 1,
    tagline: 'Mind what you throw.',
    teaches: 'Defense: safe tiles and reading discards',
  },
  {
    floor: 6, name: 'The Collection', rival: 'aki', difficulty: 'medium', minFaan: 3,
    tagline: 'Cheap wins bore the curator.',
    teaches: 'Value: one-suit hands and faan building',
  },
  {
    floor: 7, name: 'The Reading Room', rival: 'sora', difficulty: 'hard', minFaan: 3,
    tagline: 'Your discards talk.',
    teaches: 'Reading waits and staying unreadable',
  },
  {
    floor: 8, name: 'The Last Door', rival: 'yuki', difficulty: 'hard', minFaan: 3,
    tagline: 'The exam before the exam.',
    teaches: 'Everything, sharpened',
  },
  {
    floor: 9, name: 'The Jade Room', rival: 'jin', difficulty: 'hard', minFaan: 3,
    tagline: 'Thirty years, one seat.',
    teaches: 'The final exam — win big to wake the house',
  },
];

export function getFloor(floor: number): ParlourFloor | undefined {
  return PARLOUR_FLOORS.find(f => f.floor === floor);
}

/**
 * Fill the other two AI seats with already-beaten rivals (the Parlour fills
 * back up as you climb). Floor 1 falls back to the Night Shift cast.
 */
export function floorSupportCast(floor: number): [NpcId, NpcId] {
  const beaten = PARLOUR_FLOORS.filter(f => f.floor < floor).map(f => f.rival);
  if (beaten.length >= 2) {
    return [beaten[beaten.length - 1], beaten[beaten.length - 2]];
  }
  if (beaten.length === 1) return [beaten[0], 'sora'];
  return ['hana', 'sora'];
}

// ── Progress persistence (local-first) ────────────────────────────────────

const PARLOUR_KEY = '16bit-mahjong-parlour';

export interface ParlourProgress {
  /** Highest floor cleared (0 = none). */
  highestCleared: number;
  /** Floor numbers beaten, with how many attempts each took. */
  attempts: Record<number, number>;
  /** Set true when Jin is beaten with a 6+ faan hand. */
  epilogueUnlocked: boolean;
}

const EMPTY_PROGRESS: ParlourProgress = {
  highestCleared: 0,
  attempts: {},
  epilogueUnlocked: false,
};

export function getParlourProgress(): ParlourProgress {
  if (typeof window === 'undefined') return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(PARLOUR_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<ParlourProgress>;
    return {
      highestCleared: typeof parsed.highestCleared === 'number'
        ? Math.max(0, Math.min(PARLOUR_FLOORS.length, parsed.highestCleared))
        : 0,
      attempts: parsed.attempts && typeof parsed.attempts === 'object' ? parsed.attempts as Record<number, number> : {},
      epilogueUnlocked: parsed.epilogueUnlocked === true,
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function saveProgress(progress: ParlourProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PARLOUR_KEY, JSON.stringify(progress));
  } catch {
    // Storage full/blocked — progress is a convenience, never a crash.
  }
}

export function recordFloorAttempt(floor: number): void {
  const progress = getParlourProgress();
  progress.attempts[floor] = (progress.attempts[floor] ?? 0) + 1;
  saveProgress(progress);
}

/**
 * Record a floor victory. `bestFanThisMatch` feeds the epilogue condition
 * on the Jade Room (6+ faan winning hand against Jin).
 */
export function recordFloorWin(floor: number, bestFanThisMatch: number): ParlourProgress {
  const progress = getParlourProgress();
  progress.highestCleared = Math.max(progress.highestCleared, floor);
  if (floor === 9 && bestFanThisMatch >= 6) {
    progress.epilogueUnlocked = true;
  }
  saveProgress(progress);
  return progress;
}

export function isFloorUnlocked(floor: number, progress?: ParlourProgress): boolean {
  const p = progress ?? getParlourProgress();
  return floor <= p.highestCleared + 1;
}

/** Rival display info for a floor (ladder cards, dialogue overlays). */
export function floorRival(floor: number) {
  const def = getFloor(floor);
  return def ? NPCS[def.rival] : undefined;
}
