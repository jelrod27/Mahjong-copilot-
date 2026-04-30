import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export default function LoginPage() {
  return (
    <DeferredFeaturePage
      title="Accounts are paused"
      description="Authentication has been removed from this release so solo play, learning, practice, and reference can ship cleanly first. Account sync comes back after the core game experience is solid."
      details={[
        'No sign-in is required for solo play.',
        'Progress is local to this device for now.',
        'Cloud sync and competitive accounts are deferred.',
      ]}
      primaryHref="/play"
      primaryLabel="PLAY SOLO"
      secondaryHref="/"
      secondaryLabel="HOME"
    />
  );
}
