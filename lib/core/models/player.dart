import 'package:equatable/equatable.dart';
import 'tile.dart';
import 'meld.dart';

/// Represents a player in the game
class Player extends Equatable {
  final String id;
  final String name;
  final Wind seatWind;
  final List<Tile> hand;
  final List<Meld> exposedMelds;
  final List<Tile> bonusTiles;
  final bool isDealer;
  final bool isAI;
  final int score;
  final bool isConnected;

  const Player({
    required this.id,
    required this.name,
    required this.seatWind,
    this.hand = const [],
    this.exposedMelds = const [],
    this.bonusTiles = const [],
    this.isDealer = false,
    this.isAI = false,
    this.score = 0,
    this.isConnected = true,
  });

  /// Create a copy with updated fields
  Player copyWith({
    String? id,
    String? name,
    Wind? seatWind,
    List<Tile>? hand,
    List<Meld>? exposedMelds,
    List<Tile>? bonusTiles,
    bool? isDealer,
    bool? isAI,
    int? score,
    bool? isConnected,
  }) {
    return Player(
      id: id ?? this.id,
      name: name ?? this.name,
      seatWind: seatWind ?? this.seatWind,
      hand: hand ?? this.hand,
      exposedMelds: exposedMelds ?? this.exposedMelds,
      bonusTiles: bonusTiles ?? this.bonusTiles,
      isDealer: isDealer ?? this.isDealer,
      isAI: isAI ?? this.isAI,
      score: score ?? this.score,
      isConnected: isConnected ?? this.isConnected,
    );
  }

  /// Get the total number of tiles in hand (including exposed melds)
  int get totalTileCount {
    var count = hand.length;
    for (final meld in exposedMelds) {
      count += meld.tiles.length;
    }
    return count;
  }

  /// Check if player has a complete hand (14+ tiles)
  bool get hasCompleteHand => totalTileCount >= 14;

  /// Add tiles to hand
  Player addToHand(List<Tile> tiles) {
    return copyWith(hand: [...hand, ...tiles]);
  }

  /// Remove a tile from hand
  Player removeFromHand(Tile tile) {
    final newHand = List<Tile>.from(hand);
    newHand.remove(tile);
    return copyWith(hand: newHand);
  }

  /// Add an exposed meld
  Player addExposedMeld(Meld meld) {
    return copyWith(exposedMelds: [...exposedMelds, meld]);
  }

  /// Add a bonus tile
  Player addBonusTile(Tile tile) {
    return copyWith(bonusTiles: [...bonusTiles, tile]);
  }

  /// Update score
  Player updateScore(int delta) {
    return copyWith(score: score + delta);
  }

  @override
  List<Object?> get props => [
    id, name, seatWind, hand, exposedMelds,
    bonusTiles, isDealer, isAI, score, isConnected,
  ];
}

/// Factory for creating players
class PlayerFactory {
  PlayerFactory._();

  /// Create a human player
  static Player createHuman({
    required String id,
    required String name,
    required Wind seatWind,
    bool isDealer = false,
  }) {
    return Player(
      id: id,
      name: name,
      seatWind: seatWind,
      isDealer: isDealer,
      isAI: false,
    );
  }

  /// Create an AI player
  static Player createAI({
    required Wind seatWind,
    bool isDealer = false,
    String? name,
  }) {
    final aiNames = {
      Wind.east: 'East Bot',
      Wind.south: 'South Bot',
      Wind.west: 'West Bot',
      Wind.north: 'North Bot',
    };

    return Player(
      id: 'ai_${seatWind.name}',
      name: name ?? aiNames[seatWind]!,
      seatWind: seatWind,
      isDealer: isDealer,
      isAI: true,
    );
  }

  /// Create 4 players for a new game (1 human, 3 AI)
  static List<Player> createSinglePlayerGame(String humanId, String humanName) {
    return [
      createHuman(id: humanId, name: humanName, seatWind: Wind.east, isDealer: true),
      createAI(seatWind: Wind.south),
      createAI(seatWind: Wind.west),
      createAI(seatWind: Wind.north),
    ];
  }

  /// Create 4 human players for multiplayer
  static List<Player> createMultiplayerSlots() {
    return [
      const Player(id: '', name: 'Waiting...', seatWind: Wind.east, isDealer: true),
      const Player(id: '', name: 'Waiting...', seatWind: Wind.south),
      const Player(id: '', name: 'Waiting...', seatWind: Wind.west),
      const Player(id: '', name: 'Waiting...', seatWind: Wind.north),
    ];
  }
}
