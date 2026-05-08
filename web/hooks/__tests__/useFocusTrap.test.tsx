import { describe, expect, it } from 'vitest';
import { useRef } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useFocusTrap } from '../useFocusTrap';

function TrappedModal({ active = true }: { active?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <div>
      <button data-testid="outside-before">Outside before</button>
      <div ref={ref}>
        <button data-testid="first">First</button>
        <button data-testid="middle">Middle</button>
        <button data-testid="last">Last</button>
      </div>
      <button data-testid="outside-after">Outside after</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the first interactive element on mount', () => {
    const { getByTestId } = render(<TrappedModal />);
    expect(document.activeElement).toBe(getByTestId('first'));
  });

  it('cycles Tab from the last element back to the first', () => {
    const { getByTestId } = render(<TrappedModal />);
    const last = getByTestId('last');
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(getByTestId('first'));
  });

  it('cycles Shift-Tab from the first element back to the last', () => {
    const { getByTestId } = render(<TrappedModal />);
    const first = getByTestId('first');
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(getByTestId('last'));
  });

  it('does not trap when active is false', () => {
    const { getByTestId } = render(<TrappedModal active={false} />);
    // No initial focus shift when inactive — original active stays.
    expect(document.activeElement).not.toBe(getByTestId('first'));
  });
});
