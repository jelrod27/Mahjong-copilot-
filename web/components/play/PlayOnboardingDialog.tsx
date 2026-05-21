'use client';

import { useState, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { markPlayOnboardingSeen } from '@/lib/playOnboarding';

const STEPS = [
  {
    title: 'Hong Kong · 4 players',
    body: 'You play against three AI opponents. This is real table mahjong — not tile-matching solitaire.',
  },
  {
    title: 'Your turn',
    body: 'Draw a tile, then discard one. Tap a tile in your hand, then confirm Discard when the button is ready.',
  },
  {
    title: 'Claims',
    body: 'When someone discards, you may chow, pung, kong, or declare mahjong if the rules allow. Use Pass if you do not want the tile.',
  },
] as const;

interface PlayOnboardingDialogProps {
  onDone: () => void;
}

export default function PlayOnboardingDialog({ onDone }: PlayOnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    markPlayOnboardingSeen();
    onDone();
  };

  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="play-onboarding-title"
        className="ds-panel w-full max-w-md p-5 shadow-ds-lg"
      >
        <p className="font-sans text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="play-onboarding-title" className="mt-2 font-display text-lg font-semibold text-highlight">
          {current.title}
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-foreground/90">{current.body}</p>
        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button
              type="button"
              className="ds-btn flex-1"
              onClick={() => setStep(s => s - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="ds-btn-accent flex-1"
            onClick={() => (isLast ? finish() : setStep(s => s + 1))}
          >
            {isLast ? 'Start playing' : 'Next'}
          </button>
        </div>
        <button
          type="button"
          className="mt-3 w-full font-sans text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={finish}
        >
          Skip intro
        </button>
      </div>
    </div>
  );
}
