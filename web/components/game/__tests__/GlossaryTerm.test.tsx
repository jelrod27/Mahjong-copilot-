import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GlossaryTerm from '../GlossaryTerm';

describe('GlossaryTerm', () => {
  it('renders the visible label and a help affordance', () => {
    render(
      <GlossaryTerm term="Wall">
        <span>Wall: 84</span>
      </GlossaryTerm>,
    );

    expect(screen.getByText('Wall: 84')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /what does wall mean/i }),
    ).toBeInTheDocument();
  });

  it('does not render the modal until the help button is clicked', () => {
    render(
      <GlossaryTerm term="Wall">
        <span>Wall: 84</span>
      </GlossaryTerm>,
    );

    expect(screen.queryByTestId('glossary-modal')).not.toBeInTheDocument();
  });

  it('opens the glossary modal with the entry definition when clicked', () => {
    render(
      <GlossaryTerm term="Tenpai">
        <span>TENPAI</span>
      </GlossaryTerm>,
    );

    fireEvent.click(screen.getByRole('button', { name: /what does tenpai mean/i }));

    const modal = screen.getByTestId('glossary-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Tenpai');
    expect(modal).toHaveTextContent(/one tile away/i);
  });

  it('shows a fallback message when the term is unknown', () => {
    render(
      <GlossaryTerm term="Riichi">
        <span>Riichi</span>
      </GlossaryTerm>,
    );

    fireEvent.click(screen.getByRole('button', { name: /what does riichi mean/i }));

    expect(screen.getByText(/term not found/i)).toBeInTheDocument();
    expect(screen.getByText(/we don't have a glossary entry/i)).toBeInTheDocument();
  });
});
