class AppLocalizations {
  static const Map<String, Map<String, String>> _localizedStrings = {
    'en': {
      // App
      'app_name': 'Mahjong Learning App',
      
      // Navigation
      'nav_home': 'Home',
      'nav_learn': 'Learn',
      'nav_practice': 'Practice',
      'nav_reference': 'Reference',
      'nav_progress': 'Progress',
      'nav_settings': 'Settings',
      
      // Authentication
      'auth_sign_in': 'Sign In',
      'auth_sign_up': 'Sign Up',
      'auth_sign_out': 'Sign Out',
      'auth_email': 'Email',
      'auth_password': 'Password',
      'auth_welcome_back': 'Welcome Back',
      'auth_create_account': 'Create Account',
      'auth_already_have_account': 'Already have an account? Sign In',
      'auth_no_account': 'Don\'t have an account? Sign Up',
      
      // Learning
      'learn_tile_recognition': 'Tile Recognition',
      'learn_learning_path': 'Learning Path',
      'learn_level': 'Level',
      'learn_complete': 'Complete',
      'learn_in_progress': 'In Progress',
      'learn_start': 'Start',
      'learn_continue': 'Continue',
      
      // Practice
      'practice_start_game': 'Start New Game',
      'practice_select_difficulty': 'Select AI Difficulty',
      'practice_difficulty_beginner': 'Beginner',
      'practice_difficulty_intermediate': 'Intermediate',
      'practice_difficulty_advanced': 'Advanced',
      'practice_draw': 'Draw',
      'practice_discard': 'Discard',
      'practice_win': 'Win',
      'practice_pause': 'Pause',
      'practice_resume': 'Resume',
      'practice_quit': 'Quit',
      
      // Progress
      'progress_overall': 'Overall Progress',
      'progress_statistics': 'Statistics',
      'progress_achievements': 'Achievements',
      'progress_time_spent': 'Time Spent',
      'progress_quizzes': 'Quizzes Completed',
      'progress_games': 'Games Played',
      'progress_wins': 'Games Won',
      'progress_win_rate': 'Win Rate',
      
      // Settings
      'settings_mahjong_variant': 'Mahjong Variant',
      'settings_language': 'Language',
      'settings_dark_mode': 'Dark Mode',
      'settings_sounds': 'Sounds',
      'settings_notifications': 'Notifications',
      'settings_account': 'Account',
      
      // Common
      'common_loading': 'Loading...',
      'common_error': 'Error',
      'common_success': 'Success',
      'common_cancel': 'Cancel',
      'common_save': 'Save',
      'common_delete': 'Delete',
      'common_edit': 'Edit',
      'common_close': 'Close',
      'common_next': 'Next',
      'common_previous': 'Previous',
      'common_done': 'Done',
    },
    'zh': {
      // App
      'app_name': '麻将学习应用',
      
      // Navigation
      'nav_home': '首页',
      'nav_learn': '学习',
      'nav_practice': '练习',
      'nav_reference': '参考',
      'nav_progress': '进度',
      'nav_settings': '设置',
      
      // Authentication
      'auth_sign_in': '登录',
      'auth_sign_up': '注册',
      'auth_sign_out': '登出',
      'auth_email': '电子邮箱',
      'auth_password': '密码',
      'auth_welcome_back': '欢迎回来',
      'auth_create_account': '创建账户',
      
      // Common
      'common_loading': '加载中...',
      'common_error': '错误',
      'common_success': '成功',
      'common_cancel': '取消',
      'common_save': '保存',
      'common_done': '完成',
    },
    'ja': {
      // App
      'app_name': '麻雀学習アプリ',
      
      // Navigation
      'nav_home': 'ホーム',
      'nav_learn': '学習',
      'nav_practice': '練習',
      'nav_reference': '参考',
      'nav_progress': '進捗',
      'nav_settings': '設定',
      
      // Common
      'common_loading': '読み込み中...',
      'common_error': 'エラー',
      'common_success': '成功',
      'common_cancel': 'キャンセル',
      'common_save': '保存',
      'common_done': '完了',
    },
  };

  static String getLocalizedString(String key, String locale) {
    return _localizedStrings[locale]?[key] ?? _localizedStrings['en']?[key] ?? key;
  }

  static bool hasLocale(String locale) {
    return _localizedStrings.containsKey(locale);
  }

  static List<String> getSupportedLocales() {
    return _localizedStrings.keys.toList();
  }
}

