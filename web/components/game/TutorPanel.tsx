'use client';

import React from 'react';
import { TutorAdvice } from '@/engine/types';
import { Sparkles, Lightbulb, Info, GraduationCap } from 'lucide-react';

interface TutorPanelProps {
  advice: TutorAdvice | null;
}

export default function TutorPanel({ advice }: TutorPanelProps) {
  if (!advice) return null;

  const getIcon = () => {
    switch (advice.type) {
      case 'discard':
        return <Lightbulb size={18} className="text-highlight" aria-hidden />;
      case 'claim':
        return <Sparkles size={18} className="text-info" aria-hidden />;
      default:
        return <Info size={18} className="text-accent" aria-hidden />;
    }
  };

  const getTitle = () => {
    switch (advice.type) {
      case 'discard':
        return 'Discard tip';
      case 'claim':
        return 'Claim window';
      default:
        return 'Table read';
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="relative overflow-hidden rounded-xl border border-border/30 game-hud-surface">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-highlight/[0.06] via-transparent to-info/[0.06]" aria-hidden />
        <div className="relative flex items-start gap-3 p-3 md:gap-4 md:p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-surface/80 md:h-12 md:w-12">
            <GraduationCap className="h-5 w-5 text-highlight md:h-6 md:w-6" strokeWidth={1.75} aria-hidden />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {getIcon()}
              <span className="font-display text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground md:text-[10px]">
                {getTitle()}
              </span>
            </div>
            <p className="font-sans text-xs leading-relaxed text-foreground/95 md:text-sm">
              {advice.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
