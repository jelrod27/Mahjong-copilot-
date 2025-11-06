import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import SvgUri from 'react-native-svg-uri';
import {Tile, TileType, TileSuit, WindTile, DragonTile} from '../../models/Tile';
import {AppColors, AppRadius} from '../../theme/appTheme';

interface MahjongTileProps {
  tile: Tile;
  width?: number;
  height?: number;
  showBack?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  borderColor?: string;
}

export const MahjongTile: React.FC<MahjongTileProps> = ({
  tile,
  width = 60,
  height = 90,
  showBack = false,
  isSelected = false,
  onPress,
  borderColor,
}) => {
  const getSuitColor = (): string => {
    switch (tile.suit) {
      case TileSuit.BAMBOO:
        return AppColors.bambooColor;
      case TileSuit.CHARACTER:
        return AppColors.characterColor;
      case TileSuit.DOT:
        return AppColors.dotColor;
      case TileSuit.WIND:
      case TileSuit.DRAGON:
        return AppColors.honorColor;
      case TileSuit.FLOWER:
      case TileSuit.SEASON:
        return AppColors.primaryGold;
      default:
        return AppColors.tileBorder;
    }
  };

  const buildTextSymbol = (): string => {
    switch (tile.type) {
      case TileType.SUIT:
        return tile.number?.toString() || '';
      case TileType.HONOR:
        if (tile.wind) {
          const windSymbols: Record<WindTile, string> = {
            [WindTile.EAST]: '東',
            [WindTile.SOUTH]: '南',
            [WindTile.WEST]: '西',
            [WindTile.NORTH]: '北',
          };
          return windSymbols[tile.wind] || '';
        } else if (tile.dragon) {
          const dragonSymbols: Record<DragonTile, string> = {
            [DragonTile.RED]: '中',
            [DragonTile.GREEN]: '發',
            [DragonTile.WHITE]: '白',
          };
          return dragonSymbols[tile.dragon] || '';
        }
        return '';
      case TileType.BONUS:
        return tile.flower || tile.season || '';
      default:
        return '';
    }
  };

  const containerStyle = [
    styles.container,
    {
      width,
      height,
      borderRadius: AppRadius.md,
      borderWidth: isSelected ? 3 : 2,
      borderColor: isSelected ? AppColors.primaryGreen : (borderColor || AppColors.tileBorder),
      shadowColor: isSelected ? AppColors.primaryGreen : 'transparent',
      shadowOffset: isSelected ? {width: 0, height: 2} : {width: 0, height: 0},
      shadowOpacity: isSelected ? 0.3 : 0,
      shadowRadius: isSelected ? 8 : 0,
      elevation: isSelected ? 4 : 0,
    },
  ];

  const content = showBack ? (
    <View style={styles.backContainer}>
      <Text style={[styles.backSymbol, {fontSize: width * 0.4}]}>🀄</Text>
    </View>
  ) : (
    <View style={styles.frontContainer}>
      {/* Suit color indicator (top bar) */}
      <View style={[styles.suitIndicator, {backgroundColor: getSuitColor()}]} />
      
      {/* Tile content */}
      <View style={styles.tileContent}>
        {/* Try to load SVG, fallback to text */}
        <View style={styles.symbolContainer}>
          {tile.assetPath ? (
            <SvgUri
              width={width * 0.6}
              height={height * 0.5}
              source={{uri: tile.assetPath}}
              fallback={<Text style={[styles.symbolText, {fontSize: width * 0.35, color: getSuitColor()}]}>{buildTextSymbol()}</Text>}
            />
          ) : (
            <Text style={[styles.symbolText, {fontSize: width * 0.35, color: getSuitColor()}]}>{buildTextSymbol()}</Text>
          )}
        </View>
        
        {/* Tile name (small) */}
        {width > 50 && (
          <Text style={[styles.tileName, {fontSize: width * 0.12}]} numberOfLines={2}>
            {tile.nameEnglish}
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={containerStyle}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.tileBackground,
    overflow: 'hidden',
  },
  backContainer: {
    flex: 1,
    backgroundColor: AppColors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backSymbol: {
    color: '#FFFFFF',
  },
  frontContainer: {
    flex: 1,
    backgroundColor: AppColors.tileBackground,
    overflow: 'hidden',
  },
  suitIndicator: {
    height: 4,
    width: '100%',
  },
  tileContent: {
    flex: 1,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolText: {
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  tileName: {
    marginTop: 4,
    color: AppColors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});

interface TileHandProps {
  tiles: Tile[];
  tileWidth?: number;
  tileHeight?: number;
  onTilePress?: (tile: Tile) => void;
  selectedTile?: Tile;
}

export const TileHand: React.FC<TileHandProps> = ({
  tiles,
  tileWidth = 50,
  tileHeight = 75,
  onTilePress,
  selectedTile,
}) => {
  return (
    <View style={stylesHand.container}>
      {tiles.map((tile) => (
        <MahjongTile
          key={tile.id}
          tile={tile}
          width={tileWidth}
          height={tileHeight}
          isSelected={selectedTile?.id === tile.id}
          onPress={() => onTilePress?.(tile)}
        />
      ))}
    </View>
  );
};

const stylesHand = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
});

interface CompactTileProps {
  tile: Tile;
  size?: number;
}

export const CompactTile: React.FC<CompactTileProps> = ({
  tile,
  size = 40,
}) => {
  return (
    <MahjongTile
      tile={tile}
      width={size}
      height={size * 1.5}
    />
  );
};

export default MahjongTile;

