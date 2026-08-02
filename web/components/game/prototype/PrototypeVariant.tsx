'use client';

/**
 * PROTOTYPE — throwaway. Delete this directory when the question is settled.
 *
 * QUESTION: Is the board's look fixable in 2D, or does it need a 3D renderer?
 *
 * Three variants of the tile face, switchable via `?variant=` on the existing
 * /play/game route:
 *
 *   A — Glyph (current)  : Unicode symbol + suit label + colour stripe. Control.
 *   B — Vector face      : public-domain HK tile artwork fills the face; no
 *                          stripe, no suit label. Typography out, art in.
 *   C — Carved & tilted  : same artwork, plus physical tile thickness (stacked
 *                          box-shadow extrusion) and a discard sea tilted with
 *                          CSS perspective. This is the "CSS 3D-lite instead of
 *                          Three.js" bet — including whether a tilted pool
 *                          hurts discard legibility.
 *
 * State lives in memory; the URL is updated with history.replaceState so the
 * variant is shareable and reload-stable WITHOUT a Next re-render (a router
 * navigation here risks restarting the live match).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Tile } from '@/models/Tile';
import { tileArtSrc } from './tileArt';

export type VariantKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface FaceRenderProps {
  tile: Tile;
  size: 'xs' | 'sm' | 'md' | 'lg';
  suitColor: string;
  stripeHeight: number;
  tutorColor?: 'green' | 'orange' | 'red';
  tutorStrip: ReactNode;
}

export interface FaceVariant {
  key: VariantKey;
  name: string;
  /** Extra class on the tile face element. */
  faceClass: string;
  /** null → RetroTile renders its own (current) markup. */
  renderFace: ((p: FaceRenderProps) => ReactNode) | null;
  /** When set, a WebGL scene replaces the sea ('sea'/'full') or the whole board ('board'). */
  three?: 'sea' | 'full' | 'board' | 'max';
}

function ArtFace({ tile, tutorStrip }: FaceRenderProps) {
  const src = tileArtSrc(tile);
  if (!src) return null;
  return (
    <>
      {tutorStrip}
      <div className="proto-art-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" aria-hidden draggable={false} className="proto-art" />
      </div>
    </>
  );
}

export const VARIANTS: Record<VariantKey, FaceVariant> = {
  A: { key: 'A', name: 'Glyph (current)', faceClass: '', renderFace: null },
  B: { key: 'B', name: 'Vector face', faceClass: 'proto-art-face', renderFace: ArtFace },
  C: {
    key: 'C',
    name: 'Carved & tilted',
    faceClass: 'proto-art-face proto-carved',
    renderFace: ArtFace,
  },
  D: {
    key: 'D',
    name: 'Three.js sea',
    faceClass: 'proto-art-face proto-carved',
    renderFace: ArtFace,
    three: 'sea',
  },
  E: {
    key: 'E',
    name: 'Three.js table + hand',
    faceClass: 'proto-art-face proto-carved',
    renderFace: ArtFace,
    three: 'full',
  },
  F: {
    key: 'F',
    name: 'Three.js full board',
    faceClass: 'proto-art-face proto-carved',
    renderFace: ArtFace,
    three: 'board',
  },
  G: {
    key: 'G',
    name: 'Three.js max',
    faceClass: 'proto-art-face proto-carved',
    renderFace: ArtFace,
    three: 'max',
  },
};

const ORDER: VariantKey[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const VariantContext = createContext<FaceVariant>(VARIANTS.A);

export function useTileFaceVariant(): FaceVariant {
  return useContext(VariantContext);
}

function readInitialVariant(): VariantKey {
  if (typeof window === 'undefined') return 'A';
  const v = new URLSearchParams(window.location.search).get('variant')?.toUpperCase();
  return v && v in VARIANTS ? (v as VariantKey) : 'A';
}

/**
 * Wrap the board. Renders nothing in production so a stray merge can't ship
 * the switcher — descendants just get variant A.
 */
export function PrototypeVariantProvider({ children }: { children: ReactNode }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const [variant, setVariant] = useState<VariantKey>('A');

  // Read the URL after mount so SSR and first client render agree.
  useEffect(() => {
    if (isDev) setVariant(readInitialVariant());
  }, [isDev]);

  const change = useCallback((next: VariantKey) => {
    setVariant(next);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next);
    window.history.replaceState(null, '', url);
  }, []);

  const cycle = useCallback(
    (step: number) => {
      setVariant(current => {
        const next = ORDER[(ORDER.indexOf(current) + step + ORDER.length) % ORDER.length];
        const url = new URL(window.location.href);
        url.searchParams.set('variant', next);
        window.history.replaceState(null, '', url);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!isDev) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      cycle(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDev, cycle]);

  if (!isDev) return <>{children}</>;

  return (
    <VariantContext.Provider value={VARIANTS[variant]}>
      <div data-proto-variant={variant} className="contents">
        {children}
      </div>
      <PrototypeStyles />
      <PrototypeSwitcher variant={variant} onCycle={cycle} onPick={change} />
    </VariantContext.Provider>
  );
}

function PrototypeSwitcher({
  variant,
  onCycle,
  onPick,
}: {
  variant: VariantKey;
  onCycle: (step: number) => void;
  onPick: (v: VariantKey) => void;
}) {
  return (
    <div className="proto-switcher" role="group" aria-label="Prototype variant switcher">
      <button type="button" onClick={() => onCycle(-1)} aria-label="Previous variant">
        ←
      </button>
      <span className="proto-switcher-label">
        <strong>{variant}</strong> — {VARIANTS[variant].name}
      </span>
      <button type="button" onClick={() => onCycle(1)} aria-label="Next variant">
        →
      </button>
      <span className="proto-switcher-dots">
        {ORDER.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => onPick(k)}
            className={k === variant ? 'is-on' : ''}
            aria-label={`Variant ${k}: ${VARIANTS[k].name}`}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * All prototype CSS lives here rather than globals.css so reverting is a
 * directory delete, not a stylesheet diff.
 */
function PrototypeStyles() {
  return (
    <style>{`
      .proto-art-wrap {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4%;
      }
      .proto-art {
        width: 100%;
        height: 100%;
        object-fit: contain;
        user-select: none;
        -webkit-user-drag: none;
      }
      .mahjong-tile-face.proto-art-face {
        position: relative;
        overflow: hidden;
      }
      /* Assist strip sits above the artwork, which fills the whole face. */
      .mahjong-tile-face.proto-art-face > .proto-tutor-strip {
        position: relative;
        z-index: 2;
      }

      /* --- Variant C: physical tile + tilted table --- */
      :is([data-proto-variant="C"], [data-proto-variant="D"], [data-proto-variant="E"])
        .mahjong-tile-face.proto-carved {
        border-radius: 12%;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.6),
          inset 0 -2px 3px rgba(0, 0, 0, 0.12),
          0 2px 0 #cdc0a0,
          0 4px 0 #b4a684,
          0 6px 0 #9b8e6c,
          0 9px 12px rgba(0, 0, 0, 0.45);
      }
      [data-proto-variant="C"] [data-proto-discard-sea] {
        perspective: 900px;
        perspective-origin: 50% 20%;
      }
      [data-proto-variant="C"] [data-proto-discard-sea] > * {
        transform: rotateX(17deg);
        transform-origin: 50% 100%;
        transform-style: preserve-3d;
      }

      /* --- Variant E: the hand lives in the 3D scene, so hide the DOM row.
             Note what this costs: every per-tile <button> and aria-label goes
             with it, replaced by raycast picking on one opaque canvas. --- */
      :is([data-proto-variant="E"], [data-proto-variant="F"], [data-proto-variant="G"]) .game-hand-row {
        display: none;
      }
      .proto-three-mount canvas {
        border-radius: 10px;
      }

      /* --- Variant F: the whole table is the scene. DOM keeps the HUD, the
             action bar, and the NPC plaques; everything tile-shaped is gone. --- */
      .proto-three-board {
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: auto;
      }
      /* The NPC seats stay — portrait, name, wind, turn cue and speech bubbles
         are the hybrid's whole point. Only the tile-shaped DOM goes. */
      :is([data-proto-variant="F"], [data-proto-variant="G"]) [data-proto-discard-sea],
      [data-proto-variant="F"] [data-proto-tutor],
      :is([data-proto-variant="F"], [data-proto-variant="G"]) [data-seat-anchor] .proto-art-face {
        display: none;
      }
      /* G keeps the tutor panel — it IS easy mode's help — but docks it under
         the table instead of letting it sit across the discard sea. */
      [data-proto-variant="G"] [data-proto-tutor] {
        position: absolute;
        left: 50%;
        bottom: 4px;
        transform: translateX(-50%);
        z-index: 4;
        width: min(94%, 36rem);
        max-height: none;
        backdrop-filter: blur(4px);
        border-radius: 10px;
      }
      /* G draws the characters in the scene, so the plaque keeps only the text
         — name, wind, score, turn cue — where DOM stays sharper than a texture. */
      [data-proto-variant="G"] [data-seat-anchor] [data-testid^="portrait-"] {
        display: none;
      }
      /* Plaques sit over a lit 3D table, so give them something to sit on. */
      :is([data-proto-variant="F"], [data-proto-variant="G"]) [data-seat-anchor] {
        pointer-events: auto;
        backdrop-filter: blur(3px);
        border-radius: 12px;
      }

      /* --- Variant G: seats are placed by projecting their 3D position, so the
             DOM rim columns that clipped them in F are retired. --- */
      [data-proto-variant="G"] [data-proto-rim-seat],
      [data-proto-variant="G"] [data-proto-mobile-seats] {
        display: none;
      }
      .proto-seat-layer {
        position: absolute;
        inset: 0;
        z-index: 3;
        pointer-events: none;
      }
      .proto-seat-layer > * {
        position: absolute;
        /* Hangs BELOW its anchor: the anchor is the character's feet, so the
           plaque reads as their nameplate rather than covering their face. */
        transform: translate(-50%, 0);
        pointer-events: auto;
      }
      /* Let clicks through the empty table wrappers to the canvas beneath. */
      [data-proto-variant="F"] .game-table-surface {
        pointer-events: none;
        background: transparent;
      }
      [data-proto-variant="F"] .game-board-root {
        background: #12241d;
      }

      /* --- Switcher chrome (deliberately not part of the design) --- */
      .proto-switcher {
        position: fixed;
        left: 50%;
        bottom: 14px;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 7px 12px;
        border-radius: 999px;
        background: #101014;
        color: #fff;
        border: 1px solid #3a3a44;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
        font: 500 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .proto-switcher button {
        min-width: 26px;
        height: 26px;
        border-radius: 999px;
        background: #26262e;
        color: #fff;
        border: 0;
        cursor: pointer;
      }
      .proto-switcher button:hover { background: #3a3a46; }
      .proto-switcher-label { white-space: nowrap; letter-spacing: 0.02em; }
      .proto-switcher-label strong { color: #ffd166; }
      .proto-switcher-dots { display: flex; gap: 5px; }
      .proto-switcher-dots button {
        min-width: 9px;
        width: 9px;
        height: 9px;
        padding: 0;
        background: #45454f;
      }
      .proto-switcher-dots button.is-on { background: #ffd166; }

      /* On a phone the bottom-centre bar lands on top of the action bar and
         the onboarding CTA. Tuck it into the corner instead. */
      @media (max-width: 700px) {
        .proto-switcher {
          bottom: auto;
          left: auto;
          top: 6px;
          right: 6px;
          transform: none;
          gap: 6px;
          padding: 4px 7px;
          font-size: 10px;
        }
        .proto-switcher-label { display: none; }
      }
    `}</style>
  );
}
