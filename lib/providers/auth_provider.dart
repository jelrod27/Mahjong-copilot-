import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_profile.dart';
import '../core/services/firebase_service.dart';
import '../core/services/storage_service.dart';

class AuthProvider with ChangeNotifier {
  UserProfile? _user;
  bool _isLoading = false;
  String? _errorMessage;

  UserProfile? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;

  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      final currentUser = FirebaseService.auth.currentUser;
      if (currentUser != null) {
        _user = UserProfile.fromFirebaseUser(currentUser);
        await _loadUserProfile();
      }
    } catch (e) {
      _errorMessage = 'Failed to initialize auth: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signInWithEmail(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final credential = await FirebaseService.auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        _user = UserProfile.fromFirebaseUser(credential.user!);
        await _loadUserProfile();
        await FirebaseService.logEvent('user_sign_in', {'method': 'email'});
      }
    } on FirebaseAuthException catch (e) {
      _errorMessage = _getAuthErrorMessage(e.code);
    } catch (e) {
      _errorMessage = 'Sign in failed: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signUpWithEmail(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final credential =
          await FirebaseService.auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        _user = UserProfile.fromFirebaseUser(credential.user!);
        await _saveUserProfile();
        await FirebaseService.logEvent('user_sign_up', {'method': 'email'});
      }
    } on FirebaseAuthException catch (e) {
      _errorMessage = _getAuthErrorMessage(e.code);
    } catch (e) {
      _errorMessage = 'Sign up failed: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    _isLoading = true;
    notifyListeners();

    try {
      await FirebaseService.auth.signOut();
      _user = null;
      await StorageService.clear();
      await FirebaseService.logEvent('user_sign_out', null);
    } catch (e) {
      _errorMessage = 'Sign out failed: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateProfile({
    String? displayName,
    String? photoUrl,
  }) async {
    if (_user == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      final user = FirebaseService.auth.currentUser;
      if (user != null) {
        await user.updateDisplayName(displayName);
        await user.updatePhotoURL(photoUrl);
        _user = UserProfile.fromFirebaseUser(user);
        await _saveUserProfile();
      }
    } catch (e) {
      _errorMessage = 'Profile update failed: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _loadUserProfile() async {
    if (_user == null) return;

    try {
      final doc = await FirebaseService.firestore
          .collection('users')
          .doc(_user!.uid)
          .get();

      if (doc.exists) {
        final data = doc.data()!;
        _user = UserProfile(
          uid: _user!.uid,
          email: _user!.email,
          displayName: data['displayName'] as String? ?? _user!.displayName,
          photoUrl: data['photoUrl'] as String? ?? _user!.photoUrl,
          createdAt: _user!.createdAt,
          lastLoginAt: DateTime.now(),
          isPremium: data['isPremium'] as bool? ?? false,
        );
      }
    } catch (e) {
      debugPrint('Failed to load user profile: $e');
    }
  }

  Future<void> _saveUserProfile() async {
    if (_user == null) return;

    try {
      await FirebaseService.firestore
          .collection('users')
          .doc(_user!.uid)
          .set(_user!.toJson(), SetOptions(merge: true));
    } catch (e) {
      debugPrint('Failed to save user profile: $e');
    }
  }

  String _getAuthErrorMessage(String code) {
    switch (code) {
      case 'weak-password':
        return 'The password provided is too weak.';
      case 'email-already-in-use':
        return 'An account already exists for this email.';
      case 'user-not-found':
        return 'No user found for this email.';
      case 'wrong-password':
        return 'Wrong password provided.';
      case 'invalid-email':
        return 'Invalid email address.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}

