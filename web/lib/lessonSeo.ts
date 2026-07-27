import type { Lesson } from '@/content/level1';

/** Google truncates around 155-160 characters; stay just inside it. */
const MAX_DESCRIPTION = 155;

/**
 * Build a lesson's meta description from its own prose.
 *
 * Derived rather than hand-written per lesson: 56 parallel description strings
 * would drift from the lessons they describe, which is the same failure that
 * put a hardcoded "Full Game" in the /learn path and wrong fan numbers in the
 * curriculum. The subtitle is the author's own one-line summary, so it leads;
 * body text fills the remainder.
 */
export function lessonMetaDescription(lesson: Lesson): string {
  const parts = [lesson.subtitle, ...lesson.content]
    // Skip layout blanks and the ALL-CAPS section headers — neither reads as
    // a sentence in a search result.
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => {
      const letters = [...line].filter(c => /[a-z]/i.test(c));
      return letters.length === 0 || !letters.every(c => c === c.toUpperCase());
    });

  // The subtitle is a fragment, not a sentence ("The rule players get wrong
  // most often"), so joining on a bare space runs it into the body text.
  // Terminate any part that does not already end a sentence.
  const punctuate = (line: string) =>
    /[.?!:—]$/.test(line) ? line : `${line}.`;

  let out = '';
  for (const part of parts) {
    const next = out ? `${out} ${punctuate(part)}` : punctuate(part);
    if (next.length > MAX_DESCRIPTION) break;
    out = next;
  }

  // A single opening sentence longer than the budget would leave `out` empty.
  if (!out) {
    const first = parts[0] ?? lesson.title;
    out = first.slice(0, MAX_DESCRIPTION - 1).trimEnd() + '…';
  }

  return out;
}
