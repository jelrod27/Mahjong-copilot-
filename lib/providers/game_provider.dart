import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/game_state.dart';
import '../models/tile.dart';
import '../core/services/firebase_service.dart';
import '../core/services/storage_service.dart';
import 'dart:math';

class GameProvider with ChangeNotifier {
  GameState? _currentGame;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isPaused = false;

  GameState? get currentGame => _currentGame;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isPaused => _isPaused;
  bool get hasActiveGame => _currentGame != null && !_currentGame!.isFinished;

  Future<void> createNewGame({
    required String userId,
    required String variant,
    required int aiDifficulty, // 1-5
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final gameId = FirebaseService.firestore.collection('games').doc().id;
      final tiles = TileFactory.getAllTiles();
      tiles.shuffle(Random());

      final players = [
        Player(id: userId, name: 'You', isAI: false),
        Player(id: 'ai1', name: 'AI Player 1', isAI: true),
        Player(id: 'ai2', name: 'AI Player 2', isAI: true),
        Player(id: 'ai3', name: 'AI Player 3', isAI: true),
      ];

      // Deal tiles (13 tiles per player, 1 tile to start)
      final hands = <List<Tile>>[];
      int tileIndex = 0;

      for (int i = 0; i < 4; i++) {
        hands.add(tiles.sublist(tileIndex, tileIndex + 13));
        tileIndex += 13;
      }

      // Update players with their hands
      final updatedPlayers = <Player>[];
      for (int i = 0; i < 4; i++) {
        updatedPlayers.add(players[i].copyWith(hand: hands[i]));
      }

      // Draw first tile for player
      final firstTile = tiles[tileIndex];
      updatedPlayers[0] = updatedPlayers[0].copyWith(
        hand: [...updatedPlayers[0].hand, firstTile],
      );

      final wall = tiles.sublist(tileIndex + 1);

      _currentGame = GameState(
        id: gameId,
        variant: variant,
        phase: GamePhase.playing,
        players: updatedPlayers,
        currentPlayerIndex: 0,
        wall: wall,
        createdAt: DateTime.now(),
      );

      await saveGame();
      await FirebaseService.logEvent('game_started', {
        'variant': variant,
        'difficulty': aiDifficulty,
      });
    } catch (e) {
      _errorMessage = 'Failed to create game: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadGame(String gameId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final doc =
          await FirebaseService.firestore.collection('games').doc(gameId).get();

      if (doc.exists) {
        _currentGame = GameState.fromJson(doc.data()!);
      } else {
        _errorMessage = 'Game not found';
      }
    } catch (e) {
      _errorMessage = 'Failed to load game: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> makeMove({
    required PlayerAction action,
    Tile? tile,
  }) async {
    if (_currentGame == null || _currentGame!.isFinished) return;

    _isLoading = true;
    notifyListeners();

    try {
      final currentPlayer = _currentGame!.currentPlayer;
      final updatedPlayers = List<Player>.from(_currentGame!.players);
      final updatedTurnHistory = List<GameTurn>.from(_currentGame!.turnHistory);

      switch (action) {
        case PlayerAction.draw:
          if (_currentGame!.wall.isNotEmpty) {
            final drawnTile = _currentGame!.wall.first;
            final updatedWall = _currentGame!.wall.sublist(1);
            final updatedHand = [...currentPlayer.hand, drawnTile];

            updatedPlayers[_currentGame!.currentPlayerIndex] =
                currentPlayer.copyWith(hand: updatedHand);

            _currentGame = _currentGame!.copyWith(
              players: updatedPlayers,
              wall: updatedWall,
              lastDrawnTile: drawnTile,
            );
          }
          break;

        case PlayerAction.discard:
          if (tile != null) {
            final updatedHand = List<Tile>.from(currentPlayer.hand)
              ..remove(tile);
            final updatedDiscardPile = [..._currentGame!.discardPile, tile];

            updatedPlayers[_currentGame!.currentPlayerIndex] =
                currentPlayer.copyWith(hand: updatedHand);

            // Move to next player
            final nextPlayerIndex =
                (_currentGame!.currentPlayerIndex + 1) % 4;

            updatedTurnHistory.add(GameTurn(
              turnNumber: _currentGame!.turnHistory.length + 1,
              playerId: currentPlayer.id,
              action: action,
              tile: tile,
              timestamp: DateTime.now(),
            ));

            _currentGame = _currentGame!.copyWith(
              players: updatedPlayers,
              discardPile: updatedDiscardPile,
              lastDiscardedTile: tile,
              lastAction: action,
              currentPlayerIndex: nextPlayerIndex,
              turnHistory: updatedTurnHistory,
            );

            // Simple AI turn
            if (updatedPlayers[nextPlayerIndex].isAI) {
              await _makeAIMove(nextPlayerIndex);
            }
          }
          break;

        case PlayerAction.win:
          _currentGame = _currentGame!.copyWith(
            phase: GamePhase.finished,
            winnerId: currentPlayer.id,
            finishedAt: DateTime.now(),
          );
          await FirebaseService.logEvent('game_won', {
            'variant': _currentGame!.variant,
          });
          break;

        default:
          // Other actions (chow, pung, kong) implemented later
          break;
      }

      await saveGame();
    } catch (e) {
      _errorMessage = 'Failed to make move: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _makeAIMove(int playerIndex) async {
    // Simple rule-based AI - discard random tile
    await Future.delayed(const Duration(milliseconds: 500));

    final aiPlayer = _currentGame!.players[playerIndex];
    if (aiPlayer.hand.isEmpty) return;

    final random = Random();
    final tileToDiscard = aiPlayer.hand[random.nextInt(aiPlayer.hand.length)];

    await makeMove(action: PlayerAction.discard, tile: tileToDiscard);
  }

  Future<void> pauseGame() async {
    if (_currentGame == null) return;

    _isPaused = true;
    _currentGame = _currentGame!.copyWith(phase: GamePhase.paused);
    await saveGame();
    notifyListeners();
  }

  Future<void> resumeGame() async {
    if (_currentGame == null) return;

    _isPaused = false;
    _currentGame = _currentGame!.copyWith(phase: GamePhase.playing);
    await saveGame();
    notifyListeners();
  }

  Future<void> saveGame() async {
    if (_currentGame == null) return;

    try {
      await FirebaseService.firestore
          .collection('games')
          .doc(_currentGame!.id)
          .set(_currentGame!.toJson(), SetOptions(merge: true));

      // Also save locally for offline play
      await StorageService.saveGame(_currentGame!);
    } catch (e) {
      _errorMessage = 'Failed to save game: $e';
      debugPrint('Error saving game: $e');
    }
  }

  void clearGame() {
    _currentGame = null;
    _isPaused = false;
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}

