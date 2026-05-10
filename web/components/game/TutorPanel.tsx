'use client';

import React from 'react';
import { TutorAdvice } from '@/engine/types';
import { Sparkles, Lightbulb, Info } from 'lucide-react';

interface TutorPanelProps {
  advice: TutorAdvice | null;
}

export default function TutorPanel({ advice }: TutorPanelProps) {
  if (!advice) return null;

  const getIcon = () => {
    switch (advice.type) {
      case 'discard': return <Lightbulb size={18} className="text-highlight" />;
      case 'claim': return <Sparkles size={18} className="text-info" />;
      default: return <Info size={18} className="text-accent" />;
    }
  };

  const getTitle = () => {
    switch (advice.type) {
      case 'discard': return 'DISCARD TIP';
      case 'claim': return 'CLAIM OPPORTUNITY';
      default: return 'MASTER ADVICE';
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="relative group">
        {/* Glow background */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-highlight/20 via-info/20 to-accent/20 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative ds-card-elevated bg-elevated/80 backdrop-blur-md border-border/20 p-2 md:p-4 flex gap-2 md:gap-4 items-start shadow-xl">
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-sm bg-surface border border-border/30 flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-lg md:text-2xl">👴</span>
          </div>

          <div className="flex-1 space-y-0.5 md:space-y-1">
            <div className="flex items-center gap-1 md:gap-2">
              {getIcon()}
              <span className="font-display text-[8px] md:text-[10px] text-highlight tracking-widest uppercase">
                {getTitle()}
              </span>
            </div>
            <p className="text-xs md:text-sm text-foreground leading-relaxed font-sans italic">
              &quot;{advice.message}&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
