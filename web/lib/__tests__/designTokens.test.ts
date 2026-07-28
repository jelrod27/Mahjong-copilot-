import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TOKENS, TOKEN_SOURCE } from '../designTokens';

/**
 * The OG image is rendered by Satori, which cannot read the app's stylesheet,
 * so a handful of colours are duplicated into TypeScript. Duplication that
 * nothing checks is how the "Full Game" level and the wrong fan numbers
 * survived, so this parses globals.css and asserts the two agree.
 */

const CSS = fs.readFileSync(
  path.join(__dirname, '..', '..', 'app', 'globals.css'),
  'utf-8',
);

/** `--color-x: rgb(1 2 3);` → `rgb(1, 2, 3)`, the form Satori needs. */
function cssToken(name: string): string | null {
  const match = CSS.match(new RegExp(`${name}:\\s*rgb\\(([^)]+)\\)`));
  if (!match) return null;
  const parts = match[1].trim().split(/[\s,]+/).slice(0, 3);
  return `rgb(${parts.join(', ')})`;
}

describe('design tokens mirrored for Satori', () => {
  it.each(Object.keys(TOKENS) as (keyof typeof TOKENS)[])(
    '%s matches its --color-* value in globals.css',
    key => {
      const fromCss = cssToken(TOKEN_SOURCE[key]);
      expect(fromCss, `${TOKEN_SOURCE[key]} not found in globals.css`).not.toBeNull();
      expect(TOKENS[key]).toBe(fromCss);
    },
  );

  it('maps every token to a source custom property', () => {
    expect(Object.keys(TOKEN_SOURCE).sort()).toEqual(Object.keys(TOKENS).sort());
  });
});
