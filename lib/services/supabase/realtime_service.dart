import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'supabase_config.dart';

/// Realtime service for multiplayer game synchronization
class RealtimeService {
  RealtimeService._();
  static final instance = RealtimeService._();

  SupabaseClient get _client => SupabaseConfig.client;

  final Map<String, RealtimeChannel> _channels = {};
  final _gameEventController = StreamController<GameEvent>.broadcast();

  /// Stream of game events for the current game
  Stream<GameEvent> get gameEvents => _gameEventController.stream;

  /// Join a game room channel for realtime updates
  Future<void> joinGameRoom(String roomId) async {
    if (_channels.containsKey(roomId)) return;

    final channel = _client.channel('game:$roomId');

    channel
        .onBroadcast(
          event: 'game_action',
          callback: (payload) => _handleGameAction(payload),
        )
        .onBroadcast(
          event: 'player_joined',
          callback: (payload) => _handlePlayerJoined(payload),
        )
        .onBroadcast(
          event: 'player_left',
          callback: (payload) => _handlePlayerLeft(payload),
        )
        .onBroadcast(
          event: 'game_started',
          callback: (payload) => _handleGameStarted(payload),
        )
        .onBroadcast(
          event: 'game_ended',
          callback: (payload) => _handleGameEnded(payload),
        )
        .subscribe();

    _channels[roomId] = channel;

    if (kDebugMode) {
      print('Joined game room channel: $roomId');
    }
  }

  /// Leave a game room channel
  Future<void> leaveGameRoom(String roomId) async {
    final channel = _channels.remove(roomId);
    if (channel != null) {
      await channel.unsubscribe();
      if (kDebugMode) {
        print('Left game room channel: $roomId');
      }
    }
  }

  /// Send a game action to other players
  Future<void> sendGameAction({
    required String roomId,
    required String playerId,
    required GameActionType actionType,
    required Map<String, dynamic> data,
  }) async {
    final channel = _channels[roomId];
    if (channel == null) {
      if (kDebugMode) {
        print('Warning: Not connected to room $roomId');
      }
      return;
    }

    await channel.sendBroadcastMessage(
      event: 'game_action',
      payload: {
        'player_id': playerId,
        'action_type': actionType.name,
        'data': data,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      },
    );
  }

  /// Notify that a player joined
  Future<void> sendPlayerJoined({
    required String roomId,
    required String playerId,
    required String playerName,
    required int seatPosition,
  }) async {
    final channel = _channels[roomId];
    if (channel == null) return;

    await channel.sendBroadcastMessage(
      event: 'player_joined',
      payload: {
        'player_id': playerId,
        'player_name': playerName,
        'seat_position': seatPosition,
      },
    );
  }

  /// Notify that a player left
  Future<void> sendPlayerLeft({
    required String roomId,
    required String playerId,
  }) async {
    final channel = _channels[roomId];
    if (channel == null) return;

    await channel.sendBroadcastMessage(
      event: 'player_left',
      payload: {
        'player_id': playerId,
      },
    );
  }

  /// Notify that the game has started
  Future<void> sendGameStarted({
    required String roomId,
    required Map<String, dynamic> initialState,
  }) async {
    final channel = _channels[roomId];
    if (channel == null) return;

    await channel.sendBroadcastMessage(
      event: 'game_started',
      payload: {
        'initial_state': initialState,
      },
    );
  }

  /// Notify that the game has ended
  Future<void> sendGameEnded({
    required String roomId,
    required String? winnerId,
    required Map<String, int> scores,
    required int winningFaan,
  }) async {
    final channel = _channels[roomId];
    if (channel == null) return;

    await channel.sendBroadcastMessage(
      event: 'game_ended',
      payload: {
        'winner_id': winnerId,
        'scores': scores,
        'winning_faan': winningFaan,
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  void _handleGameAction(Map<String, dynamic> payload) {
    final playerId = payload['player_id'] as String;
    final actionTypeName = payload['action_type'] as String;
    final data = payload['data'] as Map<String, dynamic>;

    final actionType = GameActionType.values.firstWhere(
      (t) => t.name == actionTypeName,
      orElse: () => GameActionType.unknown,
    );

    _gameEventController.add(GameActionEvent(
      playerId: playerId,
      actionType: actionType,
      data: data,
    ));
  }

  void _handlePlayerJoined(Map<String, dynamic> payload) {
    _gameEventController.add(PlayerJoinedEvent(
      playerId: payload['player_id'] as String,
      playerName: payload['player_name'] as String,
      seatPosition: payload['seat_position'] as int,
    ));
  }

  void _handlePlayerLeft(Map<String, dynamic> payload) {
    _gameEventController.add(PlayerLeftEvent(
      playerId: payload['player_id'] as String,
    ));
  }

  void _handleGameStarted(Map<String, dynamic> payload) {
    _gameEventController.add(GameStartedEvent(
      initialState: payload['initial_state'] as Map<String, dynamic>,
    ));
  }

  void _handleGameEnded(Map<String, dynamic> payload) {
    _gameEventController.add(GameEndedEvent(
      winnerId: payload['winner_id'] as String?,
      scores: Map<String, int>.from(payload['scores'] as Map),
      winningFaan: payload['winning_faan'] as int,
    ));
  }

  /// Dispose all channels
  Future<void> dispose() async {
    for (final channel in _channels.values) {
      await channel.unsubscribe();
    }
    _channels.clear();
    await _gameEventController.close();
  }
}

/// Types of game actions
enum GameActionType {
  drawTile,
  discardTile,
  claimChow,
  claimPong,
  claimKong,
  declareKong,
  declareWin,
  pass,
  unknown,
}

/// Base class for game events
sealed class GameEvent {
  const GameEvent();
}

/// A player performed a game action
class GameActionEvent extends GameEvent {
  final String playerId;
  final GameActionType actionType;
  final Map<String, dynamic> data;

  const GameActionEvent({
    required this.playerId,
    required this.actionType,
    required this.data,
  });
}

/// A player joined the game
class PlayerJoinedEvent extends GameEvent {
  final String playerId;
  final String playerName;
  final int seatPosition;

  const PlayerJoinedEvent({
    required this.playerId,
    required this.playerName,
    required this.seatPosition,
  });
}

/// A player left the game
class PlayerLeftEvent extends GameEvent {
  final String playerId;

  const PlayerLeftEvent({
    required this.playerId,
  });
}

/// The game has started
class GameStartedEvent extends GameEvent {
  final Map<String, dynamic> initialState;

  const GameStartedEvent({
    required this.initialState,
  });
}

/// The game has ended
class GameEndedEvent extends GameEvent {
  final String? winnerId;
  final Map<String, int> scores;
  final int winningFaan;

  const GameEndedEvent({
    required this.winnerId,
    required this.scores,
    required this.winningFaan,
  });
}
