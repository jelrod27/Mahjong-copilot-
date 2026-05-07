'use client';

import { useState, type ReactNode } from 'react';
import GlossaryModal from './GlossaryModal';

interface GlossaryTermProps {
  /** Term to look up in the glossary. */
  term: string;
  /** Visible label rendered next to the help affordance. */
  children: ReactNode;
  /** Tailwind class overrides for the help-button positioning. */
  buttonClassName?: string;
}

/**
 * Wraps an in-game label with a small "?" help button that opens the
 * GlossaryModal for the given term. The label itself stays non-interactive,
 * so this is safe to drop in next to numeric values like "Wall: 84".
 *
 * GAME-05 acceptance: in-game terms get a help affordance that opens a
 * modal without leaving the active game.
 */
export default function GlossaryTerm({ term, children, buttonClassName = '' }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="inline-flex items-center gap-0.5">
      {children}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`What does ${term} mean?`}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-pixel text-retro-textDim border border-retro-border/40 hover:text-retro-cyan hover:border-retro-cyan/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/60 ${buttonClassName}`}
      >
        ?
      </button>
      <GlossaryModal term={term} open={open} onOpenChange={setOpen} />
    </span>
  );
}
