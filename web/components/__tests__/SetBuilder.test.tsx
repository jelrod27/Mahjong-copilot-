import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetBuilder } from '../SetBuilder';
import { TileSuit, TileType, Tile } from '@/models/Tile';

function makeDot(n: number, copy = 1): Tile {
  return {
    id: `dot_${n}_${copy}`,
    suit: TileSuit.DOT,
    type: TileType.SUIT,
    number: n,
    nameEnglish: `${n} Dot`,
    nameChinese: '',
    nameJapanese: '',
    assetPath: '',
  };
}

const testTiles = [
  makeDot(1, 1), makeDot(1, 2), makeDot(1, 3), makeDot(1, 4),
  makeDot(2, 1), makeDot(3, 1),
];

describe('SetBuilder', () => {
  it('renders available tiles', () => {
    render(<SetBuilder availableTiles={testTiles} />);
    expect(screen.getByText('Available Tiles')).toBeInTheDocument();
  });

  it('check button is disabled when no tiles selected', () => {
    render(<SetBuilder availableTiles={testTiles} />);
    const checkBtn = screen.getByText('Check Set');
    expect(checkBtn).toBeDisabled();
  });

  it('selecting a tile enables the check button', () => {
    render(<SetBuilder availableTiles={testTiles} />);
    // Click first tile button (there are tile buttons in the available area)
    const tileButtons = screen.getAllByRole('button').filter(b => b.textContent !== 'Check Set' && b.textContent !== 'Reset');
    fireEvent.click(tileButtons[0]);
    expect(screen.getByText('Check Set')).not.toBeDisabled();
  });

  it('validates a pung (3 identical tiles)', () => {
    render(<SetBuilder availableTiles={testTiles} />);
    const tileButtons = screen.getAllByRole('button').filter(b => b.textContent !== 'Check Set' && b.textContent !== 'Reset');
    // Select first 3 tiles (all 1-dot copies)
    fireEvent.click(tileButtons[0]);
    fireEvent.click(tileButtons[1]);
    fireEvent.click(tileButtons[2]);
    fireEvent.click(screen.getByText('Check Set'));
    expect(screen.getByText(/Valid Pung/)).toBeInTheDocument();
  });

  it('validates a chow (3 consecutive tiles)', () => {
    render(<SetBuilder availableTiles={testTiles} />);
    const tileButtons = screen.getAllByRole('button').filter(b => b.textContent !== 'Check Set' && b.textContent !== 'Reset');
    // Select 1-dot, 2-dot, 3-dot
    fireEvent.click(tileButtons[0]); // 1-dot copy 1
    fireEvent.click(tileButtons[4]); // 2-dot
    fireEvent.click(tileButtons[5]); // 3-dot
    fireEvent.click(screen.getByText('Check Set'));
    expect(screen.getByText(/Valid Chow/)).toBeInTheDocument();
  });

  it('shows error for invalid set', () => {
    render(<SetBuilder availableTiles={testTiles} />);
    const tileButtons = screen.getAllByRole('button').filter(b => b.textContent !== 'Check Set' && b.textContent !== 'Reset');
    // Select 1-dot, 1-dot, 3-dot (not pung or chow)
    fireEvent.click(tileButtons[0]);
    fireEvent.click(tileButtons[1]);
    fireEvent.click(tileButtons[5]); // 3-dot
    fireEvent.click(screen.getByText('Check Set'));
    expect(screen.getByText(/Not a valid set/)).toBeInTheDocument();
  });

  it('reset clears selection and validation', () => {
    render(<SetBuilder availableTiles={testTiles} />);
    const tileButtons = screen.getAllByRole('button').filter(b => b.textContent !== 'Check Set' && b.textContent !== 'Reset');
    fireEvent.click(tileButtons[0]);
    fireEvent.click(screen.getByText('Check Set'));
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByText('Check Set')).toBeDisabled();
  });

  it('calls onValidSet when set is valid', () => {
    const handler = vi.fn();
    render(<SetBuilder availableTiles={testTiles} onValidSet={handler} />);
    const tileButtons = screen.getAllByRole('button').filter(b => b.textContent !== 'Check Set' && b.textContent !== 'Reset');
    fireEvent.click(tileButtons[0]);
    fireEvent.click(tileButtons[1]);
    fireEvent.click(tileButtons[2]);
    fireEvent.click(screen.getByText('Check Set'));
    expect(handler).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ suit: TileSuit.DOT })]),
      'pung',
    );
  });

  it('shows target set type instruction when provided', () => {
    render(<SetBuilder availableTiles={testTiles} targetSetType="pung" />);
    expect(screen.getByText('Build a:')).toBeInTheDocument();
  });
});
