import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  usePathname: () => '/learn',
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import BottomNav from '../BottomNav';

describe('BottomNav', () => {
  it('renders primary tabs and More control in the main nav', () => {
    render(<BottomNav />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(within(nav).getByText('Home')).toBeInTheDocument();
    expect(within(nav).getByText('Learn')).toBeInTheDocument();
    expect(within(nav).getByText('Play')).toBeInTheDocument();
    expect(within(nav).getByText('Practice')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /more/i })).toBeInTheDocument();
  });

  it('opens More sheet with secondary destinations', async () => {
    const user = userEvent.setup();
    render(<BottomNav />);
    await user.click(screen.getByRole('button', { name: /more/i }));
    expect(await screen.findByRole('link', { name: /^reference$/i })).toHaveAttribute('href', '/reference');
    expect(screen.getByRole('link', { name: /^settings$/i })).toHaveAttribute('href', '/settings');
  });

  it('renders correct primary hrefs', () => {
    render(<BottomNav />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toEqual(['/', '/learn', '/play', '/practice']);
  });

  it('highlights active tab based on pathname', () => {
    render(<BottomNav />);
    const learnLink = screen.getByText('Learn').closest('a');
    expect(learnLink?.className).toContain('text-retro-cyan');
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink?.className).toContain('text-retro-textDim');
  });
});
