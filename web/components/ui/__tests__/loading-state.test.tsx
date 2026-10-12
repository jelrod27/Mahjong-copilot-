import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState } from '../loading-state';

describe('LoadingState', () => {
  it('renders the default label', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<LoadingState label="Loading your progress…" />);
    expect(screen.getByText('Loading your progress…')).toBeInTheDocument();
  });

  it('announces the wait to assistive technology', () => {
    const { container } = render(<LoadingState />);
    const region = container.firstElementChild;
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-busy', 'true');
  });
});
