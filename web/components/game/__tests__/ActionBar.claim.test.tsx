import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/soundManager', () => ({
  default: { play: vi.fn(), setEnabled: vi.fn(), isEnabled: () => false },
}));
import soundManager from '@/lib/soundManager';
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
  isMyClaimTurn: true,
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

  it('claim buttons are not rendered before the human\'s claim turn', () => {
    render(
      <ActionBar
        {...baseProps}
        isMyClaimTurn={false}
        claimOptions={[pungClaim]}
        discardedTile={dragon}
      />,
    );
    // The buttons would be inert until the claim rotation reaches the human —
    // an absent control is honest, a dead-looking one still invites the tap.
    expect(screen.queryByTestId('claim-best-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claim-pass-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('claim-waiting-state')).toBeInTheDocument();
  });

  it('claim buttons render on the human\'s claim turn', () => {
    render(
      <ActionBar
        {...baseProps}
        isMyClaimTurn={true}
        claimOptions={[pungClaim]}
        discardedTile={dragon}
      />,
    );
    expect(screen.getByTestId('claim-best-button')).toBeInTheDocument();
    expect(screen.queryByTestId('claim-waiting-state')).not.toBeInTheDocument();
  });

  it('announces the waiting state to assistive technology', () => {
    render(
      <ActionBar
        {...baseProps}
        isMyClaimTurn={false}
        claimOptions={[pungClaim]}
        discardedTile={dragon}
      />,
    );
    // The claim window opens and closes without any user action, so a screen
    // reader must be told — otherwise the state change is silent.
    expect(screen.getByTestId('claim-waiting-state')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('ActionBar — rejected-action feedback', () => {
  const dragon = dragonTile(DragonTile.RED, 1);
  const SHAKE_DURATION_MS = 550;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // fireEvent rather than userEvent: userEvent's async event loop deadlocks
  // against fake timers, and the behaviour under test is a plain click →
  // setState → setTimeout sequence that needs no pointer simulation.
  const clickClaim = (accepted: boolean) => {
    render(
      <ActionBar
        {...baseProps}
        onClaimBest={vi.fn().mockReturnValue(accepted)}
        claimOptions={[pungClaim]}
        discardedTile={dragon}
      />,
    );
    fireEvent.click(screen.getByTestId('claim-best-button'));
  };

  it('shakes the claim button and plays a cue when the claim is rejected', () => {
    clickClaim(false);

    expect(screen.getByTestId('claim-best-button')).toHaveClass('animate-screen-shake');
    expect(soundManager.play).toHaveBeenCalledWith('pass');
  });

  it('clears the shake once the animation window elapses', () => {
    clickClaim(false);
    expect(screen.getByTestId('claim-best-button')).toHaveClass('animate-screen-shake');

    // Without this the class would stick permanently after the first
    // rejection, so a later rejection would produce no visible shake at all.
    act(() => {
      vi.advanceTimersByTime(SHAKE_DURATION_MS);
    });
    expect(screen.getByTestId('claim-best-button')).not.toHaveClass('animate-screen-shake');
  });

  it('neither shakes nor plays a cue when the claim is accepted', () => {
    clickClaim(true);

    expect(screen.getByTestId('claim-best-button')).not.toHaveClass('animate-screen-shake');
    expect(soundManager.play).not.toHaveBeenCalledWith('pass');
  });
});
