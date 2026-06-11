/**
 * Deterministic RNG for the engine.
 *
 * Every game carries a seed; the wall shuffle and all AI randomness derive
 * from it, so a (seed, action-sequence) pair fully determines a game. This
 * powers replays, seeded puzzles, and the Daily Hand.
 */

export type Rng = () => number;

/** 32-bit string hash (FNV-1a). */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good-enough PRNG returning [0, 1). */
export function createRng(seed: string): Rng {
  let a = hashString(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stateless deterministic noise in [0, 1) from arbitrary parts.
 * Lets pure functions (AI decisions) use stable pseudo-randomness without
 * threading an RNG instance: same inputs always produce the same value.
 */
export function deterministicNoise(...parts: (string | number)[]): number {
  // JSON encoding keeps tuples unambiguous (['a|b','c'] vs ['a','b|c'])
  return createRng(JSON.stringify(parts))();
}

/** Fisher-Yates shuffle in place, driven by the given RNG. */
export function shuffleInPlace<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a fresh random seed. The single sanctioned non-deterministic
 * call site in the engine: used only when the caller does not supply a seed.
 */
export function randomSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
