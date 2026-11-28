import { expect, test, type Page } from '@playwright/test';

const SOLO_KEY = 'mahjong_match_in_progress';

function savedSeed(page: Page, key: string) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.game?.seed ?? null, key);
}

test('Daily Hand and Jade Parlour leave the original solo match resumable', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('start-game-button').click();
  await expect.poll(() => savedSeed(page, SOLO_KEY)).not.toBeNull();
  const original = await savedSeed(page, SOLO_KEY);

  await page.goto('/play/game?daily=1');
  await expect(page.getByTestId('game-board-root')).toBeVisible();
  expect(await savedSeed(page, SOLO_KEY)).toBe(original);
  await expect.poll(() => savedSeed(page, `${SOLO_KEY}:daily`)).toMatch(/^daily-/);

  await page.goto('/play/game?floor=1');
  await expect(page.getByRole('button', { name: 'Sit down' })).toBeVisible();
  expect(await savedSeed(page, SOLO_KEY)).toBe(original);
  await expect.poll(() => savedSeed(page, `${SOLO_KEY}:parlour-1`)).not.toBeNull();
  const floor = await savedSeed(page, `${SOLO_KEY}:parlour-1`);
  await page.reload();
  await expect(page.getByTestId('game-board-root')).toBeVisible();
  expect(await savedSeed(page, `${SOLO_KEY}:parlour-1`)).toBe(floor);

  await page.goto('/play');
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByTestId('game-board-root')).toBeVisible();
  expect(await savedSeed(page, SOLO_KEY)).toBe(original);
});
