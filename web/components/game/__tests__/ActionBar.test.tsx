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
    expect(screen.getByText(/selected: 1 bamboo/i)).toBeInTheDocument();
    expect(screen.getByText(/discard it or choose another tile/i)).toBeInTheDocument();
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
    expect(screen.getByText(/choose one tile to discard/i)).toBeInTheDocument();
  });
});
