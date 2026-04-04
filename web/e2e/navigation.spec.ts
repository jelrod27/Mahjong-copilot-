import { test, expect } from '@playwright/test';

const mainRoutes: { path: string; expectText: string | RegExp }[] = [
  { path: '/learn', expectText: /LEARN MAHJONG|Hong Kong Mahjong/i },
  { path: '/play', expectText: 'SELECT DIFFICULTY' },
  { path: '/practice', expectText: 'PRACTICE MODE' },
  { path: '/reference', expectText: 'Tile Reference' },
  { path: '/progress', expectText: 'Your Progress' },
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

test.describe('Protected routes', () => {
  for (const path of ['/multiplayer/lobby', '/settings']) {
    test(`${path} redirects unauthenticated users to login (middleware)`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([302, 307, 308], `expected redirect for ${path}`).toContain(res.status());
      const loc = res.headers().location ?? '';
      expect(loc).toMatch(/\/login/);
    });
  }
});
