import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

/** GameBoard mounted; turn indicator may still be in dealing transition briefly. */
async function expectGameBoardReady(page: Page) {
  await expect(page.getByTestId('game-board-root')).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText(/YOUR TURN|OPPONENT|CLAIM|Waiting for opponent/).first(),
  ).toBeVisible({ timeout: 60_000 });
}

test.describe('Solo play', () => {
  test('play lobby: pick difficulty and open live game', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByText('HONG KONG')).toBeVisible();

    await page.getByRole('button', { name: /MEDIUM — Smart AI/i }).click();
    await page.getByRole('button', { name: /EASY — Random AI/i }).click();
    await page.getByRole('button', { name: '[ START GAME ]' }).click();

    await expect(page).toHaveURL(/\/play\/game\?difficulty=easy/);
    await expectGameBoardReady(page);
  });

  test('direct game URL (easy) reaches playable board', async ({ page }) => {
    await page.goto('/play/game?difficulty=easy');
    await expectGameBoardReady(page);
  });
});

test.describe('Practice mode', () => {
  test('menu card opens in-game HUD', async ({ page }) => {
    await page.goto('/practice');
    // Redesigned practice menu: "Play with Hints" is a mode card (button),
    // not a separate setup screen with its own "Start Practice" button.
    const playWithHints = page.getByRole('button', { name: /Play with Hints/i });
    await expect(playWithHints).toBeVisible();
    await playWithHints.click();
    await expectGameBoardReady(page);
  });
});

test.describe('Minimal interaction smoke', () => {
  test('when it is your discard turn, discard button enables after selecting a tile', async ({
    page,
  }) => {
    await page.goto('/play/game?difficulty=easy');
    await expectGameBoardReady(page);

    const discardBtn = page.getByRole('button', { name: '[ DISCARD ]' });
    await discardBtn.waitFor({ state: 'visible', timeout: 60_000 });

    const tiles = page.locator('[data-testid="human-hand-tile"]');
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);

    await tiles.first().click();
    await expect(discardBtn).toBeEnabled();
  });
});
