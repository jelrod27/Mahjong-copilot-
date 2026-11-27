import { expect, test } from '@playwright/test';

test('a direct route cannot start or record an attempt at a locked Parlour floor', async ({ page }) => {
  await page.goto('/play/game?floor=9');
  await expect(page.getByRole('heading', { name: 'This floor is locked' })).toBeVisible();
  await expect(page.getByTestId('game-board-root')).toHaveCount(0);
  expect(await page.evaluate(() => ({
    progress: localStorage.getItem('16bit-mahjong-parlour'),
    save: localStorage.getItem('mahjong_match_in_progress:parlour-9'),
  }))).toEqual({ progress: null, save: null });
  await page.getByRole('link', { name: 'Back to the Jade Parlour' }).click();
  await page.getByTestId('parlour-floor-1').getByRole('link', { name: 'Challenge' }).click();
  await expect(page.getByRole('button', { name: 'Sit down' })).toBeVisible();
});
