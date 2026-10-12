import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameToast from '../GameToast';

describe('GameToast accessibility', () => {
  it('announces opponent action messages in a persistent polite live region', () => {
    const { rerender } = render(<GameToast message={null} />);
    const announcement = screen.getByRole('status');

    expect(announcement).toBeEmptyDOMElement();
    rerender(<GameToast message="Hana discarded 5 Bamboo" />);
    expect(announcement).toHaveTextContent('Hana discarded 5 Bamboo');
  });

  it('keeps the visual toast hidden from assistive technology to avoid duplicate speech', () => {
    const { container } = render(<GameToast message="Yuki claimed pung" />);

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('Yuki claimed pung');
    expect(screen.getByRole('status')).toHaveTextContent('Yuki claimed pung');
  });
});
