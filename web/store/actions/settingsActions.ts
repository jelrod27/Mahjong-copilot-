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
import { isNpcRosterMode, NpcRosterMode } from '@/lib/rosterRotation';

export type DisplayMode = 'tutor' | 'shantenHeat' | 'off';
export type GameSpeed = 'relaxed' | 'normal' | 'fast';

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
  /** In-game overlay mode: tutor hints, shanten heatmap, or none. */
  displayMode: DisplayMode;
  /** Pacing of AI turns during play, independent of AI difficulty. */
  gameSpeed: GameSpeed;
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
  /** Auto rotates rosters each match; fixed keeps `npcRoster` until changed. */
  npcRosterMode: NpcRosterMode;
  /** CRT scanline overlay on the game table (retro display effect). */
  crtEffect: boolean;
  /** Chiptune background music during play. */
  musicEnabled: boolean;
  /** 0-100. */
  musicVolume: number;
}

export const SETTINGS_INITIALIZE = 'SETTINGS_INITIALIZE' as const;
export const SETTINGS_SET_VARIANT = 'SETTINGS_SET_VARIANT' as const;
export const SETTINGS_SET_LOCALE = 'SETTINGS_SET_LOCALE' as const;
export const SETTINGS_SET_THEME_MODE = 'SETTINGS_SET_THEME_MODE' as const;
export const SETTINGS_SET_SOUND_ENABLED = 'SETTINGS_SET_SOUND_ENABLED' as const;
export const SETTINGS_SET_NOTIFICATIONS_ENABLED = 'SETTINGS_SET_NOTIFICATIONS_ENABLED' as const;
export const SETTINGS_SET_LARGER_UI_TEXT = 'SETTINGS_SET_LARGER_UI_TEXT' as const;
export const SETTINGS_SET_SHOW_TUTOR = 'SETTINGS_SET_SHOW_TUTOR' as const;
export const SETTINGS_SET_DISPLAY_MODE = 'SETTINGS_SET_DISPLAY_MODE' as const;
export const SETTINGS_SET_GAME_SPEED = 'SETTINGS_SET_GAME_SPEED' as const;
export const SETTINGS_SET_LIVE_FAAN_METER = 'SETTINGS_SET_LIVE_FAAN_METER' as const;
export const SETTINGS_SET_TILE_VOICE = 'SETTINGS_SET_TILE_VOICE' as const;
export const SETTINGS_SET_TILE_PALETTE = 'SETTINGS_SET_TILE_PALETTE' as const;
export const SETTINGS_SET_TABLE_FELT = 'SETTINGS_SET_TABLE_FELT' as const;
export const SETTINGS_SET_NPC_ROSTER = 'SETTINGS_SET_NPC_ROSTER' as const;
export const SETTINGS_SET_NPC_ROSTER_MODE = 'SETTINGS_SET_NPC_ROSTER_MODE' as const;
export const SETTINGS_SET_CRT_EFFECT = 'SETTINGS_SET_CRT_EFFECT' as const;
export const SETTINGS_SET_MUSIC_ENABLED = 'SETTINGS_SET_MUSIC_ENABLED' as const;
export const SETTINGS_SET_MUSIC_VOLUME = 'SETTINGS_SET_MUSIC_VOLUME' as const;

export type SettingsAction =
  | { type: typeof SETTINGS_INITIALIZE; payload: SettingsState }
  | { type: typeof SETTINGS_SET_VARIANT; payload: string }
  | { type: typeof SETTINGS_SET_LOCALE; payload: string }
  | { type: typeof SETTINGS_SET_THEME_MODE; payload: SettingsState['themeMode'] }
  | { type: typeof SETTINGS_SET_SOUND_ENABLED; payload: boolean }
  | { type: typeof SETTINGS_SET_NOTIFICATIONS_ENABLED; payload: boolean }
  | { type: typeof SETTINGS_SET_LARGER_UI_TEXT; payload: boolean }
  | { type: typeof SETTINGS_SET_SHOW_TUTOR; payload: boolean }
  | { type: typeof SETTINGS_SET_DISPLAY_MODE; payload: DisplayMode }
  | { type: typeof SETTINGS_SET_GAME_SPEED; payload: GameSpeed }
  | { type: typeof SETTINGS_SET_LIVE_FAAN_METER; payload: boolean }
  | { type: typeof SETTINGS_SET_TILE_VOICE; payload: SettingsState['tileVoice'] }
  | { type: typeof SETTINGS_SET_TILE_PALETTE; payload: TilePaletteId }
  | { type: typeof SETTINGS_SET_TABLE_FELT; payload: TableFeltId }
  | { type: typeof SETTINGS_SET_NPC_ROSTER; payload: RosterId }
  | { type: typeof SETTINGS_SET_NPC_ROSTER_MODE; payload: NpcRosterMode }
  | { type: typeof SETTINGS_SET_CRT_EFFECT; payload: boolean }
  | { type: typeof SETTINGS_SET_MUSIC_ENABLED; payload: boolean }
  | { type: typeof SETTINGS_SET_MUSIC_VOLUME; payload: number };

export const initializeSettings = () => async (dispatch: any) => {
  try {
    const selectedVariant = await StorageService.getString(AppConstants.SELECTED_VARIANT_KEY) || AppConstants.VARIANTS[0];
    const themeModeString = await StorageService.getString(AppConstants.THEME_MODE_KEY) || 'light';
    const themeMode = themeModeString === 'dark' ? 'dark' : themeModeString === 'light' ? 'light' : 'retro';
    const soundEnabled = await StorageService.getBool(AppConstants.SOUND_ENABLED_KEY) ?? true;
    const languageCode = await StorageService.getString(AppConstants.LANGUAGE_KEY) || 'en';
    const largerUiText = await StorageService.getBool(AppConstants.LARGER_UI_TEXT_KEY) ?? false;
    const showTutor = await StorageService.getBool(AppConstants.SHOW_TUTOR_KEY) ?? true;
    const displayModeRaw = await StorageService.getString(AppConstants.DISPLAY_MODE_KEY);
    const displayMode: DisplayMode =
      displayModeRaw === 'shantenHeat' || displayModeRaw === 'off'
        ? displayModeRaw
        : showTutor
          ? 'tutor'
          : 'off';
    const gameSpeedRaw = await StorageService.getString(AppConstants.GAME_SPEED_KEY);
    const gameSpeed: GameSpeed =
      gameSpeedRaw === 'relaxed' || gameSpeedRaw === 'fast' ? gameSpeedRaw : 'normal';
    const liveFaanMeter = await StorageService.getBool(AppConstants.LIVE_FAAN_METER_KEY) ?? true;
    const tileVoiceRaw = await StorageService.getString(AppConstants.TILE_VOICE_KEY);
    const tileVoice: SettingsState['tileVoice'] =
      tileVoiceRaw === 'cantonese' || tileVoiceRaw === 'english' ? tileVoiceRaw : 'off';

    const tilePaletteRaw = await StorageService.getString(AppConstants.TILE_PALETTE_KEY);
    const tilePalette: TilePaletteId =
      tilePaletteRaw && Object.hasOwn(TILE_PALETTES, tilePaletteRaw)
        ? (tilePaletteRaw as TilePaletteId)
        : DEFAULT_TILE_PALETTE;

    const tableFeltRaw = await StorageService.getString(AppConstants.TABLE_FELT_KEY);
    const tableFelt: TableFeltId =
      tableFeltRaw && Object.hasOwn(TABLE_FELTS, tableFeltRaw)
        ? (tableFeltRaw as TableFeltId)
        : DEFAULT_TABLE_FELT;

    const rosterRaw = await StorageService.getString(AppConstants.NPC_ROSTER_KEY);
    const npcRoster: RosterId =
      rosterRaw && Object.hasOwn(ROSTERS, rosterRaw)
        ? (rosterRaw as RosterId)
        : DEFAULT_ROSTER;

    const rosterModeRaw = await StorageService.getString(AppConstants.NPC_ROSTER_MODE_KEY);
    const npcRosterMode: NpcRosterMode = isNpcRosterMode(rosterModeRaw) ? rosterModeRaw : 'auto';
    const crtEffect = await StorageService.getBool(AppConstants.CRT_EFFECT_KEY) ?? false;
    const musicEnabled = await StorageService.getBool(AppConstants.MUSIC_ENABLED_KEY) ?? true;
    // getInt can return NaN for a malformed stored value, which ?? does not
    // catch — it would reach musicEngine.setVolume() and silence the score.
    const storedVolume = await StorageService.getInt(AppConstants.MUSIC_VOLUME_KEY);
    const musicVolume = clampVolume(storedVolume);

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
        displayMode,
        gameSpeed,
        liveFaanMeter,
        tileVoice,
        tilePalette,
        tableFelt,
        npcRoster,
        npcRosterMode,
        crtEffect,
        musicEnabled,
        musicVolume,
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

export const setDisplayMode = (mode: DisplayMode) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.DISPLAY_MODE_KEY, mode);
  dispatch({ type: SETTINGS_SET_DISPLAY_MODE, payload: mode });
};

export const setGameSpeed = (speed: GameSpeed) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.GAME_SPEED_KEY, speed);
  dispatch({ type: SETTINGS_SET_GAME_SPEED, payload: speed });
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
  await StorageService.setString(AppConstants.NPC_ROSTER_MODE_KEY, 'fixed');
  dispatch({ type: SETTINGS_SET_NPC_ROSTER, payload: id });
  dispatch({ type: SETTINGS_SET_NPC_ROSTER_MODE, payload: 'fixed' });
};

export const setCrtEffect = (enabled: boolean) => async (dispatch: any) => {
  await StorageService.setBool(AppConstants.CRT_EFFECT_KEY, enabled);
  dispatch({ type: SETTINGS_SET_CRT_EFFECT, payload: enabled });
};

export const setMusicEnabled = (enabled: boolean) => async (dispatch: any) => {
  await StorageService.setBool(AppConstants.MUSIC_ENABLED_KEY, enabled);
  dispatch({ type: SETTINGS_SET_MUSIC_ENABLED, payload: enabled });
};

/**
 * Coerce anything that reached us to a usable percentage.
 *
 * Applied on the way in and on the way out: a non-finite value from storage
 * and a non-finite value from a caller both end up in the same place, and
 * NaN propagates silently all the way to the gain node.
 */
export const clampVolume = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : AppConstants.DEFAULT_MUSIC_VOLUME;

/** Music level as a percentage, 0-100. */
export const setMusicVolume = (volume: number) => async (dispatch: any) => {
  const clamped = clampVolume(volume);
  await StorageService.setInt(AppConstants.MUSIC_VOLUME_KEY, clamped);
  dispatch({ type: SETTINGS_SET_MUSIC_VOLUME, payload: clamped });
};

export const setNpcRosterMode = (mode: NpcRosterMode) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.NPC_ROSTER_MODE_KEY, mode);
  dispatch({ type: SETTINGS_SET_NPC_ROSTER_MODE, payload: mode });
};

/** Apply the roster active for the current match (auto rotation or fixed). */
export const setActiveMatchRoster = (id: RosterId) => async (dispatch: any) => {
  await StorageService.setString(AppConstants.NPC_ROSTER_KEY, id);
  dispatch({ type: SETTINGS_SET_NPC_ROSTER, payload: id });
};