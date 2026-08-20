/**
 * PROTOTYPE — throwaway.
 *
 * Rasterises the existing SVG CharacterPortrait rig into textures so the NPCs
 * can live in the 3D scene instead of floating above it as DOM plaques.
 *
 * Deliberately reuses `components/npc/CharacterPortrait` rather than
 * re-authoring the characters: that component is 566 lines of hand-built rig
 * covering every character x emotion, and it stays the single source of truth
 * for what a character looks like. This only turns it into pixels.
 *
 * The rig is cut into four depth slices rather than rasterised whole. A single
 * flat plane facing the camera is a postcard no matter how well it is lit —
 * the README's "cardboard standee" finding. Four slices spaced along z give the
 * silhouette real volume the moment the character turns, which is what the
 * gaze behaviour in ThreeTable makes it do.
 *
 * The slices also pay for the reactions. Emotion is confined to the 'face'
 * slice in the rig, so changing expression re-rasterises one texture of four
 * and the other three stay cached for the session. Rasterising the whole rig
 * per reaction per NPC is what would have made reactive emotion too expensive
 * to use at all.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import { NPCS, type NpcId, type NpcEmotion } from '@/content/npcs';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Depth slices, back to front. Index is the draw order and the z order. */
export const PORTRAIT_LAYERS = ['back', 'body', 'face', 'front'] as const;
export type PortraitLayer = (typeof PORTRAIT_LAYERS)[number];

/**
 * Which `data-layer` groups in the rig each slice claims.
 *
 * Every group the rig emits must be claimed by exactly one slice or it vanishes
 * from the 3D board with no error — the test beside this file pins that. 'aura'
 * rides with 'back' because it is a backdrop; the scene switches it off anyway
 * (a baked halo fights the table's own light) but a slice has to own it.
 */
const LAYER_GROUPS: Record<PortraitLayer, readonly string[]> = {
  back: ['aura', 'back'],
  body: ['body'],
  face: ['face'],
  front: ['front'],
};

/**
 * Slices whose artwork changes with emotion. Only the expression rig does —
 * hair, neck and accessory are fixed per character — and the texture cache
 * leans on that, so `slicesAreEmotionStable` in the tests guards it.
 */
const EMOTION_DEPENDENT: Record<PortraitLayer, boolean> = {
  back: false,
  body: false,
  face: true,
  front: false,
};

/**
 * True when the rig would render an `<img>` rather than its SVG.
 *
 * CharacterPortrait short-circuits to a plain image whenever
 * `portraitImageSet[emotion]` is populated — the documented "round 2 art-swap"
 * path. That markup has no viewBox and no data-layer groups, so slicing it
 * yields four empty documents and the character rasterises to four fully
 * transparent textures: invisible at their seat, with nothing logged. Callers
 * have to know the difference rather than discover it as a missing NPC.
 */
export function hasImageOverride(character: NpcId, emotion: NpcEmotion): boolean {
  return Boolean(NPCS[character]?.portraitImageSet?.[emotion]);
}

/** Renders the portrait component to a standalone SVG document string. */
export function portraitSvg(character: NpcId, emotion: NpcEmotion): string {
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

/** One rig cut into depth slices, with the pixel height derived from its viewBox. */
export interface SlicedPortrait {
  layers: Record<PortraitLayer, string>;
  height: number;
}

/** Every `data-layer` name present in a rendered rig, in document order. */
export function layerNamesIn(markup: string): string[] {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  return Array.from(doc.querySelectorAll('[data-layer]')).map(
    (el) => el.getAttribute('data-layer') as string,
  );
}

/**
 * Cuts one rendered rig into a standalone SVG document per depth slice.
 *
 * Every slice keeps the source `viewBox`, so the slices register exactly on top
 * of one another — without that the layers would drift apart and the parallax
 * would read as the character coming apart.
 *
 * `<defs>` is cloned into every slice rather than left in one: the gradients are
 * referenced by `url(#…)` from several layers at once, and a slice that
 * references a gradient it does not carry paints black. That is the same class
 * of bug as the duplicated-gradient-id one the rig already documents.
 *
 * `width`/`height` are overridden to the intended raster size. The rig renders
 * at its DOM size (160x192 for 'lg'), and rasterising there before scaling up to
 * a 512px texture is exactly the one-bilinear-tap resample that made the tile
 * faces look crunchy. Sizing the document up front makes the browser rasterise
 * the vectors at full texture resolution instead.
 *
 * The derived pixel height is returned rather than left for the caller to
 * recompute: it comes from the rig's own viewBox, and a second hardcoded copy of
 * that ratio agrees only while framing is 'bust' ('face' framing is square).
 */
export function sliceSvg(markup: string, size: number): SlicedPortrait {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = doc.documentElement;
  const defs = root.querySelector('defs');

  const viewBox = root.getAttribute('viewBox') ?? '0 0 200 240';
  const [, , vbW, vbH] = viewBox.split(/\s+/).map(Number);
  const height = Math.round((size * vbH) / vbW);

  const layers = {} as Record<PortraitLayer, string>;
  for (const layer of PORTRAIT_LAYERS) {
    const claimed = LAYER_GROUPS[layer];
    const groups = Array.from(root.querySelectorAll('[data-layer]')).filter((el) =>
      claimed.includes(el.getAttribute('data-layer') as string),
    );
    const body = groups.map((g) => g.outerHTML).join('');
    layers[layer] =
      `<svg xmlns="${SVG_NS}" viewBox="${viewBox}" width="${size}" height="${height}">` +
      (defs ? defs.outerHTML : '') +
      body +
      `</svg>`;
  }
  return { layers, height };
}

/**
 * Rasterises an SVG document to a canvas.
 *
 * Loads via <img> + onload rather than createImageBitmap: Chrome rejects SVG
 * blobs outright there (see tileArt.ts). The double rAF after load is the guard
 * against the same partially-rasterised SVG race that made honour tiles come out
 * black — an SVG can report loaded before it has painted.
 */
async function rasterise(svg: string, width: number, height: number): Promise<HTMLCanvasElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  try {
    const img = new Image();
    img.width = width;
    img.height = height;
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('portrait svg failed to load'));
    });
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    ctx.drawImage(img, 0, 0, width, height);
  } catch {
    /* prototype: a slice that fails to rasterise just renders empty */
  } finally {
    URL.revokeObjectURL(url);
  }

  return canvas;
}

/**
 * Cache key. Emotion is only part of it for the slice that actually varies with
 * emotion, which is what keeps a reaction down to one rasterisation.
 */
function cacheKey(character: NpcId, emotion: NpcEmotion, layer: PortraitLayer, size: number) {
  return EMOTION_DEPENDENT[layer]
    ? `${character}:${emotion}:${layer}:${size}`
    : `${character}:${layer}:${size}`;
}

const canvasCache = new Map<string, Promise<HTMLCanvasElement>>();
/**
 * Sliced documents, keyed by character:emotion:size.
 *
 * Slicing produces all four layers at once, so doing it per layer meant four
 * full `renderToStaticMarkup` passes over the 566-line rig and four DOMParser
 * passes to keep one document and throw three away — twelve of each for a
 * three-character table. Cached at the set level, three quarters of that goes.
 */
const sliceCache = new Map<string, SlicedPortrait>();

function slicesFor(character: NpcId, emotion: NpcEmotion, size: number): SlicedPortrait {
  const key = `${character}:${emotion}:${size}`;
  let sliced = sliceCache.get(key);
  if (!sliced) {
    sliced = sliceSvg(portraitSvg(character, emotion), size);
    sliceCache.set(key, sliced);
  }
  return sliced;
}

/** One depth slice of a character, rasterised and cached. */
export function renderPortraitLayer(
  character: NpcId,
  emotion: NpcEmotion,
  layer: PortraitLayer,
  size = 512,
): Promise<HTMLCanvasElement> {
  const key = cacheKey(character, emotion, layer, size);
  let pending = canvasCache.get(key);
  if (!pending) {
    const sliced = slicesFor(character, emotion, size);
    // Height comes from the slicer, which derived it from the rig's own
    // viewBox. Hardcoding `size * 1.2` here duplicated that ratio in a second
    // place: the two agree only while framing is 'bust', and 'face' framing is
    // square, so any viewBox change would have stretched every character with
    // no test able to see it.
    pending = rasterise(sliced.layers[layer], size, sliced.height);
    canvasCache.set(key, pending);
  }
  return pending;
}

/** All four slices of a character, back to front. */
export function renderPortraitLayers(
  character: NpcId,
  emotion: NpcEmotion,
  size = 512,
): Promise<HTMLCanvasElement[]> {
  return Promise.all(
    PORTRAIT_LAYERS.map((layer) => renderPortraitLayer(character, emotion, layer, size)),
  );
}

/** Test seam: the caches are module-level and would leak between cases. */
export function clearPortraitCache() {
  canvasCache.clear();
  sliceCache.clear();
}
