import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchOverScreen from '../MatchOverScreen';
import type { MatchState } from '@/models/MatchState';

/**
 * Build a finished match where playerScores drive final placement
 * (index 0 is the human). Higher score = better rank.
 */
function finishedMatch(humanScore: number): MatchState {
  return {
    mode: 'quick',
    difficulty: 'easy',
    currentRound: 'east' as MatchState['currentRound'],
    handNumber: 4,
    totalHandsPlayed: 4,
    initialDealerIndex: 0,
    currentDealerIndex: 0,
    initialDealerHasRotated: false,
    playerScores: [humanScore, 100, 50, 25],
    startingScore: 0,
    handResults: [],
    currentHand: null,
    phase: 'finished',
    playerNames: ['You', 'AI East', 'AI South', 'AI West'],
    humanPlayerId: 'human-player',
    minFaan: 3,
  };
}

describe('MatchOverScreen progress arc', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records the match and leads with the progress arc', async () => {
    render(<MatchOverScreen match={finishedMatch(200)} onPlayAgain={vi.fn()} onBackToMenu={vi.fn()} />);

    const arc = await screen.findByTestId('match-progress-arc');
    expect(arc).toBeInTheDocument();
    // First-place finish starts a top-2 streak of 1.
    expect(screen.getByTestId('streak-value')).toHaveTextContent('1');
  });

  it('shows the next tier to chase with live progress', async () => {
    render(<MatchOverScreen match={finishedMatch(200)} onPlayAgain={vi.fn()} onBackToMenu={vi.fn()} />);

    const tier = await screen.findByTestId('tier-progress');
    // After one match played, the next goal is "Finding Your Feet" (3 matches).
    expect(tier).toHaveTextContent('Finding Your Feet');
    expect(tier).toHaveTextContent('1 / 3');
  });

  it('reports a reset streak after a bottom-half finish', async () => {
    render(<MatchOverScreen match={finishedMatch(10)} onPlayAgain={vi.fn()} onBackToMenu={vi.fn()} />);

    await screen.findByTestId('match-progress-arc');
    expect(screen.getByTestId('streak-value')).toHaveTextContent('0');
    expect(screen.getByText(/finish top-2 to start a streak/i)).toBeInTheDocument();
  });

  it('keeps Play again wired as a single tap', async () => {
    const onPlayAgain = vi.fn();
    render(<MatchOverScreen match={finishedMatch(200)} onPlayAgain={onPlayAgain} onBackToMenu={vi.fn()} />);

    // Click works before the 300ms reveal finishes: the path stays one tap.
    fireEvent.click(screen.getByRole('button', { name: /play again/i }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    // Drain the pending reveal timer so it does not leak into the next test.
    await new Promise(resolve => setTimeout(resolve, 350));
  });

  it('celebrates a first-place finish with confetti once revealed', async () => {
    render(<MatchOverScreen match={finishedMatch(200)} onPlayAgain={vi.fn()} onBackToMenu={vi.fn()} />);

    // Confetti is gated behind the 300ms reveal timer; wait past it.
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
  });

  it('does not show confetti for a non-winning finish', async () => {
    render(<MatchOverScreen match={finishedMatch(10)} onPlayAgain={vi.fn()} onBackToMenu={vi.fn()} />);

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
  });
});
