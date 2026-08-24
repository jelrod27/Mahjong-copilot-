import { describe, it, expect, vi } from 'vitest';
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

  it('draws its entropy from the platform CSPRNG', () => {
    // Asserted against a stubbed source rather than by sampling real output.
    // The property that matters is *where* the entropy comes from: the previous
    // implementation embedded Date.now(), so anyone who knew roughly when a
    // hand started could narrow the search. Pinning the source proves that
    // directly, where a statistical check on real seeds could only ever fail
    // probabilistically.
    const spy = vi
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
        const view = array as unknown as Uint32Array;
        view[0] = 0;
        view[1] = 4294967295;
        return array;
      });

    try {
      expect(randomSeed()).toBe(`0-${(4294967295).toString(36)}`);
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      spy.mockRestore();
    }
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

  it('deterministicNoise returns the same value for the same parts', () => {
    expect(deterministicNoise('a', 1)).toBe(deterministicNoise('a', 1));
  });

  it('deterministicNoise separates different parts', () => {
    expect(deterministicNoise('a', 1)).not.toBe(deterministicNoise('a', 2));
  });
});
