'use client';

import { useState } from 'react';

const PARTICLE_COLORS = ['#f5b731', '#4CAF50', '#45b7d1', '#e8384f', '#FFFFFF'];
const DEFAULT_COUNT = 40;

interface ConfettiProps {
  active?: boolean;
  count?: number;
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

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1.5,
    drift: (Math.random() - 0.5) * 240,
    rotation: 360 + Math.random() * 720,
    size: 4 + Math.floor(Math.random() * 5),
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
  }));
}

/**
 * Pixel-square particles that fall across the viewport once. Pure CSS animation
 * (no canvas, no deps). Particles render once on mount; the parent controls
 * lifetime by unmounting or toggling `active`.
 */
export default function Confetti({ active = true, count = DEFAULT_COUNT }: ConfettiProps) {
  const [particles] = useState(() => makeParticles(count));

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
