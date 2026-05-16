import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActionBar from '../ActionBar';
import { dragonTile } from '@/engine/__tests__/testHelpers';
import { DragonTile } from '@/models/Tile';
import type { AvailableClaim } from '@/engine/types';

const winClaim: AvailableClaim = {
  playerId: 'human-player',
  claimType: 'win',
  tilesFromHand: [[]],
  priority: 4,
};
const kongClaim: AvailableClaim = {
  playerId: 'human-player',
  claimType: 'kong',
  tilesFromHand: [[]],
  priority: 3,
};
const pungClaim: AvailableClaim = {
  playerId: 'human-player',
  claimType: 'pung',
  tilesFromHand: [[]],
  priority: 2,
};
const chowClaim: AvailableClaim = {
  playerId: 'human-player',
  claimType: 'chow',
  tilesFromHand: [[]],
  priority: 1,
};

const baseProps = {
  canDiscard: false,
  canDeclareKong: false,
  canDeclareWin: false,
  hasClaimOptions: true,
  onDiscard: vi.fn(),
  onKong: vi.fn(),
  onWin: vi.fn(),
  onClaimBest: vi.fn(),
  onSubmitChow: vi.fn(),
  onPass: vi.fn(),
  turnPhase: 'claim' as const,
  isHumanTurn: true,
};

describe('ActionBar — claim guidance (PRD GAME-06)', () => {
  const dragon = dragonTile(DragonTile.RED, 1);

  it('explains the consequence of the best claim instead of a generic "adds tile" footer', () => {
    render(
      <ActionBar
        {...baseProps}
        claimOptions={[pungClaim]}
        discardedTile={dragon}
      />,
    );
    const consequence = screen.getByTestId('claim-consequence');
    expect(consequence.textContent).toMatch(/pung/i);
    // Mentions hand exposure tradeoff per PRD acceptance.
    expect(consequence.textContent).toMatch(/reveal|exposed/i);
  });

  it('uses kong-specific consequence when kong is the best claim', () => {
    render(
      <ActionBar
        {...baseProps}
        claimOptions={[kongClaim]}
        discardedTile={dragon}
      />,
    );
    const consequence = screen.getByTestId('claim-consequence');
    expect(consequence.textContent).toMatch(/kong|four of a kind/i);
    expect(consequence.textContent).toMatch(/replacement|draw/i);
  });

  it('uses chow-specific consequence with the "reveals" hand-shape note', () => {
    render(
      <ActionBar
        {...baseProps}
        claimOptions={[chowClaim]}
        discardedTile={dragon}
      />,
    );
    const consequence = screen.getByTestId('claim-consequence');
    expect(consequence.textContent).toMatch(/chow|sequence/i);
    expect(consequence.textContent).toMatch(/reveal/i);
  });

  it('uses win-specific declaration copy when win is the best claim', () => {
    render(
      <ActionBar
        {...baseProps}
        claimOptions={[winClaim]}
        discardedTile={dragon}
      />,
    );
    const consequence = screen.getByTestId('claim-consequence');
    expect(consequence.textContent).toMatch(/mahjong|winning/i);
  });

  it('always shows a strategic Pass hint, not just a dismiss label', () => {
    render(
      <ActionBar
        {...baseProps}
        claimOptions={[pungClaim]}
        discardedTile={dragon}
      />,
    );
    const passHint = screen.getByTestId('claim-pass-hint');
    expect(passHint.textContent).toMatch(/concealed|improve|shape/i);
  });
});
