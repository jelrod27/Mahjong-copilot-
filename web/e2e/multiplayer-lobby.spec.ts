import { test, expect } from '@playwright/test';

test.describe('Multiplayer deferred scope', () => {
  test('navigate from /play to deferred multiplayer page', async ({ page }) => {
    await page.goto('/play');

    await page.getByRole('button', { name: /MULTIPLAYER/i }).click();
    await expect(page).toHaveURL(/\/play\/lobby/);
    await expect(page.getByText('Online rooms are deferred')).toBeVisible();
  });

  test('play lobby explains multiplayer is deferred', async ({ page }) => {
    await page.goto('/play/lobby');

    await expect(page.getByText('MULTIPLAYER LATER')).toBeVisible();
    await expect(page.getByText('Online rooms are deferred')).toBeVisible();
    await expect(page.getByRole('link', { name: /PLAY SOLO/i })).toBeVisible();
  });

  test('legacy multiplayer lobby route stays non-crashing and deferred', async ({ page }) => {
    await page.goto('/multiplayer/lobby');

    await expect(page.getByText('Online Mahjong is coming later')).toBeVisible();
    await expect(page.getByText(/No login wall/i)).toBeVisible();
  });
});
