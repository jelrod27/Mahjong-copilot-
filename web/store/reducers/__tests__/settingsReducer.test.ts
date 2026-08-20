import { describe, it, expect } from 'vitest';
import { settingsReducer } from '../settingsReducer';
import {
  SETTINGS_INITIALIZE, SETTINGS_SET_VARIANT, SETTINGS_SET_LOCALE,
  SETTINGS_SET_THEME_MODE, SETTINGS_SET_SOUND_ENABLED, SETTINGS_SET_NOTIFICATIONS_ENABLED,
  SETTINGS_SET_LARGER_UI_TEXT, SETTINGS_SET_SHOW_TUTOR, SETTINGS_SET_DISPLAY_MODE,
  SETTINGS_SET_GAME_SPEED,
  SETTINGS_SET_LIVE_FAAN_METER,
  SETTINGS_SET_TILE_VOICE, SETTINGS_SET_CRT_EFFECT, SETTINGS_SET_MUSIC_ENABLED,
  SETTINGS_SET_MUSIC_VOLUME,
} from '../../actions/settingsActions';
import { DEFAULT_TABLE_FELT } from '@/lib/cosmetics';

const initialState = {
  selectedVariant: 'Hong Kong Mahjong',
  locale: 'en',
  themeMode: 'retro',
  soundEnabled: true,
  notificationsEnabled: true,
  largerUiText: false,
  showTutor: true,
  beginnerAssist: 'auto',
  displayMode: 'tutor' as const,
  gameSpeed: 'normal' as const,
  liveFaanMeter: true,
  tileVoice: 'off' as const,
  tilePalette: 'bone-wood' as const,
  // Sourced from the constant the reducer itself defaults to; changing the
  // shipped felt should not require editing this fixture.
  tableFelt: DEFAULT_TABLE_FELT,
  npcRoster: 'default' as const,
  npcRosterMode: 'auto' as const,
  crtEffect: false,
  musicEnabled: true,
  musicVolume: 70,
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
      displayMode: 'off' as const,
      liveFaanMeter: false,
      tileVoice: 'cantonese' as const,
      crtEffect: true,
      musicEnabled: false,
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

  it('handles SETTINGS_SET_DISPLAY_MODE', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_DISPLAY_MODE, payload: 'shantenHeat' });
    expect(state.displayMode).toBe('shantenHeat');
  });

  it('defaults displayMode to tutor', () => {
    const state = settingsReducer(undefined, { type: 'UNKNOWN' });
    expect(state.displayMode).toBe('tutor');
  });

  it('handles SETTINGS_SET_GAME_SPEED', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_GAME_SPEED, payload: 'fast' });
    expect(state.gameSpeed).toBe('fast');
  });

  it('defaults gameSpeed to normal', () => {
    const state = settingsReducer(undefined, { type: 'UNKNOWN' });
    expect(state.gameSpeed).toBe('normal');
  });

  it('handles SETTINGS_SET_LIVE_FAAN_METER', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_LIVE_FAAN_METER, payload: false });
    expect(state.liveFaanMeter).toBe(false);
  });

  it('handles SETTINGS_SET_TILE_VOICE', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_TILE_VOICE, payload: 'cantonese' });
    expect(state.tileVoice).toBe('cantonese');
  });

  it('handles SETTINGS_SET_CRT_EFFECT', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_CRT_EFFECT, payload: true });
    expect(state.crtEffect).toBe(true);
  });

  it('handles SETTINGS_SET_MUSIC_ENABLED', () => {
    const state = settingsReducer(initialState, { type: SETTINGS_SET_MUSIC_ENABLED, payload: false });
    expect(state.musicEnabled).toBe(false);
  });

  it('defaults showTutor to true', () => {
    const state = settingsReducer(undefined, { type: 'UNKNOWN' });
    expect(state.showTutor).toBe(true);
  });

  it('defaults liveFaanMeter to true', () => {
    const state = settingsReducer(undefined, { type: 'UNKNOWN' });
    expect(state.liveFaanMeter).toBe(true);
  });

  it('returns state unchanged for unknown action', () => {
    const state = settingsReducer(initialState, { type: 'SOMETHING_RANDOM' });
    expect(state).toEqual(initialState);
  });
});

describe('music volume', () => {
  it('starts at a level that is audible but not the loudest available', () => {
    // Defaulting to 100 makes the first impression the worst one; defaulting
    // to 0 means someone who never opens settings never hears the score.
    const state = settingsReducer(undefined, { type: '@@INIT' } as never);
    expect(state.musicVolume).toBeGreaterThan(0);
    expect(state.musicVolume).toBeLessThan(100);
  });

  it('stores the level it is given', () => {
    const state = settingsReducer(undefined, {
      type: SETTINGS_SET_MUSIC_VOLUME,
      payload: 35,
    } as never);
    expect(state.musicVolume).toBe(35);
  });

  it('leaves the on/off switch alone', () => {
    // Volume and enablement are separate controls: turning the score down
    // should never silently disable it, or the toggle stops meaning anything.
    const quiet = settingsReducer(undefined, {
      type: SETTINGS_SET_MUSIC_VOLUME,
      payload: 0,
    } as never);
    expect(quiet.musicEnabled).toBe(true);
  });
});
