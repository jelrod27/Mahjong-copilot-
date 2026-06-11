'use client';

/**
 * Cross-container tile travel. Watches the game state for discards and claims,
 * then flies a clone tile from where the tile was (hand, seat, discard pool)
 * to where it lands (pool slot, meld row) using the Web Animations API.
 *
 * Positions come from data attributes:
 * - [data-flight-tile="<tileId>"]   on every visible tile that can travel
 * - [data-seat-anchor="<playerId>"] on opponent seats (face-down hands)
 * - [data-meld-anchor="<playerId>"] on each player's exposed-meld row
 *
 * If an anchor is missing or reduced motion is requested, flights are skipped
 * and the existing arrive/depart CSS animations remain the fallback.
 */

import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { GameState } from '@/models/GameState';
import { Tile } from '@/models/Tile';
import RetroTile from './RetroTile';
import soundManager from '@/lib/soundManager';

interface FlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Flight {
  key: string;
  tile: Tile;
  from: FlightRect;
  to: FlightRect;
  kind: 'discard' | 'claim';
  playSound: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function FlightClone({ flight, onDone }: { flight: Flight; onDone: (key: string) => void }) {
  const startedRef = useRef(false);

  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el || startedRef.current) return;
    startedRef.current = true;

    if (typeof el.animate !== 'function') {
      onDone(flight.key);
      return;
    }

    const elRect = el.getBoundingClientRect();
    if (elRect.width === 0) {
      onDone(flight.key);
      return;
    }

    const s0 = flight.from.width / elRect.width;
    const s1 = flight.to.width / elRect.width;
    const dx = flight.to.left - flight.from.left;
    const dy = flight.to.top - flight.from.top;

    // Hide the real destination tile while its clone is in the air
    const destEl = document.querySelector(
      `[data-flight-tile="${flight.tile.id}"]`,
    ) as HTMLElement | null;
    if (destEl) destEl.style.visibility = 'hidden';

    const isClaim = flight.kind === 'claim';
    const keyframes: Keyframe[] = isClaim
      ? [
          // Claim SNAP: straight line, fast, overshoot scale on arrival
          { transform: `translate(0px, 0px) scale(${s0})` },
          { transform: `translate(${dx}px, ${dy}px) scale(${s1 * 1.25})`, offset: 0.72 },
          { transform: `translate(${dx}px, ${dy}px) scale(${s1})` },
        ]
      : [
          // Discard arc: lift, tilt, drop with a landing settle
          { transform: `translate(0px, 0px) rotate(0deg) scale(${s0})` },
          {
            transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) rotate(${dx >= 0 ? 10 : -10}deg) scale(${(s0 + s1) / 2})`,
            offset: 0.55,
          },
          { transform: `translate(${dx}px, ${dy + 2}px) rotate(0deg) scale(${s1 * 1.04})`, offset: 0.92 },
          { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${s1})` },
        ];

    const anim = el.animate(keyframes, {
      duration: isClaim ? 240 : 420,
      easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
      fill: 'forwards',
    });

    const finish = () => {
      if (destEl) destEl.style.visibility = '';
      if (flight.playSound) {
        soundManager.play(flight.kind === 'claim' ? 'claim' : 'tilePlace');
      }
      onDone(flight.key);
    };
    anim.onfinish = finish;
    anim.oncancel = finish;
  }, [flight, onDone]);

  return (
    <div
      ref={ref}
      className="tile-flight-clone"
      style={{
        left: flight.from.left,
        top: flight.from.top,
        transformOrigin: 'top left',
        // No initial transform: the ref callback measures the natural size
        // before animate() applies the scaled keyframes pre-paint.
        opacity: 0.999,
      }}
      aria-hidden
    >
      <RetroTile tile={flight.tile} size="sm" />
    </div>
  );
}

export default function TileFlightLayer({
  gameState,
  humanPlayerId,
}: {
  gameState: GameState;
  humanPlayerId: string;
}) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const rectCache = useRef<Map<string, FlightRect>>(new Map());
  const prevDiscardId = useRef<string | undefined>(undefined);
  const prevMeldCounts = useRef<Record<string, number> | null>(null);

  useLayoutEffect(() => {
    const reduce = prefersReducedMotion();
    const newFlights: Flight[] = [];

    // --- Discard: tile appeared in the pool
    const lastTile = gameState.lastDiscardedTile;
    if (!reduce && lastTile && lastTile.id !== prevDiscardId.current && gameState.lastDiscardedBy) {
      const destEl = document.querySelector(`[data-flight-tile="${lastTile.id}"]`);
      if (destEl) {
        const to = destEl.getBoundingClientRect();
        // Human discards launch from the tile's last position in hand;
        // AI discards launch from the discarder's seat.
        let from = rectCache.current.get(lastTile.id);
        if (!from) {
          const seatEl = document.querySelector(
            `[data-seat-anchor="${gameState.lastDiscardedBy}"]`,
          );
          if (seatEl) from = seatEl.getBoundingClientRect();
        }
        if (from && to.width > 0) {
          newFlights.push({
            key: `discard-${lastTile.id}`,
            tile: lastTile,
            from,
            to,
            kind: 'discard',
            // The controller already plays the clack for human discards
            playSound: gameState.lastDiscardedBy !== humanPlayerId,
          });
        }
      }
    }
    prevDiscardId.current = lastTile?.id;

    // --- Claim: a player's meld count grew; fly the pool tile to their meld row
    const meldCounts = Object.fromEntries(
      gameState.players.map(p => [p.id, p.melds.length]),
    );
    if (!reduce && prevMeldCounts.current) {
      for (const player of gameState.players) {
        if (meldCounts[player.id] <= (prevMeldCounts.current[player.id] ?? 0)) continue;
        const newMeld = player.melds[player.melds.length - 1];
        if (!newMeld) continue;
        // The claimed tile is the meld tile that was visible in the pool last render
        const claimedTile = newMeld.tiles.find(t => rectCache.current.has(t.id));
        // Mobile compact seats don't render a meld row — snap to the seat instead
        const meldEl = document.querySelector(`[data-meld-anchor="${player.id}"]`) ??
          document.querySelector(`[data-seat-anchor="${player.id}"]`);
        if (claimedTile && meldEl) {
          const from = rectCache.current.get(claimedTile.id)!;
          const to = meldEl.getBoundingClientRect();
          if (to.width > 0) {
            newFlights.push({
              key: `claim-${claimedTile.id}-${meldCounts[player.id]}`,
              tile: claimedTile,
              from,
              to: { left: to.left, top: to.top, width: from.width, height: from.height },
              kind: 'claim',
              playSound: false, // claim sting handled elsewhere
            });
          }
        }
      }
    }
    prevMeldCounts.current = meldCounts;

    // Refresh the rect cache from the freshly committed DOM
    const rects = new Map<string, FlightRect>();
    document.querySelectorAll('[data-flight-tile]').forEach(el => {
      const id = el.getAttribute('data-flight-tile');
      if (id) rects.set(id, el.getBoundingClientRect());
    });
    rectCache.current = rects;

    if (newFlights.length > 0) {
      setFlights(prev => [...prev, ...newFlights]);
    }
  }, [gameState, humanPlayerId]);

  const removeFlight = useCallback((key: string) => {
    setFlights(prev => prev.filter(f => f.key !== key));
  }, []);

  if (flights.length === 0) return null;

  return (
    <div className="tile-flight-layer" aria-hidden>
      {flights.map(f => (
        <FlightClone key={f.key} flight={f} onDone={removeFlight} />
      ))}
    </div>
  );
}
