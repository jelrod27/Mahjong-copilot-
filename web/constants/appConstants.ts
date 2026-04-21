export class AppConstants {
  // App Info
  static readonly APP_NAME = 'Mahjong Learning App';
  static readonly APP_VERSION = '1.0.0';

  // Tile Constants
  static readonly TOTAL_TILES = 144;
  static readonly TILES_PER_SUIT = 36; // 9 tiles × 4 copies
  static readonly HONOR_TILES = 28; // 7 types × 4 copies
  static readonly FLOWER_SEASON_TILES = 8; // 4 flowers + 4 seasons

  // Learning Levels
  static readonly LEARNING_LEVELS = [
    'Level 1: Basic Tile Identification',
    'Level 2: Understanding Suits and Sets',
    'Level 3: Hand Combinations',
    'Level 4: Scoring Fundamentals',
    'Level 5: Advanced Scoring',
    'Level 6: Strategic Gameplay',
  ];

  // Mahjong Variants
  static readonly VARIANTS = [
    'Hong Kong Mahjong',
    'Japanese Riichi Mahjong',
    'Chinese Classical Mahjong',
    'American Mahjong',
    'Singaporean Mahjong',
  ];

  // Firebase Collections
  static readonly USERS_COLLECTION = 'users';
  static readonly PROGRESS_COLLECTION = 'progress';
  static readonly LEARNING_CONTENT_COLLECTION = 'learning_content';
  static readonly GAMES_COLLECTION = 'games';

  // Storage Keys
  static readonly SELECTED_VARIANT_KEY = 'selected_variant';
  static readonly THEME_MODE_KEY = 'theme_mode';
  static readonly LANGUAGE_KEY = 'language';
  static readonly SOUND_ENABLED_KEY = 'sound_enabled';
  static readonly LARGER_UI_TEXT_KEY = 'larger_ui_text';
  static readonly SHOW_TUTOR_KEY = 'show_tutor';
  static readonly LIVE_FAAN_METER_KEY = 'live_faan_meter';
  static readonly TILE_VOICE_KEY = 'tile_voice';
  static readonly OFFLINE_PROGRESS_KEY = 'offline_progress';
}

