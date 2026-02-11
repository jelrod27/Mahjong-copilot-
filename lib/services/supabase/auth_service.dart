import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'supabase_config.dart';

/// Authentication service using Supabase Auth
class AuthService {
  AuthService._();
  static final instance = AuthService._();

  /// Stream of authentication state changes
  Stream<AuthState> get authStateChanges =>
      SupabaseConfig.client.auth.onAuthStateChange;

  /// Get the current user
  User? get currentUser => SupabaseConfig.client.auth.currentUser;

  /// Get the current session
  Session? get currentSession => SupabaseConfig.client.auth.currentSession;

  /// Check if user is logged in
  bool get isLoggedIn => currentUser != null;

  /// Sign up with email and password
  Future<AuthResult> signUp({
    required String email,
    required String password,
    String? displayName,
  }) async {
    try {
      final response = await SupabaseConfig.client.auth.signUp(
        email: email,
        password: password,
        data: displayName != null ? {'display_name': displayName} : null,
      );

      if (response.user != null) {
        return AuthResult.success(response.user!);
      }

      return AuthResult.failure('Sign up failed. Please try again.');
    } on AuthException catch (e) {
      return AuthResult.failure(e.message);
    } catch (e) {
      if (kDebugMode) print('Sign up error: $e');
      return AuthResult.failure('An unexpected error occurred.');
    }
  }

  /// Sign in with email and password
  Future<AuthResult> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await SupabaseConfig.client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user != null) {
        return AuthResult.success(response.user!);
      }

      return AuthResult.failure('Sign in failed. Please try again.');
    } on AuthException catch (e) {
      return AuthResult.failure(e.message);
    } catch (e) {
      if (kDebugMode) print('Sign in error: $e');
      return AuthResult.failure('An unexpected error occurred.');
    }
  }

  /// Sign in anonymously (guest mode)
  Future<AuthResult> signInAnonymously() async {
    try {
      final response = await SupabaseConfig.client.auth.signInAnonymously();

      if (response.user != null) {
        return AuthResult.success(response.user!);
      }

      return AuthResult.failure('Guest sign in failed.');
    } on AuthException catch (e) {
      return AuthResult.failure(e.message);
    } catch (e) {
      if (kDebugMode) print('Anonymous sign in error: $e');
      return AuthResult.failure('An unexpected error occurred.');
    }
  }

  /// Sign out
  Future<void> signOut() async {
    await SupabaseConfig.client.auth.signOut();
  }

  /// Send password reset email
  Future<AuthResult> resetPassword(String email) async {
    try {
      await SupabaseConfig.client.auth.resetPasswordForEmail(email);
      return AuthResult.success(null);
    } on AuthException catch (e) {
      return AuthResult.failure(e.message);
    } catch (e) {
      if (kDebugMode) print('Reset password error: $e');
      return AuthResult.failure('An unexpected error occurred.');
    }
  }

  /// Update user profile
  Future<AuthResult> updateProfile({
    String? displayName,
    String? avatarUrl,
  }) async {
    try {
      final response = await SupabaseConfig.client.auth.updateUser(
        UserAttributes(
          data: {
            if (displayName != null) 'display_name': displayName,
            if (avatarUrl != null) 'avatar_url': avatarUrl,
          },
        ),
      );

      if (response.user != null) {
        return AuthResult.success(response.user!);
      }

      return AuthResult.failure('Profile update failed.');
    } on AuthException catch (e) {
      return AuthResult.failure(e.message);
    } catch (e) {
      if (kDebugMode) print('Update profile error: $e');
      return AuthResult.failure('An unexpected error occurred.');
    }
  }

  /// Get user's display name
  String getDisplayName() {
    final user = currentUser;
    if (user == null) return 'Guest';

    final metadata = user.userMetadata;
    return metadata?['display_name'] as String? ??
        user.email?.split('@').first ??
        'Player';
  }
}

/// Result of an authentication operation
class AuthResult {
  final bool isSuccess;
  final User? user;
  final String? errorMessage;

  const AuthResult._({
    required this.isSuccess,
    this.user,
    this.errorMessage,
  });

  factory AuthResult.success(User? user) => AuthResult._(
        isSuccess: true,
        user: user,
      );

  factory AuthResult.failure(String message) => AuthResult._(
        isSuccess: false,
        errorMessage: message,
      );
}
