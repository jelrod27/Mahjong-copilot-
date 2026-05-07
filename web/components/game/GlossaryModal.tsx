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
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 retro-panel p-4 md:p-6 shadow-2xl transition duration-150 data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95"
        >
          {entry ? (
            <>
              <div className="mb-3 flex items-baseline gap-3">
                <Dialog.Title className="font-pixel text-base md:text-lg text-retro-cyan">
                  {entry.term}
                </Dialog.Title>
                <span className="font-retro text-base md:text-lg text-retro-gold">
                  {entry.chinese}
                </span>
              </div>
              <Dialog.Description className="font-retro text-sm md:text-base text-retro-text leading-relaxed">
                {entry.definition}
              </Dialog.Description>
              {entry.aliases && entry.aliases.length > 0 && (
                <p className="mt-3 font-retro text-xs text-retro-textDim">
                  Also called: {entry.aliases.join(', ')}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-2">
                <Link
                  href="/reference"
                  className="font-pixel text-[10px] text-retro-cyan hover:text-retro-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/60 rounded-sm"
                  onClick={() => onOpenChange(false)}
                >
                  OPEN IN REFERENCE →
                </Link>
                <Dialog.Close
                  className="retro-btn px-3 py-1 font-pixel text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/60"
                  aria-label="Close glossary"
                >
                  CLOSE
                </Dialog.Close>
              </div>
            </>
          ) : (
            <>
              <Dialog.Title className="font-pixel text-base text-retro-accent mb-2">
                Term not found
              </Dialog.Title>
              <Dialog.Description className="font-retro text-sm text-retro-text">
                We don&apos;t have a glossary entry for &ldquo;{term}&rdquo; yet. Try the{' '}
                <Link href="/reference" className="text-retro-cyan underline" onClick={() => onOpenChange(false)}>
                  Reference page
                </Link>
                .
              </Dialog.Description>
              <div className="mt-4 flex justify-end">
                <Dialog.Close
                  className="retro-btn px-3 py-1 font-pixel text-[10px]"
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
