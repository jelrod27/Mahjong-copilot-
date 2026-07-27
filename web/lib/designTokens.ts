/**
 * Colour tokens mirrored from the `@theme` block in `app/globals.css`.
 *
 * globals.css remains the single source of truth for anything rendered by the
 * browser. This exists only for renderers that cannot read the stylesheet at
 * all — currently Satori, which generates the OG image: it resolves CSS
 * variables declared inside its own render tree, but has no access to the
 * app's external stylesheet, so the values must arrive as literals.
 *
 * `__tests__/designTokens.test.ts` parses globals.css and asserts these match,
 * so the duplication cannot drift silently.
 */
export const TOKENS = {
  background: 'rgb(13, 15, 20)',
  foreground: 'rgb(232, 223, 208)',
  mutedForeground: 'rgb(168, 155, 140)',
  info: 'rgb(91, 159, 168)',
  highlight: 'rgb(232, 197, 90)',
} as const;

/** The `--color-*` custom property each token mirrors. */
export const TOKEN_SOURCE: Record<keyof typeof TOKENS, string> = {
  background: '--color-background',
  foreground: '--color-foreground',
  mutedForeground: '--color-muted-foreground',
  info: '--color-info',
  highlight: '--color-highlight',
};
