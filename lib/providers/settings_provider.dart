import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../core/services/storage_service.dart';
import '../core/constants/app_constants.dart';

class SettingsProvider with ChangeNotifier {
  String _selectedVariant = AppConstants.variants.first;
  Locale _locale = const Locale('en');
  ThemeMode _themeMode = ThemeMode.light;
  bool _soundEnabled = true;
  bool _notificationsEnabled = true;

  String get selectedVariant => _selectedVariant;
  Locale get locale => _locale;
  ThemeMode get themeMode => _themeMode;
  bool get soundEnabled => _soundEnabled;
  bool get notificationsEnabled => _notificationsEnabled;

  Future<void> initialize() async {
    await loadSettings();
  }

  Future<void> loadSettings() async {
    _selectedVariant =
        await StorageService.getString(AppConstants.selectedVariantKey) ??
            AppConstants.variants.first;

    final themeModeString =
        await StorageService.getString(AppConstants.themeModeKey) ?? 'light';
    _themeMode = themeModeString == 'dark' ? ThemeMode.dark : ThemeMode.light;

    _soundEnabled =
        await StorageService.getBool(AppConstants.soundEnabledKey) ?? true;

    final languageCode =
        await StorageService.getString(AppConstants.languageKey) ?? 'en';
    _locale = Locale(languageCode);

    notifyListeners();
  }

  Future<void> setSelectedVariant(String variant) async {
    _selectedVariant = variant;
    await StorageService.setString(AppConstants.selectedVariantKey, variant);
    notifyListeners();
  }

  Future<void> setLocale(Locale locale) async {
    _locale = locale;
    await StorageService.setString(AppConstants.languageKey, locale.languageCode);
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    await StorageService.setString(
      AppConstants.themeModeKey,
      mode == ThemeMode.dark ? 'dark' : 'light',
    );
    notifyListeners();
  }

  Future<void> setSoundEnabled(bool enabled) async {
    _soundEnabled = enabled;
    await StorageService.setBool(AppConstants.soundEnabledKey, enabled);
    notifyListeners();
  }

  Future<void> setNotificationsEnabled(bool enabled) async {
    _notificationsEnabled = enabled;
    await StorageService.setBool('notifications_enabled', enabled);
    notifyListeners();
  }
}

