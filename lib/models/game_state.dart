import 'package:cloud_firestore/cloud_firestore.dart';
import 'tile.dart';

enum GamePhase {
  waiting, // Waiting to start
  dealing, // Dealing tiles
  playing, // Active gameplay
  paused, // Paused
  finished, // Game finished
}

enum PlayerAction {
  draw, // Draw a tile
  discard, // Discard a tile
  chow, // Make a chow (sequence)
  pung, // Make a pung (triplet)
  kong, // Make a kong (quad)
  win, // Win the game
  pass, // Pass turn
}

class Player {
  final String id;
  final String name;
  final bool isAI;
  final List<Tile> hand;
  final List<List<Tile>> melds; // Completed melds (chows, pungs, kongs)
  final int score;

  const Player({
    required this.id,
    required this.name,
    this.isAI = false,
    this.hand = const [],
    this.melds = const [],
    this.score = 0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'isAI': isAI,
        'hand': hand.map((t) => t.toJson()).toList(),
        'melds': melds.map((m) => m.map((t) => t.toJson()).toList()).toList(),
        'score': score,
      };

  factory Player.fromJson(Map<String, dynamic> json) => Player(
        id: json['id'] as String,
        name: json['name'] as String,
        isAI: json['isAI'] as bool? ?? false,
        hand: (json['hand'] as List?)
                ?.map((t) => Tile.fromJson(t as Map<String, dynamic>))
                .toList() ??
            const [],
        melds: (json['melds'] as List?)
                ?.map((m) => (m as List)
                    .map((t) => Tile.fromJson(t as Map<String, dynamic>))
                    .toList())
                .toList() ??
            const [],
        score: json['score'] as int? ?? 0,
      );

  Player copyWith({
    String? id,
    String? name,
    bool? isAI,
    List<Tile>? hand,
    List<List<Tile>>? melds,
    int? score,
  }) {
    return Player(
      id: id ?? this.id,
      name: name ?? this.name,
      isAI: isAI ?? this.isAI,
      hand: hand ?? this.hand,
      melds: melds ?? this.melds,
      score: score ?? this.score,
    );
  }
}

class GameState {
  final String id;
  final String variant; // Mahjong variant
  final GamePhase phase;
  final List<Player> players;
  final int currentPlayerIndex;
  final List<Tile> wall; // Remaining tiles in wall
  final List<Tile> discardPile; // Discarded tiles
  final Tile? lastDrawnTile;
  final Tile? lastDiscardedTile;
  final PlayerAction? lastAction;
  final String? winnerId;
  final Map<String, int> finalScores;
  final DateTime createdAt;
  final DateTime? finishedAt;
  final List<GameTurn> turnHistory; // For rewind functionality

  const GameState({
    required this.id,
    required this.variant,
    required this.phase,
    required this.players,
    this.currentPlayerIndex = 0,
    this.wall = const [],
    this.discardPile = const [],
    this.lastDrawnTile,
    this.lastDiscardedTile,
    this.lastAction,
    this.winnerId,
    this.finalScores = const {},
    required this.createdAt,
    this.finishedAt,
    this.turnHistory = const [],
  });

  Player get currentPlayer => players[currentPlayerIndex];
  bool get isFinished => phase == GamePhase.finished;
  int get remainingTiles => wall.length;

  Map<String, dynamic> toJson() => {
        'id': id,
        'variant': variant,
        'phase': phase.name,
        'players': players.map((p) => p.toJson()).toList(),
        'currentPlayerIndex': currentPlayerIndex,
        'wall': wall.map((t) => t.toJson()).toList(),
        'discardPile': discardPile.map((t) => t.toJson()).toList(),
        'lastDrawnTile': lastDrawnTile?.toJson(),
        'lastDiscardedTile': lastDiscardedTile?.toJson(),
        'lastAction': lastAction?.name,
        'winnerId': winnerId,
        'finalScores': finalScores,
        'createdAt': Timestamp.fromDate(createdAt),
        'finishedAt': finishedAt != null
            ? Timestamp.fromDate(finishedAt!)
            : null,
        'turnHistory': turnHistory.map((t) => t.toJson()).toList(),
      };

  factory GameState.fromJson(Map<String, dynamic> json) => GameState(
        id: json['id'] as String,
        variant: json['variant'] as String,
        phase: GamePhase.values.firstWhere(
          (e) => e.name == json['phase'],
        ),
        players: (json['players'] as List)
            .map((p) => Player.fromJson(p as Map<String, dynamic>))
            .toList(),
        currentPlayerIndex: json['currentPlayerIndex'] as int? ?? 0,
        wall: (json['wall'] as List?)
                ?.map((t) => Tile.fromJson(t as Map<String, dynamic>))
                .toList() ??
            const [],
        discardPile: (json['discardPile'] as List?)
                ?.map((t) => Tile.fromJson(t as Map<String, dynamic>))
                .toList() ??
            const [],
        lastDrawnTile: json['lastDrawnTile'] != null
            ? Tile.fromJson(json['lastDrawnTile'] as Map<String, dynamic>)
            : null,
        lastDiscardedTile: json['lastDiscardedTile'] != null
            ? Tile.fromJson(json['lastDiscardedTile'] as Map<String, dynamic>)
            : null,
        lastAction: json['lastAction'] != null
            ? PlayerAction.values.firstWhere(
                (e) => e.name == json['lastAction'],
              )
            : null,
        winnerId: json['winnerId'] as String?,
        finalScores: Map<String, int>.from(
          json['finalScores'] as Map? ?? {},
        ),
        createdAt: (json['createdAt'] as Timestamp).toDate(),
        finishedAt: json['finishedAt'] != null
            ? (json['finishedAt'] as Timestamp).toDate()
            : null,
        turnHistory: (json['turnHistory'] as List?)
                ?.map((t) => GameTurn.fromJson(t as Map<String, dynamic>))
                .toList() ??
            const [],
      );

  GameState copyWith({
    String? id,
    String? variant,
    GamePhase? phase,
    List<Player>? players,
    int? currentPlayerIndex,
    List<Tile>? wall,
    List<Tile>? discardPile,
    Tile? lastDrawnTile,
    Tile? lastDiscardedTile,
    PlayerAction? lastAction,
    String? winnerId,
    Map<String, int>? finalScores,
    DateTime? createdAt,
    DateTime? finishedAt,
    List<GameTurn>? turnHistory,
  }) {
    return GameState(
      id: id ?? this.id,
      variant: variant ?? this.variant,
      phase: phase ?? this.phase,
      players: players ?? this.players,
      currentPlayerIndex: currentPlayerIndex ?? this.currentPlayerIndex,
      wall: wall ?? this.wall,
      discardPile: discardPile ?? this.discardPile,
      lastDrawnTile: lastDrawnTile ?? this.lastDrawnTile,
      lastDiscardedTile: lastDiscardedTile ?? this.lastDiscardedTile,
      lastAction: lastAction ?? this.lastAction,
      winnerId: winnerId ?? this.winnerId,
      finalScores: finalScores ?? this.finalScores,
      createdAt: createdAt ?? this.createdAt,
      finishedAt: finishedAt ?? this.finishedAt,
      turnHistory: turnHistory ?? this.turnHistory,
    );
  }
}

class GameTurn {
  final int turnNumber;
  final String playerId;
  final PlayerAction action;
  final Tile? tile;
  final DateTime timestamp;

  const GameTurn({
    required this.turnNumber,
    required this.playerId,
    required this.action,
    this.tile,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'turnNumber': turnNumber,
        'playerId': playerId,
        'action': action.name,
        'tile': tile?.toJson(),
        'timestamp': Timestamp.fromDate(timestamp),
      };

  factory GameTurn.fromJson(Map<String, dynamic> json) => GameTurn(
        turnNumber: json['turnNumber'] as int,
        playerId: json['playerId'] as String,
        action: PlayerAction.values.firstWhere(
          (e) => e.name == json['action'],
        ),
        tile: json['tile'] != null
            ? Tile.fromJson(json['tile'] as Map<String, dynamic>)
            : null,
        timestamp: (json['timestamp'] as Timestamp).toDate(),
      );
}

