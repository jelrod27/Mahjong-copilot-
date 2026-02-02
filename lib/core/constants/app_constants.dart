class AppConstants {
  // App Info
  static const String appName = 'Mahjong Learning App';
  static const String appVersion = '1.0.0';

  // Tile Constants
  static const int totalTiles = 144;
  static const int tilesPerSuit = 36; // 9 tiles × 4 copies
  static const int honorTiles = 28; // 7 types × 4 copies
  static const int flowerSeasonTiles = 8; // 4 flowers + 4 seasons

  // Learning Levels
  static const List<String> learningLevels = [
    'Level 1: Basic Tile Identification',
    'Level 2: Understanding Suits and Sets',
    'Level 3: Hand Combinations',
    'Level 4: Scoring Fundamentals',
    'Level 5: Advanced Scoring',
    'Level 6: Strategic Gameplay',
  ];

  // Mahjong Variants
  static const List<String> variants = [
    'Hong Kong Mahjong',
    'Japanese Riichi Mahjong',
    'Chinese Classical Mahjong',
    'American Mahjong',
    'Singaporean Mahjong',
  ];

  // Firebase Collections
  static const String usersCollection = 'users';
  static const String progressCollection = 'progress';
  static const String learningContentCollection = 'learning_content';
  static const String gamesCollection = 'games';

  // Storage Keys
  static const String selectedVariantKey = 'selected_variant';
  static const String themeModeKey = 'theme_mode';
  static const String languageKey = 'language';
  static const String soundEnabledKey = 'sound_enabled';
  static const String offlineProgressKey = 'offline_progress';
}

