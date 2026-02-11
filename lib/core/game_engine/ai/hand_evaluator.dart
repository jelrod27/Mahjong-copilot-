import 'dart:math';

import '../../models/tile.dart';
import '../../models/meld.dart';

/// Evaluates the quality and potential of a mahjong hand
class HandEvaluator {
  final Random _random = Random();

  /// Evaluate how close a hand is to winning (shanten count)
  /// Lower is better, 0 = tenpai, -1 = winning hand
  int calculateShanten(List<Tile> hand, List<Meld> melds) {
    if (hand.isEmpty) return 8;

    // Count tiles needed for a winning hand
    // Simplified calculation for now
    final tilesNeeded = _estimateTilesNeeded(hand, melds);
    return tilesNeeded.clamp(-1, 8);
  }

  int _estimateTilesNeeded(List<Tile> hand, List<Meld> melds) {
    // Group tiles by type
    final groups = _groupTiles(hand);

    int pairs = 0;
    int triples = 0;
    int almostTriples = 0; // Two tiles that could form a meld
    int almostSequences = 0;

    for (final entry in groups.entries) {
      final count = entry.value;

      if (count >= 3) {
        triples += count ~/ 3;
        final remainder = count % 3;
        if (remainder >= 2) pairs++;
        else if (remainder == 1) almostTriples++;
      } else if (count == 2) {
        pairs++;
      } else if (count == 1) {
        almostTriples++;
      }
    }

    // Check for potential sequences in suited tiles
    almostSequences = _countPotentialSequences(hand);

    // Basic shanten calculation
    final totalMelds = melds.length + triples;
    final neededMelds = 4 - totalMelds;
    final hasPair = pairs > 0;

    // Rough estimate: each missing meld needs 2-3 tiles
    var shanten = neededMelds * 2;
    if (!hasPair) shanten++;

    // Reduce based on almost-complete melds
    shanten -= (almostTriples + almostSequences) ~/ 2;

    return shanten.clamp(-1, 8);
  }

  Map<String, int> _groupTiles(List<Tile> tiles) {
    final groups = <String, int>{};
    for (final tile in tiles) {
      final key = tile.tileKey;
      groups[key] = (groups[key] ?? 0) + 1;
    }
    return groups;
  }

  int _countPotentialSequences(List<Tile> hand) {
    int count = 0;
    final suited = hand.where((t) => t.type == TileType.suit && t.number != null).toList();

    for (final suit in [TileSuit.bamboo, TileSuit.character, TileSuit.dot]) {
      final suitTiles = suited.where((t) => t.suit == suit).toList();
      final numbers = suitTiles.map((t) => t.number!).toSet().toList()..sort();

      // Count consecutive pairs
      for (int i = 0; i < numbers.length - 1; i++) {
        if (numbers[i + 1] - numbers[i] <= 2) {
          count++;
        }
      }
    }

    return count;
  }

  /// Calculate the value/usefulness of a tile in the current hand
  double evaluateTileValue(Tile tile, List<Tile> hand, List<Meld> melds) {
    double value = 0;
    final handWithoutTile = hand.where((t) => t.id != tile.id).toList();

    // Count how many copies of this tile we have
    final copies = hand.where((t) => t.tileKey == tile.tileKey).length;

    // Pairs and triples are valuable
    if (copies >= 3) {
      value += 30; // Part of a pong
    } else if (copies == 2) {
      value += 15; // Part of a pair
    }

    // Check sequence potential for suited tiles
    if (tile.type == TileType.suit && tile.number != null) {
      value += _evaluateSequencePotential(tile, hand);
    }

    // Honor tiles get bonus for winds/dragons
    if (tile.type == TileType.honor) {
      value += 10; // Dragons and winds are always valuable
      if (tile.dragon != null) {
        value += 5; // Dragons slightly more valuable
      }
    }

    // Terminal tiles (1s and 9s) are less flexible
    if (tile.number == 1 || tile.number == 9) {
      value -= 5;
    }

    // Middle tiles (4, 5, 6) are most flexible
    if (tile.number != null && tile.number! >= 4 && tile.number! <= 6) {
      value += 5;
    }

    // Calculate shanten impact
    final currentShanten = calculateShanten(hand, melds);
    final newShanten = calculateShanten(handWithoutTile, melds);

    // If discarding this tile makes hand worse, it's valuable
    if (newShanten > currentShanten) {
      value += (newShanten - currentShanten) * 20;
    }

    return value;
  }

  double _evaluateSequencePotential(Tile tile, List<Tile> hand) {
    if (tile.number == null) return 0;

    double value = 0;
    final number = tile.number!;
    final suitTiles = hand.where(
      (t) => t.suit == tile.suit && t.number != null
    ).toList();

    final numbers = suitTiles.map((t) => t.number!).toSet();

    // Check for adjacent tiles
    if (numbers.contains(number - 1)) value += 10;
    if (numbers.contains(number + 1)) value += 10;
    if (numbers.contains(number - 2)) value += 5;
    if (numbers.contains(number + 2)) value += 5;

    // Check for complete sequences
    if (numbers.contains(number - 1) && numbers.contains(number - 2)) {
      value += 20; // Complete sequence below
    }
    if (numbers.contains(number + 1) && numbers.contains(number + 2)) {
      value += 20; // Complete sequence above
    }
    if (numbers.contains(number - 1) && numbers.contains(number + 1)) {
      value += 20; // Middle of sequence
    }

    return value;
  }

  /// Find the best tile to discard from a hand
  Tile findBestDiscard(List<Tile> hand, List<Meld> melds, {double randomFactor = 0}) {
    if (hand.isEmpty) {
      throw StateError('Cannot find discard from empty hand');
    }

    // Evaluate each tile
    final evaluations = <Tile, double>{};
    for (final tile in hand) {
      evaluations[tile] = evaluateTileValue(tile, hand, melds);
    }

    // Sort by value (ascending - lowest value should be discarded)
    final sorted = hand.toList()
      ..sort((a, b) => evaluations[a]!.compareTo(evaluations[b]!));

    // Apply randomness based on difficulty
    if (randomFactor > 0 && _random.nextDouble() < randomFactor) {
      // Pick a random tile from the bottom half (worse tiles)
      final bottomHalf = sorted.take((sorted.length / 2).ceil()).toList();
      return bottomHalf[_random.nextInt(bottomHalf.length)];
    }

    return sorted.first; // Return lowest value tile
  }

  /// Check if the hand can win with the given tile
  bool canWinWith(List<Tile> hand, List<Meld> melds, Tile? winningTile) {
    final fullHand = winningTile != null ? [...hand, winningTile] : hand;
    return isWinningHand(fullHand, melds);
  }

  /// Check if the hand is a winning hand
  bool isWinningHand(List<Tile> hand, List<Meld> melds) {
    // Need 4 melds + 1 pair total
    // Each exposed meld reduces tiles needed in hand
    final handTileCount = hand.length;
    final meldCount = melds.length;

    // Standard hand: 14 tiles total (4 melds of 3 + 1 pair of 2)
    // With exposed melds, hand should have: 14 - (meldCount * 3) tiles
    final expectedHandSize = 14 - (meldCount * 3);

    if (handTileCount != expectedHandSize && handTileCount != expectedHandSize + 1) {
      return false;
    }

    // Try to form 4 melds + 1 pair
    return _canFormWinningCombination(hand, 4 - meldCount);
  }

  bool _canFormWinningCombination(List<Tile> tiles, int meldsNeeded) {
    if (meldsNeeded == 0) {
      // Just need a pair
      return tiles.length == 2 && tiles[0].tileKey == tiles[1].tileKey;
    }

    if (tiles.length < meldsNeeded * 3 + 2) {
      return false;
    }

    // Group tiles
    final groups = _groupTiles(tiles);

    // Try each possible pair
    for (final pairKey in groups.keys.where((k) => groups[k]! >= 2)) {
      final remaining = List<Tile>.from(tiles);

      // Remove pair
      int removed = 0;
      remaining.removeWhere((t) {
        if (t.tileKey == pairKey && removed < 2) {
          removed++;
          return true;
        }
        return false;
      });

      // Try to form melds with remaining tiles
      if (_canFormMelds(remaining, meldsNeeded)) {
        return true;
      }
    }

    return false;
  }

  bool _canFormMelds(List<Tile> tiles, int meldsNeeded) {
    if (meldsNeeded == 0) return tiles.isEmpty;
    if (tiles.length < meldsNeeded * 3) return false;

    // Sort tiles for consistent processing
    final sorted = tiles.toList()
      ..sort((a, b) => a.tileKey.compareTo(b.tileKey));

    // Try to form a pong with first tile
    final first = sorted.first;
    final sameTiles = sorted.where((t) => t.tileKey == first.tileKey).toList();

    if (sameTiles.length >= 3) {
      final remaining = sorted.toList();
      for (int i = 0; i < 3; i++) {
        remaining.removeWhere((t) => t.id == sameTiles[i].id);
      }
      if (_canFormMelds(remaining, meldsNeeded - 1)) {
        return true;
      }
    }

    // Try to form a chow with first tile (if suited)
    if (first.type == TileType.suit && first.number != null) {
      final n = first.number!;
      final next1 = sorted.firstWhere(
        (t) => t.suit == first.suit && t.number == n + 1,
        orElse: () => first,
      );
      final next2 = sorted.firstWhere(
        (t) => t.suit == first.suit && t.number == n + 2,
        orElse: () => first,
      );

      if (next1.number == n + 1 && next2.number == n + 2) {
        final remaining = sorted.toList()
          ..remove(first)
          ..remove(next1)
          ..remove(next2);
        if (_canFormMelds(remaining, meldsNeeded - 1)) {
          return true;
        }
      }
    }

    return false;
  }

  /// Get tiles that would complete the hand (waiting tiles)
  List<String> getWaitingTiles(List<Tile> hand, List<Meld> melds) {
    final waiting = <String>[];

    // Generate all possible tiles
    final allTileKeys = _generateAllTileKeys();

    for (final key in allTileKeys) {
      // Create a dummy tile with this key
      final testTile = _createTileFromKey(key);
      if (testTile != null) {
        final testHand = [...hand, testTile];
        if (isWinningHand(testHand, melds)) {
          waiting.add(key);
        }
      }
    }

    return waiting;
  }

  List<String> _generateAllTileKeys() {
    final keys = <String>[];

    // Suited tiles
    for (final suit in ['bamboo', 'character', 'dot']) {
      for (int n = 1; n <= 9; n++) {
        keys.add('$suit-$n');
      }
    }

    // Wind tiles
    for (final wind in ['east', 'south', 'west', 'north']) {
      keys.add('wind-$wind');
    }

    // Dragon tiles
    for (final dragon in ['red', 'green', 'white']) {
      keys.add('dragon-$dragon');
    }

    return keys;
  }

  Tile? _createTileFromKey(String key) {
    final parts = key.split('-');
    if (parts.length != 2) return null;

    final type = parts[0];
    final value = parts[1];

    try {
      if (type == 'wind') {
        return Tile.wind(Wind.values.firstWhere((w) => w.name == value));
      } else if (type == 'dragon') {
        return Tile.dragon(Dragon.values.firstWhere((d) => d.name == value));
      } else {
        final suit = TileSuit.values.firstWhere((s) => s.name == type);
        return Tile.suit(suit, int.parse(value));
      }
    } catch (_) {
      return null;
    }
  }
}
