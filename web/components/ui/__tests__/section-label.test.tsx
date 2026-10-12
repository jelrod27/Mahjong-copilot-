import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionLabel } from '../section-label';

describe('SectionLabel', () => {
  it('renders its content', () => {
    render(<SectionLabel>LEARN MAHJONG</SectionLabel>);
    expect(screen.getByText('LEARN MAHJONG')).toBeInTheDocument();
  });
});
