import { describe, it, expect } from 'vitest';
import {
  PORTRAIT_LAYERS,
  portraitSvg,
  layerNamesIn,
  sliceSvg,
} from '../portraitTexture';
import { NPCS, type NpcId, type NpcEmotion } from '@/content/npcs';

/**
 * The rasteriser needs a browser, but the slicer is pure string -> string and
 * carries the two invariants the 3D NPCs actually depend on:
 *
 *   1. Every data-layer group the rig emits is claimed by exactly one slice.
 *      Miss one and that part of the character silently disappears from the
 *      board — no error, no failing type, just a headless NPC.
 *   2. Only the 'face' slice varies with emotion. The texture cache keys the
 *      other three by character alone, so if a future edit moves an
 *      emotion-driven element out of the face group, reactions would start
 *      showing a stale layer.
 */

const CHARACTERS = Object.keys(NPCS) as NpcId[];
const EMOTIONS: NpcEmotion[] = [
  'idle',
  'thinking',
  'smug',
  'surprised',
  'frustrated',
  'triumphant',
];

describe('portrait layer slicing', () => {
  it('has characters and emotions to exercise', () => {
    expect(CHARACTERS.length).toBeGreaterThan(0);
  });

  it('claims every data-layer group the rig emits', () => {
    for (const character of CHARACTERS) {
      for (const emotion of EMOTIONS) {
        const markup = portraitSvg(character, emotion);
        const emitted = new Set(layerNamesIn(markup));
        expect(emitted.size, `${character}/${emotion} emitted no layer groups`).toBeGreaterThan(0);

        const slices = sliceSvg(markup, 512);
        const claimed = new Set<string>();
        for (const layer of PORTRAIT_LAYERS) {
          for (const name of layerNamesIn(slices[layer])) claimed.add(name);
        }
        for (const name of emitted) {
          expect(claimed.has(name), `layer "${name}" is in no slice`).toBe(true);
        }
      }
    }
  });

  it('puts each group in exactly one slice, never two', () => {
    const markup = portraitSvg(CHARACTERS[0], 'idle');
    const slices = sliceSvg(markup, 512);
    const seen = new Map<string, string>();
    for (const layer of PORTRAIT_LAYERS) {
      for (const name of layerNamesIn(slices[layer])) {
        expect(seen.has(name), `"${name}" is in both ${seen.get(name)} and ${layer}`).toBe(false);
        seen.set(name, layer);
      }
    }
  });

  it('keeps every slice on the source viewBox so the layers register', () => {
    const markup = portraitSvg(CHARACTERS[0], 'idle');
    const sourceViewBox = markup.match(/viewBox="([^"]+)"/)![1];
    const slices = sliceSvg(markup, 512);
    for (const layer of PORTRAIT_LAYERS) {
      expect(slices[layer]).toContain(`viewBox="${sourceViewBox}"`);
    }
  });

  it('carries defs into every slice, so no slice paints a missing gradient black', () => {
    const markup = portraitSvg(CHARACTERS[0], 'idle');
    expect(markup).toContain('<defs>');
    const slices = sliceSvg(markup, 512);
    for (const layer of PORTRAIT_LAYERS) {
      // Serialising a parsed SVG re-declares xmlns on each child, so the tag
      // comes back as `<defs xmlns="...">` rather than a bare `<defs>`.
      expect(slices[layer], `${layer} has no defs`).toContain('<defs');
      expect(slices[layer], `${layer} lost its gradients`).toContain('id="skin-shade-');
    }
  });

  it('rasterises at the requested texture size, not the rig DOM size', () => {
    const slices = sliceSvg(portraitSvg(CHARACTERS[0], 'idle'), 512);
    for (const layer of PORTRAIT_LAYERS) {
      expect(slices[layer]).toContain('width="512"');
      expect(slices[layer]).toContain('height="614"');
    }
  });

  it('confines emotion to the face slice', () => {
    const stable = PORTRAIT_LAYERS.filter((l) => l !== 'face');
    for (const character of CHARACTERS) {
      const baseline = sliceSvg(portraitSvg(character, 'idle'), 512);
      for (const emotion of EMOTIONS) {
        const slices = sliceSvg(portraitSvg(character, emotion), 512);
        for (const layer of stable) {
          expect(
            slices[layer],
            `${character}: "${layer}" changed between idle and ${emotion}, so caching it by character alone would show a stale layer`,
          ).toBe(baseline[layer]);
        }
      }
    }
  });

  it('actually varies the face slice with emotion', () => {
    // Guards the previous test from passing vacuously — if slicing returned
    // empty documents, every layer would compare equal.
    const character = CHARACTERS[0];
    const idle = sliceSvg(portraitSvg(character, 'idle'), 512).face;
    const surprised = sliceSvg(portraitSvg(character, 'surprised'), 512).face;
    expect(idle).not.toBe(surprised);
  });
});
