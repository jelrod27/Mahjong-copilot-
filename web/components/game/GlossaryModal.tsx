'use client';

import { Dialog } from '@base-ui/react/dialog';
import Link from 'next/link';
import { findGlossaryEntry } from '@/content/glossary';

interface GlossaryModalProps {
  /** The glossary term to look up. Matches term name or alias, case-insensitive. */
  term: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Compact modal that shows a glossary entry without leaving the active game.
 * Built on @base-ui/react/dialog (the same primitive backing the Sheet
 * component) so focus trap and Escape-to-close come for free.
 *
 * REF-02 acceptance: opens over the game, preserves game state on close,
 * keyboard accessible, links to the full Reference page.
 */
export default function GlossaryModal({ term, open, onOpenChange }: GlossaryModalProps) {
  const entry = findGlossaryEntry(term);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          data-testid="glossary-modal"
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 ds-panel p-4 md:p-6 shadow-2xl transition duration-150 data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95"
        >
          {entry ? (
            <>
              <div className="mb-3 flex items-baseline gap-3">
                <Dialog.Title className="font-display text-base md:text-lg text-info">
                  {entry.term}
                </Dialog.Title>
                <span className="font-sans text-base md:text-lg text-highlight">
                  {entry.chinese}
                </span>
              </div>
              <Dialog.Description className="font-sans text-sm md:text-base text-foreground leading-relaxed">
                {entry.definition}
              </Dialog.Description>
              {entry.aliases && entry.aliases.length > 0 && (
                <p className="mt-3 font-sans text-xs text-muted-foreground">
                  Also called: {entry.aliases.join(', ')}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-2">
                <Link
                  href="/reference"
                  className="font-display text-[10px] text-info hover:text-highlight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/60 rounded-sm"
                  onClick={() => onOpenChange(false)}
                >
                  OPEN IN REFERENCE →
                </Link>
                <Dialog.Close
                  className="ds-btn px-3 py-1 font-display text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/60"
                  aria-label="Close glossary"
                >
                  CLOSE
                </Dialog.Close>
              </div>
            </>
          ) : (
            <>
              <Dialog.Title className="font-display text-base text-accent mb-2">
                Term not found
              </Dialog.Title>
              <Dialog.Description className="font-sans text-sm text-foreground">
                We don&apos;t have a glossary entry for &ldquo;{term}&rdquo; yet. Try the{' '}
                <Link href="/reference" className="text-info underline" onClick={() => onOpenChange(false)}>
                  Reference page
                </Link>
                .
              </Dialog.Description>
              <div className="mt-4 flex justify-end">
                <Dialog.Close
                  className="ds-btn px-3 py-1 font-display text-[10px]"
                  aria-label="Close glossary"
                >
                  CLOSE
                </Dialog.Close>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
