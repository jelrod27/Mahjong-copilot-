import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_progress.dart';
import '../core/services/firebase_service.dart';
import '../core/services/storage_service.dart';

class ProgressProvider with ChangeNotifier {
  UserProgress? _progress;
  bool _isLoading = false;
  String? _errorMessage;

  UserProgress? get progress => _progress;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> initialize(String userId, String variant) async {
    _isLoading = true;
    notifyListeners();

    try {
      // Try to load from local storage first
      final localProgress = await StorageService.getProgress(userId);
      if (localProgress != null) {
        _progress = localProgress;
      }

      // Then sync from Firestore
      await loadProgress(userId, variant);
    } catch (e) {
      _errorMessage = 'Failed to initialize progress: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadProgress(String userId, String variant) async {
    _isLoading = true;
    notifyListeners();

    try {
      final doc = await FirebaseService.firestore
          .collection('progress')
          .doc(userId)
          .get();

      if (doc.exists) {
        _progress = UserProgress.fromJson(doc.data()!);
      } else {
        // Create new progress
        _progress = UserProgress(
          userId: userId,
          variant: variant,
          levelProgress: {},
          createdAt: DateTime.now(),
          lastUpdated: DateTime.now(),
        );
        await saveProgress();
      }

      // Save to local storage
      await StorageService.saveProgress(_progress!);
    } catch (e) {
      _errorMessage = 'Failed to load progress: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateLevelProgress(
    LearningLevel level,
    LevelProgress levelProgress,
  ) async {
    if (_progress == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      final updatedProgress = Map<LearningLevel, LevelProgress>.from(
        _progress!.levelProgress,
      );
      updatedProgress[level] = levelProgress;

      _progress = _progress!.copyWith(
        levelProgress: updatedProgress,
        lastUpdated: DateTime.now(),
      );

      await saveProgress();
      await StorageService.saveProgress(_progress!);
    } catch (e) {
      _errorMessage = 'Failed to update progress: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> incrementGamesPlayed() async {
    if (_progress == null) return;

    _progress = _progress!.copyWith(
      gamesPlayed: _progress!.gamesPlayed + 1,
      lastUpdated: DateTime.now(),
    );

    await saveProgress();
    await StorageService.saveProgress(_progress!);
    notifyListeners();
  }

  Future<void> incrementGamesWon() async {
    if (_progress == null) return;

    _progress = _progress!.copyWith(
      gamesWon: _progress!.gamesWon + 1,
      lastUpdated: DateTime.now(),
    );

    await saveProgress();
    await StorageService.saveProgress(_progress!);
    notifyListeners();
  }

  Future<void> addTimeSpent(int seconds) async {
    if (_progress == null) return;

    _progress = _progress!.copyWith(
      totalTimeSpent: _progress!.totalTimeSpent + seconds,
      lastUpdated: DateTime.now(),
    );

    await saveProgress();
    await StorageService.saveProgress(_progress!);
    notifyListeners();
  }

  Future<void> addAchievement(String achievementId) async {
    if (_progress == null) return;

    if (_progress!.achievements.contains(achievementId)) return;

    final updatedAchievements = List<String>.from(_progress!.achievements)
      ..add(achievementId);

    _progress = _progress!.copyWith(
      achievements: updatedAchievements,
      lastUpdated: DateTime.now(),
    );

    await saveProgress();
    await StorageService.saveProgress(_progress!);
    notifyListeners();
  }

  Future<void> saveProgress() async {
    if (_progress == null) return;

    try {
      await FirebaseService.firestore
          .collection('progress')
          .doc(_progress!.userId)
          .set(_progress!.toJson(), SetOptions(merge: true));
    } catch (e) {
      _errorMessage = 'Failed to save progress: $e';
      debugPrint('Error saving progress: $e');
    }
  }

  Future<void> syncProgress() async {
    if (_progress == null) return;

    try {
      // Load from Firestore
      final doc = await FirebaseService.firestore
          .collection('progress')
          .doc(_progress!.userId)
          .get();

      if (doc.exists) {
        final remoteProgress = UserProgress.fromJson(doc.data()!);
        // Merge with local if local is newer
        if (_progress!.lastUpdated.isAfter(remoteProgress.lastUpdated)) {
          await saveProgress();
        } else {
          _progress = remoteProgress;
          await StorageService.saveProgress(_progress!);
        }
      } else {
        await saveProgress();
      }

      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to sync progress: $e';
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}

