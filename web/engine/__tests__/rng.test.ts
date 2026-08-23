import { describe, it, expect } from 'vitest';
import { createRng, deterministicNoise, shuffleInPlace, randomSeed } from '../rng';

describe('randomSeed', () => {
  it('is available in this runtime', () => {
    // randomSeed relies on the `crypto` global rather than an import so the
    // module stays dependency-free. If that global is missing anywhere the
    // engine runs — browser, Node, Workers — every unseeded game throws.
    expect(typeof randomSeed()).toBe('string');
  });

  it('does not repeat across many calls', () => {
    const seeds = new Set(Array.from({ length: 1000 }, () => randomSeed()));
    expect(seeds.size).toBe(1000);
  });

  it('carries no timestamp an observer could narrow the search with', () => {
    // The old implementation embedded Date.now() in base 36, which let anyone
    // who knew roughly when a hand started guess the seed and so the shuffle.
    const now = Date.now().toString(36);
    const prefix = now.slice(0, 5);
    const seeds = Array.from({ length: 200 }, () => randomSeed());
    expect(seeds.filter(s => s.includes(prefix))).toEqual([]);
  });
});

describe('seeded determinism still holds', () => {
  it('the same seed yields the same sequence', () => {
    const a = createRng('fixed-seed');
    const b = createRng('fixed-seed');
    expect(Array.from({ length: 20 }, () => a())).toEqual(
      Array.from({ length: 20 }, () => b()),
    );
  });

  it('the same seed yields the same shuffle', () => {
    const items = () => Array.from({ length: 50 }, (_, i) => i);
    expect(shuffleInPlace(items(), createRng('shuffle-seed')))
      .toEqual(shuffleInPlace(items(), createRng('shuffle-seed')));
  });

  it('deterministicNoise is stable for the same parts', () => {
    expect(deterministicNoise('a', 1)).toBe(deterministicNoise('a', 1));
    expect(deterministicNoise('a', 1)).not.toBe(deterministicNoise('a', 2));
  });
});
