import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import GameToast from '../GameToast';

describe('GameToast accessibility', () => {
  afterEach(() => vi.useRealTimers());

  it('announces opponent action messages in a persistent polite live region', () => {
    const { rerender } = render(<GameToast message={null} eventId={0} />);
    const announcement = screen.getByRole('status');

    expect(announcement).toBeEmptyDOMElement();
    rerender(<GameToast message="Hana discarded 5 Bamboo" eventId={1} />);
    expect(announcement).toHaveTextContent('Hana discarded 5 Bamboo');
  });

  it('reannounces identical action text and reopens the visual toast for a new event', () => {
    vi.useFakeTimers();
    const message = 'Yuki claimed pung';
    const { container, rerender } = render(<GameToast message={message} eventId={1} />);
    const firstAnnouncement = screen.getByRole('status').firstElementChild;

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(message);
    act(() => vi.advanceTimersByTime(2000));
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();

    rerender(<GameToast message={message} eventId={2} />);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(message);
    expect(screen.getByRole('status').firstElementChild).not.toBe(firstAnnouncement);
  });
});
