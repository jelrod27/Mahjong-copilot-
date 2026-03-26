import { describe, it, expect } from 'vitest';
import { AllLevels, getLevelById } from '../index';

describe('Content Levels', () => {
  it('should have all 6 levels', () => {
    expect(AllLevels).toHaveLength(6);
  });

  it('should have levels with sequential IDs 1-6', () => {
    const ids = AllLevels.map(l => l.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('should include Level 4 (Scoring Fundamentals)', () => {
    const level4 = getLevelById(4);
    expect(level4).toBeDefined();
    expect(level4!.id).toBe(4);
    expect(level4!.title).toContain('Scoring');
  });

  it('Level 4 should have 8 lessons', () => {
    const level4 = getLevelById(4)!;
    expect(level4.lessons).toHaveLength(8);
  });

  it('Level 4 lessons should have sequential IDs starting with 4-', () => {
    const level4 = getLevelById(4)!;
    level4.lessons.forEach((lesson, i) => {
      expect(lesson.id).toBe(`4-${i + 1}`);
    });
  });

  it('every lesson should have title, subtitle, and content', () => {
    for (const level of AllLevels) {
      for (const lesson of level.lessons) {
        expect(lesson.title).toBeTruthy();
        expect(lesson.subtitle).toBeTruthy();
        expect(lesson.content.length).toBeGreaterThan(0);
      }
    }
  });

  it('every quiz question should have valid structure with correctAnswer in options', () => {
    for (const level of AllLevels) {
      for (const lesson of level.lessons) {
        if (lesson.quiz) {
          for (const q of lesson.quiz) {
            expect(q.id).toBeTruthy();
            expect(q.question).toBeTruthy();
            expect(q.options.length).toBeGreaterThanOrEqual(2);
            expect(q.correctAnswer).toBeTruthy();
            expect(q.explanation).toBeTruthy();
            expect(q.options).toContain(q.correctAnswer);
          }
        }
      }
    }
  });

  it('Level 4 should have quiz questions covering scoring concepts', () => {
    const level4 = getLevelById(4)!;
    const allQuizzes = level4.lessons.flatMap(l => l.quiz || []);
    expect(allQuizzes.length).toBeGreaterThanOrEqual(8);
    const allText = allQuizzes.map(q => q.question + ' ' + q.explanation).join(' ');
    expect(allText).toMatch(/fan/i);
    expect(allText).toMatch(/point/i);
  });
});
