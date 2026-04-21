import { describe, it, expect } from 'vitest';
import { settingsReducer } from '../settingsReducer';
import {
  SETTINGS_INITIALIZE, SETTINGS_SET_VARIANT, SETTINGS_SET_LOCALE,
  SETTINGS_SET_THEME_MODE, SETTINGS_SET_SOUND_ENABLED, SETTINGS_SET_NOTIFICATIONS_ENABLED,
  SETTINGS_SET_LARGER_UI_TEXT, SETTINGS_SET_SHOW_TUTOR,
} from '../../actions/settingsActions';

const initialState = {
  selectedVariant: 'Hong Kong Mahjong',
  locale: 'en',
  themeMode: 'retro',
  soundEnabled: true,
  notificationsEnabled: true,
  largerUiText: false,
  showTutor: true,
  liveFaanMeter: true,
};

describe('settingsReducer', () => {
  it('returns correct initial state', () => {
    expect(settingsReducer(undefined, { type: 'UNKNOWN' })).toEqual(initialState);
  });

  it('handles SETTINGS_INITIALIZE', () => {
    const newSettings = {
      selectedVariant: 'Japanese',
      locale: 'ja',
      themeMode: 'dark' as const,
      soundEnabled: false,
      notificationsEnabled: false,
      largerUiText: true,
      showTutor: false,
    };
    const state = settingsReducer(initialState, { type: SETTINGS_INITIALIZE, payload: newSettings });
    expect(state).toEqual(newSettings);
  });

  it('handles SETTINGS_SET_VARIANT', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_VARIANT, payload: 'Japanese Riichi' });
    expect(state.selectedVariant).toBe('Japanese Riichi');
    expect(state.locale).toBe('en'); // unchanged
  });

  it('handles SETTINGS_SET_LOCALE', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_LOCALE, payload: 'zh' });
    expect(state.locale).toBe('zh');
  });

  it('handles SETTINGS_SET_THEME_MODE', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_THEME_MODE, payload: 'dark' });
    expect(state.themeMode).toBe('dark');
  });

  it('handles SETTINGS_SET_SOUND_ENABLED', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_SOUND_ENABLED, payload: false });
    expect(state.soundEnabled).toBe(false);
  });

  it('handles SETTINGS_SET_NOTIFICATIONS_ENABLED', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_NOTIFICATIONS_ENABLED, payload: false });
    expect(state.notificationsEnabled).toBe(false);
  });

  it('handles SETTINGS_SET_LARGER_UI_TEXT', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_LARGER_UI_TEXT, payload: true });
    expect(state.largerUiText).toBe(true);
  });

  it('handles SETTINGS_SET_SHOW_TUTOR', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_SHOW_TUTOR, payload: false });
    expect(state.showTutor).toBe(false);
  });

  it('defaults showTutor to true', () => {
    const state = settingsReducer(undefined, { type: 'UNKNOWN' });
    expect(state.showTutor).toBe(true);
  });

  it('returns state unchanged for unknown action', () => {
    const state = settingsReducer(initialState, { type: 'SOMETHING_RANDOM' });
    expect(state).toEqual(initialState);
  });
});
