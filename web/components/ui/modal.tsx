'use client';

import { Dialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';

/**
 * Centred modal dialog.
 *
 * Wraps `@base-ui/react/dialog` — already a dependency, already proven in
 * `components/game/GlossaryModal.tsx` — so focus trapping and Escape-to-close
 * come for free. The hand-rolled overlays this replaces handled neither: all
 * three in-scope call sites had zero Escape handling before this.
 *
 * SCOPE — this fixes keyboard behaviour for the three dialogs plan 023 names
 * (`DailyResultDialog`, `FloorDialog`, and the inline `learn` lesson overlay),
 * not every dialog in the app. `components/game/**` is out of scope, and
 * `PlayOnboardingDialog` already has its own focus trap and is left alone.
 */

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name for the dialog. */
  title?: React.ReactNode;
  children: React.ReactNode;
  /** Extra classes on the popup surface. */
  className?: string;
  'data-testid'?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  className,
  'data-testid': testId,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[rgb(6_10_14/0.88)] backdrop-blur-[10px] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          data-testid={testId}
          className={cn(
            'ds-card-elevated fixed left-1/2 top-1/2 z-60 w-[min(92vw,420px)] max-h-[min(90vh,560px)] overflow-y-auto -translate-x-1/2 -translate-y-1/2 p-5 shadow-2xl',
            'transition duration-150 data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95',
            className,
          )}
        >
          {title && (
            <Dialog.Title className="font-display text-base text-foreground mb-3">
              {title}
            </Dialog.Title>
          )}
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default Modal;
