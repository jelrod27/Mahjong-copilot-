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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 bg-background text-foreground">
      <h1 className="font-display text-info ds-text-glow text-lg text-center">
        Something went wrong
      </h1>
      <p className="font-sans text-muted-foreground text-center max-w-md">
        An unexpected error occurred. You can try again or return home.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="ds-btn-accent px-4 py-2"
        >
          Try again
        </button>
        <Link
          href="/"
          className="font-sans text-base px-4 py-2 border-2 border-border/60 rounded-md text-foreground hover:bg-accent/15 transition-colors"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
