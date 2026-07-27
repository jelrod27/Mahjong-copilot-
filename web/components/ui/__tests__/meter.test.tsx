import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Meter } from '../meter';

/** The fill is the inner element carrying the inline width. */
const fillWidth = (container: HTMLElement): string =>
  (container.querySelector('[role="progressbar"] > div') as HTMLElement).style.width;

describe('Meter', () => {
  it('renders a fill proportional to value over max', () => {
    const { container } = render(<Meter value={25} max={50} />);
    expect(fillWidth(container)).toBe('50%');
  });

  it('treats max as a percentage scale by default', () => {
    const { container } = render(<Meter value={30} />);
    expect(fillWidth(container)).toBe('30%');
  });

  it('clamps a value above max to a full bar', () => {
    const { container } = render(<Meter value={200} max={100} />);
    expect(fillWidth(container)).toBe('100%');
  });

  it('clamps a negative value to an empty bar', () => {
    const { container } = render(<Meter value={-40} max={100} />);
    expect(fillWidth(container)).toBe('0%');
  });

  it('does not produce NaN width when max is zero', () => {
    // A caller dividing by a collection length can legitimately pass 0.
    const { container } = render(<Meter value={0} max={0} />);
    expect(fillWidth(container)).toBe('0%');
  });

  it('exposes its progress to assistive technology', () => {
    render(<Meter value={3} max={8} label="Quiz progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Quiz progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '8');
  });
});
