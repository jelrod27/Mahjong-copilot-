import { describe, expect, it } from 'vitest';
import { NPCS, npcForDifficulty, pickVoiceLine, NpcEmotion } from '../npcs';

const ALL_EMOTIONS: NpcEmotion[] = [
  'idle',
  'thinking',
  'smug',
  'surprised',
  'frustrated',
  'triumphant',
];

describe('NPC roster', () => {
  it('has exactly 3 characters', () => {
    expect(Object.keys(NPCS)).toHaveLength(3);
    expect(Object.keys(NPCS).sort()).toEqual(['hana', 'mei', 'yuki']);
  });

  it('every character has a name, archetype, and blurb', () => {
    for (const npc of Object.values(NPCS)) {
      expect(npc.name.length).toBeGreaterThan(0);
      expect(npc.archetype.length).toBeGreaterThan(0);
      expect(npc.blurb.length).toBeGreaterThan(0);
    }
  });

  it('every character has visible visual traits the portrait component needs', () => {
    for (const npc of Object.values(NPCS)) {
      const t = npc.visualTraits;
      expect(['round', 'oval', 'angular']).toContain(t.faceShape);
      expect(['short-bob', 'long-straight', 'long-sleek']).toContain(t.hairStyle);
      expect(t.hairColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.skinColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.eyeColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.blushColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(['earrings', 'glasses', 'choker']).toContain(t.accessory);
      expect(t.auraStops).toHaveLength(2);
    }
  });

  it('every character has at least 3 voice lines for every emotion', () => {
    for (const npc of Object.values(NPCS)) {
      for (const emotion of ALL_EMOTIONS) {
        const lines = npc.voiceLines[emotion];
        expect(lines, `${npc.id} missing ${emotion} lines`).toBeDefined();
        expect(lines.length, `${npc.id}.${emotion} has < 3 lines`).toBeGreaterThanOrEqual(3);
        for (const line of lines) {
          expect(line.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('npcForDifficulty', () => {
  it('maps each difficulty to a distinct NPC', () => {
    expect(npcForDifficulty('easy').id).toBe('mei');
    expect(npcForDifficulty('medium').id).toBe('hana');
    expect(npcForDifficulty('hard').id).toBe('yuki');
  });
});

describe('pickVoiceLine', () => {
  it('returns one of the curated lines for the given emotion', () => {
    const line = pickVoiceLine('mei', 'triumphant', () => 0);
    expect(NPCS.mei.voiceLines.triumphant).toContain(line);
  });

  it('honors a deterministic rng', () => {
    // rng() = 0 picks index 0; rng() = 0.99 picks the last index.
    const first = pickVoiceLine('yuki', 'smug', () => 0);
    const last = pickVoiceLine('yuki', 'smug', () => 0.99);
    expect(first).toBe(NPCS.yuki.voiceLines.smug[0]);
    expect(last).toBe(NPCS.yuki.voiceLines.smug[NPCS.yuki.voiceLines.smug.length - 1]);
  });
});
