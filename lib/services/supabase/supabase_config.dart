import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Configuration for Supabase connection
///
/// Set these values via environment variables or --dart-define:
/// flutter run --dart-define=SUPABASE_URL=your-url --dart-define=SUPABASE_ANON_KEY=your-key
class SupabaseConfig {
  // These should be set via dart-define
  static const String _url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );

  static const String _anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  /// Get the Supabase URL
  static String get url => _url;

  /// Get the Supabase anonymous key
  static String get anonKey => _anonKey;

  /// Check if Supabase is configured
  static bool get isConfigured => _url.isNotEmpty && _anonKey.isNotEmpty;

  /// Initialize Supabase
  static Future<void> initialize() async {
    if (!isConfigured) {
      if (kDebugMode) {
        print('Warning: Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
      }
      return;
    }

    await Supabase.initialize(
      url: _url,
      anonKey: _anonKey,
      debug: kDebugMode,
    );
  }

  /// Get the Supabase client instance
  static SupabaseClient get client => Supabase.instance.client;
}
