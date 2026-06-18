import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActionBar from '../ActionBar';

describe('ActionBar discard state', () => {
  it('names the selected tile in the discard CTA and exposes beginner helper copy', () => {
    render(
      <ActionBar
        canDiscard
        canDeclareKong={false}
        canDeclareWin={false}
        hasClaimOptions={false}
        claimOptions={[]}
        onDiscard={vi.fn()}
        onKong={vi.fn()}
        onWin={vi.fn()}
        onClaimBest={vi.fn()}
        onSubmitChow={vi.fn()}
        onPass={vi.fn()}
        turnPhase="discard"
        isHumanTurn
        selectedTileName="1 Bamboo"
      />,
    );

    expect(screen.getByRole('button', { name: /discard 1 bamboo/i })).toBeEnabled();
    expect(screen.getAllByText(/1 Bamboo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/tap discard to send it out/i)).toBeInTheDocument();
  });

  it('explains the faan shortfall instead of a dead Mahjong button when the hand is complete but short', () => {
    render(
      <ActionBar
        canDiscard
        canDeclareKong={false}
        canDeclareWin={false}
        winShortfall={{ currentFaan: 2, minFaan: 3 }}
        hasClaimOptions={false}
        claimOptions={[]}
        onDiscard={vi.fn()}
        onKong={vi.fn()}
        onWin={vi.fn()}
        onClaimBest={vi.fn()}
        onSubmitChow={vi.fn()}
        onPass={vi.fn()}
        turnPhase="discard"
        isHumanTurn
        selectedTileName="1 Bamboo"
      />,
    );

    expect(screen.queryByRole('button', { name: /mahjong/i })).not.toBeInTheDocument();
    const notice = screen.getByTestId('win-short-notice');
    expect(notice).toHaveTextContent(/only 2 faan/i);
    expect(notice).toHaveTextContent(/needs 3\+ to win/i);
  });

  it('prompts the player to choose a tile before discarding', () => {
    render(
      <ActionBar
        canDiscard={false}
        canDeclareKong={false}
        canDeclareWin={false}
        hasClaimOptions={false}
        claimOptions={[]}
        onDiscard={vi.fn()}
        onKong={vi.fn()}
        onWin={vi.fn()}
        onClaimBest={vi.fn()}
        onSubmitChow={vi.fn()}
        onPass={vi.fn()}
        turnPhase="discard"
        isHumanTurn
      />,
    );

    expect(screen.getByRole('button', { name: /discard selected tile/i })).toBeDisabled();
    expect(screen.getByText(/select one tile from your hand/i)).toBeInTheDocument();
  });
});
