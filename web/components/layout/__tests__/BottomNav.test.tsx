import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/learn',
}));

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

import BottomNav from '../BottomNav';

describe('BottomNav', () => {
  it('renders all 7 navigation tabs', () => {
    render(<BottomNav />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders correct hrefs', () => {
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map(l => l.getAttribute('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/learn');
    expect(hrefs).toContain('/practice');
    expect(hrefs).toContain('/reference');
    expect(hrefs).toContain('/progress');
    expect(hrefs).toContain('/settings');
  });

  it('highlights active tab based on pathname', () => {
    render(<BottomNav />);
    const learnLink = screen.getByText('Learn').closest('a');
    expect(learnLink?.className).toContain('text-retro-cyan');
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink?.className).toContain('text-retro-textDim');
  });
});
