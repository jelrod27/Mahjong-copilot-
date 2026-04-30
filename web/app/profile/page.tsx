import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export default function ProfilePage() {
  return (
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
  );
}
