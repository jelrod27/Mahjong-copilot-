import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../models/tile.dart';
import '../core/theme/app_theme.dart';

class MahjongTileWidget extends StatelessWidget {
  final Tile tile;
  final double width;
  final double height;
  final bool showBack;
  final bool isSelected;
  final VoidCallback? onTap;
  final Color? borderColor;

  const MahjongTileWidget({
    super.key,
    required this.tile,
    this.width = 60,
    this.height = 90,
    this.showBack = false,
    this.isSelected = false,
    this.onTap,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: showBack ? AppTheme.tileBackground : AppTheme.tileBackground,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: isSelected
                ? AppTheme.primaryGreen
                : (borderColor ?? AppTheme.tileBorder),
            width: isSelected ? 3 : 2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.primaryGreen.withOpacity(0.3),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
                ]
              : null,
        ),
        child: showBack
            ? _buildTileBack()
            : _buildTileFront(context),
      ),
    );
  }

  Widget _buildTileBack() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.md),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppTheme.primaryGreen.withOpacity(0.8),
            AppTheme.primaryGreen,
          ],
        ),
      ),
      child: Center(
        child: Text(
          '🀄',
          style: TextStyle(fontSize: width * 0.4),
        ),
      ),
    );
  }

  Widget _buildTileFront(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Stack(
        children: [
          // Tile background
          Container(
            color: AppTheme.tileBackground,
            child: Padding(
              padding: const EdgeInsets.all(4.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Tile symbol/number
                  _buildTileSymbol(),
                  
                  // Tile name (small)
                  if (width > 50)
                    Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(
                        tile.nameEnglish,
                        style: TextStyle(
                          fontSize: width * 0.12,
                          color: AppTheme.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
              ),
            ),
          ),
          
          // Suit color indicator (top bar)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              height: 4,
              decoration: BoxDecoration(
                color: _getSuitColor(),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(AppRadius.md),
                  topRight: Radius.circular(AppRadius.md),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTileSymbol() {
    // Try to load SVG, fallback to text
    return Builder(
      builder: (context) {
        try {
          return SvgPicture.asset(
            tile.assetPath,
            width: width * 0.6,
            height: height * 0.5,
            placeholderBuilder: (context) => _buildTextSymbol(),
          );
        } catch (e) {
          return _buildTextSymbol();
        }
      },
    );
  }

  Widget _buildTextSymbol() {
    switch (tile.type) {
      case TileType.suit:
        return Text(
          '${tile.number}',
          style: TextStyle(
            fontSize: width * 0.35,
            fontWeight: FontWeight.bold,
            color: _getSuitColor(),
          ),
        );
      case TileType.honor:
        if (tile.wind != null) {
          final windSymbols = {
            TileSuit.wind: '風',
          };
          return Text(
            windSymbols[tile.suit] ?? '',
            style: TextStyle(
              fontSize: width * 0.3,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          );
        } else if (tile.dragon != null) {
          final dragonSymbols = {
            DragonTile.red: '中',
            DragonTile.green: '發',
            DragonTile.white: '白',
          };
          return Text(
            dragonSymbols[tile.dragon] ?? '',
            style: TextStyle(
              fontSize: width * 0.3,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          );
        }
        return const SizedBox.shrink();
      case TileType.bonus:
        return Text(
          tile.flower ?? tile.season ?? '',
          style: TextStyle(
            fontSize: width * 0.25,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        );
    }
  }

  Color _getSuitColor() {
    switch (tile.suit) {
      case TileSuit.bamboo:
        return AppTheme.bambooColor;
      case TileSuit.character:
        return AppTheme.characterColor;
      case TileSuit.dot:
        return AppTheme.dotColor;
      case TileSuit.wind:
      case TileSuit.dragon:
        return AppTheme.honorColor;
      case TileSuit.flower:
      case TileSuit.season:
        return AppTheme.primaryGold;
    }
  }
}

// Tile hand widget for displaying multiple tiles
class TileHandWidget extends StatelessWidget {
  final List<Tile> tiles;
  final double tileWidth;
  final double tileHeight;
  final Function(Tile)? onTileTap;
  final Tile? selectedTile;

  const TileHandWidget({
    super.key,
    required this.tiles,
    this.tileWidth = 50,
    this.tileHeight = 75,
    this.onTileTap,
    this.selectedTile,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 4,
      runSpacing: 4,
      alignment: WrapAlignment.center,
      children: tiles.map((tile) {
        return MahjongTileWidget(
          tile: tile,
          width: tileWidth,
          height: tileHeight,
          isSelected: selectedTile?.id == tile.id,
          onTap: () => onTileTap?.call(tile),
        );
      }).toList(),
    );
  }
}

// Compact tile display for lists
class CompactTileWidget extends StatelessWidget {
  final Tile tile;
  final double size;

  const CompactTileWidget({
    super.key,
    required this.tile,
    this.size = 40,
  });

  @override
  Widget build(BuildContext context) {
    return MahjongTileWidget(
      tile: tile,
      width: size,
      height: size * 1.5,
    );
  }
}

