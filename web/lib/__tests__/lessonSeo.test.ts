import { describe, it, expect } from 'vitest';
import { AllLevels } from '@/content';
import { lessonMetaDescription } from '../lessonSeo';

describe('lesson meta descriptions', () => {
  const lessons = AllLevels.flatMap(l => l.lessons);

  it('generates one for every lesson', () => {
    for (const lesson of lessons) {
      expect(lessonMetaDescription(lesson).length, lesson.id).toBeGreaterThan(0);
    }
  });

  it('keeps every description within Google’s display limit', () => {
    for (const lesson of lessons) {
      expect(lessonMetaDescription(lesson).length, lesson.id).toBeLessThanOrEqual(155);
    }
  });

  it('gives every lesson a distinct description', () => {
    // The entire defect being fixed was ~70 pages sharing one description.
    const descriptions = lessons.map(lessonMetaDescription);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('excludes ALL-CAPS section headers', () => {
    // "PUNG AND KONG — FROM ANYONE" is a layout header, not a sentence, and
    // reads as shouting in a search result.
    //
    // Checks each lesson against its OWN header lines rather than a generic
    // caps regex — several lessons legitimately use inline caps for emphasis
    // mid-sentence ("DRAGON PUNGS are one of the easiest fans to earn"), and a
    // blanket pattern flags those too.
    const isHeader = (line: string) => {
      const letters = [...line].filter(c => /[a-z]/i.test(c));
      return letters.length > 0 && letters.every(c => c === c.toUpperCase());
    };

    for (const lesson of lessons) {
      const desc = lessonMetaDescription(lesson);
      for (const header of lesson.content.filter(isHeader)) {
        expect(desc, `${lesson.id} leaked header "${header}"`).not.toContain(header);
      }
    }
  });

  it('starts each description with readable prose, not a header', () => {
    for (const lesson of lessons) {
      expect(lessonMetaDescription(lesson)[0], lesson.id).toMatch(/[A-Za-z0-9"'“]/);
    }
  });

  it('does not run the subtitle into the body text', () => {
    const lesson = AllLevels.flatMap(l => l.lessons).find(l => l.id === '7-4')!;
    expect(lessonMetaDescription(lesson)).toContain('most often.');
  });
});
