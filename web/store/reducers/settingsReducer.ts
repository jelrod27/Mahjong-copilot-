import { SettingsState, SettingsAction } from '../actions/settingsActions';
import {
  SETTINGS_INITIALIZE,
  SETTINGS_SET_VARIANT,
  SETTINGS_SET_LOCALE,
  SETTINGS_SET_THEME_MODE,
  SETTINGS_SET_SOUND_ENABLED,
  SETTINGS_SET_NOTIFICATIONS_ENABLED,
  SETTINGS_SET_LARGER_UI_TEXT,
  SETTINGS_SET_SHOW_TUTOR,
  SETTINGS_SET_LIVE_FAAN_METER,
  SETTINGS_SET_TILE_VOICE,
  SETTINGS_SET_TILE_PALETTE,
  SETTINGS_SET_TABLE_FELT,
  SETTINGS_SET_NPC_ROSTER,
} from '../actions/settingsActions';
import { DEFAULT_TILE_PALETTE, DEFAULT_TABLE_FELT, DEFAULT_ROSTER } from '@/lib/cosmetics';

const initialState: SettingsState = {
  selectedVariant: 'Hong Kong Mahjong',
  locale: 'en',
  themeMode: 'retro',
  soundEnabled: true,
  notificationsEnabled: true,
  largerUiText: false,
  showTutor: true,
  liveFaanMeter: true,
  tileVoice: 'off',
  tilePalette: DEFAULT_TILE_PALETTE,
  tableFelt: DEFAULT_TABLE_FELT,
  npcRoster: DEFAULT_ROSTER,
};

export const settingsReducer = (
  state: SettingsState = initialState,
  action: SettingsAction
): SettingsState => {
  switch (action.type) {
    case SETTINGS_INITIALIZE:
      return { ...action.payload };
    case SETTINGS_SET_VARIANT:
      return { ...state, selectedVariant: action.payload };
    case SETTINGS_SET_LOCALE:
      return { ...state, locale: action.payload };
    case SETTINGS_SET_THEME_MODE:
      return { ...state, themeMode: action.payload };
    case SETTINGS_SET_SOUND_ENABLED:
      return { ...state, soundEnabled: action.payload };
    case SETTINGS_SET_NOTIFICATIONS_ENABLED:
      return { ...state, notificationsEnabled: action.payload };
    case SETTINGS_SET_LARGER_UI_TEXT:
      return { ...state, largerUiText: action.payload };
    case SETTINGS_SET_SHOW_TUTOR:
      return { ...state, showTutor: action.payload };
    case SETTINGS_SET_LIVE_FAAN_METER:
      return { ...state, liveFaanMeter: action.payload };
    case SETTINGS_SET_TILE_VOICE:
      return { ...state, tileVoice: action.payload };
    case SETTINGS_SET_TILE_PALETTE:
      return { ...state, tilePalette: action.payload };
    case SETTINGS_SET_TABLE_FELT:
      return { ...state, tableFelt: action.payload };
    case SETTINGS_SET_NPC_ROSTER:
      return { ...state, npcRoster: action.payload };
    default:
      return state;
  }
};