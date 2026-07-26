import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// WCAG 2.x relative luminance / contrast ratio, per
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// Design tokens are authored as `rgb(r g b / <alpha-value>)` strings so
// Tailwind's opacity modifiers keep working. Pull the r/g/b triplet back out
// for luminance math.
function parseRgb(token: string): [number, number, number] {
  const match = token.match(/rgb\((\d+)\s+(\d+)\s+(\d+)/);
  if (!match) {
    throw new Error(`Could not parse rgb() token: ${token}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// Since the Tailwind v4 migration (plan 022), tokens live in the @theme
// block in globals.css rather than tailwind.config.ts — @theme is now the
// single source of truth, so read the value straight from there instead of
// duplicating it.
function readThemeColor(css: string, name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!match) {
    throw new Error(`Could not find --color-${name} in globals.css @theme block`);
  }
  return match[1].trim();
}

describe('elevation ladder contrast (plan 025)', () => {
  const css = readFileSync(join(__dirname, '../app/globals.css'), 'utf-8');
  const background = parseRgb(readThemeColor(css, 'background'));
  const card = parseRgb(readThemeColor(css, 'card'));

  it('gives card a real luminance step off background (>= 1.25:1)', () => {
    // This is the invariant plan 025 exists to establish: before this plan,
    // card vs background measured 1.32:1 nominally but the surrounding
    // tokens were within a 1.35:1 band of each other, reading as flat. The
    // floor here locks in that card is a distinguishable surface, not a
    // re-tint of the same plane.
    expect(contrastRatio(card, background)).toBeGreaterThanOrEqual(1.25);
  });
});
