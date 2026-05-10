'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

type GameResultsOverlayProps = {
  children: ReactNode;
  className?: string;
};

/** Full-screen dimmed felt-style backdrop for post-hand / match / practice modals. */
export function GameResultsOverlay({ children, className = '' }: GameResultsOverlayProps) {
  return <div className={`game-results-overlay ${className}`.trim()}>{children}</div>;
}

type GameResultsSheetProps = HTMLAttributes<HTMLDivElement>;

/** Glass sheet card — pass ref for focus trap (dialog). */
export const GameResultsSheet = forwardRef<HTMLDivElement, GameResultsSheetProps>(
  function GameResultsSheet({ className = '', children, ...rest }, ref) {
    return (
      <div ref={ref} className={`game-results-sheet ${className}`.trim()} {...rest}>
        {children}
      </div>
    );
  },
);

type SectionLabelProps = { children: string };

/** Small caps rail label between hairlines — matches in-table HUD rhythm. */
export function GameResultsSectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="h-px max-w-[2rem] flex-1 bg-border/50" aria-hidden />
      <span className="shrink-0 font-display text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground md:text-[10px]">
        {children}
      </span>
      <span className="h-px flex-1 bg-border/50" aria-hidden />
    </div>
  );
}
