import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../modal';

describe('Modal', () => {
  it('renders its children when open', () => {
    render(
      <Modal open onOpenChange={() => {}} ariaLabel="Test dialog">
        <p>Body copy</p>
      </Modal>,
    );
    expect(screen.getByText('Body copy')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onOpenChange={() => {}} ariaLabel="Test dialog">
        <p>Body copy</p>
      </Modal>,
    );
    expect(screen.queryByText('Body copy')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    // The whole reason this component exists: every overlay it replaces was a
    // bare <div role="dialog"> where Escape did nothing.
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onOpenChange={onOpenChange} ariaLabel="Test dialog">
        <button>Focusable</button>
      </Modal>,
    );

    await user.keyboard('{Escape}');
    // Assert the meaningful argument only — Base UI also passes event details
    // whose arity is an implementation detail we should not pin.
    expect(onOpenChange).toHaveBeenCalled();
    expect(onOpenChange.mock.calls[0][0]).toBe(false);
  });

  it('names the dialog for assistive technology', () => {
    render(
      <Modal open onOpenChange={() => {}} ariaLabel="Daily Hand result">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Daily Hand result' })).toBeInTheDocument();
  });
});
