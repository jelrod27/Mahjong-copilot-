import { test, expect } from '@playwright/test';

const mainRoutes: { path: string; expectText: string | RegExp }[] = [
  { path: '/learn', expectText: /LEARN MAHJONG|Hong Kong Mahjong/i },
  { path: '/play', expectText: 'SELECT DIFFICULTY' },
  { path: '/practice', expectText: 'Sharpen Your Skills' },
  { path: '/reference', expectText: 'Quick Reference' },
  { path: '/progress', expectText: 'Your Progress' },
  { path: '/login', expectText: 'Accounts are paused' },
  { path: '/signup', expectText: 'Account creation is paused' },
  { path: '/profile', expectText: 'Profiles are deferred' },
  { path: '/multiplayer/lobby', expectText: 'Online Mahjong is coming later' },
];

test.describe('Main app routes', () => {
  for (const { path, expectText } of mainRoutes) {
    test(`loads ${path}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${path} should respond`).toBeLessThan(400);
      await expect(page.getByText(expectText).first()).toBeVisible();
    });
  }
});

test.describe('No auth-gated routes in local release', () => {
  for (const path of ['/multiplayer/lobby', '/settings']) {
    test(`${path} loads without auth redirect`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `${path} should not redirect to login`).toBe(200);
    });
  }
});
