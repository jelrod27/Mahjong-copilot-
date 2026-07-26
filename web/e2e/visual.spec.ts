import { test, expect, type Page } from '@playwright/test';

/**
 * Visual regression snapshots (plan 024).
 *
 * Why this file exists: the Tailwind v4 migration (plan 022) shipped with
 * every font in the app silently falling back to Times — Inter and Plus
 * Jakarta Sans never loaded. Lint passed, typecheck passed, unit tests
 * passed, `npm run build` passed, and a computed-style diff between
 * before/after reported "byte-identical" because it compared colors and
 * radii but never checked `fontFamily`. Only a human reviewer looking at the
 * rendered page caught it. Pixel screenshots are the automated stand-in for
 * that glance — they pin what pages actually render as, not just what design
 * tokens resolve to on paper. Do not delete these to speed up CI: that is
 * exactly the class of regression nothing else here would catch.
 *
 * No `/play/game` board snapshot: it was tried (masking hand tiles, opponent
 * seats, wall count, the tutor tip, and the bonus-flower chip, plus
 * prefers-reduced-motion to freeze animation) and still failed on a plain
 * re-run with no code changes. The tutor tip's message text is computed from
 * the randomly dealt hand and wraps to a different number of lines run to
 * run; because the column it sits in is vertically centered
 * (`flex-1 ... justify-center`), that height change reflows every sibling
 * around it. Masking hides content, not position, so this is a genuine
 * layout-shift problem, not a pixel-tolerance one — fixing it for real would
 * mean giving the app a seeded/deterministic deal or a fixed-height tutor
 * slot, both application-code changes out of scope for this plan. A flaky
 * check trains people to ignore red, so it was dropped rather than shipped.
 */

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 812 },
} as const;

/** Wait for web fonts to settle so the same page renders identically run to run. */
async function waitForFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

test.describe('Visual regression', () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`landing page — ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => window.localStorage.clear());
      await page.goto('/');
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
      await waitForFonts(page);

      await expect(page).toHaveScreenshot(`landing-${name}.png`, { maxDiffPixelRatio: 0.02 });
    });

    test(`learn page — ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => window.localStorage.clear());
      await page.goto('/learn');
      await expect(page.getByText('Hong Kong Mahjong')).toBeVisible();
      await waitForFonts(page);

      await expect(page).toHaveScreenshot(`learn-${name}.png`, { maxDiffPixelRatio: 0.02 });
    });
  }
});
