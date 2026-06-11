/**
 * AI personality parameters — multipliers layered on top of a skill tier.
 * Characters live in the content layer; the engine only sees numbers.
 * Everything stays inside the no-cheating envelope: personality changes how
 * an AI weighs public information, never what it can see.
 */

import { AIPersonalityParams } from '@/models/GameState';

/**
 * Engine-facing alias of the model-layer params:
 * - claimAppetite — >1 claims aggressively, <1 holds concealed
 * - fanGreed — >1 chases value patterns (one-suit, dragons)
 * - defenseBias — >1 reads danger earlier and folds harder
 * - speedBias — >1 prefers cheap fast hands over slow value
 */
export type AIPersonality = AIPersonalityParams;

export const DEFAULT_PERSONALITY: AIPersonality = {
  claimAppetite: 1,
  fanGreed: 1,
  defenseBias: 1,
  speedBias: 1,
};

/** Clamp helper so corrupted persisted values can't produce absurd AI. */
export function normalizePersonality(p?: Partial<AIPersonality>): AIPersonality {
  const clamp = (v: number | undefined, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(3, Math.max(0.1, v)) : fallback;
  return {
    claimAppetite: clamp(p?.claimAppetite, 1),
    fanGreed: clamp(p?.fanGreed, 1),
    defenseBias: clamp(p?.defenseBias, 1),
    speedBias: clamp(p?.speedBias, 1),
  };
}
