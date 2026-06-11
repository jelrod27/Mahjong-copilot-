'use client';

import { useMemo } from 'react';

const PARTICLE_COLORS = ['#f5b731', '#4CAF50', '#45b7d1', '#e8384f', '#FFFFFF'];
/** Gold-dominated palette for big and limit hands — the jackpot shower. */
const GOLD_COLORS = ['#f5b731', '#ffd700', '#c9a84c', '#fff3c4', '#f5b731'];
const DEFAULT_COUNT = 40;

interface ConfettiProps {
  active?: boolean;
  count?: number;
  /** Big-win mode: gold-dominant particles. */
  goldHeavy?: boolean;
}

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rotation: number;
  size: number;
  color: string;
}

function makeParticles(count: number, colors: string[]): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1.5,
    drift: (Math.random() - 0.5) * 240,
    rotation: 360 + Math.random() * 720,
    size: 4 + Math.floor(Math.random() * 5),
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

/**
 * Pixel-square particles that fall across the viewport once. Pure CSS animation
 * (no canvas, no deps). Particles regenerate with fresh random values every time
 * `active` becomes true so celebrations feel organic, not replayed.
 */
export default function Confetti({ active = true, count = DEFAULT_COUNT, goldHeavy = false }: ConfettiProps) {
  const particles = useMemo(
    () => (active ? makeParticles(count, goldHeavy ? GOLD_COLORS : PARTICLE_COLORS) : []),
    [active, count, goldHeavy],
  );

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
      data-testid="confetti"
    >
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute top-[-10px] block animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // Custom CSS variables consumed by the keyframe in globals.css.
            ['--confetti-drift' as string]: `${p.drift}px`,
            ['--confetti-rotation' as string]: `${p.rotation}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
