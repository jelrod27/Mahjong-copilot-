import { SettingsState } from '../actions/settingsActions';
import {
  SETTINGS_INITIALIZE,
  SETTINGS_SET_VARIANT,
  SETTINGS_SET_LOCALE,
  SETTINGS_SET_THEME_MODE,
  SETTINGS_SET_SOUND_ENABLED,
  SETTINGS_SET_NOTIFICATIONS_ENABLED,
  SETTINGS_SET_LARGER_UI_TEXT,
} from '../actions/settingsActions';

const initialState: SettingsState = {
  selectedVariant: 'Hong Kong Mahjong',
  locale: 'en',
  themeMode: 'light',
  soundEnabled: true,
  notificationsEnabled: true,
  largerUiText: false,
};

export const settingsReducer = (
  state: SettingsState = initialState,
  action: any
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
    default:
      return state;
  }
};
