'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Target } from 'lucide-react';
import { FaanProjection } from '@/engine/faanProjection';

interface FaanMeterProps {
  projection: FaanProjection | null;
  /** Minimum faan to legally win (HK default 3) */
  minFaan?: number;
  /** Compact single-line mode (mobile) */
  compact?: boolean;
}

export default function FaanMeter({ projection, minFaan = 3, compact = false }: FaanMeterProps) {
  const [expanded, setExpanded] = useState(false);

  if (!projection) return null;

  const { lockedIn, inProgress, projectedMin, projectedMax, shanten, waits, bestCase } = projection;
  const isTenpai = shanten <= 0;
  const meetsMin = (bestCase?.totalFan ?? projectedMax) >= minFaan;
  const displayMax = bestCase ? bestCase.totalFan : projectedMax;

  // Color the max number by whether it clears the legal-win threshold.
  const maxColor = meetsMin ? 'text-retro-green' : 'text-retro-accent';

  // Compact header — always visible
  const header = (
    <button
      type="button"
      onClick={() => setExpanded(v => !v)}
      className="w-full flex items-center justify-between gap-2 px-2 py-1 hover:bg-retro-bg/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/50 rounded-sm"
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse faan meter' : 'Expand faan meter'}
    >
      <span className="flex items-center gap-1 font-pixel text-[8px] md:text-[10px] text-retro-gold tracking-widest uppercase">
        <Target size={12} className="text-retro-gold" aria-hidden />
        Faan
      </span>
      <span className="flex items-center gap-2 font-retro text-xs">
        <span className="text-retro-textDim">{projectedMin}</span>
        <span className="text-retro-textDim">→</span>
        <span className={`${maxColor} retro-glow font-semibold`}>{displayMax}</span>
        <span className="text-retro-textDim text-[10px]">
          {isTenpai ? 'TENPAI' : `${shanten + 1}-away`}
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </span>
    </button>
  );

  if (compact && !expanded) {
    return <div className="retro-panel" data-testid="faan-meter">{header}</div>;
  }

  return (
    <div className="retro-panel" data-testid="faan-meter">
      {header}

      {expanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-retro-border/20 pt-2">
          {/* Locked-in section */}
          {lockedIn.length > 0 && (
            <section>
              <header className="flex items-center gap-1 mb-1">
                <Lock size={10} className="text-retro-green" aria-hidden />
                <span className="font-pixel text-[7px] md:text-[9px] uppercase tracking-widest text-retro-green">
                  Locked in
                </span>
              </header>
              <ul className="space-y-0.5">
                {lockedIn.map((fan, idx) => (
                  <li key={`locked-${idx}-${fan.name}`} className="flex items-start justify-between gap-2 text-[11px] md:text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="text-retro-text font-retro">{fan.name}</span>
                      <span className="block text-[10px] text-retro-textDim italic truncate">
                        {fan.description}
                      </span>
                    </div>
                    <span className="text-retro-green font-retro shrink-0">+{fan.fan}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* In-progress section */}
          {inProgress.length > 0 && (
            <section>
              <header className="flex items-center gap-1 mb-1">
                <Target size={10} className="text-retro-cyan" aria-hidden />
                <span className="font-pixel text-[7px] md:text-[9px] uppercase tracking-widest text-retro-cyan">
                  In progress
                </span>
              </header>
              <ul className="space-y-1">
                {inProgress.map((fan, idx) => (
                  <li key={`ip-${idx}-${fan.name}`} className="text-[11px] md:text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-retro-text font-retro">{fan.name}</span>
                        <span className="block text-[10px] text-retro-textDim italic">
                          {fan.hint}
                        </span>
                      </div>
                      <span className="text-retro-cyan font-retro shrink-0">+{fan.fan}</span>
                    </div>
                    <div className="mt-0.5 h-1 w-full bg-retro-bg rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-retro-cyan/60 transition-[width] duration-500"
                        style={{ width: `${Math.round(fan.progress * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Wait tiles when tenpai */}
          {isTenpai && waits.length > 0 && (
            <section className="pt-1 border-t border-retro-border/20">
              <header className="flex items-center gap-1 mb-0.5">
                <span className="font-pixel text-[7px] md:text-[9px] uppercase tracking-widest text-retro-gold">
                  Waiting on
                </span>
              </header>
              <p className="text-[11px] md:text-xs text-retro-text font-retro leading-snug">
                {waits.slice(0, 4).join(', ')}
                {waits.length > 4 && <span className="text-retro-textDim"> +{waits.length - 4} more</span>}
              </p>
            </section>
          )}

          {/* Min-faan status line — tells the learner whether they can legally win */}
          <div className="flex items-center justify-between pt-1 border-t border-retro-border/20 text-[10px]">
            <span className="text-retro-textDim font-retro">
              Need {minFaan}+ faan to win
            </span>
            <span className={`font-pixel ${meetsMin ? 'text-retro-green' : 'text-retro-accent'}`}>
              {meetsMin ? '✓ LEGAL' : '✗ SHORT'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
