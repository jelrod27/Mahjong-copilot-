import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('renders its title', () => {
    render(<EmptyState title="No games yet" />);
    expect(screen.getByText('No games yet')).toBeInTheDocument();
  });

  it('renders its body when given one', () => {
    render(<EmptyState title="No games yet" body="Play your first game to start tracking stats!" />);
    expect(screen.getByText('Play your first game to start tracking stats!')).toBeInTheDocument();
  });

  it('omits the body when none is given', () => {
    const { container } = render(<EmptyState title="No games yet" />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('renders its action when given one', () => {
    render(<EmptyState title="No games yet" action={<a href="/play">Play now</a>} />);
    expect(screen.getByRole('link', { name: 'Play now' })).toBeInTheDocument();
  });

  it('omits the action when none is given', () => {
    render(<EmptyState title="No games yet" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
