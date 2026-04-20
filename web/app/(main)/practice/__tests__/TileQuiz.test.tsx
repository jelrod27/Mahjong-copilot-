import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import TileQuiz from '../TileQuiz';

const renderWithProvider = (ui: React.ReactElement) =>
  render(<Provider store={store}>{ui}</Provider>);

// Make shuffle deterministic by returning the array in original order
vi.mock('../TileQuiz', async () => {
  // We need the actual module, but shuffle is internal.
  // Instead, we'll just import the real component and test with random questions.
  const actual = await vi.importActual('../TileQuiz');
  return actual;
});

describe('TileQuiz', () => {
  const onBack = vi.fn();

  beforeEach(() => {
    onBack.mockClear();
    localStorage.clear();
  });

  it('renders a question', () => {
    renderWithProvider(<TileQuiz onBack={onBack} />);
    // Should show "IDENTIFY THIS TILE" prompt and "Question 1 of 10"
    expect(screen.getByText('IDENTIFY THIS TILE')).toBeDefined();
    expect(screen.getByText(/Question 1 of 10/)).toBeDefined();
  });

  it('clicking an answer option shows feedback', () => {
    renderWithProvider(<TileQuiz onBack={onBack} />);
    // Get all option buttons (there should be 4)
    const buttons = screen.getAllByRole('button').filter(
      btn => !btn.textContent?.includes('Back') && !btn.textContent?.includes('TILE QUIZ'),
    );
    // The quiz options are the ones inside the options area
    // Click the first option
    const optionButtons = buttons.filter(b => !b.textContent?.includes('Back'));
    expect(optionButtons.length).toBeGreaterThanOrEqual(4);

    fireEvent.click(optionButtons[0]);

    // After clicking, a "Next Question" or "See Results" button should appear
    const nextBtn = screen.queryByText('Next Question') || screen.queryByText('See Results');
    expect(nextBtn).not.toBeNull();
  });

  it('after 10 questions, shows final score', () => {
    renderWithProvider(<TileQuiz onBack={onBack} />);

    for (let i = 0; i < 10; i++) {
      // Get clickable option buttons (not disabled, not Back button)
      const optionButtons = screen.getAllByRole('button').filter(
        btn =>
          !btn.textContent?.includes('Back') &&
          !btn.textContent?.includes('Next') &&
          !btn.textContent?.includes('See Results') &&
          !btn.textContent?.includes('TILE QUIZ') &&
          !(btn as HTMLButtonElement).disabled,
      );

      // Click the first available option
      fireEvent.click(optionButtons[0]);

      // Click "Next Question" or "See Results"
      const nextBtn = screen.queryByText('Next Question') || screen.queryByText('See Results');
      expect(nextBtn).not.toBeNull();
      fireEvent.click(nextBtn!);
    }

    // Should show the completion screen
    expect(screen.getByText('Quiz Complete')).toBeDefined();
    expect(screen.getByText(/\/10/)).toBeDefined();
    expect(screen.getByText('Try Again')).toBeDefined();
    expect(screen.getByText('Back to Practice')).toBeDefined();
  });
});
