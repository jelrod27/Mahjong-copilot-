import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/game_state.dart';
import '../../models/tile.dart';
import '../../providers/game_provider.dart';
import '../../providers/progress_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/settings_provider.dart';
import '../../widgets/mahjong_tiles/tile_widget.dart';
import '../../core/theme/app_theme.dart';

class PracticeScreen extends StatelessWidget {
  const PracticeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Practice'),
      ),
      body: Consumer<GameProvider>(
        builder: (context, gameProvider, _) {
          if (gameProvider.hasActiveGame) {
            return const GameBoardScreen();
          }
          return const PracticeMenuScreen();
        },
      ),
    );
  }
}

class PracticeMenuScreen extends StatelessWidget {
  const PracticeMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.casino,
              size: 80,
              color: AppTheme.primaryGreen,
            ),
            const SizedBox(height: 24),
            Text(
              'Practice Mode',
              style: Theme.of(context).textTheme.displayMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Play against AI opponents to improve your skills',
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),
            ElevatedButton.icon(
              onPressed: () {
                _showDifficultyDialog(context);
              },
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start New Game'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDifficultyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Select AI Difficulty'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildDifficultyOption(dialogContext, 1, 'Beginner', 'Easy AI'),
            _buildDifficultyOption(dialogContext, 2, 'Intermediate', 'Medium AI'),
            _buildDifficultyOption(dialogContext, 3, 'Advanced', 'Hard AI'),
          ],
        ),
      ),
    );
  }

  Widget _buildDifficultyOption(
    BuildContext context,
    int difficulty,
    String title,
    String description,
  ) {
    return ListTile(
      title: Text(title),
      subtitle: Text(description),
      onTap: () {
        Navigator.pop(context);
        _startGame(context, difficulty);
      },
    );
  }

  void _startGame(BuildContext context, int difficulty) {
    final gameProvider = Provider.of<GameProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final settingsProvider = Provider.of<SettingsProvider>(context, listen: false);

    if (authProvider.user != null) {
      gameProvider.createNewGame(
        userId: authProvider.user!.uid,
        variant: settingsProvider.selectedVariant,
        aiDifficulty: difficulty,
      );
    } else {
      // Use guest mode
      gameProvider.createNewGame(
        userId: 'guest_${DateTime.now().millisecondsSinceEpoch}',
        variant: settingsProvider.selectedVariant,
        aiDifficulty: difficulty,
      );
    }
  }
}

class GameBoardScreen extends StatelessWidget {
  const GameBoardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<GameProvider>(
      builder: (context, gameProvider, _) {
        final game = gameProvider.currentGame!;
        final currentPlayer = game.currentPlayer;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Practice Game'),
            actions: [
              IconButton(
                icon: const Icon(Icons.pause),
                onPressed: () => gameProvider.pauseGame(),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () {
                  _showQuitDialog(context, gameProvider);
                },
              ),
            ],
          ),
          body: Column(
            children: [
              // Opponent info
              _buildOpponentInfo(game.players[1]),
              
              // Discard pile
              _buildDiscardPile(game.discardPile),
              
              // Current player's hand
              Expanded(
                child: _buildPlayerHand(context, gameProvider, currentPlayer),
              ),
              
              // Action buttons
              _buildActionButtons(context, gameProvider, game),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOpponentInfo(Player player) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: AppTheme.primaryGreen.withOpacity(0.1),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            player.name,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          Text('Hand: ${player.hand.length} tiles'),
        ],
      ),
    );
  }

  Widget _buildDiscardPile(List<Tile> discardPile) {
    return Container(
      height: 100,
      padding: const EdgeInsets.all(8),
      child: discardPile.isEmpty
          ? const Center(child: Text('No tiles discarded yet'))
          : ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: discardPile.length,
              itemBuilder: (context, index) {
                return Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: MahjongTileWidget(
                    tile: discardPile[index],
                    width: 50,
                    height: 75,
                  ),
                );
              },
            ),
    );
  }

  Widget _buildPlayerHand(
    BuildContext context,
    GameProvider gameProvider,
    Player player,
  ) {
    Tile? selectedTile;

    return StatefulBuilder(
      builder: (context, setState) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Your Hand (${player.hand.length} tiles)',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    childAspectRatio: 0.6,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                  ),
                  itemCount: player.hand.length,
                  itemBuilder: (context, index) {
                    final tile = player.hand[index];
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          selectedTile = selectedTile == tile ? null : tile;
                        });
                      },
                      child: MahjongTileWidget(
                        tile: tile,
                        width: 60,
                        height: 90,
                        isSelected: selectedTile == tile,
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActionButtons(
    BuildContext context,
    GameProvider gameProvider,
    GameState game,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          ElevatedButton.icon(
            onPressed: () {
              // Draw tile
              gameProvider.makeMove(action: PlayerAction.draw);
            },
            icon: const Icon(Icons.add),
            label: const Text('Draw'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              // Discard selected tile
              // This would need to track selected tile
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Select a tile to discard')),
              );
            },
            icon: const Icon(Icons.remove),
            label: const Text('Discard'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              // Try to win
              gameProvider.makeMove(action: PlayerAction.win);
            },
            icon: const Icon(Icons.emoji_events),
            label: const Text('Win'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.successColor,
            ),
          ),
        ],
      ),
    );
  }

  void _showQuitDialog(BuildContext context, GameProvider gameProvider) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Quit Game?'),
        content: const Text('Are you sure you want to quit this game?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              gameProvider.clearGame();
              Navigator.pop(dialogContext);
            },
            child: const Text('Quit'),
          ),
        ],
      ),
    );
  }
}

import '../../providers/auth_provider.dart';
import '../../providers/settings_provider.dart';

