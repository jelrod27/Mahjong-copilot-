import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export default function MultiplayerLobbyPage() {
  return (
    <DeferredFeaturePage
      title="Online Mahjong is coming later"
      eyebrow="MULTIPLAYER LATER"
      description="Online lobbies are intentionally out of scope while the app focuses on solo gameplay, learning flow, accessibility, and local developer reliability."
      details={[
        'No login wall for the current release.',
        'No Supabase room service in the app shell.',
        'Multiplayer returns when competition is fully scoped.',
      ]}
      primaryHref="/play"
      primaryLabel="PLAY SOLO"
      secondaryHref="/practice"
      secondaryLabel="PRACTICE"
    />
  );
}
