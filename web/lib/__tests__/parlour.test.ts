import { describe, it, expect, beforeEach } from 'vitest';
import {
  PARLOUR_FLOORS, getFloor, floorSupportCast, getParlourProgress,
  recordFloorWin, recordFloorAttempt, isFloorUnlocked,
} from '../parlour';

const KEY = '16bit-mahjong-parlour';

beforeEach(() => {
  window.localStorage.removeItem(KEY);
});

describe('floor definitions', () => {
  it('defines nine floors in ascending order with unique rivals', () => {
    expect(PARLOUR_FLOORS).toHaveLength(9);
    expect(PARLOUR_FLOORS.map(f => f.floor)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(PARLOUR_FLOORS.map(f => f.rival)).size).toBe(9);
  });

  it('ramps min faan with the wings', () => {
    expect(getFloor(1)?.minFaan).toBe(0);
    expect(getFloor(3)?.minFaan).toBe(1);
    expect(getFloor(9)?.minFaan).toBe(3);
  });

  it('support cast pulls from already-beaten floors', () => {
    const [a, b] = floorSupportCast(4);
    expect(a).toBe(getFloor(3)?.rival);
    expect(b).toBe(getFloor(2)?.rival);
  });

  it('floor 1 support cast falls back to the established cast', () => {
    const [a, b] = floorSupportCast(1);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('progress persistence', () => {
  it('starts empty', () => {
    const p = getParlourProgress();
    expect(p.highestCleared).toBe(0);
    expect(p.epilogueUnlocked).toBe(false);
  });

  it('survives corrupted localStorage', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(getParlourProgress().highestCleared).toBe(0);
    window.localStorage.setItem(KEY, JSON.stringify({ highestCleared: 999, attempts: 'nope', epilogueUnlocked: 'yes' }));
    const p = getParlourProgress();
    expect(p.highestCleared).toBe(9); // clamped to floor count
    expect(p.attempts).toEqual({});
    expect(p.epilogueUnlocked).toBe(false); // only literal true counts
  });

  it('unlocks exactly one floor past the highest cleared', () => {
    expect(isFloorUnlocked(1)).toBe(true);
    expect(isFloorUnlocked(2)).toBe(false);
    recordFloorWin(1, 2);
    expect(isFloorUnlocked(2)).toBe(true);
    expect(isFloorUnlocked(3)).toBe(false);
  });

  it('never lowers highestCleared on a lower-floor rematch win', () => {
    recordFloorWin(5, 3);
    recordFloorWin(2, 1);
    expect(getParlourProgress().highestCleared).toBe(5);
  });

  it('epilogue requires beating floor 9 with 6+ faan', () => {
    recordFloorWin(9, 5);
    expect(getParlourProgress().epilogueUnlocked).toBe(false);
    recordFloorWin(9, 6);
    expect(getParlourProgress().epilogueUnlocked).toBe(true);
  });

  it('counts attempts per floor', () => {
    recordFloorAttempt(3);
    recordFloorAttempt(3);
    expect(getParlourProgress().attempts[3]).toBe(2);
  });
});
