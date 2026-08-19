'use client';

import { useState, useEffect } from 'react';

interface GameToastProps {
  message: string | null;
}

/**
 * A brief toast notification that auto-dismisses after 2 seconds.
 * Appears at the top of the game board.
 */
export default function GameToast({ message }: GameToastProps) {
  // The message is rendered straight from the prop rather than mirrored into
  // state, so the toast can never be left showing text the parent has already
  // replaced. Only the dismissal is state, and it resets whenever a new
  // message arrives — including the same text arriving again after a null.
  const [shownMessage, setShownMessage] = useState(message);
  const [dismissed, setDismissed] = useState(false);

  if (message !== shownMessage) {
    setShownMessage(message);
    setDismissed(false);
  }

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setDismissed(true), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message || dismissed) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="max-w-md rounded-xl border border-white/15 bg-background/85 px-4 py-2.5 shadow-ds-md backdrop-blur-md animate-fade-in">
        <span className="font-sans text-sm text-foreground">
          {message}
        </span>
      </div>
    </div>
  );
}
