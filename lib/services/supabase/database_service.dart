import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'supabase_config.dart';

/// Database service for game data persistence
class DatabaseService {
  DatabaseService._();
  static final instance = DatabaseService._();

  SupabaseClient get _client => SupabaseConfig.client;

  // ─────────────────────────────────────────────────────────────────────────
  // User Profiles
  // ─────────────────────────────────────────────────────────────────────────

  /// Get user profile by ID
  Future<UserProfile?> getUserProfile(String userId) async {
    try {
      final response = await _client
          .from('profiles')
          .select()
          .eq('id', userId)
          .single();

      return UserProfile.fromJson(response);
    } catch (e) {
      if (kDebugMode) print('Get profile error: $e');
      return null;
    }
  }

  /// Create or update user profile
  Future<bool> upsertUserProfile(UserProfile profile) async {
    try {
      await _client.from('profiles').upsert(profile.toJson());
      return true;
    } catch (e) {
      if (kDebugMode) print('Upsert profile error: $e');
      return false;
    }
  }

  /// Update user statistics
  Future<bool> updateUserStats({
    required String userId,
    int? gamesPlayed,
    int? gamesWon,
    int? highestFaan,
    int? totalScore,
  }) async {
    try {
      final updates = <String, dynamic>{
        'updated_at': DateTime.now().toIso8601String(),
      };

      if (gamesPlayed != null) {
        updates['games_played'] = gamesPlayed;
      }
      if (gamesWon != null) {
        updates['games_won'] = gamesWon;
      }
      if (highestFaan != null) {
        updates['highest_faan'] = highestFaan;
      }
      if (totalScore != null) {
        updates['total_score'] = totalScore;
      }

      await _client.from('profiles').update(updates).eq('id', userId);
      return true;
    } catch (e) {
      if (kDebugMode) print('Update stats error: $e');
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Game Rooms
  // ─────────────────────────────────────────────────────────────────────────

  /// Create a new game room
  Future<GameRoom?> createGameRoom({
    required String hostId,
    required String hostName,
    bool isPrivate = true,
    int maxPlayers = 4,
  }) async {
    try {
      final roomCode = isPrivate ? _generateRoomCode() : null;

      final response = await _client.from('game_rooms').insert({
        'host_id': hostId,
        'host_name': hostName,
        'room_code': roomCode,
        'is_private': isPrivate,
        'max_players': maxPlayers,
        'current_players': 1,
        'status': 'waiting',
        'created_at': DateTime.now().toIso8601String(),
      }).select().single();

      return GameRoom.fromJson(response);
    } catch (e) {
      if (kDebugMode) print('Create room error: $e');
      return null;
    }
  }

  /// Get game room by code
  Future<GameRoom?> getRoomByCode(String code) async {
    try {
      final response = await _client
          .from('game_rooms')
          .select()
          .eq('room_code', code.toUpperCase())
          .eq('status', 'waiting')
          .single();

      return GameRoom.fromJson(response);
    } catch (e) {
      if (kDebugMode) print('Get room error: $e');
      return null;
    }
  }

  /// Get available public rooms
  Future<List<GameRoom>> getPublicRooms() async {
    try {
      final response = await _client
          .from('game_rooms')
          .select()
          .eq('is_private', false)
          .eq('status', 'waiting')
          .order('created_at', ascending: false)
          .limit(20);

      return (response as List)
          .map((json) => GameRoom.fromJson(json))
          .toList();
    } catch (e) {
      if (kDebugMode) print('Get public rooms error: $e');
      return [];
    }
  }

  /// Join a game room
  Future<bool> joinRoom({
    required String roomId,
    required String playerId,
    required String playerName,
  }) async {
    try {
      // Add player to room_players
      await _client.from('room_players').insert({
        'room_id': roomId,
        'player_id': playerId,
        'player_name': playerName,
        'joined_at': DateTime.now().toIso8601String(),
      });

      // Increment player count
      await _client.rpc('increment_room_players', params: {'room_id': roomId});

      return true;
    } catch (e) {
      if (kDebugMode) print('Join room error: $e');
      return false;
    }
  }

  /// Leave a game room
  Future<bool> leaveRoom({
    required String roomId,
    required String playerId,
  }) async {
    try {
      await _client
          .from('room_players')
          .delete()
          .eq('room_id', roomId)
          .eq('player_id', playerId);

      await _client.rpc('decrement_room_players', params: {'room_id': roomId});

      return true;
    } catch (e) {
      if (kDebugMode) print('Leave room error: $e');
      return false;
    }
  }

  /// Update room status
  Future<bool> updateRoomStatus(String roomId, String status) async {
    try {
      await _client
          .from('game_rooms')
          .update({'status': status})
          .eq('id', roomId);
      return true;
    } catch (e) {
      if (kDebugMode) print('Update room status error: $e');
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Game History
  // ─────────────────────────────────────────────────────────────────────────

  /// Save game result
  Future<bool> saveGameResult({
    required String roomId,
    required String winnerId,
    required int winningFaan,
    required List<String> playerIds,
    required Map<String, int> scores,
  }) async {
    try {
      await _client.from('game_history').insert({
        'room_id': roomId,
        'winner_id': winnerId,
        'winning_faan': winningFaan,
        'player_ids': playerIds,
        'scores': scores,
        'played_at': DateTime.now().toIso8601String(),
      });
      return true;
    } catch (e) {
      if (kDebugMode) print('Save game result error: $e');
      return false;
    }
  }

  /// Get user's game history
  Future<List<Map<String, dynamic>>> getGameHistory(String userId) async {
    try {
      final response = await _client
          .from('game_history')
          .select()
          .contains('player_ids', [userId])
          .order('played_at', ascending: false)
          .limit(50);

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      if (kDebugMode) print('Get game history error: $e');
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  String _generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final random = DateTime.now().millisecondsSinceEpoch;
    return List.generate(6, (i) => chars[(random + i * 7) % chars.length]).join();
  }
}

/// User profile data model
class UserProfile {
  final String id;
  final String displayName;
  final String? avatarUrl;
  final int gamesPlayed;
  final int gamesWon;
  final int highestFaan;
  final int totalScore;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserProfile({
    required this.id,
    required this.displayName,
    this.avatarUrl,
    this.gamesPlayed = 0,
    this.gamesWon = 0,
    this.highestFaan = 0,
    this.totalScore = 0,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      displayName: json['display_name'] as String,
      avatarUrl: json['avatar_url'] as String?,
      gamesPlayed: json['games_played'] as int? ?? 0,
      gamesWon: json['games_won'] as int? ?? 0,
      highestFaan: json['highest_faan'] as int? ?? 0,
      totalScore: json['total_score'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'display_name': displayName,
        'avatar_url': avatarUrl,
        'games_played': gamesPlayed,
        'games_won': gamesWon,
        'highest_faan': highestFaan,
        'total_score': totalScore,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };

  double get winRate => gamesPlayed > 0 ? gamesWon / gamesPlayed : 0;
}

/// Game room data model
class GameRoom {
  final String id;
  final String hostId;
  final String hostName;
  final String? roomCode;
  final bool isPrivate;
  final int maxPlayers;
  final int currentPlayers;
  final String status;
  final DateTime createdAt;

  GameRoom({
    required this.id,
    required this.hostId,
    required this.hostName,
    this.roomCode,
    this.isPrivate = true,
    this.maxPlayers = 4,
    this.currentPlayers = 1,
    this.status = 'waiting',
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory GameRoom.fromJson(Map<String, dynamic> json) {
    return GameRoom(
      id: json['id'] as String,
      hostId: json['host_id'] as String,
      hostName: json['host_name'] as String,
      roomCode: json['room_code'] as String?,
      isPrivate: json['is_private'] as bool? ?? true,
      maxPlayers: json['max_players'] as int? ?? 4,
      currentPlayers: json['current_players'] as int? ?? 1,
      status: json['status'] as String? ?? 'waiting',
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  bool get isFull => currentPlayers >= maxPlayers;
  bool get canStart => currentPlayers == maxPlayers;
}
