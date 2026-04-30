import DeferredFeaturePage from '@/components/DeferredFeaturePage';

export default function SignupPage() {
  return (
    <DeferredFeaturePage
      title="Account creation is paused"
      description="Accounts are intentionally out of scope while the game, learning flow, UI, and player experience get tightened. No login wall. No fake plumbing."
      details={[
        'Solo gameplay works without an account.',
        'Learning and practice remain available offline.',
        'Competitive profiles return with the future multiplayer scope.',
      ]}
      primaryHref="/learn"
      primaryLabel="START LEARNING"
      secondaryHref="/play"
      secondaryLabel="PLAY SOLO"
    />
  );
}
