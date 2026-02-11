import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/models/tile.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';

/// A widget that displays a mahjong tile with animations
class TileWidget extends StatelessWidget {
  final Tile tile;
  final bool isSelected;
  final bool isDisabled;
  final bool isHighlighted;
  final VoidCallback? onTap;
  final TileSize size;

  const TileWidget({
    super.key,
    required this.tile,
    this.isSelected = false,
    this.isDisabled = false,
    this.isHighlighted = false,
    this.onTap,
    this.size = TileSize.medium,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isDisabled ? null : onTap,
      child: _buildTile()
          .animate(target: isSelected ? 1 : 0)
          .scale(
            begin: 1.0,
            end: 1.08,
            duration: 200.ms,
            curve: Curves.easeOut,
          )
          .elevation(
            begin: AppTheme.elevationLow,
            end: AppTheme.elevationHigh,
            duration: 200.ms,
          ),
    );
  }

  Widget _buildTile() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: size.width,
      height: size.height,
      decoration: BoxDecoration(
        color: isDisabled
            ? AppColors.tileBorder.withOpacity(0.5)
            : AppColors.tileBackground,
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
        border: Border.all(
          color: isSelected
              ? AppColors.selectedTile
              : isHighlighted
                  ? AppColors.discardHighlight
                  : AppColors.tileBorder,
          width: isSelected || isHighlighted ? 3 : 2,
        ),
        boxShadow: [
          BoxShadow(
            color: isSelected
                ? AppColors.selectedTile.withOpacity(0.3)
                : AppColors.shadowLight,
            blurRadius: isSelected ? 8 : 4,
            offset: const Offset(1, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Top color bar indicating suit
          Container(
            height: 4,
            decoration: BoxDecoration(
              color: _getSuitColor(),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(AppTheme.radiusSmall - 2),
              ),
            ),
          ),
          // Tile content
          Expanded(
            child: Center(
              child: _buildTileContent(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTileContent() {
    // Try to load SVG, fallback to text
    return FutureBuilder<bool>(
      future: _checkAssetExists(),
      builder: (context, snapshot) {
        if (snapshot.data == true) {
          return Padding(
            padding: const EdgeInsets.all(4),
            child: SvgPicture.asset(
              tile.assetPath,
              fit: BoxFit.contain,
              colorFilter: isDisabled
                  ? const ColorFilter.mode(Colors.grey, BlendMode.saturation)
                  : null,
            ),
          );
        }
        // Fallback to text representation
        return _buildTextFallback();
      },
    );
  }

  Widget _buildTextFallback() {
    String display;
    if (tile.number != null) {
      display = '${tile.number}';
    } else if (tile.wind != null) {
      display = tile.wind!.chinese;
    } else if (tile.dragon != null) {
      display = tile.dragon!.chinese;
    } else if (tile.bonus != null) {
      display = tile.bonus!.substring(0, 1);
    } else {
      display = '?';
    }

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          display,
          style: TextStyle(
            fontSize: size.fontSize,
            fontWeight: FontWeight.bold,
            color: isDisabled ? Colors.grey : _getSuitColor(),
          ),
        ),
        if (tile.number != null)
          Text(
            _getSuitSymbol(),
            style: TextStyle(
              fontSize: size.fontSize * 0.6,
              color: isDisabled ? Colors.grey : _getSuitColor(),
            ),
          ),
      ],
    );
  }

  Future<bool> _checkAssetExists() async {
    // For now, always return false to use text fallback
    // TODO: Implement actual asset checking when SVGs are added
    return false;
  }

  Color _getSuitColor() {
    switch (tile.suit) {
      case TileSuit.bamboo:
        return AppColors.bambooGreen;
      case TileSuit.character:
        return AppColors.characterRed;
      case TileSuit.dot:
        return AppColors.dotBlue;
      case TileSuit.wind:
      case TileSuit.dragon:
        return AppColors.honorPurple;
      case TileSuit.flower:
      case TileSuit.season:
        return AppColors.bonusGold;
    }
  }

  String _getSuitSymbol() {
    switch (tile.suit) {
      case TileSuit.bamboo:
        return '索';
      case TileSuit.character:
        return '萬';
      case TileSuit.dot:
        return '筒';
      default:
        return '';
    }
  }
}

/// Size variants for tile display
enum TileSize {
  small(width: 36, height: 48, fontSize: 16),
  medium(width: 48, height: 64, fontSize: 20),
  large(width: 60, height: 80, fontSize: 28);

  final double width;
  final double height;
  final double fontSize;

  const TileSize({
    required this.width,
    required this.height,
    required this.fontSize,
  });
}

/// A row of tiles representing a player's hand
class TileHand extends StatelessWidget {
  final List<Tile> tiles;
  final Tile? selectedTile;
  final ValueChanged<Tile>? onTileSelected;
  final TileSize tileSize;
  final bool isInteractive;

  const TileHand({
    super.key,
    required this.tiles,
    this.selectedTile,
    this.onTileSelected,
    this.tileSize = TileSize.medium,
    this.isInteractive = true,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: tiles.asMap().entries.map((entry) {
          final index = entry.key;
          final tile = entry.value;
          final isSelected = selectedTile?.id == tile.id;

          return Padding(
            padding: EdgeInsets.only(
              right: index < tiles.length - 1 ? 4 : 0,
            ),
            child: TileWidget(
              tile: tile,
              isSelected: isSelected,
              onTap: isInteractive ? () => onTileSelected?.call(tile) : null,
              size: tileSize,
            ),
          )
              .animate()
              .fadeIn(delay: (50 * index).ms, duration: 200.ms)
              .slideX(begin: 0.2, end: 0, delay: (50 * index).ms);
        }).toList(),
      ),
    );
  }
}

/// Animated tile that flies from one position to another
class AnimatedTileTransition extends StatelessWidget {
  final Tile tile;
  final Offset startPosition;
  final Offset endPosition;
  final Duration duration;
  final VoidCallback? onComplete;

  const AnimatedTileTransition({
    super.key,
    required this.tile,
    required this.startPosition,
    required this.endPosition,
    this.duration = const Duration(milliseconds: 400),
    this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<Offset>(
      tween: Tween(begin: startPosition, end: endPosition),
      duration: duration,
      curve: Curves.easeOutCubic,
      onEnd: onComplete,
      builder: (context, offset, child) {
        return Positioned(
          left: offset.dx,
          top: offset.dy,
          child: child!,
        );
      },
      child: TileWidget(tile: tile, size: TileSize.medium),
    );
  }
}
