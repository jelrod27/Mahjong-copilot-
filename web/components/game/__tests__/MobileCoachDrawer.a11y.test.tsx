import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MobileCoachDrawer from '../MobileCoachDrawer';
import { initializeGame } from '@/engine/turnManager';
import { dot } from '@/engine/__tests__/testHelpers';

const initialGame = initializeGame({
  playerNames: ['Human', 'AI 1', 'AI 2', 'AI 3'],
  aiPlayers: [
    { index: 1, difficulty: 'easy' },
    { index: 2, difficulty: 'easy' },
    { index: 3, difficulty: 'easy' },
  ],
  humanPlayerId: 'human-1',
  seed: 'mobile-discard-history',
});
const opponentId = initialGame.players[1].id;
const game = {
  ...initialGame,
  playerDiscards: {
    ...initialGame.playerDiscards,
    [opponentId]: [dot(1)],
  },
};

describe('MobileCoachDrawer accessibility', () => {
  it('makes opponent discard history available through a keyboard-operable disclosure', () => {
    render(<MobileCoachDrawer game={game} humanPlayerId="human-1" faanProjection={null} />);

    fireEvent.click(screen.getByRole('button', { name: /Coach tools/ }));
    const discardReading = screen.getByRole('button', { name: 'Expand discard reading' });
    expect(discardReading).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(discardReading);
    expect(screen.getByRole('button', { name: 'Collapse discard reading' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('AI 1')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mahjong tile: 1 dot' })).toBeInTheDocument();
  });
});
