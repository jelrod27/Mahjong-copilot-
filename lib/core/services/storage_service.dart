import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/user_progress.dart';
import '../models/game_state.dart';

class StorageService {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<bool> setString(String key, String value) async {
    return await _prefs?.setString(key, value) ?? false;
  }

  static Future<String?> getString(String key) async {
    return _prefs?.getString(key);
  }

  static Future<bool> setBool(String key, bool value) async {
    return await _prefs?.setBool(key, value) ?? false;
  }

  static Future<bool?> getBool(String key) async {
    return _prefs?.getBool(key);
  }

  static Future<bool> setInt(String key, int value) async {
    return await _prefs?.setInt(key, value) ?? false;
  }

  static Future<int?> getInt(String key) async {
    return _prefs?.getInt(key);
  }

  static Future<bool> saveProgress(UserProgress progress) async {
    final json = jsonEncode(progress.toJson());
    return await setString('user_progress_${progress.userId}', json);
  }

  static Future<UserProgress?> getProgress(String userId) async {
    final json = await getString('user_progress_$userId');
    if (json == null) return null;

    try {
      final data = jsonDecode(json) as Map<String, dynamic>;
      return UserProgress.fromJson(data);
    } catch (e) {
      return null;
    }
  }

  static Future<bool> saveGame(GameState game) async {
    final json = jsonEncode(game.toJson());
    return await setString('current_game_${game.id}', json);
  }

  static Future<GameState?> getGame(String gameId) async {
    final json = await getString('current_game_$gameId');
    if (json == null) return null;

    try {
      final data = jsonDecode(json) as Map<String, dynamic>;
      return GameState.fromJson(data);
    } catch (e) {
      return null;
    }
  }

  static Future<bool> clear() async {
    return await _prefs?.clear() ?? false;
  }
}

