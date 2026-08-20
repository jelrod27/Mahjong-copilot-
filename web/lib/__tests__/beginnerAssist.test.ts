import { describe, it, expect } from 'vitest';
import { resolveBeginnerAssist, isBeginnerAssistSetting } from '../beginnerAssist';
import { settingsReducer } from '@/store/reducers/settingsReducer';
import { SETTINGS_SET_BEGINNER_ASSIST } from '@/store/actions/settingsActions';

/**
 * The rule is "on at Beginner tables, off elsewhere, and the player can
 * overrule it permanently". A boolean cannot hold that, because it cannot
 * distinguish "off because this is a hard table" from "off because the player
 * said so", and only the second should survive sitting down at an easy table.
 */

describe('resolving beginner assist', () => {
  it('follows the table when left on auto', () => {
    expect(resolveBeginnerAssist('auto', 'easy')).toBe(true);
    expect(resolveBeginnerAssist('auto', 'medium')).toBe(false);
    expect(resolveBeginnerAssist('auto', 'hard')).toBe(false);
  });

  it('overrules the table in both directions', () => {
    // The half that a plain boolean gets wrong: an explicit off has to stay
    // off at an easy table, and an explicit on has to stay on at a hard one.
    expect(resolveBeginnerAssist('off', 'easy')).toBe(false);
    expect(resolveBeginnerAssist('on', 'hard')).toBe(true);
  });

  it('is total over every setting and difficulty', () => {
    for (const setting of ['auto', 'on', 'off'] as const) {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        expect(typeof resolveBeginnerAssist(setting, difficulty)).toBe('boolean');
      }
    }
  });
});

describe('reading the stored setting', () => {
  it('accepts only the three known values', () => {
    expect(isBeginnerAssistSetting('auto')).toBe(true);
    expect(isBeginnerAssistSetting('on')).toBe(true);
    expect(isBeginnerAssistSetting('off')).toBe(true);
  });

  it('rejects anything else, including a value an older build might have written', () => {
    // The load path falls back to 'auto' on a false here, rather than trusting
    // an unknown string into the store.
    expect(isBeginnerAssistSetting('true')).toBe(false);
    expect(isBeginnerAssistSetting(true)).toBe(false);
    expect(isBeginnerAssistSetting(null)).toBe(false);
    expect(isBeginnerAssistSetting(undefined)).toBe(false);
    expect(isBeginnerAssistSetting('')).toBe(false);
  });
});

describe('the settings slice', () => {
  it('defaults to auto, so a fresh install defers to the table', () => {
    const state = settingsReducer(undefined, { type: '@@INIT' } as never);
    expect(state.beginnerAssist).toBe('auto');
  });

  it('stores an override', () => {
    for (const value of ['on', 'off', 'auto'] as const) {
      const state = settingsReducer(undefined, {
        type: SETTINGS_SET_BEGINNER_ASSIST,
        payload: value,
      } as never);
      expect(state.beginnerAssist).toBe(value);
    }
  });

  it('leaves the tutor toggle alone', () => {
    // Separate features that happen to share a name in the UI's history. One
    // must not move the other.
    const state = settingsReducer(undefined, {
      type: SETTINGS_SET_BEGINNER_ASSIST,
      payload: 'off',
    } as never);
    expect(state.showTutor).toBe(true);
  });
});
