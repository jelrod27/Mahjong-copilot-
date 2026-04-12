import { test, expect, type Page } from '@playwright/test';

/** iPhone SE viewport */
const MOBILE_VIEWPORT = { width: 375, height: 667 };

/** Wait for game board to be mounted and turn indicator visible. */
async function expectGameBoardReady(page: Page) {
  await expect(page.getByTestId('game-board-root')).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText(/YOUR TURN|OPPONENT|CLAIM|Waiting for opponent/).first(),
  ).toBeVisible({ timeout: 60_000 });
}

test.describe('Mobile viewport tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('play page: title and buttons visible at mobile size', async ({ page }) => {
    await page.goto('/play');

    await expect(page.getByText('HONG KONG')).toBeVisible();
    await expect(page.getByText('MAHJONG')).toBeVisible();
    await expect(page.getByRole('button', { name: '[ START GAME ]' })).toBeVisible();

    // Difficulty buttons should be visible
    await expect(page.getByRole('button', { name: /EASY/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /MEDIUM/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /HARD/i })).toBeVisible();
  });

  test('game board renders at mobile size', async ({ page }) => {
    await page.goto('/play/game?difficulty=easy');
    await expectGameBoardReady(page);

    // Game board root should be visible and not overflowing
    const boardRoot = page.getByTestId('game-board-root');
    const box = await boardRoot.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
  });

  test('tiles are visible and tappable at mobile size', async ({ page }) => {
    await page.goto('/play/game?difficulty=easy');
    await expectGameBoardReady(page);

    // Wait for human turn with discard button
    const discardBtn = page.getByRole('button', { name: '[ DISCARD ]' });
    await discardBtn.waitFor({ state: 'visible', timeout: 60_000 });

    // Tiles in hand should be visible
    const tiles = page.locator('[data-testid="human-hand-tile"]');
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);

    // Tap a tile — it should become selected
    await tiles.first().click();
    await expect(discardBtn).toBeEnabled();
  });

  test('reference page tabs work on mobile', async ({ page }) => {
    await page.goto('/reference');
    await expect(page.getByText('Quick Reference')).toBeVisible();

    // All 4 tabs should be visible and tappable
    for (const tab of ['Tiles', 'Scoring', 'Hands', 'Glossary']) {
      const tabBtn = page.getByRole('button', { name: tab });
      await expect(tabBtn).toBeVisible();
      await tabBtn.click();
    }

    // After clicking Glossary (last tab), its content should appear
    await expect(page.getByText(/\d+ terms/)).toBeVisible();
  });

  test('progress page layout does not overflow on mobile', async ({ page }) => {
    await page.goto('/progress');
    await expect(page.getByText('YOUR PROGRESS')).toBeVisible();

    // Check that the page body does not exceed viewport width (no horizontal scroll)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
  });
});
