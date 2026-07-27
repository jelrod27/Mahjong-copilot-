import { pageMetadata } from '@/lib/siteMetadata';
import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export const metadata = pageMetadata({
  title: 'Paused feature',
  description: 'This feature is paused while solo play, learning, and reference ship first.',
  path: '/multiplayer/ranked',
  noindex: true,
});

export default function RankedPage() {
  return (
    <DeferredFeaturePage
      title="Ranked play is deferred"
      eyebrow="COMPETITIVE LATER"
      description="Ranked play needs accounts, verified matches, ratings, leaderboards, and abuse prevention. It does not belong in the current DX/UI/gameplay cleanup."
      details={[
        'No Elo or ranked data is active in this release.',
        'Competitive identity returns with authentication.',
        'Solo Mahjong remains the product center of gravity for now.',
      ]}
      primaryHref="/play"
      primaryLabel="PLAY SOLO"
      secondaryHref="/reference"
      secondaryLabel="REFERENCE"
    />
  );
}
