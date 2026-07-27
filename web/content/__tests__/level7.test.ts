import { describe, it, expect } from 'vitest';
import { AllLevels, getLevelById } from '../index';
import { Level7 } from '../level7';
import { NOTEN_PENALTY_PER_NOTEN } from '@/engine/turnManager';

/**
 * Level 7 teaches the turn loop and the claim rules. Shape assertions alone
 * would let eight arbitrary lessons pass, which would defeat the point — the
 * level exists specifically because three rules were untaught anywhere in the
 * curriculum. So this file asserts the contract: the exact navigation chain,
 * and that the three rules are actually present in the text.
 */

/** Concatenated searchable text for one lesson. */
const lessonText = (id: string): string => {
  const lesson = Level7.lessons.find(l => l.id === id)!;
  return [lesson.title, lesson.subtitle, ...lesson.content, ...(lesson.keyTakeaways ?? [])]
    .join(' ')
    .toLowerCase();
};

/** All Level 7 prose, for level-wide topic checks. */
const allText = (): string =>
  Level7.lessons.map(l => lessonText(l.id)).join(' ');

describe('Level 7 — Playing a Hand', () => {
  it('is registered in AllLevels', () => {
    expect(getLevelById(7)).toBeDefined();
  });

  it('has eight lessons', () => {
    expect(Level7.lessons).toHaveLength(8);
  });

  it('numbers its lessons 7-1 through 7-8 in order', () => {
    const ids = Level7.lessons.map(l => l.id);
    expect(ids).toEqual(['7-1', '7-2', '7-3', '7-4', '7-5', '7-6', '7-7', '7-8']);
  });

  it('unlocks after Level 6', () => {
    expect(Level7.unlockRequirement).toBe('Complete Level 6');
  });
});

describe('Level 7 navigation chain', () => {
  // "nextLessonId points at a lesson that exists" would pass a Next button
  // that jumps to the wrong lesson. Assert the actual chain.
  it.each([
    ['7-1', '7-2'],
    ['7-2', '7-3'],
    ['7-3', '7-4'],
    ['7-4', '7-5'],
    ['7-5', '7-6'],
    ['7-6', '7-7'],
    ['7-7', '7-8'],
  ])('links %s to %s', (from, to) => {
    const lesson = Level7.lessons.find(l => l.id === from)!;
    expect(lesson.nextLessonId).toBe(to);
  });

  it('ends the chain at the final lesson', () => {
    const last = Level7.lessons.find(l => l.id === '7-8')!;
    expect(last.nextLessonId).toBeUndefined();
  });
});

describe('Level 7 lesson completeness', () => {
  it.each(Level7.lessons.map(l => [l.id] as const))('%s has body content', id => {
    const lesson = Level7.lessons.find(l => l.id === id)!;
    expect(lesson.content.length).toBeGreaterThan(0);
  });

  it.each(Level7.lessons.map(l => [l.id] as const))('%s has key takeaways', id => {
    const lesson = Level7.lessons.find(l => l.id === id)!;
    expect(lesson.keyTakeaways?.length ?? 0).toBeGreaterThan(0);
  });

  it.each(Level7.lessons.map(l => [l.id] as const))('%s has at least one quiz question', id => {
    const lesson = Level7.lessons.find(l => l.id === id)!;
    expect(lesson.quiz?.length ?? 0).toBeGreaterThan(0);
  });

  it('gives every quiz question a correct answer drawn from its own options', () => {
    for (const lesson of Level7.lessons) {
      for (const q of lesson.quiz ?? []) {
        expect(q.options, `${q.id} options must include its correctAnswer`).toContain(q.correctAnswer);
      }
    }
  });

  it('explains every quiz answer', () => {
    for (const lesson of Level7.lessons) {
      for (const q of lesson.quiz ?? []) {
        expect(q.explanation.length, `${q.id} needs an explanation`).toBeGreaterThan(0);
      }
    }
  });
});

describe('Level 7 required topics', () => {
  // These three rules are the entire reason this level exists. A lesson count
  // cannot prove they were taught; the text has to.

  it('teaches that chow is restricted to the preceding seat', () => {
    const text = lessonText('7-4');
    expect(text).toContain('chow');
    expect(text).toMatch(/immediately before you|player on your left|before you/);
  });

  it('teaches that pung and kong carry no seat restriction', () => {
    expect(lessonText('7-4')).toMatch(/any player|from anyone/);
  });

  it('teaches the full claim priority order', () => {
    const text = lessonText('7-5');
    for (const claim of ['win', 'kong', 'pung', 'chow']) {
      expect(text, `priority lesson must mention ${claim}`).toContain(claim);
    }
  });

  it('teaches the tie-break for equal-priority claims', () => {
    expect(lessonText('7-5')).toMatch(/closest to the discarder/);
  });

  it('teaches that claims skip the players in between', () => {
    expect(lessonText('7-6')).toMatch(/skip/);
  });

  it('teaches the draw-to-14, discard-to-13 turn loop', () => {
    const text = lessonText('7-1');
    expect(text).toContain('13');
    expect(text).toContain('14');
  });

  it('teaches that the dealer keeps the deal on a draw, not only on a win', () => {
    // The easy mistake is teaching "dealer stays on a win" alone. The engine
    // retains the dealer on a drawn hand too (matchManager: dealerWon || isDraw).
    expect(lessonText('7-7')).toMatch(/draw/);
  });
});

describe('Level 7 engine agreement', () => {
  it('quotes the noten penalty the engine actually applies', () => {
    // Imported, not retyped — but assert it reached the prose, so the lesson
    // cannot silently drift to a hardcoded number later.
    expect(allText()).toContain(String(NOTEN_PENALTY_PER_NOTEN));
  });

  it('never states affirmatively that chow can be claimed from any player', () => {
    // Guards the single most common wrong statement about this rule.
    //
    // Must match affirmative constructions only. The lesson legitimately
    // contains the counterfactual "if you COULD chow from anyone, the turn
    // order would barely survive" as motivation for the restriction — a bare
    // /chow from any/ substring check flags that and is useless.
    expect(allText()).not.toMatch(
      /you can chow from any|chow can be (claimed|taken) from any|chow (?:it )?from any(?:one| player)(?:'s)? discard/,
    );
  });
});
