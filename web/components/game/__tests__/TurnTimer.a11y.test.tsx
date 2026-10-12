import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TurnTimer from '../TurnTimer';

describe('TurnTimer accessibility', () => {
  it('exposes remaining time as a named progress indicator without live announcements', () => {
    render(<TurnTimer timeRemaining={8_000} totalTime={20_000} />);

    const timer = screen.getByRole('progressbar', { name: 'Time to discard' });
    expect(timer).toHaveAttribute('aria-valuemin', '0');
    expect(timer).toHaveAttribute('aria-valuemax', '20');
    expect(timer).toHaveAttribute('aria-valuenow', '8');
    expect(timer).toHaveAttribute('aria-valuetext', '8 seconds remaining');
    expect(timer).toHaveAttribute('aria-live', 'off');
  });

  it('does not render a timer when the turn has no timeout', () => {
    render(<TurnTimer timeRemaining={0} totalTime={0} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
