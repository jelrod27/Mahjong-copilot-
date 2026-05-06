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
  /** Show the live faan meter overlay during play (learning aid for HK scoring). */
  liveFaanMeter: boolean;
  /** Voice callouts for discarded tiles: 'off', 'cantonese' (preferred), or 'english'. */
  tileVoice: 'off' | 'cantonese' | 'english';
}

export const SETTINGS_INITIALIZE = 'SETTINGS_INITIALIZE' as const;
export const SETTINGS_SET_VARIANT = 'SETTINGS_SET_VARIANT' as const;
export const SETTINGS_SET_LOCALE = 'SETTINGS_SET_LOCALE' as const;
export const SETTINGS_SET_THEME_MODE = 'SETTINGS_SET_THEME_MODE' as const;
export const SETTINGS_SET_SOUND_ENABLED = 'SETTINGS_SET_SOUND_ENABLED' as const;
export const SETTINGS_SET_NOTIFICATIONS_ENABLED = 'SETTINGS_SET_NOTIFICATIONS_ENABLED' as const;
export const SETTINGS_SET_LARGER_UI_TEXT = 'SETTINGS_SET_LARGER_UI_TEXT' as const;
export const SETTINGS_SET_SHOW_TUTOR = 'SETTINGS_SET_SHOW_TUTOR' as const;
export const SETTINGS_SET_LIVE_FAAN_METER = 'SETTINGS_SET_LIVE_FAAN_METER' as const;
export const SETTINGS_SET_TILE_VOICE = 'SETTINGS_SET_TILE_VOICE' as const;

export type SettingsAction =
  | { type: typeof SETTINGS_INITIALIZE; payload: SettingsState }
  | { type: typeof SETTINGS_SET_VARIANT; payload: string }
  | { type: typeof SETTINGS_SET_LOCALE; payload: string }
  | { type: typeof SETTINGS_SET_THEME_MODE; payload: SettingsState['themeMode'] }
  | { type: typeof SETTINGS_SET_SOUND_ENABLED; payload: boolean }
  | { type: typeof SETTINGS_SET_NOTIFICATIONS_ENABLED; payload: boolean }
  | { type: typeof SETTINGS_SET_LARGER_UI_TEXT; payload: boolean }
  | { type: typeof SETTINGS_SET_SHOW_TUTOR; payload: boolean }
  | { type: typeof SETTINGS_SET_LIVE_FAAN_METER; payload: boolean }
  | { type: typeof SETTINGS_SET_TILE_VOICE; payload: SettingsState['tileVoice'] };

export const initializeSettings = () => async (dispatch: any) => {
  try {
    const selectedVariant = await StorageService.getString(AppConstants.SELECTED_VARIANT_KEY) || AppConstants.VARIANTS[0];
    const themeModeString = await StorageService.getString(AppConstants.THEME_MODE_KEY) || 'light';
    const themeMode = themeModeString === 'dark' ? 'dark' : themeModeString === 'light' ? 'light' : 'retro';
    const soundEnabled = await StorageService.getBool(AppConstants.SOUND_ENABLED_KEY) ?? true;
    const languageCode = await StorageService.getString(AppConstants.LANGUAGE_KEY) || 'en';
    const largerUiText = await StorageService.getBool(AppConstants.LARGER_UI_TEXT_KEY) ?? false;
    const showTutor = await StorageService.getBool(AppConstants.SHOW_TUTOR_KEY) ?? true;
    const liveFaanMeter = await StorageService.getBool(AppConstants.LIVE_FAAN_METER_KEY) ?? true;
    const tileVoiceRaw = await StorageService.getString(AppConstants.TILE_VOICE_KEY);
    const tileVoice: SettingsState['tileVoice'] =
      tileVoiceRaw === 'cantonese' || tileVoiceRaw === 'english' ? tileVoiceRaw : 'off';

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
        liveFaanMeter,
        tileVoice,
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

export const setLiveFaanMeter = (enabled: boolean) => async (dispatch: any) => {
  await StorageService.setBool(AppConstants.LIVE_FAAN_METER_KEY, enabled);
  dispatch({ type: SETTINGS_SET_LIVE_FAAN_METER, payload: enabled });
};

export const setTileVoice = (mode: SettingsState['tileVoice']) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.TILE_VOICE_KEY, mode);
  dispatch({ type: SETTINGS_SET_TILE_VOICE, payload: mode });
};