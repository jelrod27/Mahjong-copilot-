import { test, expect } from '@playwright/test';

test.describe('Progress tracking', () => {
  test('the completed Daily Hand leads to its result and streak on Progress', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-01-03T12:00:00Z'));
    await page.addInitScript(() => {
      const result = { outcome: 'loss', fan: 0, points: 0, scoreChange: -32 };
      localStorage.setItem('16bit-mahjong-daily', JSON.stringify({
        results: { '2026-01-02': result, '2026-01-03': result }, bestStreak: 4,
      }));
    });
    await page.goto('/');
    const dailyLink = page.getByRole('link', { name: /Daily Hand.*DONE/i });
    await expect(dailyLink).toHaveAttribute('href', '/progress');
    await dailyLink.click();

    const card = page.getByRole('region', { name: 'Daily Hand' });
    await expect(card.getByText('Loss', { exact: true })).toBeVisible();
    await expect(card.getByText('−32 points')).toBeVisible();
    await expect(card.getByText('2 days', { exact: true })).toBeVisible();
    await expect(card.getByText('4 days', { exact: true })).toBeVisible();
    await expect(page.getByText('NO SOLO OR PARLOUR MATCHES YET')).toBeVisible();
  });

  test('shows "NO GAMES YET" when no stats exist', async ({ page }) => {
    // Clear any stored stats before navigating
    await page.goto('/progress');
    await page.evaluate(() => localStorage.removeItem('16bit-mahjong-stats'));
    await page.reload();

    await expect(page.getByRole('heading', { name: 'YOUR PROGRESS' })).toBeVisible();
    await expect(page.getByText('NO GAMES YET')).toBeVisible();
    await expect(
      page.getByText('Play a solo or Parlour match to start tracking match stats.'),
    ).toBeVisible();

    // "PLAY NOW" link should send players back into solo play
    const playNowLink = page.getByRole('link', { name: /PLAY NOW/i });
    await expect(playNowLink).toBeVisible();
    await expect(playNowLink).toHaveAttribute('href', '/play');
    await expect(page.getByRole('link', { name: "Play today's hand" })).toHaveAttribute('href', '/play/game?daily=1');
  });

  test('progress page loads and shows stats structure after games are played', async ({ page }) => {
    // Seed fake stats into localStorage so we can verify the stats UI renders
    await page.goto('/progress');
    await page.evaluate(() => {
      const fakeStats = {
        gamesPlayed: 3,
        gamesWon: 1,
        totalHandsPlayed: 12,
        bestFan: 3,
        bestHandName: 'All Pungs',
        bestHandSource: 'player',
        placementCounts: [1, 1, 1, 0] as [number, number, number, number],
        byDifficulty: {
          easy: { played: 2, won: 1 },
          medium: { played: 1, won: 0 },
          hard: { played: 0, won: 0 },
        },
        byMode: {
          quick: { played: 2, won: 1 },
          full: { played: 1, won: 0 },
        },
      };
      localStorage.setItem('16bit-mahjong-stats', JSON.stringify(fakeStats));
    });
    await page.reload();

    // Stats should now be visible instead of "NO GAMES YET"
    await expect(page.getByRole('heading', { name: 'YOUR PROGRESS' })).toBeVisible();
    await expect(page.getByText('NO GAMES YET')).not.toBeVisible();

    // Core stat cards
    await expect(page.getByText('GAMES')).toBeVisible();
    await expect(page.getByText('WINS')).toBeVisible();
    await expect(page.getByText('AVG PLACE')).toBeVisible();

    // Placement distribution
    await expect(page.getByText('PLACEMENT DISTRIBUTION')).toBeVisible();

    // Best hand section
    await expect(page.getByText('BEST HAND')).toBeVisible();

    // Difficulty breakdown
    await expect(page.getByText('BY DIFFICULTY')).toBeVisible();

    // Mode breakdown
    await expect(page.getByText('BY MODE')).toBeVisible();
  });
});
