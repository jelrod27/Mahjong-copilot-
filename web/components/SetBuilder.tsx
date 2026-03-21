'use client';

import React, { useState, useCallback } from 'react';
import { Tile, TileSuit, TileType } from '@/models/Tile';
import { MahjongTile } from './MahjongTile';
import { isSameTile, isPung, isChow, isKong } from '@/engine/claiming';

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
  targetSetType?: SetType;
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
    if (tiles.length === 0) return { isValid: false, setType: null, message: 'Select tiles to build a set' };
    if (tiles.length === 2) {
      if (isSameTile(tiles[0], tiles[1])) return { isValid: true, setType: 'pair', message: 'Valid Pair!' };
      return { isValid: false, setType: null, message: 'A pair needs 2 identical tiles' };
    }
    if (tiles.length === 3) {
      if (isPung(tiles)) return { isValid: true, setType: 'pung', message: 'Valid Pung!' };
      if (isChow(tiles)) return { isValid: true, setType: 'chow', message: 'Valid Chow!' };
      return { isValid: false, setType: null, message: 'Not a valid set. Try 3 identical tiles OR 3 consecutive numbers in the same suit.' };
    }
    if (tiles.length === 4) {
      if (isKong(tiles)) return { isValid: true, setType: 'kong', message: 'Valid Kong!' };
      return { isValid: false, setType: null, message: 'A Kong needs 4 identical tiles' };
    }
    return { isValid: false, setType: null, message: 'Invalid number of tiles' };
  }, []);

  const handleTilePress = (tile: Tile) => {
    setHasSubmitted(false);
    setValidationResult(null);
    setSelectedTiles(prev => {
      if (prev.find(t => t.id === tile.id)) return prev.filter(t => t.id !== tile.id);
      if (prev.length < maxSelection) return [...prev, tile];
      return prev;
    });
  };

  const handleCheck = () => {
    const result = validateSet(selectedTiles);
    setValidationResult(result);
    setHasSubmitted(true);
    if (result.isValid && onValidSet) onValidSet(selectedTiles, result.setType);
  };

  const handleReset = () => {
    setSelectedTiles([]);
    setValidationResult(null);
    setHasSubmitted(false);
  };

  const tileGroups = [
    { title: 'Dots', tiles: availableTiles.filter(t => t.suit === TileSuit.DOT) },
    { title: 'Bamboo', tiles: availableTiles.filter(t => t.suit === TileSuit.BAMBOO) },
    { title: 'Characters', tiles: availableTiles.filter(t => t.suit === TileSuit.CHARACTER) },
    { title: 'Winds', tiles: availableTiles.filter(t => t.suit === TileSuit.WIND) },
    { title: 'Dragons', tiles: availableTiles.filter(t => t.suit === TileSuit.DRAGON) },
  ].filter(g => g.tiles.length > 0);

  return (
    <div className="flex flex-col bg-surface">
      {/* Target instruction */}
      {targetSetType && (
        <div className="bg-mahjong-gold p-4 text-center">
          <span className="text-lg font-semibold text-black">
            Build a: <span className="font-bold uppercase">{targetSetType}</span>
          </span>
        </div>
      )}

      {/* Selected tiles area */}
      <div className="bg-white p-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          Selected ({selectedTiles.length}/{maxSelection})
        </h3>
        <div className="flex flex-wrap items-center justify-center min-h-[90px] bg-gray-50 rounded-md p-2 gap-1">
          {selectedTiles.length === 0 ? (
            <span className="text-gray-400 italic">Tap tiles below to select</span>
          ) : (
            selectedTiles.map((tile, index) => (
              <div key={`${tile.id}-${index}`} className="m-1">
                <MahjongTile tile={tile} width={50} height={75} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Validation result */}
      {hasSubmitted && validationResult && (
        <div className={`mx-4 mt-4 p-4 rounded-md text-center border-l-4 ${
          validationResult.isValid
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}>
          <span className={`text-base font-semibold ${
            validationResult.isValid ? 'text-green-500' : 'text-red-500'
          }`}>
            {validationResult.isValid ? '✓ ' : ''}{validationResult.message}
          </span>
          {validationResult.isValid && (
            <span className="ml-2 text-sm font-bold text-gray-500 bg-white px-3 py-1 rounded-full">
              {validationResult.setType?.toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 p-4">
        <button
          className={`flex-1 py-3 rounded-md text-base font-semibold text-white bg-mahjong-green ${
            selectedTiles.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
          }`}
          onClick={handleCheck}
          disabled={selectedTiles.length === 0}
        >
          Check Set
        </button>
        <button
          className="flex-1 py-3 rounded-md text-base font-semibold text-gray-500 bg-white border-2 border-gray-500 hover:bg-gray-50"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      {/* Available tiles */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Available Tiles</h3>
        {tileGroups.map(group => (
          <div key={group.title} className="mb-4">
            <h4 className="text-sm font-semibold text-gray-500 mb-1">{group.title}</h4>
            <div className="flex flex-wrap gap-1">
              {group.tiles.map(tile => {
                const isSelected = !!selectedTiles.find(t => t.id === tile.id);
                return (
                  <button
                    key={tile.id}
                    onClick={() => handleTilePress(tile)}
                    className={`p-0.5 ${isSelected ? 'opacity-50' : ''}`}
                    type="button"
                  >
                    <MahjongTile tile={tile} width={45} height={68} isSelected={isSelected} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Helper text */}
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Quick Reference:</h4>
        <p className="text-xs text-gray-500">Pung = 3 identical tiles</p>
        <p className="text-xs text-gray-500">Chow = 3 consecutive suit tiles</p>
        <p className="text-xs text-gray-500">Kong = 4 identical tiles</p>
        <p className="text-xs text-gray-500">Pair = 2 identical tiles</p>
      </div>
    </div>
  );
};

export default SetBuilder;
