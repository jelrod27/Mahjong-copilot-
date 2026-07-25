import { describe, expect, it } from 'vitest';
import { resolveAiDelays, MIN_DISCARD_DELAY_MS } from '../useGameController';

/**
 * The discard clamp is the one piece of the pacing system with a correctness
 * rationale rather than a taste one: a discard must not resolve before the
 * previous tile has visibly landed (420ms flight + 380ms pool arrival), or
 * turns visibly collide. Before these tests, deleting the clamp outright left
 * the whole suite green.
 *
 * The multiplier values themselves are taste and deliberately NOT asserted —
 * pinning them would make every future retune a test edit.
 */

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const SPEEDS = ['relaxed', 'normal', 'fast'] as const;

/** 420ms flight (TileFlightLayer) + 380ms pool arrival (.animate-tile-arrive). */
const ANIMATION_BUDGET_MS = 800;

describe('resolveAiDelays — the animation floor', () => {
  it('never returns a discard delay below the animation budget, at any combination', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const speed of SPEEDS) {
        const { discard } = resolveAiDelays(difficulty, speed);
        expect(
          discard,
          `${difficulty} at ${speed} must not resolve before the tile lands`,
        ).toBeGreaterThanOrEqual(ANIMATION_BUDGET_MS);
      }
    }
  });

  it('clamps the tightest combination — hard AI at fast speed', () => {
    // hard.discard (550) x fast (0.65) = 357.5ms, well under the budget.
    // Without the clamp this is where tiles would visibly collide.
    expect(resolveAiDelays('hard', 'fast').discard).toBe(MIN_DISCARD_DELAY_MS);
  });

  it('leaves a discard delay that already exceeds the floor untouched', () => {
    // easy.discard (900) at normal (1.0) is above 800, so the clamp must not
    // bind — otherwise every tier would collapse to the same pacing.
    expect(resolveAiDelays('easy', 'normal').discard).toBeGreaterThan(MIN_DISCARD_DELAY_MS);
  });
});

describe('resolveAiDelays — speed and difficulty are independent axes', () => {
  it('makes each speed strictly faster than the one below it, at fixed difficulty', () => {
    const relaxed = resolveAiDelays('easy', 'relaxed');
    const normal = resolveAiDelays('easy', 'normal');
    const fast = resolveAiDelays('easy', 'fast');

    expect(relaxed.draw).toBeGreaterThan(normal.draw);
    expect(normal.draw).toBeGreaterThan(fast.draw);
  });

  it('makes each difficulty faster than the one below it, at fixed speed', () => {
    // Difficulty still carries pacing (harder opponents act quicker), but it
    // is no longer the ONLY control — that separation is the point of the setting.
    const easy = resolveAiDelays('easy', 'normal');
    const hard = resolveAiDelays('hard', 'normal');
    expect(hard.draw).toBeLessThan(easy.draw);
  });

  it('does not clamp the draw leg — nothing animates during a draw', () => {
    // The tightest draw is hard x fast. It is allowed below the animation
    // budget by design; clamping it would make `fast` barely faster at all.
    expect(resolveAiDelays('hard', 'fast').draw).toBeLessThan(ANIMATION_BUDGET_MS);
  });
});
