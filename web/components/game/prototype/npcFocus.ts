/**
 * PROTOTYPE — throwaway.
 *
 * Who each character is looking at, and how they feel about it.
 *
 * Pure: no three.js, no React, no clock. Everything here is seat -> seat, so it
 * is unit-testable without a GPU, which matters because this is the part that
 * decides whether the table reads as four people or as three portraits pointed
 * at the player.
 *
 * Seat space, not player index: seat 0 is always the human, 1/2/3 go round the
 * table. ThreeTable converts.
 *
 * NOTE: the real implementation should consume `presentation/events.ts`, which
 * derives exactly this vocabulary (discard / claim / turnChange / handEnd, each
 * carrying a seat) from the engine's own transitions. `deriveEvents` currently
 * has no consumers — wiring it into useGameController is a change to the bridge
 * layer and belongs in its own PR, not in a throwaway prototype. Until then this
 * recovers the same events by diffing two snapshots, which is weaker (it cannot
 * see a claim's victim without remembering who discarded last) but touches no
 * production code.
 */

import type { NpcEmotion } from '@/content/npcs';

export type TableEvent =
  | { kind: 'discard'; seat: number }
  | { kind: 'claim'; seat: number; from: number | null }
  | { kind: 'win'; seat: number }
  | { kind: 'turn'; seat: number };

/** The parts of the board this module reacts to, per seat. */
export interface TableSnapshot {
  discards: number[];
  melds: number[];
  current: number;
  finished: boolean;
  winner: number | null;
}

/**
 * The single most notable thing that happened between two snapshots.
 *
 * Deliberately one event, not a list: this drives where heads turn, and a head
 * can only look at one thing. Ranked so the loudest wins — a win outranks the
 * claim that produced it, and a claim outranks the discard it took.
 */
export function deriveTableEvent(
  prev: TableSnapshot | null,
  next: TableSnapshot,
  lastDiscarder: number | null,
): TableEvent | null {
  if (!prev) return null;

  if (next.finished && next.winner !== null && !prev.finished) {
    return { kind: 'win', seat: next.winner };
  }

  for (let seat = 0; seat < next.melds.length; seat++) {
    if ((next.melds[seat] ?? 0) > (prev.melds[seat] ?? 0)) {
      // A claim takes the tile from whoever discarded last. A concealed kong is
      // drawn, not claimed, so `from` is that same seat and the victim lookup
      // below correctly finds nobody to be annoyed.
      const from = lastDiscarder !== null && lastDiscarder !== seat ? lastDiscarder : null;
      return { kind: 'claim', seat, from };
    }
  }

  for (let seat = 0; seat < next.discards.length; seat++) {
    if ((next.discards[seat] ?? 0) > (prev.discards[seat] ?? 0)) {
      return { kind: 'discard', seat };
    }
  }

  if (next.current !== prev.current) return { kind: 'turn', seat: next.current };

  return null;
}

/**
 * Which seat `viewer` should be looking at.
 *
 * Returning the viewer's own seat means "look at your own hand" — the caller
 * turns that into facing straight ahead rather than turning to face themselves.
 */
export function gazeSeat(viewer: number, event: TableEvent | null, current: number): number {
  if (event) {
    switch (event.kind) {
      case 'discard':
      case 'claim':
      case 'win':
        return event.seat;
      case 'turn':
        return event.seat;
    }
  }
  return current;
}

/** Where a character rests when nothing has just happened. */
export function restingEmotion(viewer: number, current: number): NpcEmotion {
  return viewer === current ? 'thinking' : 'idle';
}

export interface Reaction {
  emotion: NpcEmotion;
  holdMs: number;
}

/**
 * How `viewer` feels about `event`, or null to stay at rest.
 *
 * The point of this table is that characters react to each other, not only to
 * the human: Mei is annoyed when Hana takes her discard whether or not the
 * player was involved at all.
 */
export function reactionFor(viewer: number, event: TableEvent | null): Reaction | null {
  if (!event) return null;
  switch (event.kind) {
    case 'win':
      return viewer === event.seat
        ? { emotion: 'triumphant', holdMs: 4000 }
        : { emotion: 'frustrated', holdMs: 4000 };
    case 'claim':
      if (viewer === event.seat) return { emotion: 'smug', holdMs: 2500 };
      if (viewer === event.from) return { emotion: 'frustrated', holdMs: 2500 };
      return { emotion: 'surprised', holdMs: 1600 };
    case 'discard':
    case 'turn':
      return null;
  }
}
