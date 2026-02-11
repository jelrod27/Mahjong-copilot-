import 'package:equatable/equatable.dart';
import 'tile.dart';

/// Type of meld (combination of tiles)
enum MeldType {
  /// Three consecutive tiles of the same suit (e.g., 1-2-3 bamboo)
  chow,

  /// Three identical tiles (e.g., three 5-bamboo)
  pong,

  /// Four identical tiles, revealed
  exposedKong,

  /// Four identical tiles, concealed (drawn from wall)
  concealedKong,

  /// Pair of identical tiles (for winning hand)
  pair,
}

/// Represents a meld (combination of tiles) in mahjong
class Meld extends Equatable {
  final MeldType type;
  final List<Tile> tiles;
  final bool isConcealed;

  const Meld({
    required this.type,
    required this.tiles,
    this.isConcealed = false,
  });

  /// Check if this is a sequence (chow)
  bool get isSequence => type == MeldType.chow;

  /// Check if this is a triplet (pong or kong)
  bool get isTriplet => type == MeldType.pong ||
      type == MeldType.exposedKong ||
      type == MeldType.concealedKong;

  /// Check if this is a kong (4 tiles)
  bool get isKong => type == MeldType.exposedKong || type == MeldType.concealedKong;

  /// Check if this meld contains only terminals (1 or 9)
  bool get containsTerminals => tiles.any((t) => t.isTerminal);

  /// Check if this meld is purely terminals
  bool get isPureTerminals => tiles.every((t) => t.isTerminal);

  /// Check if this meld contains only honors
  bool get isHonors => tiles.every((t) => t.isHonor);

  /// Get the suit of this meld (null if mixed, which shouldn't happen)
  TileSuit? get suit => tiles.isNotEmpty ? tiles.first.suit : null;

  @override
  List<Object?> get props => [type, tiles, isConcealed];

  @override
  String toString() {
    final tileNames = tiles.map((t) => t.nameEnglish).join(', ');
    return '${type.name}($tileNames)${isConcealed ? " [concealed]" : ""}';
  }
}

/// Validates and creates melds from tiles
class MeldValidator {
  MeldValidator._();

  /// Check if three tiles form a valid chow (sequence)
  static bool isValidChow(Tile t1, Tile t2, Tile t3) {
    // Must all be suit tiles (bamboo, character, or dot)
    if (!t1.canFormSequence || !t2.canFormSequence || !t3.canFormSequence) {
      return false;
    }

    // Must be same suit
    if (t1.suit != t2.suit || t2.suit != t3.suit) {
      return false;
    }

    // Sort by number and check for consecutive sequence
    final numbers = [t1.number!, t2.number!, t3.number!]..sort();
    return numbers[1] == numbers[0] + 1 && numbers[2] == numbers[1] + 1;
  }

  /// Check if three tiles form a valid pong (triplet)
  static bool isValidPong(Tile t1, Tile t2, Tile t3) {
    return t1.matches(t2) && t2.matches(t3);
  }

  /// Check if four tiles form a valid kong
  static bool isValidKong(Tile t1, Tile t2, Tile t3, Tile t4) {
    return t1.matches(t2) && t2.matches(t3) && t3.matches(t4);
  }

  /// Check if two tiles form a valid pair
  static bool isValidPair(Tile t1, Tile t2) {
    return t1.matches(t2);
  }

  /// Create a chow meld if valid, otherwise return null
  static Meld? createChow(Tile t1, Tile t2, Tile t3, {bool isConcealed = false}) {
    if (!isValidChow(t1, t2, t3)) return null;

    // Sort tiles for consistent ordering
    final tiles = [t1, t2, t3]..sort((a, b) => a.number!.compareTo(b.number!));

    return Meld(
      type: MeldType.chow,
      tiles: tiles,
      isConcealed: isConcealed,
    );
  }

  /// Create a pong meld if valid, otherwise return null
  static Meld? createPong(Tile t1, Tile t2, Tile t3, {bool isConcealed = false}) {
    if (!isValidPong(t1, t2, t3)) return null;

    return Meld(
      type: MeldType.pong,
      tiles: [t1, t2, t3],
      isConcealed: isConcealed,
    );
  }

  /// Create a kong meld if valid, otherwise return null
  static Meld? createKong(
    Tile t1, Tile t2, Tile t3, Tile t4, {
    bool isConcealed = false,
  }) {
    if (!isValidKong(t1, t2, t3, t4)) return null;

    return Meld(
      type: isConcealed ? MeldType.concealedKong : MeldType.exposedKong,
      tiles: [t1, t2, t3, t4],
      isConcealed: isConcealed,
    );
  }

  /// Create a pair meld if valid, otherwise return null
  static Meld? createPair(Tile t1, Tile t2) {
    if (!isValidPair(t1, t2)) return null;

    return Meld(
      type: MeldType.pair,
      tiles: [t1, t2],
      isConcealed: true,
    );
  }

  /// Find all possible chows that can be formed with a given tile
  static List<Meld> findPossibleChows(Tile tile, List<Tile> hand) {
    if (!tile.canFormSequence) return [];

    final melds = <Meld>[];
    final sameSuit = hand.where((t) => t.suit == tile.suit && t.number != null).toList();

    // Try all combinations
    for (var i = 0; i < sameSuit.length; i++) {
      for (var j = i + 1; j < sameSuit.length; j++) {
        final meld = createChow(tile, sameSuit[i], sameSuit[j], isConcealed: true);
        if (meld != null) {
          melds.add(meld);
        }
      }
    }

    return melds;
  }

  /// Find all possible pongs that can be formed with a given tile
  static List<Meld> findPossiblePongs(Tile tile, List<Tile> hand) {
    final matching = hand.where((t) => t.matches(tile)).toList();
    if (matching.length < 2) return [];

    final melds = <Meld>[];
    for (var i = 0; i < matching.length; i++) {
      for (var j = i + 1; j < matching.length; j++) {
        final meld = createPong(tile, matching[i], matching[j], isConcealed: true);
        if (meld != null) {
          melds.add(meld);
        }
      }
    }

    return melds;
  }

  /// Find all possible kongs that can be formed with a given tile
  static List<Meld> findPossibleKongs(Tile tile, List<Tile> hand) {
    final matching = hand.where((t) => t.matches(tile)).toList();
    if (matching.length < 3) return [];

    final melds = <Meld>[];
    for (var i = 0; i < matching.length; i++) {
      for (var j = i + 1; j < matching.length; j++) {
        for (var k = j + 1; k < matching.length; k++) {
          final meld = createKong(
            tile, matching[i], matching[j], matching[k],
            isConcealed: true,
          );
          if (meld != null) {
            melds.add(meld);
          }
        }
      }
    }

    return melds;
  }
}
