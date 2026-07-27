'use client';

import { Dialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';

/**
 * Behaviour-only modal wrapper.
 *
 * Wraps `@base-ui/react/dialog` — already a dependency, already proven in
 * `components/game/GlossaryModal.tsx` — so focus trapping and Escape-to-close
 * come for free. Every hand-rolled overlay this replaces had neither: all
 * three in-scope call sites rendered a bare `<div role="dialog">`, so Escape
 * did nothing and Tab walked straight out of the dialog into the page behind.
 *
 * DELIBERATELY NOT A STYLED CARD. The three call sites have genuinely
 * different surfaces (two are bottom-sheet-on-mobile with `ds-card-elevated`,
 * one is an always-centred `ds-card` with a highlight border) and collapsing
 * them into one look would be a redesign, which plan 023 forbids. So this owns
 * layering and keyboard behaviour only; the caller passes the same layout
 * classes and the same inner markup it had before.
 *
 * SCOPE — fixes keyboard behaviour for the three dialogs plan 023 names, not
 * every dialog in the app. `components/game/**` is out of scope, and
 * `PlayOnboardingDialog` already has its own focus trap and is left alone.
 */

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Classes for the full-screen flex container holding the dialog surface.
   * Mirrors the single overlay `div` these call sites used, so their existing
   * alignment (`items-end … sm:items-center`, etc.) carries over verbatim.
   */
  className?: string;
  /** Accessible name, when no visible title element provides one. */
  ariaLabel?: string;
  /** Id of the element naming the dialog. Use instead of `ariaLabel`. */
  ariaLabelledBy?: string;
  /** Id of the element describing the dialog. */
  ariaDescribedBy?: string;
  children: React.ReactNode;
  'data-testid'?: string;
}

export function Modal({
  open,
  onOpenChange,
  className,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  children,
  'data-testid': testId,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-65 bg-black/70 backdrop-blur-xs transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          data-testid={testId}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          className={cn('fixed inset-0 z-65 flex justify-center p-4', className)}
        >
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default Modal;
