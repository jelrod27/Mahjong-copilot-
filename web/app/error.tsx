'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 bg-retro-bg text-retro-text">
      <h1 className="font-pixel text-retro-cyan retro-glow text-lg text-center">
        Something went wrong
      </h1>
      <p className="font-retro text-retro-textDim text-center max-w-md">
        An unexpected error occurred. You can try again or return home.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="retro-btn-accent px-4 py-2"
        >
          Try again
        </button>
        <Link
          href="/"
          className="font-retro text-base px-4 py-2 border-2 border-retro-border/60 rounded-md text-retro-text hover:bg-retro-accent/15 transition-colors"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
