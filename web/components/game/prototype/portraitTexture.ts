/**
 * PROTOTYPE — throwaway.
 *
 * Rasterises the existing SVG CharacterPortrait rig into a texture so the NPCs
 * can live in the 3D scene instead of floating above it as DOM plaques.
 *
 * Deliberately reuses `components/npc/CharacterPortrait` rather than
 * re-authoring the characters: that component is 566 lines of hand-built rig
 * covering every character x emotion, and it stays the single source of truth
 * for what a character looks like. This just renders it to pixels.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import type { NpcId, NpcEmotion } from '@/content/npcs';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Renders the portrait component to a standalone SVG document string. */
function portraitSvg(character: NpcId, emotion: NpcEmotion): string {
  const markup = renderToStaticMarkup(
    createElement(CharacterPortrait, {
      character,
      emotion,
      size: 'lg',
      framing: 'bust',
      showAura: false, // the scene supplies its own light; a baked halo fights it
    }),
  );
  // renderToStaticMarkup emits the element as it appears in the DOM tree, which
  // has no xmlns — required once the SVG is loaded standalone through an <img>.
  return markup.includes('xmlns=')
    ? markup
    : markup.replace('<svg', `<svg xmlns="${SVG_NS}"`);
}

/**
 * Rasterises a portrait to a canvas at `size` px wide.
 *
 * Loads via <img> + onload rather than createImageBitmap: Chrome rejects SVG
 * blobs outright there (see tileArt.ts). The double rAF after load is the
 * guard against the same partially-rasterised SVG race that made honour tiles
 * come out black — an SVG can report loaded before it has painted.
 */
export async function renderPortraitCanvas(
  character: NpcId,
  emotion: NpcEmotion,
  size = 512,
): Promise<HTMLCanvasElement> {
  const svg = portraitSvg(character, emotion);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.round(size * 1.2); // rig is 200x240
  const ctx = canvas.getContext('2d')!;

  try {
    const img = new Image();
    img.width = canvas.width;
    img.height = canvas.height;
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('portrait svg failed to load'));
    });
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } catch {
    /* prototype: a portrait that fails to rasterise just renders empty */
  } finally {
    URL.revokeObjectURL(url);
  }

  return canvas;
}
