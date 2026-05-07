import { describe, expect, it } from 'vitest';
import { GLOSSARY, findGlossaryEntry } from '../glossary';

describe('glossary content', () => {
  it('contains the PRD MVP terms', () => {
    const required = [
      'Wall', 'Fan', 'Chow', 'Pung', 'Kong',
      'Tenpai', 'Shanten', 'Wind', 'Dragon', 'Meld', 'Claim',
    ];
    for (const term of required) {
      expect(findGlossaryEntry(term), `glossary missing ${term}`).not.toBeNull();
    }
  });

  it('every entry has a non-empty Chinese rendering and a definition', () => {
    for (const entry of GLOSSARY) {
      expect(entry.term.length, `term name empty for ${JSON.stringify(entry)}`).toBeGreaterThan(0);
      expect(entry.chinese.length, `chinese empty for ${entry.term}`).toBeGreaterThan(0);
      expect(entry.definition.length, `definition empty for ${entry.term}`).toBeGreaterThan(0);
    }
  });
});

describe('findGlossaryEntry', () => {
  it('matches by exact term name', () => {
    expect(findGlossaryEntry('Wall')?.term).toBe('Wall');
  });

  it('matches case- and whitespace-insensitively', () => {
    expect(findGlossaryEntry(' wall ')?.term).toBe('Wall');
    expect(findGlossaryEntry('TENPAI')?.term).toBe('Tenpai');
  });

  it('matches by alias', () => {
    // "Flower" is an alias for "Bonus Tile" — the in-game flower indicator
    // shows "🌸" but the glossary entry is named after the canonical term.
    expect(findGlossaryEntry('Flower')?.term).toBe('Bonus Tile');
    expect(findGlossaryEntry('Faan')?.term).toBe('Fan');
  });

  it('returns null for unknown terms', () => {
    expect(findGlossaryEntry('Riichi')).toBeNull();
    expect(findGlossaryEntry('')).toBeNull();
  });
});
