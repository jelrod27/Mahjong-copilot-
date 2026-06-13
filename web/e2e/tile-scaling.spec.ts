import { test, expect, type Page } from '@playwright/test';

/** Viewport sizes used to exercise tile scaling across devices. */
const VIEWPORTS = {
  iphoneSE: { width: 375, height: 667 },
  iphoneXR: { width: 414, height: 896 },
  ipad: { width: 768, height: 1024 },
  laptop720: { width: 1280, height: 720 },
  laptop600: { width: 1280, height: 600 },
  desktop: { width: 1920, height: 1080 },
} as const;

type ViewportName = keyof typeof VIEWPORTS;

/** Navigate to the solo game and wait until the board and human hand tiles are present. */
async function loadGameWithViewport(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto('/play/game?difficulty=easy');

  const boardRoot = page.getByTestId('game-board-root');
  await boardRoot.waitFor({ state: 'visible', timeout: 60_000 });

  const firstTile = page.locator('[data-testid="human-hand-tile"]').first();
  await firstTile.waitFor({ state: 'visible', timeout: 60_000 });

  return firstTile;
}

test.describe('Tile scaling across viewports', () => {
  test('human-hand tile width scales with viewport and stays stable at the same width', async ({ page }) => {
    const widths: Record<ViewportName, number> = {
      iphoneSE: 0,
      iphoneXR: 0,
      ipad: 0,
      laptop720: 0,
      laptop600: 0,
      desktop: 0,
    };

    for (const [name, viewport] of Object.entries(VIEWPORTS) as [ViewportName, { width: number; height: number }][]) {
      const firstTile = await loadGameWithViewport(page, viewport);
      const box = await firstTile.boundingBox();
      expect(box).not.toBeNull();
      widths[name] = box!.width;
      // eslint-disable-next-line no-console
      console.log(`Tile width at ${viewport.width}x${viewport.height}: ${widths[name]}px`);
    }

    // Tile width should grow meaningfully from the smallest mobile viewport to desktop.
    // Use a loose floor now; tighten after the CSS fix lands.
    const desktopToMobileRatio = widths.desktop / widths.iphoneSE;
    expect(
      desktopToMobileRatio,
      `Expected desktop tile width (${widths.desktop}px) to be > 1.4x iPhone SE tile width (${widths.iphoneSE}px), but ratio was ${desktopToMobileRatio.toFixed(2)}x`
    ).toBeGreaterThan(1.4);

    // Same width with less vertical space should not shrink tiles by more than 5%.
    // This is the exact regression reported: compressed laptop height causes tiles to scale down.
    const compressedRatio = widths.laptop600 / widths.laptop720;
    expect(
      compressedRatio,
      `Expected 1280x600 tile width (${widths.laptop600}px) to be within 5% of 1280x720 tile width (${widths.laptop720}px), but ratio was ${compressedRatio.toFixed(3)}`
    ).toBeGreaterThanOrEqual(0.95);
  });
});
