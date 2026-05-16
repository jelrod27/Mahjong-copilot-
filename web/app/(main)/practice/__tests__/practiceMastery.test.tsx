import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../TileQuiz', () => ({ default: () => <div>TileQuiz</div> }));
vi.mock('../ScoringQuiz', () => ({ default: () => <div>ScoringQuiz</div> }));
vi.mock('../HandRecognition', () => ({ default: () => <div>HandRecognition</div> }));
vi.mock('@/components/game/useGameController', () => ({ default: () => ({ game: null }) }));
vi.mock('@/components/game/GameBoard', () => ({ default: () => null }));
vi.mock('@/components/game/GameOverScreen', () => ({ default: () => null }));
vi.mock('@/components/game/HintOverlay', () => ({ default: () => null }));

import PracticePage from '../page';

const STATS_KEY = '16bit-mahjong-stats';

beforeEach(() => {
  localStorage.clear();
});

describe('PracticeMenu mastery hydration (PRACTICE-01)', () => {
  it('shows New mastery and START on every card when no quizzes have been played', async () => {
    render(<PracticePage />);
    // Hydration runs in useEffect — the labels appear after the effect flushes.
    expect(await screen.findByTestId('mastery-badge-tile-quiz')).toHaveTextContent('New');
    expect(screen.getByTestId('mastery-badge-scoring-quiz')).toHaveTextContent('New');
    expect(screen.getByTestId('mastery-badge-hand-recognition')).toHaveTextContent('New');
    // Three CTAs say START + one says PLAY (for Play with Hints).
    expect(screen.getAllByText(/START ›/).length).toBe(3);
    expect(screen.getByText(/PLAY ›/)).toBeInTheDocument();
  });

  it('renders best/last/attempts and Mastered badge once a card has 2+ high-scoring attempts', async () => {
    localStorage.setItem(
      STATS_KEY,
      JSON.stringify({
        gamesPlayed: 0,
        gamesWon: 0,
        totalHandsPlayed: 0,
        bestFan: 0,
        bestHandName: null,
        byDifficulty: { easy: { played: 0, won: 0 }, medium: { played: 0, won: 0 }, hard: { played: 0, won: 0 } },
        byMode: { quick: { played: 0, won: 0 }, full: { played: 0, won: 0 } },
        placementCounts: [0, 0, 0, 0],
        lastPlayedAt: null,
        quizzes: {
          'tile-quiz': { played: 5, best: 9, lastScore: 7, lastPlayedAt: '2026-05-01T00:00:00Z' },
        },
      }),
    );

    render(<PracticePage />);
    expect(await screen.findByTestId('mastery-badge-tile-quiz')).toHaveTextContent('Mastered');
    expect(screen.getByText(/Best: 9\/10/)).toBeInTheDocument();
    expect(screen.getByText(/Last: 7\/10/)).toBeInTheDocument();
    expect(screen.getByText(/5 attempts/)).toBeInTheDocument();
    // Card with prior attempts renders CONTINUE rather than START.
    const tileQuizCard = screen.getByTestId('practice-card-tile-quiz');
    expect(tileQuizCard).toHaveTextContent('CONTINUE');
  });

  it('routes the Recommended badge to the lowest-mastery card', async () => {
    localStorage.setItem(
      STATS_KEY,
      JSON.stringify({
        gamesPlayed: 0,
        gamesWon: 0,
        totalHandsPlayed: 0,
        bestFan: 0,
        bestHandName: null,
        byDifficulty: { easy: { played: 0, won: 0 }, medium: { played: 0, won: 0 }, hard: { played: 0, won: 0 } },
        byMode: { quick: { played: 0, won: 0 }, full: { played: 0, won: 0 } },
        placementCounts: [0, 0, 0, 0],
        lastPlayedAt: null,
        quizzes: {
          'tile-quiz': { played: 5, best: 10, lastScore: 10, lastPlayedAt: '2026-05-01T00:00:00Z' }, // mastered
          'scoring-quiz': { played: 3, best: 4, lastScore: 4, lastPlayedAt: '2026-05-02T00:00:00Z' }, // needs-work
          'hand-recognition': { played: 5, best: 10, lastScore: 10, lastPlayedAt: '2026-05-02T00:00:00Z' }, // mastered
        },
      }),
    );

    render(<PracticePage />);
    expect(await screen.findByTestId('recommended-scoring-quiz')).toBeInTheDocument();
    expect(screen.queryByTestId('recommended-tile-quiz')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recommended-hand-recognition')).not.toBeInTheDocument();
  });
});
