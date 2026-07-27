import { cn } from '@/lib/utils';

/**
 * Small-caps overline used above a heading or a card section.
 *
 * NOTE ON SCOPE — this is NOT the same component as
 * `components/game/GameResultsSectionLabel`. Plan 023 treated them as one and
 * asked for the game one to be "promoted", but they are visually distinct:
 * the game label is a *rail* — centred small caps flanked by two hairlines —
 * while this is a plain left-aligned overline. Promoting the rail and using it
 * for page eyebrows would have restyled every page header, which the plan's
 * own no-unapproved-visual-change rule forbids. They stay separate.
 */

type Tone = 'info' | 'highlight' | 'muted' | 'success';

const TONE_CLASS: Record<Tone, string> = {
  info: 'text-info',
  highlight: 'text-highlight',
  muted: 'text-muted-foreground',
  success: 'text-success',
};

export interface SectionLabelProps {
  children: React.ReactNode;
  /** Colour role. Defaults to `info`, the dominant existing usage. */
  tone?: Tone;
  className?: string;
}

export function SectionLabel({ children, tone = 'info', className }: SectionLabelProps) {
  return (
    <p className={cn('font-display text-[10px] tracking-[1.5px]', TONE_CLASS[tone], className)}>
      {children}
    </p>
  );
}

export default SectionLabel;
