import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Playwright snapshots are per-platform: a baseline generated on macOS is
 * `-chromium-darwin.png`, CI on ubuntu looks for `-chromium-linux.png`. Only
 * darwin baselines are committed today, so on CI these would fail on a missing
 * file and turn every PR red — the opposite of this suite's purpose.
 *
 * Skip (loudly) when the current platform has no baseline. To enable on CI:
 *   1. on Linux, run
 *        UPDATE_SNAPSHOTS=1 npm run test:e2e -- visual.spec.ts --update-snapshots
 *      (or download the `playwright-snapshots` artifact from any CI run, which
 *      runs exactly that command)
 *   2. commit the resulting `*-chromium-linux.png` files
 * These then run automatically — no code change needed.
 *
 * `UPDATE_SNAPSHOTS=1` is load-bearing, not belt-and-braces — see below.
 */
const SNAPSHOT_PLATFORM = process.platform === 'darwin' ? 'darwin' : 'linux';
const HAS_BASELINES = fs.existsSync(
  path.join(__dirname, 'visual.spec.ts-snapshots', `landing-desktop-chromium-${SNAPSHOT_PLATFORM}.png`),
);

/**
 * A skipped test does not run, and a test that does not run generates no
 * snapshot — so `--update-snapshots` alone cannot bootstrap a platform whose
 * baselines are missing. Without this, the CI bootstrap step below silently
 * produces an empty artifact. Detect update mode and run anyway.
 *
 * Must be an env var, not `process.argv`: Playwright evaluates spec files in
 * worker processes whose argv does not carry the CLI flags. Verified — an
 * argv check reported 4 skipped and wrote 0 baselines; the env var writes 4.
 * So bootstrap with `UPDATE_SNAPSHOTS=1 ... --update-snapshots` (both: the env
 * var un-skips, the flag tells Playwright to write).
 */
const UPDATING_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === '1';

const SHOULD_RUN = HAS_BASELINES || UPDATING_SNAPSHOTS;

/**
 * Visual regression snapshots (plan 024).
 *
 * Why this file exists: the Tailwind v4 migration (plan 022) shipped with
 * every font in the app silently falling back to Times — Noto Sans SC and
 * Noto Serif SC never loaded. Lint passed, typecheck passed, unit tests
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
  test.skip(
    !SHOULD_RUN,
    `No ${SNAPSHOT_PLATFORM} snapshot baselines committed. Generate them on this platform with ` +
      `\`npm run test:e2e -- visual.spec.ts --update-snapshots\` and commit ` +
      `web/e2e/visual.spec.ts-snapshots/.`,
  );

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
