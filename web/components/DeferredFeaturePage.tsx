import Link from 'next/link';
import { Card } from '@/components/ui/card';

interface DeferredFeaturePageProps {
  title: string;
  eyebrow?: string;
  description: string;
  details?: string[];
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export default function DeferredFeaturePage({
  title,
  eyebrow = 'COMING LATER',
  description,
  details = [],
  primaryHref = '/play',
  primaryLabel = 'PLAY SOLO',
  secondaryHref = '/',
  secondaryLabel = 'HOME',
}: DeferredFeaturePageProps) {
  return (
    <main className="min-h-screen bg-background font-sans text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 md:p-8 border-border/40 bg-elevated/40 text-center shadow-[8px_8px_0_rgba(0,0,0,0.25)]">
        <p className="font-display text-[10px] text-info uppercase tracking-[0.3em] mb-4">
          {eyebrow}
        </p>
        <h1 className="font-display text-lg md:text-2xl text-highlight ds-text-glow-strong mb-5 leading-relaxed">
          {title}
        </h1>
        <p className="font-sans text-base leading-relaxed text-foreground/85 max-w-xl mx-auto">
          {description}
        </p>

        {details.length > 0 && (
          <ul className="mt-6 grid gap-3 text-left max-w-xl mx-auto" aria-label="Deferred scope details">
            {details.map((detail) => (
              <li
                key={detail}
                className="rounded-sm border border-border/20 bg-background/40 px-4 py-3 font-sans text-sm text-muted-foreground"
              >
                {detail}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link href={primaryHref} className="ds-btn-success font-display text-xs px-5 py-3">
            <span aria-hidden="true">[ </span>{primaryLabel}<span aria-hidden="true"> ]</span>
          </Link>
          <Link href={secondaryHref} className="ds-btn font-display text-xs px-5 py-3">
            <span aria-hidden="true">[ </span>{secondaryLabel}<span aria-hidden="true"> ]</span>
          </Link>
        </div>
      </Card>
    </main>
  );
}
