import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Confetti from '../Confetti';

describe('Confetti', () => {
  it('renders the requested number of particles when active', () => {
    render(<Confetti count={20} />);
    const root = screen.getByTestId('confetti');
    expect(root.children).toHaveLength(20);
  });

  it('renders nothing when inactive', () => {
    render(<Confetti active={false} />);
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
  });

  it('marks itself aria-hidden and pointer-events-none so it never blocks the modal underneath', () => {
    render(<Confetti count={4} />);
    const root = screen.getByTestId('confetti');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.className).toContain('pointer-events-none');
  });

  it('gives each particle a falling animation and randomized inline style', () => {
    render(<Confetti count={4} />);
    const root = screen.getByTestId('confetti');
    for (const particle of Array.from(root.children) as HTMLElement[]) {
      expect(particle.className).toContain('animate-confetti-fall');
      expect(particle.style.animationDuration).toBeTruthy();
      expect(particle.style.backgroundColor).toBeTruthy();
    }
  });
});
