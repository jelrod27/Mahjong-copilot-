/// Defines AI difficulty levels for single-player mode
enum AiDifficulty {
  /// Beginner AI - Makes random decisions with occasional mistakes
  beginner(
    name: 'Beginner',
    description: 'Learning to play - makes simple decisions',
    thinkingDelayMs: 2000,
    mistakeChance: 0.3,
    claimAwareness: 0.5,
    handEvaluationDepth: 1,
  ),

  /// Intermediate AI - Follows basic strategy, recognizes patterns
  intermediate(
    name: 'Intermediate',
    description: 'Knows the basics - follows common strategies',
    thinkingDelayMs: 1500,
    mistakeChance: 0.1,
    claimAwareness: 0.8,
    handEvaluationDepth: 2,
  ),

  /// Advanced AI - Optimal play, defensive awareness, reading opponents
  advanced(
    name: 'Advanced',
    description: 'Expert player - strategic and defensive',
    thinkingDelayMs: 1000,
    mistakeChance: 0.02,
    claimAwareness: 0.95,
    handEvaluationDepth: 3,
  );

  final String name;
  final String description;
  final int thinkingDelayMs;
  final double mistakeChance;
  final double claimAwareness;
  final int handEvaluationDepth;

  const AiDifficulty({
    required this.name,
    required this.description,
    required this.thinkingDelayMs,
    required this.mistakeChance,
    required this.claimAwareness,
    required this.handEvaluationDepth,
  });
}

/// Configuration for AI behavior
class AiConfig {
  final AiDifficulty difficulty;
  final bool useDefensivePlay;
  final bool announceActions;
  final int maxThinkingTimeMs;

  const AiConfig({
    required this.difficulty,
    this.useDefensivePlay = true,
    this.announceActions = true,
    this.maxThinkingTimeMs = 5000,
  });

  AiConfig copyWith({
    AiDifficulty? difficulty,
    bool? useDefensivePlay,
    bool? announceActions,
    int? maxThinkingTimeMs,
  }) {
    return AiConfig(
      difficulty: difficulty ?? this.difficulty,
      useDefensivePlay: useDefensivePlay ?? this.useDefensivePlay,
      announceActions: announceActions ?? this.announceActions,
      maxThinkingTimeMs: maxThinkingTimeMs ?? this.maxThinkingTimeMs,
    );
  }
}
