import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppConstants } from '@/constants/appConstants';
import { rosterForMatchIndex, resolveMatchRoster } from '../rosterRotation';

describe('rosterRotation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('alternates rosters by match index', () => {
    expect(rosterForMatchIndex(0)).toBe('default');
    expect(rosterForMatchIndex(1)).toBe('alt');
    expect(rosterForMatchIndex(2)).toBe('default');
  });

  it('advances counter in auto mode', () => {
    expect(resolveMatchRoster('auto', 'default')).toBe('default');
    expect(resolveMatchRoster('auto', 'default')).toBe('alt');
    expect(resolveMatchRoster('auto', 'default')).toBe('default');
    expect(localStorage.getItem(AppConstants.MATCH_ROSTER_COUNTER_KEY)).toBe('3');
  });

  it('does not advance counter in fixed mode', () => {
    expect(resolveMatchRoster('fixed', 'alt')).toBe('alt');
    expect(resolveMatchRoster('fixed', 'alt')).toBe('alt');
    expect(localStorage.getItem(AppConstants.MATCH_ROSTER_COUNTER_KEY)).toBeNull();
  });
});
