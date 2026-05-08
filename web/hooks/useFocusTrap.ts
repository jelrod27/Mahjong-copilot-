'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Trap keyboard focus within a container element. On mount, moves focus to
 * the first interactive element inside the container. While active, Tab and
 * Shift-Tab cycle within the container instead of escaping to the page.
 * On unmount (or when `active` flips to false), focus is restored to whatever
 * was focused before the trap engaged.
 *
 * Used by HandResultScreen and MatchOverScreen to satisfy PRD A11Y-03 — modal
 * dialogs must trap focus and restore it on close. Glossary/sheet modals get
 * this for free via @base-ui/react/dialog; the result screens are custom
 * div-based modals that need the manual trap.
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  active: boolean = true,
): void {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      const selector =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(el => {
        if (el.hidden) return false;
        // Use computed style for visibility — works in real browsers AND
        // jsdom (which always returns "" for unset properties, so display
        // !== 'none' lets everything through, which is what we want for
        // the test environment).
        if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
        }
        return true;
      });
    };

    // Focus the first interactive element on mount.
    const initial = getFocusable();
    if (initial.length > 0) initial[0].focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the previously-focused element (if it still exists).
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef]);
}
