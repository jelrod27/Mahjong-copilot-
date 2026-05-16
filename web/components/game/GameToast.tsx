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
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState('');

  useEffect(() => {
    if (!message) return;
    setDisplayMessage(message);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!visible || !displayMessage) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="max-w-md rounded-xl border border-white/15 bg-background/85 px-4 py-2.5 shadow-ds-md backdrop-blur-md animate-fade-in">
        <span className="font-sans text-sm text-foreground">
          {displayMessage}
        </span>
      </div>
    </div>
  );
}
