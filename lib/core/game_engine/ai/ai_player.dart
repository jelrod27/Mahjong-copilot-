import 'dart:async';
import 'dart:math';

import '../../models/tile.dart';
import '../../models/meld.dart';
import '../../models/player.dart';
import 'ai_difficulty.dart';
import 'hand_evaluator.dart';

/// Represents a decision made by the AI
sealed class AiDecision {
  const AiDecision();
}

/// AI decides to discard a tile
class DiscardDecision extends AiDecision {
  final Tile tile;
  const DiscardDecision(this.tile);
}

/// AI decides to claim a discarded tile
class ClaimDecision extends AiDecision {
  final ClaimType type;
  final List<Tile> tilesFromHand;
  const ClaimDecision(this.type, this.tilesFromHand);
}

/// AI decides to declare a win
class WinDecision extends AiDecision {
  const WinDecision();
}

/// AI decides to pass (not claim a tile)
class PassDecision extends AiDecision {
  const PassDecision();
}

/// AI decides to declare a concealed kong
class ConcealedKongDecision extends AiDecision {
  final List<Tile> tiles;
  const ConcealedKongDecision(this.tiles);
}

/// Types of claims the AI can make
enum ClaimType {
  chow,
  pong,
  kong,
  win,
}

/// AI player that makes decisions based on difficulty level
class AiPlayer {
  final String id;
  final String name;
  final AiConfig config;
  final HandEvaluator _evaluator = HandEvaluator();
  final Random _random = Random();

  AiPlayer({
    required this.id,
    required this.name,
    required this.config,
  });

  /// Get the current difficulty level
  AiDifficulty get difficulty => config.difficulty;

  /// Decide which tile to discard
  Future<DiscardDecision> decideDiscard(Player player) async {
    // Simulate thinking time
    await _simulateThinking();

    final hand = player.hand;
    final melds = player.exposedMelds;

    // Check for mistakes based on difficulty
    if (_shouldMakeMistake()) {
      // Pick a random tile (mistake)
      final randomTile = hand[_random.nextInt(hand.length)];
      return DiscardDecision(randomTile);
    }

    // Find the best tile to discard
    final bestDiscard = _evaluator.findBestDiscard(
      hand,
      melds,
      randomFactor: difficulty.mistakeChance,
    );

    return DiscardDecision(bestDiscard);
  }

  /// Decide whether to claim a discarded tile
  Future<AiDecision> decideOnDiscard({
    required Player player,
    required Tile discardedTile,
    required bool canChow,
    required bool canPong,
    required bool canKong,
    required bool canWin,
  }) async {
    // Simulate thinking time (shorter for claims)
    await _simulateThinking(factor: 0.5);

    final hand = player.hand;
    final melds = player.exposedMelds;

    // Always try to win if possible
    if (canWin && _evaluator.canWinWith(hand, melds, discardedTile)) {
      return const WinDecision();
    }

    // Check if AI should consider claiming (based on awareness)
    if (_random.nextDouble() > difficulty.claimAwareness) {
      return const PassDecision();
    }

    // Evaluate the value of claiming
    final currentShanten = _evaluator.calculateShanten(hand, melds);

    // Kong: Get 4 of a kind exposed
    if (canKong) {
      final matchingTiles = hand.where((t) => t.tileKey == discardedTile.tileKey).toList();
      if (matchingTiles.length >= 3) {
        // Kong is usually good for honor tiles
        if (discardedTile.isHonor) {
          return ClaimDecision(ClaimType.kong, matchingTiles.take(3).toList());
        }
        // For suit tiles, consider if it helps the hand
        if (_random.nextDouble() > 0.3) {
          return ClaimDecision(ClaimType.kong, matchingTiles.take(3).toList());
        }
      }
    }

    // Pong: Get 3 of a kind exposed
    if (canPong) {
      final matchingTiles = hand.where((t) => t.tileKey == discardedTile.tileKey).toList();
      if (matchingTiles.length >= 2) {
        // Evaluate if ponging improves the hand
        final newHand = hand.where((t) => !matchingTiles.take(2).contains(t)).toList();
        final newMelds = [...melds, Meld.pong(matchingTiles[0], matchingTiles[1], discardedTile)];
        final newShanten = _evaluator.calculateShanten(newHand, newMelds);

        // Pong if it improves shanten or maintains it for honor tiles
        if (newShanten < currentShanten || (newShanten == currentShanten && discardedTile.isHonor)) {
          return ClaimDecision(ClaimType.pong, matchingTiles.take(2).toList());
        }

        // Advanced AI might pong defensively
        if (difficulty == AiDifficulty.advanced && discardedTile.isHonor) {
          return ClaimDecision(ClaimType.pong, matchingTiles.take(2).toList());
        }
      }
    }

    // Chow: Get a sequence (only from player to the left)
    if (canChow && discardedTile.canFormSequence) {
      final chowTiles = _findChowTiles(hand, discardedTile);
      if (chowTiles != null) {
        // Evaluate if chowing improves the hand
        final newHand = hand.where((t) => !chowTiles.contains(t)).toList();
        final newMelds = [...melds, Meld.chow(chowTiles[0], chowTiles[1], discardedTile)];
        final newShanten = _evaluator.calculateShanten(newHand, newMelds);

        // Chow if it improves shanten significantly
        if (newShanten < currentShanten - 1) {
          return ClaimDecision(ClaimType.chow, chowTiles);
        }

        // Beginner AI might chow more liberally
        if (difficulty == AiDifficulty.beginner && newShanten <= currentShanten) {
          if (_random.nextDouble() > 0.5) {
            return ClaimDecision(ClaimType.chow, chowTiles);
          }
        }
      }
    }

    return const PassDecision();
  }

  /// Check if the AI should declare a concealed kong
  Future<ConcealedKongDecision?> checkConcealedKong(Player player) async {
    final hand = player.hand;

    // Group tiles
    final groups = <String, List<Tile>>{};
    for (final tile in hand) {
      groups.putIfAbsent(tile.tileKey, () => []).add(tile);
    }

    // Find any sets of 4
    for (final entry in groups.entries) {
      if (entry.value.length == 4) {
        // Check if declaring kong is beneficial
        // (usually good for honor tiles)
        final tile = entry.value.first;
        if (tile.isHonor || _random.nextDouble() > 0.3) {
          return ConcealedKongDecision(entry.value);
        }
      }
    }

    return null;
  }

  /// Check if the AI can win with self-drawn tile
  bool checkSelfDrawWin(Player player, Tile drawnTile) {
    final hand = [...player.hand, drawnTile];
    return _evaluator.isWinningHand(hand, player.exposedMelds);
  }

  /// Find tiles in hand that can form a chow with the discarded tile
  List<Tile>? _findChowTiles(List<Tile> hand, Tile discardedTile) {
    if (!discardedTile.canFormSequence || discardedTile.number == null) {
      return null;
    }

    final suit = discardedTile.suit;
    final number = discardedTile.number!;
    final suitTiles = hand.where((t) => t.suit == suit && t.number != null).toList();

    // Try different chow configurations
    // Configuration 1: tile is lowest (need n+1, n+2)
    if (number <= 7) {
      final t1 = suitTiles.firstWhere((t) => t.number == number + 1, orElse: () => discardedTile);
      final t2 = suitTiles.firstWhere((t) => t.number == number + 2, orElse: () => discardedTile);
      if (t1.number == number + 1 && t2.number == number + 2) {
        return [t1, t2];
      }
    }

    // Configuration 2: tile is middle (need n-1, n+1)
    if (number >= 2 && number <= 8) {
      final t1 = suitTiles.firstWhere((t) => t.number == number - 1, orElse: () => discardedTile);
      final t2 = suitTiles.firstWhere((t) => t.number == number + 1, orElse: () => discardedTile);
      if (t1.number == number - 1 && t2.number == number + 1) {
        return [t1, t2];
      }
    }

    // Configuration 3: tile is highest (need n-2, n-1)
    if (number >= 3) {
      final t1 = suitTiles.firstWhere((t) => t.number == number - 2, orElse: () => discardedTile);
      final t2 = suitTiles.firstWhere((t) => t.number == number - 1, orElse: () => discardedTile);
      if (t1.number == number - 2 && t2.number == number - 1) {
        return [t1, t2];
      }
    }

    return null;
  }

  /// Simulate AI thinking time based on difficulty
  Future<void> _simulateThinking({double factor = 1.0}) async {
    final baseDelay = difficulty.thinkingDelayMs;
    final variance = (baseDelay * 0.3).toInt();
    final delay = baseDelay + _random.nextInt(variance) - variance ~/ 2;
    await Future.delayed(Duration(milliseconds: (delay * factor).toInt()));
  }

  /// Check if the AI should make a mistake based on difficulty
  bool _shouldMakeMistake() {
    return _random.nextDouble() < difficulty.mistakeChance;
  }
}

/// Factory for creating AI players
class AiPlayerFactory {
  static const _names = [
    'East Bot',
    'South Bot',
    'West Bot',
    'North Bot',
    'Lucky Dragon',
    'Jade Bamboo',
    'Golden Phoenix',
    'Silver Tiger',
  ];

  static int _nameIndex = 0;

  /// Create an AI player with the given difficulty
  static AiPlayer create({
    required AiDifficulty difficulty,
    String? name,
    String? id,
  }) {
    final playerName = name ?? _names[_nameIndex++ % _names.length];
    final playerId = id ?? 'ai_${DateTime.now().millisecondsSinceEpoch}_${_nameIndex}';

    return AiPlayer(
      id: playerId,
      name: playerName,
      config: AiConfig(difficulty: difficulty),
    );
  }

  /// Create a full table of 3 AI players (for single player mode)
  static List<AiPlayer> createTable(AiDifficulty difficulty) {
    return [
      create(difficulty: difficulty, name: 'South Bot'),
      create(difficulty: difficulty, name: 'West Bot'),
      create(difficulty: difficulty, name: 'North Bot'),
    ];
  }

  /// Create AI players with mixed difficulties
  static List<AiPlayer> createMixedTable() {
    return [
      create(difficulty: AiDifficulty.beginner, name: 'Rookie'),
      create(difficulty: AiDifficulty.intermediate, name: 'Regular'),
      create(difficulty: AiDifficulty.advanced, name: 'Expert'),
    ];
  }
}
