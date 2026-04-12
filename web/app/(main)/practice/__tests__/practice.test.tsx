import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock heavy sub-components to isolate the menu test
vi.mock('../TileQuiz', () => ({ default: () => <div data-testid="tile-quiz">TileQuiz</div> }));
vi.mock('../ScoringQuiz', () => ({ default: () => <div data-testid="scoring-quiz">ScoringQuiz</div> }));
vi.mock('../HandRecognition', () => ({ default: () => <div data-testid="hand-recognition">HandRecognition</div> }));
vi.mock('@/components/game/useGameController', () => ({
  default: () => ({ game: null }),
}));
vi.mock('@/components/game/GameBoard', () => ({ default: () => null }));
vi.mock('@/components/game/GameOverScreen', () => ({ default: () => null }));
vi.mock('@/components/game/HintOverlay', () => ({ default: () => null }));

import PracticePage from '../page';

describe('PracticePage', () => {
  it('renders quiz mode buttons', () => {
    render(<PracticePage />);
    expect(screen.getByText('Tile Quiz')).toBeDefined();
    expect(screen.getByText('Scoring Quiz')).toBeDefined();
    expect(screen.getByText('Hand Recognition')).toBeDefined();
    expect(screen.getByText('Play with Hints')).toBeDefined();
  });

  it('each mode button is clickable and navigates to the mode', () => {
    render(<PracticePage />);

    // Click Tile Quiz — should render the mocked TileQuiz component
    fireEvent.click(screen.getByText('Tile Quiz'));
    expect(screen.getByTestId('tile-quiz')).toBeDefined();
  });
});
