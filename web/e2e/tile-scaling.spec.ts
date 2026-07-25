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

  const lastTile = page.locator('[data-testid="human-hand-tile"]').last();
  await lastTile.waitFor({ state: 'visible', timeout: 60_000 });

  return { firstTile, lastTile };
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

    const lastTileRights: Record<ViewportName, number> = {
      iphoneSE: 0,
      iphoneXR: 0,
      ipad: 0,
      laptop720: 0,
      laptop600: 0,
      desktop: 0,
    };

    for (const [name, viewport] of Object.entries(VIEWPORTS) as [ViewportName, { width: number; height: number }][]) {
      const { firstTile, lastTile } = await loadGameWithViewport(page, viewport);
      const firstBox = await firstTile.boundingBox();
      expect(firstBox).not.toBeNull();
      widths[name] = firstBox!.width;

      const lastBox = await lastTile.boundingBox();
      expect(lastBox).not.toBeNull();
      // The hand wraps to a second row on narrow portrait viewports instead of
      // scrolling horizontally, so the last hand tile's right edge sits within
      // the viewport on its own — no scroll-container clipping needed.
      lastTileRights[name] = lastBox!.x + lastBox!.width;

      // eslint-disable-next-line no-console
      console.log(`Tile width at ${viewport.width}x${viewport.height}: ${widths[name]}px; last tile right edge: ${lastTileRights[name].toFixed(2)}px`);
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

    // The last human-hand tile must not overflow the viewport right edge.
    // A 2px tolerance is allowed for subpixel rounding. This is the regression
    // test for the hand-overflow bug on narrow portrait mobile.
    for (const [name, viewport] of Object.entries(VIEWPORTS) as [ViewportName, { width: number; height: number }][]) {
      const lastTileRight = lastTileRights[name];
      expect(
        lastTileRight,
        `Last human-hand tile right edge at ${name} (${viewport.width}x${viewport.height}) should fit within viewport width (${viewport.width}px), but was ${lastTileRight.toFixed(2)}px`
      ).toBeLessThanOrEqual(viewport.width + 2);
    }
  });

  test('player hand is fully visible on portrait mobile', async ({ page }) => {
    const viewport = { width: 375, height: 812 };
    await page.setViewportSize(viewport);
    await page.goto('/play/game?table=training&mode=quick&difficulty=easy&minFaan=0');

    const boardRoot = page.getByTestId('game-board-root');
    await boardRoot.waitFor({ state: 'visible', timeout: 60_000 });

    const handTiles = page.locator('button[aria-label^="Mahjong tile"]');
    await handTiles.first().waitFor({ state: 'visible', timeout: 60_000 });

    // The 14-tile hand should wrap to two rows rather than scroll or overflow.
    // Assert the behaviour (every tile fully within the viewport), not a
    // specific pixel width.
    const count = await handTiles.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await handTiles.nth(i).boundingBox();
      expect(box).not.toBeNull();
      const tileRight = box!.x + box!.width;
      expect(
        tileRight,
        `Hand tile ${i} right edge should fit within viewport width (${viewport.width}px), but was ${tileRight.toFixed(2)}px`
      ).toBeLessThanOrEqual(viewport.width + 2);
    }
  });
});
