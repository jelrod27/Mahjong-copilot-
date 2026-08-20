import { describe, it, expect } from 'vitest';
import {
  deriveTableEvent,
  gazeSeat,
  reactionFor,
  restingEmotion,
  type TableSnapshot,
} from '../npcFocus';

const snap = (over: Partial<TableSnapshot> = {}): TableSnapshot => ({
  discards: [0, 0, 0, 0],
  melds: [0, 0, 0, 0],
  current: 0,
  finished: false,
  winner: null,
  ...over,
});

describe('deriveTableEvent', () => {
  it('reports nothing on the first snapshot, having nothing to compare', () => {
    expect(deriveTableEvent(null, snap(), null)).toBeNull();
  });

  it('reports nothing when the board has not moved', () => {
    expect(deriveTableEvent(snap(), snap(), null)).toBeNull();
  });

  it('sees a discard', () => {
    const next = snap({ discards: [0, 1, 0, 0] });
    expect(deriveTableEvent(snap(), next, null)).toEqual({ kind: 'discard', seat: 1 });
  });

  it('sees a claim and attributes it to the last discarder', () => {
    const next = snap({ melds: [0, 0, 1, 0] });
    expect(deriveTableEvent(snap(), next, 3)).toEqual({ kind: 'claim', seat: 2, from: 3 });
  });

  it('attributes a self-sourced meld to nobody, so a concealed kong annoys no one', () => {
    const next = snap({ melds: [0, 0, 1, 0] });
    expect(deriveTableEvent(snap(), next, 2)).toEqual({ kind: 'claim', seat: 2, from: null });
  });

  it('ranks a claim above the discard that arrived with it', () => {
    // A claim resolves in the same transition as the discard it took.
    const next = snap({ discards: [0, 1, 0, 0], melds: [0, 0, 1, 0] });
    expect(deriveTableEvent(snap(), next, 1)).toEqual({ kind: 'claim', seat: 2, from: 1 });
  });

  it('ranks a win above everything else in the same transition', () => {
    const next = snap({ discards: [0, 1, 0, 0], melds: [0, 0, 1, 0], finished: true, winner: 2 });
    expect(deriveTableEvent(snap(), next, 1)).toEqual({ kind: 'win', seat: 2 });
  });

  it('does not re-fire a win that was already showing', () => {
    const prev = snap({ finished: true, winner: 2 });
    const next = snap({ finished: true, winner: 2 });
    expect(deriveTableEvent(prev, next, null)).toBeNull();
  });

  it('falls back to a turn change when nothing visible moved', () => {
    expect(deriveTableEvent(snap(), snap({ current: 2 }), null)).toEqual({ kind: 'turn', seat: 2 });
  });

  it('ignores a draw that only shortens the wall', () => {
    // Wall length is not in the snapshot on purpose: a draw moves no tile the
    // table can see, so nobody should turn their head for it.
    expect(deriveTableEvent(snap({ current: 1 }), snap({ current: 1 }), null)).toBeNull();
  });
});

describe('gazeSeat', () => {
  it('turns the table toward whoever just discarded', () => {
    const event = { kind: 'discard', seat: 2 } as const;
    expect(gazeSeat(1, event, 2)).toBe(2);
    expect(gazeSeat(3, event, 2)).toBe(2);
  });

  it('turns the table toward a claimer, not toward the player', () => {
    // The whole point: seat 3 looks at seat 1 taking seat 2's tile. The human
    // (seat 0) is not involved and nobody looks at them.
    expect(gazeSeat(3, { kind: 'claim', seat: 1, from: 2 }, 1)).toBe(1);
  });

  it('reports the viewer when the viewer is the subject, meaning look ahead', () => {
    expect(gazeSeat(2, { kind: 'discard', seat: 2 }, 2)).toBe(2);
  });

  it('tracks the current player when nothing has happened', () => {
    expect(gazeSeat(1, null, 3)).toBe(3);
  });
});

describe('reactionFor', () => {
  it('makes the claimer smug and the victim frustrated', () => {
    const event = { kind: 'claim', seat: 1, from: 2 } as const;
    expect(reactionFor(1, event)?.emotion).toBe('smug');
    expect(reactionFor(2, event)?.emotion).toBe('frustrated');
  });

  it('makes an uninvolved onlooker merely surprised', () => {
    expect(reactionFor(3, { kind: 'claim', seat: 1, from: 2 })?.emotion).toBe('surprised');
  });

  it('leaves nobody frustrated when the meld came from a self-draw', () => {
    const event = { kind: 'claim', seat: 1, from: null } as const;
    expect(reactionFor(1, event)?.emotion).toBe('smug');
    expect(reactionFor(2, event)?.emotion).toBe('surprised');
  });

  it('splits a win into one triumphant and three frustrated', () => {
    const event = { kind: 'win', seat: 2 } as const;
    expect(reactionFor(2, event)?.emotion).toBe('triumphant');
    expect(reactionFor(0, event)?.emotion).toBe('frustrated');
    expect(reactionFor(1, event)?.emotion).toBe('frustrated');
  });

  it('holds a win longer than a claim', () => {
    const win = reactionFor(2, { kind: 'win', seat: 2 })!;
    const claim = reactionFor(1, { kind: 'claim', seat: 1, from: 2 })!;
    expect(win.holdMs).toBeGreaterThan(claim.holdMs);
  });

  it('does not fire an expression for an ordinary discard or turn change', () => {
    expect(reactionFor(1, { kind: 'discard', seat: 2 })).toBeNull();
    expect(reactionFor(1, { kind: 'turn', seat: 2 })).toBeNull();
  });
});

describe('restingEmotion', () => {
  it('thinks on its own turn and idles otherwise', () => {
    expect(restingEmotion(2, 2)).toBe('thinking');
    expect(restingEmotion(2, 1)).toBe('idle');
  });
});
