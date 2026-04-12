import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReferencePage from '../page';

describe('ReferencePage', () => {
  it('renders all 4 tab buttons', () => {
    render(<ReferencePage />);
    expect(screen.getByText('Tiles')).toBeDefined();
    expect(screen.getByText('Scoring')).toBeDefined();
    expect(screen.getByText('Hands')).toBeDefined();
    expect(screen.getByText('Glossary')).toBeDefined();
  });

  it('default tab shows tiles content with "Bamboo"', () => {
    render(<ReferencePage />);
    // The tiles tab should show the Bamboo suit section
    expect(screen.getByText(/BAMBOO/)).toBeDefined();
  });

  it('clicking "Scoring" tab shows fan table with "Self-Drawn" entry', () => {
    render(<ReferencePage />);
    fireEvent.click(screen.getByText('Scoring'));
    expect(screen.getByText('Self-Drawn Win')).toBeDefined();
    expect(screen.getByText('FAN TABLE')).toBeDefined();
  });

  it('clicking "Glossary" tab shows term definitions', () => {
    render(<ReferencePage />);
    fireEvent.click(screen.getByText('Glossary'));
    // Should show glossary terms like Chow, Pung, etc.
    expect(screen.getByText('Chow')).toBeDefined();
    expect(screen.getByText('Pung')).toBeDefined();
    expect(screen.getByText('Fan')).toBeDefined();
  });

  it('clicking "Hands" tab shows limit hands', () => {
    render(<ReferencePage />);
    fireEvent.click(screen.getByText('Hands'));
    expect(screen.getByText('Thirteen Orphans')).toBeDefined();
    expect(screen.getByText('LIMIT HANDS')).toBeDefined();
  });
});
