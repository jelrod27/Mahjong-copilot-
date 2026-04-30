import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('shows hero and primary entry points', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('main').getByRole('heading', { name: /16 BIT MAHJONG/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /local progress/i })).toBeVisible();
    await expect(page.locator('a[href="/learn"]').filter({ hasText: /Know Your Tiles/i })).toBeVisible();
  });

  test('mobile layout still exposes core navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('navigation').getByRole('link', { name: 'Learn' })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Play' })).toBeVisible();
  });
});
