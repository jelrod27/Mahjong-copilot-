import { cn } from '@/lib/utils';

/**
 * Horizontal progress bar.
 *
 * Replaces 11 hand-rolled track+fill pairs across `app/(main)`. Those had
 * drifted into three different motion treatments — `duration-slow ease-ds-out`,
 * `duration-500`, and a bare `transition-all` (Tailwind's 150ms default) — for
 * what is visually the same element. This normalises on the design-system
 * tokens; see the PR body for the full before/after list.
 *
 * Track height is NOT normalised: `h-1.5` and `h-2` are both in use and the
 * taller one reads as a deliberate emphasis on overall-progress bars, so it is
 * exposed as `size` and every call site keeps what it had.
 *
 * Out of scope: the six bars under `components/game/`, which plan 023 excludes.
 */

type Tone = 'highlight' | 'info' | 'success';
type Size = 'sm' | 'md';
type Track = 'elevated' | 'surface';

const TONE_CLASS: Record<Tone, string> = {
  highlight: 'bg-highlight',
  info: 'bg-info',
  success: 'bg-success',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-1.5',
  md: 'h-2',
};

/**
 * Track colour is also drifted in the wild — the landing/parlour bars sit on
 * `bg-surface`, the learn/practice bars on `bg-elevated`. Since those two
 * tokens are deliberately different steps of the elevation ladder (plan 025),
 * picking one would visibly recolour half the call sites. Exposed instead.
 */
const TRACK_CLASS: Record<Track, string> = {
  elevated: 'bg-elevated',
  surface: 'bg-surface',
};

export interface MeterProps {
  /** Current value. Clamped into [0, max] — callers pass raw ratios. */
  value: number;
  /** Upper bound. Defaults to 100 so callers can pass a percentage directly. */
  max?: number;
  tone?: Tone;
  size?: Size;
  /** Track colour. Defaults to `elevated`, the more common of the two. */
  track?: Track;
  className?: string;
  /** Accessible label. Omit only when an adjacent element already names it. */
  label?: string;
}

export function Meter({
  value,
  max = 100,
  tone = 'highlight',
  size = 'sm',
  track = 'elevated',
  className,
  label,
}: MeterProps) {
  // Guard the degenerate max before dividing: a zero or negative bound would
  // otherwise yield NaN/Infinity and render a bar of style="width: NaN%".
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = (clamped / safeMax) * 100;

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden',
        SIZE_CLASS[size],
        TRACK_CLASS[track],
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-slow ease-ds-out',
          TONE_CLASS[tone],
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default Meter;
