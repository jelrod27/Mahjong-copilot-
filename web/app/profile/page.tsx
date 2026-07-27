import { pageMetadata } from '@/lib/siteMetadata';
import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export const metadata = pageMetadata({
  title: 'Profile — deferred',
  description: 'Profiles are deferred until accounts return. Your progress is stored locally on this device.',
  path: '/profile',
  noindex: true,
});

export default function ProfilePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center">
      <DeferredFeaturePage
        title="Profiles are deferred"
        description="Player profiles depend on accounts, cloud progress, match history, and competitive identity. That whole stack is intentionally out until the core app is worth competing in."
        details={[
          'Local progress stays on this device.',
          'Cloud profiles will return with account sync.',
          'Match history belongs with multiplayer, not this release.',
        ]}
        primaryHref="/progress"
        primaryLabel="LOCAL PROGRESS"
        secondaryHref="/play"
        secondaryLabel="PLAY SOLO"
      />
    </main>
  );
}
