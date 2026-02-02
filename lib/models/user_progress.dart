import 'package:cloud_firestore/cloud_firestore.dart';

enum LearningLevel {
  level1, // Basic tile identification
  level2, // Understanding suits and sets
  level3, // Hand combinations
  level4, // Scoring fundamentals
  level5, // Advanced scoring
  level6, // Strategic gameplay
}

class LevelProgress {
  final LearningLevel level;
  final int completedLessons;
  final int totalLessons;
  final int quizScore;
  final bool isCompleted;
  final DateTime? completedAt;

  const LevelProgress({
    required this.level,
    required this.completedLessons,
    required this.totalLessons,
    required this.quizScore,
    this.isCompleted = false,
    this.completedAt,
  });

  double get progressPercentage =>
      totalLessons > 0 ? completedLessons / totalLessons : 0.0;

  Map<String, dynamic> toJson() => {
        'level': level.name,
        'completedLessons': completedLessons,
        'totalLessons': totalLessons,
        'quizScore': quizScore,
        'isCompleted': isCompleted,
        'completedAt': completedAt?.toIso8601String(),
      };

  factory LevelProgress.fromJson(Map<String, dynamic> json) => LevelProgress(
        level: LearningLevel.values.firstWhere(
          (e) => e.name == json['level'],
        ),
        completedLessons: json['completedLessons'] as int,
        totalLessons: json['totalLessons'] as int,
        quizScore: json['quizScore'] as int,
        isCompleted: json['isCompleted'] as bool? ?? false,
        completedAt: json['completedAt'] != null
            ? DateTime.parse(json['completedAt'] as String)
            : null,
      );
}

class UserProgress {
  final String userId;
  final String variant; // Selected mahjong variant
  final Map<LearningLevel, LevelProgress> levelProgress;
  final int totalTimeSpent; // in seconds
  final int gamesPlayed;
  final int gamesWon;
  final int quizzesCompleted;
  final List<String> achievements; // Achievement IDs
  final DateTime lastUpdated;
  final DateTime createdAt;

  const UserProgress({
    required this.userId,
    required this.variant,
    required this.levelProgress,
    this.totalTimeSpent = 0,
    this.gamesPlayed = 0,
    this.gamesWon = 0,
    this.quizzesCompleted = 0,
    this.achievements = const [],
    required this.lastUpdated,
    required this.createdAt,
  });

  double get overallProgress {
    if (levelProgress.isEmpty) return 0.0;
    final totalProgress = levelProgress.values
        .map((p) => p.progressPercentage)
        .fold(0.0, (a, b) => a + b);
    return totalProgress / levelProgress.length;
  }

  int get completedLevels =>
      levelProgress.values.where((p) => p.isCompleted).length;

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'variant': variant,
        'levelProgress': levelProgress.map(
          (key, value) => MapEntry(key.name, value.toJson()),
        ),
        'totalTimeSpent': totalTimeSpent,
        'gamesPlayed': gamesPlayed,
        'gamesWon': gamesWon,
        'quizzesCompleted': quizzesCompleted,
        'achievements': achievements,
        'lastUpdated': Timestamp.fromDate(lastUpdated),
        'createdAt': Timestamp.fromDate(createdAt),
      };

  factory UserProgress.fromJson(Map<String, dynamic> json) {
    final levelProgressMap = <LearningLevel, LevelProgress>{};
    final levelData = json['levelProgress'] as Map<String, dynamic>?;
    if (levelData != null) {
      for (final entry in levelData.entries) {
        final level = LearningLevel.values.firstWhere(
          (e) => e.name == entry.key,
        );
        levelProgressMap[level] = LevelProgress.fromJson(entry.value);
      }
    }

    return UserProgress(
      userId: json['userId'] as String,
      variant: json['variant'] as String,
      levelProgress: levelProgressMap,
      totalTimeSpent: json['totalTimeSpent'] as int? ?? 0,
      gamesPlayed: json['gamesPlayed'] as int? ?? 0,
      gamesWon: json['gamesWon'] as int? ?? 0,
      quizzesCompleted: json['quizzesCompleted'] as int? ?? 0,
      achievements: List<String>.from(json['achievements'] as List? ?? []),
      lastUpdated: (json['lastUpdated'] as Timestamp).toDate(),
      createdAt: (json['createdAt'] as Timestamp).toDate(),
    );
  }

  UserProgress copyWith({
    String? userId,
    String? variant,
    Map<LearningLevel, LevelProgress>? levelProgress,
    int? totalTimeSpent,
    int? gamesPlayed,
    int? gamesWon,
    int? quizzesCompleted,
    List<String>? achievements,
    DateTime? lastUpdated,
    DateTime? createdAt,
  }) {
    return UserProgress(
      userId: userId ?? this.userId,
      variant: variant ?? this.variant,
      levelProgress: levelProgress ?? this.levelProgress,
      totalTimeSpent: totalTimeSpent ?? this.totalTimeSpent,
      gamesPlayed: gamesPlayed ?? this.gamesPlayed,
      gamesWon: gamesWon ?? this.gamesWon,
      quizzesCompleted: quizzesCompleted ?? this.quizzesCompleted,
      achievements: achievements ?? this.achievements,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

