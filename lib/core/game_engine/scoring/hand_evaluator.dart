import '../../models/tile.dart';
import '../../models/meld.dart';

/// Result of evaluating a hand for winning
class HandEvaluation {
  final bool isWinning;
  final List<List<Meld>> possibleMeldCombinations;
  final String? reason;

  const HandEvaluation({
    required this.isWinning,
    this.possibleMeldCombinations = const [],
    this.reason,
  });

  static const notWinning = HandEvaluation(
    isWinning: false,
    reason: 'Hand is not complete',
  );
}

/// Evaluates whether a hand is a winning hand
class HandEvaluator {
  HandEvaluator._();

  /// Check if a hand is a winning hand (standard 4 melds + 1 pair pattern)
  /// Hand should be 14 tiles (or 17/20 with kongs)
  static HandEvaluation evaluate(List<Tile> hand, List<Meld> exposedMelds) {
    // Count total tiles
    final handTiles = hand.length;
    final exposedTiles = exposedMelds.fold<int>(0, (sum, m) => sum + m.tiles.length);

    // Standard winning hand: 14 tiles (4 melds of 3 + 1 pair of 2)
    // With kongs, can be 14 + 1 per kong
    final totalTiles = handTiles + exposedTiles;

    // Check for valid tile count
    if (totalTiles < 14) {
      return const HandEvaluation(
        isWinning: false,
        reason: 'Not enough tiles',
      );
    }

    // Check for special hands first
    if (_isThirteenOrphans(hand)) {
      return HandEvaluation(
        isWinning: true,
        possibleMeldCombinations: [],
        reason: 'Thirteen Orphans',
      );
    }

    // Try to find valid meld combinations
    final combinations = _findMeldCombinations(hand, 4 - exposedMelds.length);

    if (combinations.isEmpty) {
      return const HandEvaluation(
        isWinning: false,
        reason: 'Cannot form valid melds',
      );
    }

    return HandEvaluation(
      isWinning: true,
      possibleMeldCombinations: combinations,
    );
  }

  /// Check for Thirteen Orphans special hand
  static bool _isThirteenOrphans(List<Tile> hand) {
    if (hand.length != 14) return false;

    // Required tiles: 1 and 9 of each suit + all honors
    final required = <String>{
      'bamboo_1', 'bamboo_9',
      'character_1', 'character_9',
      'dot_1', 'dot_9',
      'wind_east', 'wind_south', 'wind_west', 'wind_north',
      'dragon_red', 'dragon_green', 'dragon_white',
    };

    final handIds = <String>{};
    for (final tile in hand) {
      String baseId;
      if (tile.number != null) {
        baseId = '${tile.suit.name}_${tile.number}';
      } else if (tile.wind != null) {
        baseId = 'wind_${tile.wind!.name}';
      } else if (tile.dragon != null) {
        baseId = 'dragon_${tile.dragon!.name}';
      } else {
        return false; // Bonus tiles not allowed
      }
      handIds.add(baseId);
    }

    // Must have all 13 unique terminals/honors, plus one pair
    return required.every((id) => handIds.contains(id));
  }

  /// Find all possible meld combinations for a hand
  static List<List<Meld>> _findMeldCombinations(List<Tile> tiles, int meldsNeeded) {
    final results = <List<Meld>>[];
    _findCombinationsRecursive(List.from(tiles), [], meldsNeeded, results);
    return results;
  }

  static void _findCombinationsRecursive(
    List<Tile> remaining,
    List<Meld> current,
    int meldsNeeded,
    List<List<Meld>> results,
  ) {
    // If we have all melds, check for pair
    if (meldsNeeded == 0) {
      if (remaining.length == 2 && MeldValidator.isValidPair(remaining[0], remaining[1])) {
        final pair = MeldValidator.createPair(remaining[0], remaining[1])!;
        results.add([...current, pair]);
      }
      return;
    }

    if (remaining.length < meldsNeeded * 3 + 2) return; // Not enough tiles

    // Sort remaining tiles for consistent processing
    remaining.sort((a, b) {
      final suitCompare = a.suit.index.compareTo(b.suit.index);
      if (suitCompare != 0) return suitCompare;
      if (a.number != null && b.number != null) {
        return a.number!.compareTo(b.number!);
      }
      return 0;
    });

    final first = remaining[0];
    final rest = remaining.sublist(1);

    // Try to form a pong with the first tile
    final matchingTiles = rest.where((t) => t.matches(first)).toList();
    if (matchingTiles.length >= 2) {
      final pong = MeldValidator.createPong(first, matchingTiles[0], matchingTiles[1], isConcealed: true);
      if (pong != null) {
        final newRemaining = List<Tile>.from(rest);
        newRemaining.remove(matchingTiles[0]);
        newRemaining.remove(matchingTiles[1]);
        _findCombinationsRecursive(
          newRemaining,
          [...current, pong],
          meldsNeeded - 1,
          results,
        );
      }
    }

    // Try to form a chow with the first tile
    if (first.canFormSequence) {
      final n = first.number!;
      final sameSuit = rest.where((t) => t.suit == first.suit && t.number != null).toList();

      // Find tiles for n+1 and n+2
      final plus1 = sameSuit.where((t) => t.number == n + 1).toList();
      final plus2 = sameSuit.where((t) => t.number == n + 2).toList();

      if (plus1.isNotEmpty && plus2.isNotEmpty) {
        final chow = MeldValidator.createChow(first, plus1[0], plus2[0], isConcealed: true);
        if (chow != null) {
          final newRemaining = List<Tile>.from(rest);
          newRemaining.remove(plus1[0]);
          newRemaining.remove(plus2[0]);
          _findCombinationsRecursive(
            newRemaining,
            [...current, chow],
            meldsNeeded - 1,
            results,
          );
        }
      }
    }
  }

  /// Quick check if hand could potentially win with one more tile
  static bool isReady(List<Tile> hand, List<Meld> exposedMelds) {
    if (hand.length != 13 - exposedMelds.fold<int>(0, (sum, m) => sum + m.tiles.length - 3)) {
      return false;
    }

    // Try adding each possible tile and check for winning
    final allTiles = TileFactory.createFullSet();
    final uniqueTiles = <String, Tile>{};
    for (final tile in allTiles) {
      String key;
      if (tile.number != null) {
        key = '${tile.suit.name}_${tile.number}';
      } else if (tile.wind != null) {
        key = 'wind_${tile.wind!.name}';
      } else if (tile.dragon != null) {
        key = 'dragon_${tile.dragon!.name}';
      } else {
        continue; // Skip bonus tiles
      }
      uniqueTiles[key] = tile;
    }

    for (final tile in uniqueTiles.values) {
      final testHand = [...hand, tile];
      final eval = evaluate(testHand, exposedMelds);
      if (eval.isWinning) return true;
    }

    return false;
  }

  /// Find all tiles that would complete the hand (waiting tiles)
  static List<Tile> findWaitingTiles(List<Tile> hand, List<Meld> exposedMelds) {
    final waiting = <Tile>[];

    final allTiles = TileFactory.createFullSet();
    final uniqueTiles = <String, Tile>{};
    for (final tile in allTiles) {
      String key;
      if (tile.number != null) {
        key = '${tile.suit.name}_${tile.number}';
      } else if (tile.wind != null) {
        key = 'wind_${tile.wind!.name}';
      } else if (tile.dragon != null) {
        key = 'dragon_${tile.dragon!.name}';
      } else {
        continue;
      }
      uniqueTiles[key] = tile;
    }

    for (final tile in uniqueTiles.values) {
      final testHand = [...hand, tile];
      final eval = evaluate(testHand, exposedMelds);
      if (eval.isWinning) {
        waiting.add(tile);
      }
    }

    return waiting;
  }
}
