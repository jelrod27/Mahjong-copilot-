import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe.configure({ mode: 'serial' });

/** GameBoard mounted; turn indicator may still be in dealing transition briefly. */
async function expectGameBoardReady(page: Page) {
  await expect(page.getByTestId('game-board-root')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('game-phase-banner')).toBeVisible({ timeout: 60_000 });
}

async function expectDialogContrast(page: Page) {
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withRules(['color-contrast'])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe('Solo play', () => {
  test('play lobby: pick difficulty and open live game', async ({ page }) => {
    await page.goto('/play');
    await expect(page.getByRole('heading', { name: 'HONG KONG' })).toBeVisible();

    await page.getByRole('button', { name: /MEDIUM — Smart AI/i }).click();
    await page.getByRole('button', { name: /EASY — Random AI/i }).click();
    await page.getByTestId('start-game-button').click();

    await expect(page).toHaveURL(/\/play\/game\?difficulty=easy/);
    await expectGameBoardReady(page);
  });

  test('direct game URL (easy) reaches playable board', async ({ page }) => {
    await page.goto('/play/game?difficulty=easy');
    await expectGameBoardReady(page);
  });

  for (const launch of [
    { testId: 'start-game-button', url: '/play/game?difficulty=easy&mode=quick&minFaan=1', mobile: false },
    { testId: 'training-table-button', url: '/play/game?table=training&mode=quick&difficulty=easy&minFaan=0', mobile: true },
  ]) {
    test(`${launch.testId}: keeps the saved match until replacement is confirmed`, async ({ page }, testInfo) => {
      if (launch.mobile) await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/play/game?difficulty=easy');
      await expectGameBoardReady(page);
      const saveKey = 'mahjong_match_in_progress';
      await expect.poll(() => page.evaluate(key => localStorage.getItem(key), saveKey)).not.toBeNull();
      await page.goto('/play');
      const saved = await page.evaluate(key => localStorage.getItem(key), saveKey);
      expect(saved).not.toBeNull();
      const oldGameId = JSON.parse(saved!).game.id;
      const button = page.getByTestId(launch.testId);

      await button.click();
      const dialog = page.getByRole('dialog', { name: /replace.*saved match/i });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
      await expectDialogContrast(page);
      const replace = dialog.getByRole('button', { name: 'Replace saved match' });
      await replace.hover();
      await replace.evaluate(async button => {
        await Promise.all(button.getAnimations().map(animation => animation.finished));
      });
      await expectDialogContrast(page);
      await page.screenshot({ path: testInfo.outputPath('saved-match-confirmation.png') });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(button).toBeFocused();
      expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(saved);
      await expect(page).toHaveURL(/\/play$/);

      await button.click();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();
      expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(saved);

      await button.click();
      await dialog.getByRole('button', { name: 'Replace saved match' }).click();
      await expect(page).toHaveURL(launch.url);
      await expectGameBoardReady(page);
      await expect.poll(() => page.evaluate(({ key, oldGameId }) => {
        const raw = localStorage.getItem(key);
        const id = raw ? JSON.parse(raw).game?.id : null;
        return typeof id === 'string' && id !== oldGameId;
      }, { key: saveKey, oldGameId })).toBe(true);
    });
  }
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

    const discardBtn = page.getByTestId('discard-tile-button');
    await discardBtn.waitFor({ state: 'visible', timeout: 60_000 });

    const tiles = page.locator('[data-testid="human-hand-tile"]');
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);

    await tiles.first().click();
    await expect(discardBtn).toBeEnabled();
  });
});
