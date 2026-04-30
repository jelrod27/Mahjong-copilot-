import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export default function PlayMultiplayerPage() {
  return (
    <DeferredFeaturePage
      title="Multiplayer gameplay is deferred"
      eyebrow="MULTIPLAYER LATER"
      description="Realtime multiplayer has been removed from the runtime for now. No auth shim. No half-working websocket casino. Solo play gets fixed first."
      details={[
        'Use solo play while beginner assist and gameplay polish are implemented.',
        'Realtime room sync will be reintroduced as a separate scoped project.',
        'Account identity and competitive state return together.',
      ]}
      primaryHref="/play"
      primaryLabel="PLAY SOLO"
      secondaryHref="/learn"
      secondaryLabel="LEARN"
    />
  );
}
