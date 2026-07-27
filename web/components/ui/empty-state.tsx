import { cn } from '@/lib/utils';

/** Placeholder shown where a list or panel has nothing to display yet. */

export interface EmptyStateProps {
  /** Decorative glyph or icon. Hidden from assistive tech. */
  icon?: React.ReactNode;
  title: string;
  body?: string;
  /** Optional call to action, e.g. a link to the screen that creates content. */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-6 py-10 text-center', className)}>
      {icon && (
        <span className="text-2xl opacity-60" aria-hidden>
          {icon}
        </span>
      )}
      <p className="font-display text-base text-foreground">{title}</p>
      {body && <p className="font-sans text-sm text-muted-foreground max-w-prose">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
