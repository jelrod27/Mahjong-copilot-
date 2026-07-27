import { cn } from '@/lib/utils';
import { SectionLabel } from './section-label';

/**
 * The gradient hero at the top of a `(main)` page.
 *
 * Replaces five near-identical blocks (`/learn`, `/practice`, `/reference`,
 * `/cosmetics`, `/learn/[levelId]`). They shared markup exactly; the only
 * variation was the eyebrow tone and whether a trailing margin was present
 * under the description, both of which are props here.
 *
 * The landing page's hero is deliberately NOT migrated — plan 026 built it as
 * a distinct full-bleed treatment, and plan 023 excludes it.
 */

export interface PageHeaderProps {
  /** Small-caps overline, e.g. "LEARN MAHJONG". */
  eyebrow: string;
  /** Eyebrow colour role. `/learn/[levelId]` uses highlight; the rest use info. */
  eyebrowTone?: 'info' | 'highlight' | 'muted' | 'success';
  title: string;
  description?: string;
  /**
   * Rendered above the eyebrow — used by `/learn/[levelId]` for its back link.
   */
  leading?: React.ReactNode;
  /** Rendered below the description, e.g. an overall-progress meter. */
  children?: React.ReactNode;
  /**
   * Adds bottom margin under the description. Matches the `mb-4` some call
   * sites carried and others did not; preserved per-site rather than
   * normalised, since it changes spacing visibly.
   */
  descriptionSpacing?: boolean;
  className?: string;
}

export function PageHeader({
  eyebrow,
  eyebrowTone = 'info',
  title,
  description,
  leading,
  children,
  descriptionSpacing = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'bg-linear-to-b from-surface to-background px-6 pt-8 pb-6 rounded-b-2xl',
        className,
      )}
    >
      {leading}
      <SectionLabel tone={eyebrowTone} className="mb-1">
        {eyebrow}
      </SectionLabel>
      <h1 className="font-display text-lg text-foreground mb-2">{title}</h1>
      {description && (
        <p className={cn('text-base text-foreground/80 font-sans', descriptionSpacing && 'mb-4')}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

export default PageHeader;
