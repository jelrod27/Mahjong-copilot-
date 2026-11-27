import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchOverScreen from '../MatchOverScreen';
import type { HandResult, MatchState } from '@/models/MatchState';
import { loadStats } from '@/lib/gameStats';
import { recordCompletedMatch } from '@/lib/completedMatchStats';

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

function winningHand(winnerId: string, totalFan: number, handName: string): HandResult {
  return {
    handNumber: 1, round: 'east' as HandResult['round'], dealerIndex: 0,
    winnerId, isSelfDrawn: false, scoreChanges: [0, 0, 0, 0],
    scoringResult: { fans: [], totalFan, basePoints: 8, totalPoints: 64, handName, melds: [], pair: [] },
  };
}

function renderRecap(match: MatchState, onPlayAgain = vi.fn()) {
  recordCompletedMatch(match, 'final-hand-1');
  return render(<MatchOverScreen match={match} onPlayAgain={onPlayAgain} onBackToMenu={vi.fn()} />);
}

describe('MatchOverScreen progress arc', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows recorded progress without writing the match again on mount', async () => {
    const match = finishedMatch(200);
    const recap = renderRecap(match);

    const arc = await screen.findByTestId('match-progress-arc');
    expect(arc).toBeInTheDocument();
    expect(screen.getByTestId('streak-value')).toHaveTextContent('1');
    recap.unmount();
    render(<MatchOverScreen match={match} onPlayAgain={vi.fn()} onBackToMenu={vi.fn()} />);
    expect(loadStats().gamesPlayed).toBe(1);
  });

  it('credits only the player’s own winning hands to their best hand', () => {
    const match = finishedMatch(200);
    match.handResults = [
      winningHand(match.humanPlayerId, 3, 'All Pungs'),
      winningHand('ai_1', 10, 'Big Three Dragons'),
    ];
    recordCompletedMatch(match, 'final-hand-1');
    expect(loadStats()).toMatchObject({ bestFan: 3, bestHandName: 'All Pungs' });
  });

  it('shows the next tier to chase with live progress', async () => {
    renderRecap(finishedMatch(200));

    const tier = await screen.findByTestId('tier-progress');
    // After one match played, the next goal is "Finding Your Feet" (3 matches).
    expect(tier).toHaveTextContent('Finding Your Feet');
    expect(tier).toHaveTextContent('1 / 3');
  });

  it('reports a reset streak after a bottom-half finish', async () => {
    renderRecap(finishedMatch(10));

    await screen.findByTestId('match-progress-arc');
    expect(screen.getByTestId('streak-value')).toHaveTextContent('0');
    expect(screen.getByText(/finish top-2 to start a streak/i)).toBeInTheDocument();
  });

  it('keeps Play again wired as a single tap', async () => {
    const onPlayAgain = vi.fn();
    renderRecap(finishedMatch(200), onPlayAgain);

    // Click works before the 300ms reveal finishes: the path stays one tap.
    fireEvent.click(screen.getByRole('button', { name: /play again/i }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    // Drain the pending reveal timer so it does not leak into the next test.
    await new Promise(resolve => setTimeout(resolve, 350));
  });

  it('celebrates a first-place finish with confetti once revealed', async () => {
    renderRecap(finishedMatch(200));

    // Confetti is gated behind the 300ms reveal timer; wait past it.
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
  });

  it('does not show confetti for a non-winning finish', async () => {
    renderRecap(finishedMatch(10));

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
  });
});
