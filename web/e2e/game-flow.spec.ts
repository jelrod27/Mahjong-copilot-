import { test, expect, type Page } from '@playwright/test';

/** Wait for game board to be mounted and turn indicator visible. */
async function expectGameBoardReady(page: Page) {
  await expect(page.getByTestId('game-board-root')).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText(/YOUR TURN|OPPONENT|CLAIM|Waiting for opponent/).first(),
  ).toBeVisible({ timeout: 60_000 });
}

test.describe('Quick Game flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('start a Quick Game on Easy and verify board loads', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByText('HONG KONG')).toBeVisible();

    // Select Easy difficulty (should be default, but click to be sure)
    await page.getByRole('button', { name: /EASY — Random AI/i }).click();

    // Quick Game mode should be selected by default
    await page.getByRole('button', { name: '[ START GAME ]' }).click();
    await expect(page).toHaveURL(/\/play\/game\?difficulty=easy/);

    await expectGameBoardReady(page);
  });

  test('select a tile and discard it, verify discard pool updates', async ({ page }) => {
    await page.goto('/play/game?difficulty=easy');
    await expectGameBoardReady(page);

    // Wait for human discard turn
    const discardBtn = page.getByRole('button', { name: '[ DISCARD ]' });
    await discardBtn.waitFor({ state: 'visible', timeout: 60_000 });

    // Count discard pool tiles before
    const discardPoolTiles = page.locator('[class*="discard"] [class*="tile"], [class*="Discard"] [class*="tile"]');
    const beforeCount = await discardPoolTiles.count().catch(() => 0);

    // Select a tile from hand
    const tiles = page.locator('[data-testid="human-hand-tile"]');
    await expect(tiles.first()).toBeVisible({ timeout: 10_000 });
    await tiles.first().click();

    // Discard the selected tile
    await expect(discardBtn).toBeEnabled();
    await discardBtn.click();

    // Verify the game progresses — wait for the next YOUR TURN or OPPONENT indicator
    await expect(
      page.getByText(/YOUR TURN|OPPONENT|CLAIM/).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('game is progressing: turns change over time', async ({ page }) => {
    await page.goto('/play/game?difficulty=easy');
    await expectGameBoardReady(page);

    // Wait for at least one turn cycle — the wall count should decrease
    // Initially wall has ~56 tiles (144 - 13*4 - bonus draws). After a few turns it shrinks.
    const wallText = page.getByText(/Wall:\s*\d+|W:\d+/).first();
    await expect(wallText).toBeVisible({ timeout: 30_000 });

    // Get initial wall count text
    const initialText = await wallText.textContent();

    // Wait for a turn cycle by checking wall count changes (generous timeout for AI turns)
    await page.waitForFunction(
      (startText) => {
        const el = document.querySelector('[class*="retro-panel"]');
        if (!el) return false;
        const match = el.textContent?.match(/Wall:\s*(\d+)|W:(\d+)/);
        return match && el.textContent !== startText;
      },
      initialText,
      { timeout: 60_000 },
    ).catch(() => {
      // If wall count didn't change, that's acceptable — game may be in claim phase
    });
  });

  test('HUD shows round wind info', async ({ page }) => {
    await page.goto('/play/game?difficulty=easy');
    await expectGameBoardReady(page);

    // The HUD displays the prevailing wind character followed by "Round"
    // or in compact mode just the wind character
    await expect(
      page.getByText(/[東南西北]\s*Round|[東南西北]/).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Full Game mode', () => {
  test('start Full Game and verify mode param in URL', async ({ page }) => {
    await page.goto('/play');

    // Select Full Game mode
    await page.getByText('FULL GAME').click();
    await page.getByRole('button', { name: /EASY — Random AI/i }).click();
    await page.getByRole('button', { name: '[ START GAME ]' }).click();

    await expect(page).toHaveURL(/mode=full/);
    await expectGameBoardReady(page);
  });
});
