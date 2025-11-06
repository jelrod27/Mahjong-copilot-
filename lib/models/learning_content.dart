import 'package:cloud_firestore/cloud_firestore.dart';
import 'user_progress.dart';

enum ContentType {
  lesson, // Learning lesson
  quiz, // Quiz question
  scenario, // Practice scenario
  video, // Video tutorial
  infographic, // Visual guide
}

enum Difficulty {
  beginner,
  intermediate,
  advanced,
}

class LearningContent {
  final String id;
  final String title;
  final String description;
  final ContentType type;
  final LearningLevel level;
  final Difficulty difficulty;
  final String variant; // Mahjong variant
  final Map<String, dynamic> content; // Flexible content structure
  final List<String> tags;
  final int estimatedMinutes;
  final String? thumbnailUrl;
  final String? videoUrl;
  final Map<String, String>? translations; // Multi-language support
  final int order; // Order within level
  final DateTime createdAt;
  final DateTime updatedAt;

  const LearningContent({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.level,
    required this.difficulty,
    required this.variant,
    required this.content,
    this.tags = const [],
    this.estimatedMinutes = 5,
    this.thumbnailUrl,
    this.videoUrl,
    this.translations,
    this.order = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'type': type.name,
        'level': level.name,
        'difficulty': difficulty.name,
        'variant': variant,
        'content': content,
        'tags': tags,
        'estimatedMinutes': estimatedMinutes,
        'thumbnailUrl': thumbnailUrl,
        'videoUrl': videoUrl,
        'translations': translations,
        'order': order,
        'createdAt': Timestamp.fromDate(createdAt),
        'updatedAt': Timestamp.fromDate(updatedAt),
      };

  factory LearningContent.fromJson(Map<String, dynamic> json) =>
      LearningContent(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        type: ContentType.values.firstWhere(
          (e) => e.name == json['type'],
        ),
        level: LearningLevel.values.firstWhere(
          (e) => e.name == json['level'],
        ),
        difficulty: Difficulty.values.firstWhere(
          (e) => e.name == json['difficulty'],
        ),
        variant: json['variant'] as String,
        content: json['content'] as Map<String, dynamic>,
        tags: List<String>.from(json['tags'] as List? ?? []),
        estimatedMinutes: json['estimatedMinutes'] as int? ?? 5,
        thumbnailUrl: json['thumbnailUrl'] as String?,
        videoUrl: json['videoUrl'] as String?,
        translations: json['translations'] != null
            ? Map<String, String>.from(json['translations'] as Map)
            : null,
        order: json['order'] as int? ?? 0,
        createdAt: (json['createdAt'] as Timestamp).toDate(),
        updatedAt: (json['updatedAt'] as Timestamp).toDate(),
      );
}

class QuizQuestion {
  final String id;
  final String question;
  final List<String> options;
  final int correctAnswerIndex;
  final String explanation;
  final String? imageUrl;
  final LearningLevel level;

  const QuizQuestion({
    required this.id,
    required this.question,
    required this.options,
    required this.correctAnswerIndex,
    required this.explanation,
    this.imageUrl,
    required this.level,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'question': question,
        'options': options,
        'correctAnswerIndex': correctAnswerIndex,
        'explanation': explanation,
        'imageUrl': imageUrl,
        'level': level.name,
      };

  factory QuizQuestion.fromJson(Map<String, dynamic> json) => QuizQuestion(
        id: json['id'] as String,
        question: json['question'] as String,
        options: List<String>.from(json['options'] as List),
        correctAnswerIndex: json['correctAnswerIndex'] as int,
        explanation: json['explanation'] as String,
        imageUrl: json['imageUrl'] as String?,
        level: LearningLevel.values.firstWhere(
          (e) => e.name == json['level'],
        ),
      );
}

