import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export const metadata = {
  title: 'Sign in — paused',
  description: 'Accounts are paused while solo play, learning, and reference ship first. No sign-in is required to play.',
};

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center">
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
    </main>
  );
}
