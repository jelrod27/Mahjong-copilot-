import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export const metadata = {
  title: 'Leaderboard — deferred',
  description: 'Leaderboards are deferred until online play returns. Solo progress is tracked locally.',
};

export default function LeaderboardPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center">
      <DeferredFeaturePage
        title="Leaderboards are deferred"
        description="Leaderboards need real accounts, match validation, anti-cheat thinking, and multiplayer telemetry. Shipping a fake board now would be theater. Bad theater."
        details={[
          'No ranked data is collected in this release.',
          'Competitive stats return with multiplayer.',
          'Solo learning remains the priority.',
        ]}
        primaryHref="/practice"
        primaryLabel="PRACTICE"
        secondaryHref="/play"
        secondaryLabel="PLAY SOLO"
      />
    </main>
  );
}
