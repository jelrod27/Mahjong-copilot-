import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initializeMatch } from '@/engine/matchManager';
import { saveGame } from '@/lib/matchStorage';
import PlayClient from '../PlayClient';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const SAVE_KEY = 'mahjong_match_in_progress';

function seedSave(finished = false) {
  const match = initializeMatch({
    mode: 'full',
    difficulty: 'hard',
    playerNames: ['You', 'West AI', 'North AI', 'East AI'],
    humanPlayerId: 'human-player',
    seed: 'protect-saved-match',
  });
  if (finished) match.phase = 'finished';
  saveGame(match, match.currentHand);
  return localStorage.getItem(SAVE_KEY);
}

beforeEach(() => {
  localStorage.clear();
  push.mockClear();
});

afterEach(() => localStorage.clear());

describe('saved match protection', () => {
  it.each(['Start game', 'Training table'])('preserves the save until %s is confirmed', async name => {
    const saved = seedSave();
    const user = userEvent.setup();
    render(<PlayClient />);

    await user.click(screen.getByRole('button', { name, exact: true }));

    expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
    expect(push).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: /replace.*saved match/i });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
    expect(push).not.toHaveBeenCalled();
  });

  it('replaces the save with the selected game settings only after confirmation', async () => {
    seedSave();
    const user = userEvent.setup();
    render(<PlayClient />);
    await user.click(screen.getByRole('button', { name: /FULL GAME/ }));
    await user.click(screen.getByRole('button', { name: /MEDIUM — Smart AI/ }));
    await user.click(screen.getByRole('button', { name: /STANDARD \(3 FAAN\)/ }));
    await user.click(screen.getByRole('button', { name: 'Start game', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Replace saved match' }));

    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(push).toHaveBeenCalledExactlyOnceWith('/play/game?difficulty=medium&mode=full&minFaan=3');
  });

  it('launches Training table after cancelling a different pending game', async () => {
    seedSave();
    const user = userEvent.setup();
    render(<PlayClient />);
    await user.click(screen.getByRole('button', { name: 'Start game', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Training table', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Replace saved match' }));

    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(push).toHaveBeenCalledExactlyOnceWith('/play/game?table=training&mode=quick&difficulty=easy&minFaan=0');
  });

  it('dismisses with Escape and keeps the saved match', async () => {
    const saved = seedSave();
    const user = userEvent.setup();
    render(<PlayClient />);
    const start = screen.getByRole('button', { name: 'Start game', exact: true });
    await user.click(start);
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(start).toHaveFocus());
  });

  it('protects a match saved after the page opened', async () => {
    const user = userEvent.setup();
    render(<PlayClient />);
    const saved = seedSave();
    await user.click(screen.getByRole('button', { name: 'Start game', exact: true }));

    expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /replace.*saved match/i })).toBeInTheDocument();
  });

  it.each([
    ['Start game', '/play/game?difficulty=easy&mode=quick&minFaan=1'],
    ['Training table', '/play/game?table=training&mode=quick&difficulty=easy&minFaan=0'],
  ])('launches %s directly without an active save', async (name, url) => {
    const user = userEvent.setup();
    render(<PlayClient />);
    await user.click(screen.getByRole('button', { name, exact: true }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledExactlyOnceWith(url);
  });

  it('does not ask to replace a completed match', async () => {
    seedSave(true);
    const user = userEvent.setup();
    render(<PlayClient />);
    await user.click(screen.getByRole('button', { name: 'Start game', exact: true }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledExactlyOnceWith('/play/game?difficulty=easy&mode=quick&minFaan=1');
  });

  it('resumes directly without changing the save', async () => {
    const saved = seedSave();
    const user = userEvent.setup();
    render(<PlayClient />);
    await user.click(screen.getByRole('button', { name: 'Resume saved game' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
    expect(push).toHaveBeenCalledExactlyOnceWith('/play/game');
  });
});
