import StorageService from '@/lib/storageService';
import { AppConstants } from '@/constants/appConstants';

export interface SettingsState {
  selectedVariant: string;
  locale: string;
  themeMode: 'retro' | 'light' | 'dark';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  /** Larger UI text for readability (bottom nav labels, micro copy). */
  largerUiText: boolean;
  /** Show the in-game tutor panel (advice + tile safety hints) across all difficulties. */
  showTutor: boolean;
}

export const SETTINGS_INITIALIZE = 'SETTINGS_INITIALIZE';
export const SETTINGS_SET_VARIANT = 'SETTINGS_SET_VARIANT';
export const SETTINGS_SET_LOCALE = 'SETTINGS_SET_LOCALE';
export const SETTINGS_SET_THEME_MODE = 'SETTINGS_SET_THEME_MODE';
export const SETTINGS_SET_SOUND_ENABLED = 'SETTINGS_SET_SOUND_ENABLED';
export const SETTINGS_SET_NOTIFICATIONS_ENABLED = 'SETTINGS_SET_NOTIFICATIONS_ENABLED';
export const SETTINGS_SET_LARGER_UI_TEXT = 'SETTINGS_SET_LARGER_UI_TEXT';
export const SETTINGS_SET_SHOW_TUTOR = 'SETTINGS_SET_SHOW_TUTOR';

export const initializeSettings = () => async (dispatch: any) => {
  try {
    const selectedVariant = await StorageService.getString(AppConstants.SELECTED_VARIANT_KEY) || AppConstants.VARIANTS[0];
    const themeModeString = await StorageService.getString(AppConstants.THEME_MODE_KEY) || 'light';
    const themeMode = themeModeString === 'dark' ? 'dark' : themeModeString === 'light' ? 'light' : 'retro';
    const soundEnabled = await StorageService.getBool(AppConstants.SOUND_ENABLED_KEY) ?? true;
    const languageCode = await StorageService.getString(AppConstants.LANGUAGE_KEY) || 'en';
    const largerUiText = await StorageService.getBool(AppConstants.LARGER_UI_TEXT_KEY) ?? false;
    const showTutor = await StorageService.getBool(AppConstants.SHOW_TUTOR_KEY) ?? true;

    dispatch({
      type: SETTINGS_INITIALIZE,
      payload: {
        selectedVariant,
        locale: languageCode,
        themeMode,
        soundEnabled,
        notificationsEnabled: true,
        largerUiText,
        showTutor,
      },
    });
  } catch (error) {
    console.error('Failed to initialize settings:', error);
  }
};

export const setSelectedVariant = (variant: string) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.SELECTED_VARIANT_KEY, variant);
  dispatch({ type: SETTINGS_SET_VARIANT, payload: variant });
};

export const setLocale = (locale: string) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.LANGUAGE_KEY, locale);
  dispatch({ type: SETTINGS_SET_LOCALE, payload: locale });
};

export const setThemeMode = (mode: 'retro' | 'light' | 'dark') => async (dispatch: any) => {
  await StorageService.setString(AppConstants.THEME_MODE_KEY, mode);
  dispatch({ type: SETTINGS_SET_THEME_MODE, payload: mode });
};

export const setSoundEnabled = (enabled: boolean) => async (dispatch: any) => {
  await StorageService.setBool(AppConstants.SOUND_ENABLED_KEY, enabled);
  dispatch({ type: SETTINGS_SET_SOUND_ENABLED, payload: enabled });
};

export const setNotificationsEnabled = (enabled: boolean) => async (dispatch: any) => {
  await StorageService.setBool('notifications_enabled', enabled);
  dispatch({ type: SETTINGS_SET_NOTIFICATIONS_ENABLED, payload: enabled });
};

export const setLargerUiText = (enabled: boolean) => async (dispatch: any) => {
  await StorageService.setBool(AppConstants.LARGER_UI_TEXT_KEY, enabled);
  dispatch({ type: SETTINGS_SET_LARGER_UI_TEXT, payload: enabled });
};

export const setShowTutor = (enabled: boolean) => async (dispatch: any) => {
  await StorageService.setBool(AppConstants.SHOW_TUTOR_KEY, enabled);
  dispatch({ type: SETTINGS_SET_SHOW_TUTOR, payload: enabled });
};
