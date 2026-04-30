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
    <main className="min-h-screen bg-retro-bg font-retro text-retro-text flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 md:p-8 border-retro-border/40 bg-retro-bgLight/40 text-center shadow-[8px_8px_0_rgba(0,0,0,0.25)]">
        <p className="font-pixel text-[10px] text-retro-cyan uppercase tracking-[0.3em] mb-4">
          {eyebrow}
        </p>
        <h1 className="font-pixel text-lg md:text-2xl text-retro-gold retro-glow-strong mb-5 leading-relaxed">
          {title}
        </h1>
        <p className="font-sans text-base leading-relaxed text-retro-text/85 max-w-xl mx-auto">
          {description}
        </p>

        {details.length > 0 && (
          <ul className="mt-6 grid gap-3 text-left max-w-xl mx-auto" aria-label="Deferred scope details">
            {details.map((detail) => (
              <li
                key={detail}
                className="rounded-sm border border-retro-border/20 bg-retro-bg/40 px-4 py-3 font-sans text-sm text-retro-textDim"
              >
                {detail}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link href={primaryHref} className="retro-btn-green font-pixel text-xs px-5 py-3">
            <span aria-hidden="true">[ </span>{primaryLabel}<span aria-hidden="true"> ]</span>
          </Link>
          <Link href={secondaryHref} className="retro-btn font-pixel text-xs px-5 py-3">
            <span aria-hidden="true">[ </span>{secondaryLabel}<span aria-hidden="true"> ]</span>
          </Link>
        </div>
      </Card>
    </main>
  );
}
