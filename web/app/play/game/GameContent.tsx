'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { initializeGame } from '@/engine/turnManager';
import { GameState } from '@/models/GameState';
import { Tile } from '@/models/Tile';
import GameBoard from '@/components/game/GameBoard';

export default function GameContent() {
  const searchParams = useSearchParams();
  const difficulty = (searchParams.get('difficulty') || 'easy') as 'easy' | 'medium' | 'hard';

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | undefined>();

  useEffect(() => {
    const state = initializeGame({
      playerNames: ['You', 'West AI', 'North AI', 'East AI'],
      aiPlayers: [
        { index: 1, difficulty },
        { index: 2, difficulty },
        { index: 3, difficulty },
      ],
      humanPlayerId: 'human-player',
    });
    setGameState(state);
  }, [difficulty]);

  if (!gameState) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="font-pixel text-retro-cyan retro-glow text-sm">
          DEALING TILES<span className="animate-blink">...</span>
        </div>
      </div>
    );
  }

  const handleTileSelect = (tile: Tile) => {
    setSelectedTileId(prev => prev === tile.id ? undefined : tile.id);
  };

  // Placeholder handlers — will be wired in PR 2
  const handleDiscard = () => {};
  const handleKong = () => {};
  const handleWin = () => {};
  const handleClaim = () => {};
  const handlePass = () => {};

  return (
    <GameBoard
      gameState={gameState}
      humanPlayerId="human-player"
      selectedTileId={selectedTileId}
      onTileSelect={handleTileSelect}
      onDiscard={handleDiscard}
      onKong={handleKong}
      onWin={handleWin}
      onClaim={handleClaim}
      onPass={handlePass}
    />
  );
}
