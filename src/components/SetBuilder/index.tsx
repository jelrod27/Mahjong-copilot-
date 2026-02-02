// SetBuilder Component
// Interactive component for building and validating tile sets

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {AppColors, AppRadius, AppSpacing} from '../../theme/appTheme';
import {Tile, TileSuit, TileType} from '../../models/Tile';
import {MahjongTile} from '../MahjongTile';

export type SetType = 'pung' | 'chow' | 'kong' | 'pair' | null;

interface SetValidationResult {
  isValid: boolean;
  setType: SetType;
  message: string;
}

interface SetBuilderProps {
  availableTiles: Tile[];
  onValidSet?: (tiles: Tile[], setType: SetType) => void;
  maxSelection?: number;
  targetSetType?: SetType; // If specified, user must build this specific type
}

export const SetBuilder: React.FC<SetBuilderProps> = ({
  availableTiles,
  onValidSet,
  maxSelection = 4,
  targetSetType,
}) => {
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [validationResult, setValidationResult] = useState<SetValidationResult | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const validateSet = useCallback((tiles: Tile[]): SetValidationResult => {
    if (tiles.length === 0) {
      return {isValid: false, setType: null, message: 'Select tiles to build a set'};
    }

    if (tiles.length === 2) {
      // Check for pair
      const [t1, t2] = tiles;
      if (isSameTile(t1, t2)) {
        return {isValid: true, setType: 'pair', message: '✓ Valid Pair!'};
      }
      return {isValid: false, setType: null, message: 'A pair needs 2 identical tiles'};
    }

    if (tiles.length === 3) {
      // Check for pung
      if (isPung(tiles)) {
        return {isValid: true, setType: 'pung', message: '✓ Valid Pung!'};
      }
      // Check for chow
      if (isChow(tiles)) {
        return {isValid: true, setType: 'chow', message: '✓ Valid Chow!'};
      }
      return {isValid: false, setType: null, message: 'Not a valid set. Try 3 identical tiles OR 3 consecutive numbers in the same suit.'};
    }

    if (tiles.length === 4) {
      // Check for kong
      if (isKong(tiles)) {
        return {isValid: true, setType: 'kong', message: '✓ Valid Kong!'};
      }
      return {isValid: false, setType: null, message: 'A Kong needs 4 identical tiles'};
    }

    return {isValid: false, setType: null, message: 'Invalid number of tiles'};
  }, []);

  const handleTilePress = (tile: Tile) => {
    setHasSubmitted(false);
    setValidationResult(null);

    setSelectedTiles(prev => {
      const isSelected = prev.find(t => t.id === tile.id);
      if (isSelected) {
        // Deselect
        return prev.filter(t => t.id !== tile.id);
      }
      // Select (if under max)
      if (prev.length < maxSelection) {
        return [...prev, tile];
      }
      return prev;
    });
  };

  const handleCheck = () => {
    const result = validateSet(selectedTiles);
    setValidationResult(result);
    setHasSubmitted(true);

    if (result.isValid && onValidSet) {
      onValidSet(selectedTiles, result.setType);
    }
  };

  const handleReset = () => {
    setSelectedTiles([]);
    setValidationResult(null);
    setHasSubmitted(false);
  };

  const getTileGroups = () => {
    // Group tiles by type for better organization
    const groups: {title: string; tiles: Tile[]}[] = [
      {title: 'Dots', tiles: availableTiles.filter(t => t.suit === TileSuit.DOT)},
      {title: 'Bamboo', tiles: availableTiles.filter(t => t.suit === TileSuit.BAMBOO)},
      {title: 'Characters', tiles: availableTiles.filter(t => t.suit === TileSuit.CHARACTER)},
      {title: 'Winds', tiles: availableTiles.filter(t => t.suit === TileSuit.WIND)},
      {title: 'Dragons', tiles: availableTiles.filter(t => t.suit === TileSuit.DRAGON)},
    ];
    return groups.filter(g => g.tiles.length > 0);
  };

  return (
    <View style={styles.container}>
      {/* Target instruction */}
      {targetSetType && (
        <View style={styles.targetContainer}>
          <Text style={styles.targetText}>
            Build a: <Text style={styles.targetHighlight}>{targetSetType.toUpperCase()}</Text>
          </Text>
        </View>
      )}

      {/* Selected tiles area */}
      <View style={styles.selectedArea}>
        <Text style={styles.sectionTitle}>
          Selected ({selectedTiles.length}/{maxSelection})
        </Text>
        <View style={styles.selectedTilesContainer}>
          {selectedTiles.length === 0 ? (
            <Text style={styles.placeholderText}>Tap tiles below to select</Text>
          ) : (
            selectedTiles.map((tile, index) => (
              <View key={`${tile.id}-${index}`} style={styles.selectedTileWrapper}>
                <MahjongTile tile={tile} width={50} height={75} />
              </View>
            ))
          )}
        </View>
      </View>

      {/* Validation result */}
      {hasSubmitted && validationResult && (
        <View style={[
          styles.resultContainer,
          validationResult.isValid ? styles.resultValid : styles.resultInvalid
        ]}>
          <Text style={[
            styles.resultText,
            validationResult.isValid ? styles.resultTextValid : styles.resultTextInvalid
          ]}>
            {validationResult.message}
          </Text>
          {validationResult.isValid && (
            <Text style={styles.setTypeLabel}>
              {validationResult.setType?.toUpperCase()}
            </Text>
          )}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.checkButton, selectedTiles.length === 0 && styles.buttonDisabled]}
          onPress={handleCheck}
          disabled={selectedTiles.length === 0}
        >
          <Text style={styles.buttonText}>Check Set</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.resetButton]}
          onPress={handleReset}
        >
          <Text style={[styles.buttonText, styles.resetButtonText]}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Available tiles */}
      <ScrollView style={styles.availableContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Available Tiles</Text>
        
        {getTileGroups().map(group => (
          <View key={group.title} style={styles.tileGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.tilesRow}>
              {group.tiles.map(tile => {
                const isSelected = selectedTiles.find(t => t.id === tile.id);
                return (
                  <TouchableOpacity
                    key={tile.id}
                    onPress={() => handleTilePress(tile)}
                    style={[
                      styles.tileWrapper,
                      isSelected && styles.tileSelected
                    ]}
                  >
                    <MahjongTile 
                      tile={tile} 
                      width={45} 
                      height={68}
                      isSelected={!!isSelected}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Helper text */}
      <View style={styles.helperContainer}>
        <Text style={styles.helperTitle}>Quick Reference:</Text>
        <Text style={styles.helperText}>• Pung = 3 identical tiles</Text>
        <Text style={styles.helperText}>• Chow = 3 consecutive suit tiles</Text>
        <Text style={styles.helperText}>• Kong = 4 identical tiles</Text>
        <Text style={styles.helperText}>• Pair = 2 identical tiles</Text>
      </View>
    </View>
  );
};

// Validation helpers
function isSameTile(t1: Tile, t2: Tile): boolean {
  if (t1.suit !== t2.suit) return false;
  if (t1.number !== t2.number) return false;
  if (t1.wind !== t2.wind) return false;
  if (t1.dragon !== t2.dragon) return false;
  return true;
}

function isPung(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  const [t1, t2, t3] = tiles;
  return isSameTile(t1, t2) && isSameTile(t2, t3);
}

function isChow(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  
  // Must all be suit tiles
  if (tiles.some(t => t.type !== TileType.SUIT)) return false;
  
  // Must all be same suit
  const suit = tiles[0].suit;
  if (tiles.some(t => t.suit !== suit)) return false;
  
  // Get numbers and sort
  const numbers = tiles.map(t => t.number!).sort((a, b) => a - b);
  
  // Must be consecutive
  return numbers[1] === numbers[0] + 1 && numbers[2] === numbers[1] + 1;
}

function isKong(tiles: Tile[]): boolean {
  if (tiles.length !== 4) return false;
  return tiles.every(t => isSameTile(t, tiles[0]));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundColor,
  },
  targetContainer: {
    backgroundColor: AppColors.primaryGold,
    padding: AppSpacing.md,
    alignItems: 'center',
  },
  targetText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  targetHighlight: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  selectedArea: {
    backgroundColor: '#FFFFFF',
    padding: AppSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.sm,
  },
  selectedTilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: AppRadius.md,
    padding: AppSpacing.sm,
  },
  selectedTileWrapper: {
    margin: 4,
  },
  placeholderText: {
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  resultContainer: {
    padding: AppSpacing.md,
    margin: AppSpacing.md,
    borderRadius: AppRadius.md,
    alignItems: 'center',
  },
  resultValid: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  resultInvalid: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultTextValid: {
    color: '#22C55E',
  },
  resultTextInvalid: {
    color: '#EF4444',
  },
  setTypeLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: AppColors.textSecondary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: AppRadius.round,
    overflow: 'hidden',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: AppSpacing.md,
    borderRadius: AppRadius.md,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: AppColors.primaryGreen,
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: AppColors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resetButtonText: {
    color: AppColors.textSecondary,
  },
  availableContainer: {
    flex: 1,
    padding: AppSpacing.md,
  },
  tileGroup: {
    marginBottom: AppSpacing.md,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: AppSpacing.xs,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tileWrapper: {
    padding: 2,
  },
  tileSelected: {
    opacity: 0.5,
  },
  helperContainer: {
    backgroundColor: '#F9FAFB',
    padding: AppSpacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  helperTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.xs,
  },
  helperText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 2,
  },
});

export default SetBuilder;
