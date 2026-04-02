import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MultiplayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-retro-bg text-retro-text">
      {children}
    </div>
  );
}
