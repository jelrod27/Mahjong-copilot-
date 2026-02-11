import 'package:equatable/equatable.dart';
import 'tile.dart';
import 'meld.dart';
import 'player.dart';

/// Phase of the game
enum GamePhase {
  waiting,    // Waiting for players
  dealing,    // Dealing tiles
  playing,    // Main gameplay
  declaring,  // Player declaring action (pong, kong, chow, win)
  finished,   // Game ended
}

/// Type of player action
enum ActionType {
  draw,       // Draw from wall
  discard,    // Discard a tile
  chow,       // Claim chow
  pong,       // Claim pong
  kong,       // Declare kong
  win,        // Declare mahjong
  pass,       // Pass on claim opportunity
}

/// A recorded action in the game
class GameAction extends Equatable {
  final String playerId;
  final ActionType type;
  final Tile? tile;
  final Meld? meld;
  final DateTime timestamp;

  GameAction({
    required this.playerId,
    required this.type,
    this.tile,
    this.meld,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  @override
  List<Object?> get props => [playerId, type, tile, meld, timestamp];
}

/// Complete game state
class GameState extends Equatable {
  final String id;
  final GamePhase phase;
  final List<Player> players;
  final int currentPlayerIndex;
  final Wind prevailingWind;
  final int roundNumber;
  final int dealerIndex;
  final List<Tile> wall;
  final List<Tile> discardPile;
  final Tile? lastDiscardedTile;
  final Tile? lastDrawnTile;
  final List<GameAction> actionHistory;
  final DateTime createdAt;
  final DateTime? endedAt;
  final String? winnerId;
  final int? winningFaan;

  const GameState({
    required this.id,
    this.phase = GamePhase.waiting,
    this.players = const [],
    this.currentPlayerIndex = 0,
    this.prevailingWind = Wind.east,
    this.roundNumber = 1,
    this.dealerIndex = 0,
    this.wall = const [],
    this.discardPile = const [],
    this.lastDiscardedTile,
    this.lastDrawnTile,
    this.actionHistory = const [],
    required this.createdAt,
    this.endedAt,
    this.winnerId,
    this.winningFaan,
  });

  /// Get the current player
  Player get currentPlayer => players[currentPlayerIndex];

  /// Get the dealer
  Player get dealer => players[dealerIndex];

  /// Check if game is in progress
  bool get isInProgress => phase == GamePhase.playing || phase == GamePhase.declaring;

  /// Check if game is finished
  bool get isFinished => phase == GamePhase.finished;

  /// Get remaining tiles in wall
  int get remainingTiles => wall.length;

  /// Check if wall is empty
  bool get isWallEmpty => wall.isEmpty;

  /// Get player by seat wind
  Player? getPlayerBySeat(Wind wind) {
    try {
      return players.firstWhere((p) => p.seatWind == wind);
    } catch (_) {
      return null;
    }
  }

  /// Get player by ID
  Player? getPlayerById(String id) {
    try {
      return players.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }

  /// Get next player index
  int get nextPlayerIndex => (currentPlayerIndex + 1) % 4;

  /// Create a copy with updated fields
  GameState copyWith({
    String? id,
    GamePhase? phase,
    List<Player>? players,
    int? currentPlayerIndex,
    Wind? prevailingWind,
    int? roundNumber,
    int? dealerIndex,
    List<Tile>? wall,
    List<Tile>? discardPile,
    Tile? lastDiscardedTile,
    Tile? lastDrawnTile,
    List<GameAction>? actionHistory,
    DateTime? createdAt,
    DateTime? endedAt,
    String? winnerId,
    int? winningFaan,
  }) {
    return GameState(
      id: id ?? this.id,
      phase: phase ?? this.phase,
      players: players ?? this.players,
      currentPlayerIndex: currentPlayerIndex ?? this.currentPlayerIndex,
      prevailingWind: prevailingWind ?? this.prevailingWind,
      roundNumber: roundNumber ?? this.roundNumber,
      dealerIndex: dealerIndex ?? this.dealerIndex,
      wall: wall ?? this.wall,
      discardPile: discardPile ?? this.discardPile,
      lastDiscardedTile: lastDiscardedTile ?? this.lastDiscardedTile,
      lastDrawnTile: lastDrawnTile ?? this.lastDrawnTile,
      actionHistory: actionHistory ?? this.actionHistory,
      createdAt: createdAt ?? this.createdAt,
      endedAt: endedAt ?? this.endedAt,
      winnerId: winnerId ?? this.winnerId,
      winningFaan: winningFaan ?? this.winningFaan,
    );
  }

  /// Update a specific player
  GameState updatePlayer(int index, Player player) {
    final newPlayers = List<Player>.from(players);
    newPlayers[index] = player;
    return copyWith(players: newPlayers);
  }

  /// Add an action to history
  GameState addAction(GameAction action) {
    return copyWith(actionHistory: [...actionHistory, action]);
  }

  @override
  List<Object?> get props => [
    id, phase, players, currentPlayerIndex, prevailingWind,
    roundNumber, dealerIndex, wall, discardPile,
    lastDiscardedTile, lastDrawnTile, actionHistory,
    createdAt, endedAt, winnerId, winningFaan,
  ];
}

/// Factory for creating new games
class GameStateFactory {
  GameStateFactory._();

  /// Create a new single player game
  static GameState createSinglePlayer({
    required String gameId,
    required String playerId,
    required String playerName,
  }) {
    final players = PlayerFactory.createSinglePlayerGame(playerId, playerName);
    final tiles = TileFactory.createShuffledSet();

    return GameState(
      id: gameId,
      phase: GamePhase.dealing,
      players: players,
      currentPlayerIndex: 0,
      prevailingWind: Wind.east,
      roundNumber: 1,
      dealerIndex: 0,
      wall: tiles,
      createdAt: DateTime.now(),
    );
  }

  /// Create a new multiplayer game
  static GameState createMultiplayer({required String gameId}) {
    return GameState(
      id: gameId,
      phase: GamePhase.waiting,
      players: PlayerFactory.createMultiplayerSlots(),
      createdAt: DateTime.now(),
    );
  }
}
