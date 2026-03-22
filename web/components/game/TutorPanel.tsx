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
      case 'discard': return <Lightbulb size={18} className="text-retro-gold" />;
      case 'claim': return <Sparkles size={18} className="text-retro-cyan" />;
      default: return <Info size={18} className="text-retro-accent" />;
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
        <div className="absolute -inset-0.5 bg-gradient-to-r from-retro-gold/20 via-retro-cyan/20 to-retro-accent/20 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative neo-retro-card bg-retro-bgLight/80 backdrop-blur-md border-retro-border/20 p-4 flex gap-4 items-start shadow-xl">
          <div className="w-12 h-12 rounded-sm bg-retro-panel border border-retro-border/30 flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-2xl">👴</span>
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {getIcon()}
              <span className="font-pixel text-[10px] text-retro-gold tracking-widest uppercase">
                {getTitle()}
              </span>
            </div>
            <p className="text-sm text-retro-text leading-relaxed font-sans italic">
              &quot;{advice.message}&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
