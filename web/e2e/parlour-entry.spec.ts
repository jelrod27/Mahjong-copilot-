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

test('the next Parlour challenge is in view on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/parlour');
  const first = page.getByRole('link', { name: 'Continue to Floor 1' });
  await expect(first).toBeInViewport({ ratio: 1 });
  await expect(first).toHaveAttribute('href', '/play/game?floor=1');

  await page.evaluate(() => localStorage.setItem('16bit-mahjong-parlour', JSON.stringify({
    highestCleared: 1, attempts: {}, epilogueUnlocked: false,
  })));
  await page.reload();
  const second = page.getByRole('link', { name: 'Continue to Floor 2' });
  await expect(second).toBeInViewport({ ratio: 1 });
  await second.click();
  await expect(page.getByRole('button', { name: 'Sit down' })).toBeVisible();
  await expect(page).toHaveURL(/floor=2$/);
});
