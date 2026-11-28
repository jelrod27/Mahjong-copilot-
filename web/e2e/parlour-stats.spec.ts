import { expect, test } from '@playwright/test';

const FLOOR_SAVE_KEY = 'mahjong_match_in_progress:parlour-1';
const STATS_KEY = '16bit-mahjong-stats';

test('leaving a completed Parlour match records it once without opening the standings', async ({ page }) => {
  await page.goto('/play/game?floor=1');
  await expect(page.getByRole('button', { name: 'Sit down' })).toBeVisible();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), FLOOR_SAVE_KEY)).not.toBeNull();

  // Seed the final hand of an East-round loss from a real game save.
  const finalHandSave = await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    saved.match = {
      ...saved.match,
      handNumber: 4,
      totalHandsPlayed: 3,
      currentDealerIndex: 3,
      initialDealerHasRotated: true,
      playerScores: [300, 700, 500, 500],
    };
    saved.game = { ...saved.game, phase: 'finished', winnerId: 'ai_1' };
    const raw = JSON.stringify(saved);
    localStorage.setItem(key, raw);
    return raw;
  }, FLOOR_SAVE_KEY);

  const readGames = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').gamesPlayed, STATS_KEY);
  await page.reload();
  await page.getByRole('button', { name: 'Back to the Parlour' }).click();
  await expect(page).toHaveURL(/\/parlour$/);
  expect(await readGames()).toBe(1);

  // A stale save of the same final hand must not count the match a second time.
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: FLOOR_SAVE_KEY, raw: finalHandSave });
  await page.goto('/play/game?floor=1');
  await page.getByRole('button', { name: 'Back to the Parlour' }).click();
  expect(await readGames()).toBe(1);
});
