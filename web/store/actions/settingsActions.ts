import StorageService from '@/lib/storageService';
import { AppConstants } from '@/constants/appConstants';
import {
  TilePaletteId,
  TableFeltId,
  RosterId,
  TILE_PALETTES,
  TABLE_FELTS,
  ROSTERS,
  DEFAULT_TILE_PALETTE,
  DEFAULT_TABLE_FELT,
  DEFAULT_ROSTER,
} from '@/lib/cosmetics';

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
  /** Cosmetic preference for the tile face artwork. */
  tilePalette: TilePaletteId;
  /** Cosmetic preference for the table felt background. */
  tableFelt: TableFeltId;
  /** Which NPC roster fills the opponent seats. */
  npcRoster: RosterId;
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
export const SETTINGS_SET_TILE_PALETTE = 'SETTINGS_SET_TILE_PALETTE' as const;
export const SETTINGS_SET_TABLE_FELT = 'SETTINGS_SET_TABLE_FELT' as const;
export const SETTINGS_SET_NPC_ROSTER = 'SETTINGS_SET_NPC_ROSTER' as const;

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
  | { type: typeof SETTINGS_SET_TILE_VOICE; payload: SettingsState['tileVoice'] }
  | { type: typeof SETTINGS_SET_TILE_PALETTE; payload: TilePaletteId }
  | { type: typeof SETTINGS_SET_TABLE_FELT; payload: TableFeltId }
  | { type: typeof SETTINGS_SET_NPC_ROSTER; payload: RosterId };

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

    const tilePaletteRaw = await StorageService.getString(AppConstants.TILE_PALETTE_KEY);
    const tilePalette: TilePaletteId =
      tilePaletteRaw && tilePaletteRaw in TILE_PALETTES
        ? (tilePaletteRaw as TilePaletteId)
        : DEFAULT_TILE_PALETTE;

    const tableFeltRaw = await StorageService.getString(AppConstants.TABLE_FELT_KEY);
    const tableFelt: TableFeltId =
      tableFeltRaw && tableFeltRaw in TABLE_FELTS
        ? (tableFeltRaw as TableFeltId)
        : DEFAULT_TABLE_FELT;

    const rosterRaw = await StorageService.getString(AppConstants.NPC_ROSTER_KEY);
    const npcRoster: RosterId =
      rosterRaw && rosterRaw in ROSTERS ? (rosterRaw as RosterId) : DEFAULT_ROSTER;

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
        tilePalette,
        tableFelt,
        npcRoster,
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

export const setTilePalette = (id: TilePaletteId) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.TILE_PALETTE_KEY, id);
  dispatch({ type: SETTINGS_SET_TILE_PALETTE, payload: id });
};

export const setTableFelt = (id: TableFeltId) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.TABLE_FELT_KEY, id);
  dispatch({ type: SETTINGS_SET_TABLE_FELT, payload: id });
};

export const setNpcRoster = (id: RosterId) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.NPC_ROSTER_KEY, id);
  dispatch({ type: SETTINGS_SET_NPC_ROSTER, payload: id });
};