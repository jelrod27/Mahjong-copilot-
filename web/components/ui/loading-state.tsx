import { cn } from '@/lib/utils';

/**
 * Neutral loading placeholder.
 *
 * `aria-live="polite"` so a screen reader announces the wait rather than
 * landing on silence, and `aria-busy` marks the region as in-flight.
 */

export interface LoadingStateProps {
  /** Announced and displayed. Defaults to a generic wait message. */
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading…', className }: LoadingStateProps) {
  return (
    <div
      className={cn('flex items-center justify-center px-6 py-10', className)}
      aria-live="polite"
      aria-busy="true"
    >
      <p className="font-sans text-sm text-muted-foreground animate-pulse">{label}</p>
    </div>
  );
}

export default LoadingState;
