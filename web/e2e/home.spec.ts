import { test, expect } from '@playwright/test';

const MATCH_STORAGE_KEY = 'mahjong_match_in_progress';

test.describe('Home', () => {
  test('shows the hero pitch and exactly one primary CTA', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('main').getByRole('heading', { name: /real table mahjong/i })
    ).toBeVisible();
    await expect(page.getByText(/coach hints while you play/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /local progress/i })).toBeVisible();
    await expect(page.locator('a[href="/learn"]').filter({ hasText: /lessons across/i })).toBeVisible();

    await expect(page.getByTestId('home-primary-cta')).toHaveCount(1);
  });

  test('first-run visitor sees "Play your first hand"', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/');

    await expect(page.getByTestId('home-primary-cta')).toHaveText('Play your first hand');
  });

  test('a saved game switches the primary CTA to "Resume your match"', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, JSON.stringify({
        match: null,
        game: null,
        savedAt: new Date().toISOString(),
        version: 1,
      }));
    }, MATCH_STORAGE_KEY);
    await page.goto('/');

    await expect(page.getByTestId('home-primary-cta')).toHaveText('Resume your match');
  });

  test('mobile layout still exposes core navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('navigation').getByRole('link', { name: 'Learn' })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Play' })).toBeVisible();
  });
});
