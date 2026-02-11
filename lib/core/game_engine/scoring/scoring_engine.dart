import '../../models/tile.dart';
import '../../models/meld.dart';
import 'patterns.dart';
import 'hand_evaluator.dart';

/// Context for scoring a winning hand
class ScoringContext {
  final List<Tile> hand;
  final List<Meld> exposedMelds;
  final Tile winningTile;
  final bool isSelfDrawn;
  final Wind seatWind;
  final Wind prevailingWind;
  final List<Tile> bonusTiles;
  final bool isDealer;
  final bool isFirstDraw;

  const ScoringContext({
    required this.hand,
    required this.exposedMelds,
    required this.winningTile,
    required this.isSelfDrawn,
    required this.seatWind,
    required this.prevailingWind,
    this.bonusTiles = const [],
    this.isDealer = false,
    this.isFirstDraw = false,
  });
}

/// Result of scoring a hand
class ScoringResult {
  final int totalFaan;
  final List<ScoringPattern> patterns;
  final bool isValid;
  final String? reason;

  const ScoringResult({
    required this.totalFaan,
    required this.patterns,
    required this.isValid,
    this.reason,
  });

  /// Check if hand meets minimum faan requirement
  bool get meetsMinimum => totalFaan >= HongKongPatterns.minFaan;

  /// Get effective faan (capped at limit)
  int get effectiveFaan => totalFaan > HongKongPatterns.maxFaan
      ? HongKongPatterns.maxFaan
      : totalFaan;
}

/// Calculates the score (faan) for a Hong Kong Mahjong hand
class ScoringEngine {
  ScoringEngine._();

  /// Calculate the total faan for a winning hand
  static ScoringResult calculate(ScoringContext context) {
    // First verify the hand is actually winning
    final fullHand = [...context.hand];
    final evaluation = HandEvaluator.evaluate(fullHand, context.exposedMelds);

    if (!evaluation.isWinning) {
      return const ScoringResult(
        totalFaan: 0,
        patterns: [],
        isValid: false,
        reason: 'Hand is not a winning hand',
      );
    }

    final patterns = <ScoringPattern>[];
    var totalFaan = 0;

    // Check for limit hands first (13 faan)
    final limitPattern = _checkLimitHands(context, evaluation);
    if (limitPattern != null) {
      return ScoringResult(
        totalFaan: HongKongPatterns.maxFaan,
        patterns: [limitPattern],
        isValid: true,
      );
    }

    // Get all melds (exposed + concealed from hand)
    final allMelds = [...context.exposedMelds];
    if (evaluation.possibleMeldCombinations.isNotEmpty) {
      allMelds.addAll(evaluation.possibleMeldCombinations.first);
    }

    // Check individual patterns
    _checkBasicPatterns(context, allMelds, patterns);
    _checkFlushPatterns(context, allMelds, patterns);
    _checkDragonPatterns(allMelds, patterns);
    _checkWindPatterns(context, allMelds, patterns);
    _checkBonusPatterns(context, patterns);

    // Calculate total faan
    for (final pattern in patterns) {
      totalFaan += pattern.faan;
    }

    return ScoringResult(
      totalFaan: totalFaan,
      patterns: patterns,
      isValid: true,
    );
  }

  /// Check for limit hands (13 faan)
  static ScoringPattern? _checkLimitHands(
    ScoringContext context,
    HandEvaluation evaluation,
  ) {
    final allTiles = [...context.hand, ...context.exposedMelds.expand((m) => m.tiles)];

    // Thirteen Orphans
    if (_isThirteenOrphans(allTiles)) {
      return HongKongPatterns.thirteenOrphans;
    }

    // Heavenly Hand (dealer wins on initial deal)
    if (context.isDealer && context.isFirstDraw && context.isSelfDrawn) {
      return HongKongPatterns.heavenlyHand;
    }

    // Earthly Hand (non-dealer wins on first draw)
    if (!context.isDealer && context.isFirstDraw && context.isSelfDrawn) {
      return HongKongPatterns.earthlyHand;
    }

    // Get melds for further checks
    final allMelds = [...context.exposedMelds];
    if (evaluation.possibleMeldCombinations.isNotEmpty) {
      allMelds.addAll(evaluation.possibleMeldCombinations.first);
    }

    // Big Winds (pong/kong of all 4 winds)
    if (_hasBigWinds(allMelds)) {
      return HongKongPatterns.bigWinds;
    }

    // All Kongs
    if (_hasAllKongs(allMelds)) {
      return HongKongPatterns.allKongs;
    }

    // Nine Gates
    if (_isNineGates(context.hand, context.exposedMelds)) {
      return HongKongPatterns.nineGates;
    }

    return null;
  }

  static bool _isThirteenOrphans(List<Tile> tiles) {
    final required = {
      'bamboo_1', 'bamboo_9',
      'character_1', 'character_9',
      'dot_1', 'dot_9',
      'wind_east', 'wind_south', 'wind_west', 'wind_north',
      'dragon_red', 'dragon_green', 'dragon_white',
    };

    final found = <String>{};
    for (final tile in tiles) {
      if (tile.isBonus) continue;
      String id;
      if (tile.number != null) {
        id = '${tile.suit.name}_${tile.number}';
      } else if (tile.wind != null) {
        id = 'wind_${tile.wind!.name}';
      } else if (tile.dragon != null) {
        id = 'dragon_${tile.dragon!.name}';
      } else {
        continue;
      }
      found.add(id);
    }

    return required.every((id) => found.contains(id)) && tiles.length == 14;
  }

  static bool _hasBigWinds(List<Meld> melds) {
    final windPongs = melds.where((m) =>
      m.isTriplet && m.tiles.first.suit == TileSuit.wind
    ).toList();
    return windPongs.length == 4;
  }

  static bool _hasAllKongs(List<Meld> melds) {
    final kongs = melds.where((m) => m.isKong).toList();
    return kongs.length == 4;
  }

  static bool _isNineGates(List<Tile> hand, List<Meld> exposed) {
    if (exposed.isNotEmpty) return false; // Must be concealed

    // Must be pure one suit
    final suit = hand.first.suit;
    if (!hand.every((t) => t.suit == suit && t.number != null)) return false;

    // Count tiles
    final counts = <int, int>{};
    for (final tile in hand) {
      counts[tile.number!] = (counts[tile.number!] ?? 0) + 1;
    }

    // Pattern: 1112345678999 + any tile of suit
    // Minimum counts: 1=3, 2=1, 3=1, 4=1, 5=1, 6=1, 7=1, 8=1, 9=3
    final pattern = {1: 3, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 3};

    var extraTileUsed = false;
    for (var i = 1; i <= 9; i++) {
      final required = pattern[i]!;
      final has = counts[i] ?? 0;
      if (has < required) return false;
      if (has > required) {
        if (extraTileUsed) return false; // Can only have one extra
        extraTileUsed = true;
      }
    }

    return true;
  }

  /// Check basic patterns
  static void _checkBasicPatterns(
    ScoringContext context,
    List<Meld> allMelds,
    List<ScoringPattern> patterns,
  ) {
    // Self-drawn
    if (context.isSelfDrawn) {
      patterns.add(HongKongPatterns.selfDrawn);
    }

    // Concealed hand
    if (context.exposedMelds.isEmpty) {
      patterns.add(HongKongPatterns.concealedHand);
    }

    // All Chows
    final nonPairMelds = allMelds.where((m) => m.type != MeldType.pair).toList();
    if (nonPairMelds.every((m) => m.isSequence)) {
      patterns.add(HongKongPatterns.allChows);
    }

    // All Pongs
    if (nonPairMelds.every((m) => m.isTriplet)) {
      patterns.add(HongKongPatterns.allPongs);
    }

    // No Flowers
    if (context.bonusTiles.isEmpty) {
      patterns.add(HongKongPatterns.noFlowers);
    }
  }

  /// Check flush patterns
  static void _checkFlushPatterns(
    ScoringContext context,
    List<Meld> allMelds,
    List<ScoringPattern> patterns,
  ) {
    final allTiles = allMelds.expand((m) => m.tiles).toList();

    // Collect suits used
    final suits = <TileSuit>{};
    var hasHonors = false;

    for (final tile in allTiles) {
      if (tile.isHonor) {
        hasHonors = true;
      } else if (tile.number != null) {
        suits.add(tile.suit);
      }
    }

    // Full Flush - one suit, no honors
    if (suits.length == 1 && !hasHonors) {
      patterns.add(HongKongPatterns.fullFlush);
    }
    // Half Flush - one suit plus honors
    else if (suits.length == 1 && hasHonors) {
      patterns.add(HongKongPatterns.halfFlush);
    }

    // All Honors
    if (allTiles.every((t) => t.isHonor)) {
      patterns.add(HongKongPatterns.allHonors);
    }

    // All Terminals
    if (allTiles.every((t) => t.isTerminal)) {
      patterns.add(HongKongPatterns.allTerminals);
    }
  }

  /// Check dragon patterns
  static void _checkDragonPatterns(
    List<Meld> allMelds,
    List<ScoringPattern> patterns,
  ) {
    final dragonMelds = allMelds.where((m) =>
      m.tiles.first.suit == TileSuit.dragon
    ).toList();

    final dragonPongs = dragonMelds.where((m) => m.isTriplet).toList();
    final dragonPairs = dragonMelds.where((m) => m.type == MeldType.pair).toList();

    // Big Dragons - pong/kong of all 3 dragons
    if (dragonPongs.length == 3) {
      patterns.add(HongKongPatterns.bigDragons);
    }
    // Small Dragons - 2 dragon pongs + 1 dragon pair
    else if (dragonPongs.length == 2 && dragonPairs.length == 1) {
      patterns.add(HongKongPatterns.smallDragons);
    }
    // Individual dragon pongs
    else {
      for (var i = 0; i < dragonPongs.length; i++) {
        patterns.add(HongKongPatterns.dragonPong);
      }
    }
  }

  /// Check wind patterns
  static void _checkWindPatterns(
    ScoringContext context,
    List<Meld> allMelds,
    List<ScoringPattern> patterns,
  ) {
    final windMelds = allMelds.where((m) =>
      m.tiles.first.suit == TileSuit.wind
    ).toList();

    final windPongs = windMelds.where((m) => m.isTriplet).toList();
    final windPairs = windMelds.where((m) => m.type == MeldType.pair).toList();

    // Small Winds - 3 wind pongs + 1 wind pair
    if (windPongs.length == 3 && windPairs.length == 1) {
      patterns.add(HongKongPatterns.smallWinds);
    }

    // Seat Wind pong
    for (final meld in windPongs) {
      if (meld.tiles.first.wind == context.seatWind) {
        patterns.add(HongKongPatterns.seatWind);
      }
      // Prevailing Wind pong
      if (meld.tiles.first.wind == context.prevailingWind) {
        patterns.add(HongKongPatterns.prevailingWind);
      }
    }
  }

  /// Check bonus tile patterns
  static void _checkBonusPatterns(
    ScoringContext context,
    List<ScoringPattern> patterns,
  ) {
    final flowers = context.bonusTiles.where((t) => t.suit == TileSuit.flower).toList();
    final seasons = context.bonusTiles.where((t) => t.suit == TileSuit.season).toList();

    // All Flowers
    if (flowers.length == 4) {
      patterns.add(HongKongPatterns.allFlowers);
    }

    // All Seasons
    if (seasons.length == 4) {
      patterns.add(HongKongPatterns.allSeasons);
    }

    // Individual flower bonuses (matching seat)
    final seatIndex = context.seatWind.index + 1; // East=1, South=2, etc.
    for (final tile in context.bonusTiles) {
      if (tile.copyIndex == seatIndex) {
        patterns.add(HongKongPatterns.flowerBonus);
      }
    }
  }
}
