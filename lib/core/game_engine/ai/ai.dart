/// AI module for single-player mahjong games
///
/// Provides AI opponents with three difficulty levels:
/// - Beginner: Makes random decisions, often mistakes
/// - Intermediate: Follows basic strategy, recognizes patterns
/// - Advanced: Optimal play, defensive awareness, reads opponents
library;

export 'ai_difficulty.dart';
export 'ai_player.dart';
export 'hand_evaluator.dart';
