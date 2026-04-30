import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export default function MultiplayerGamePage() {
  return (
    <DeferredFeaturePage
      title="Multiplayer games are deferred"
      eyebrow="MULTIPLAYER LATER"
      description="Realtime multiplayer sessions have been removed from this release. The app should not pretend to support online play until auth, rooms, and sync are properly scoped."
      details={[
        'No room lookup runs on this route.',
        'No realtime subscription starts here.',
        'Use solo play while the core game is polished.',
      ]}
      primaryHref="/play"
      primaryLabel="PLAY SOLO"
      secondaryHref="/"
      secondaryLabel="HOME"
    />
  );
}
