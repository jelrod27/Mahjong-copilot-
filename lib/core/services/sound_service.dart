import 'package:audioplayers/audioplayers.dart';

/// Service for playing sound effects throughout the app
class SoundService {
  static final AudioPlayer _player = AudioPlayer();
  static bool _soundEnabled = true;

  /// Initialize sound service
  static Future<void> init() async {
    // Sound enabled state should be loaded from settings
  }

  /// Set whether sounds are enabled
  static void setSoundEnabled(bool enabled) {
    _soundEnabled = enabled;
  }

  /// Play tile click sound
  static Future<void> playTileClick() async {
    if (!_soundEnabled) return;
    try {
      await _player.play(AssetSource('sounds/tile_click.mp3'));
    } catch (e) {
      // Silently fail if sound file doesn't exist
      print('Sound error: $e');
    }
  }

  /// Play tile shuffle sound
  static Future<void> playShuffle() async {
    if (!_soundEnabled) return;
    try {
      await _player.play(AssetSource('sounds/tile_shuffle.mp3'));
    } catch (e) {
      print('Sound error: $e');
    }
  }

  /// Play win sound
  static Future<void> playWin() async {
    if (!_soundEnabled) return;
    try {
      await _player.play(AssetSource('sounds/win.mp3'));
    } catch (e) {
      print('Sound error: $e');
    }
  }

  /// Play lose sound
  static Future<void> playLose() async {
    if (!_soundEnabled) return;
    try {
      await _player.play(AssetSource('sounds/lose.mp3'));
    } catch (e) {
      print('Sound error: $e');
    }
  }

  /// Play discard sound
  static Future<void> playDiscard() async {
    if (!_soundEnabled) return;
    try {
      await _player.play(AssetSource('sounds/discard.mp3'));
    } catch (e) {
      print('Sound error: $e');
    }
  }

  /// Dispose resources
  static Future<void> dispose() async {
    await _player.dispose();
  }
}

