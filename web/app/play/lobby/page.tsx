import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export default function PlayLobbyPage() {
  return (
    <DeferredFeaturePage
      title="Online rooms are deferred"
      eyebrow="MULTIPLAYER LATER"
      description="Room creation and joining have been removed from this release. The next milestone is making solo Mahjong clear, stable, and genuinely useful for beginners."
      details={[
        'No Supabase setup is required for local development.',
        'No online room state runs in the client.',
        'Competitive rooms return after core gameplay and learning polish.',
      ]}
      primaryHref="/play"
      primaryLabel="PLAY SOLO"
      secondaryHref="/reference"
      secondaryLabel="REFERENCE"
    />
  );
}
