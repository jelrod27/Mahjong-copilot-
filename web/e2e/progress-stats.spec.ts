import { test, expect, type Page } from '@playwright/test';

/** Wait for game board to be mounted and turn indicator visible. */
async function expectGameBoardReady(page: Page) {
  await expect(page.getByTestId('game-board-root')).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText(/YOUR TURN|OPPONENT|CLAIM|Waiting for opponent/).first(),
  ).toBeVisible({ timeout: 60_000 });
}

test.describe('Progress tracking', () => {
  test('shows "NO GAMES YET" when no stats exist', async ({ page }) => {
    // Clear any stored stats before navigating
    await page.goto('/progress');
    await page.evaluate(() => localStorage.removeItem('16bit-mahjong-stats'));
    await page.reload();

    await expect(page.getByText('YOUR PROGRESS')).toBeVisible();
    await expect(page.getByText('NO GAMES YET')).toBeVisible();
    await expect(
      page.getByText('Play your first game to start tracking stats!'),
    ).toBeVisible();

    // "PLAY NOW" link should be present
    await expect(page.getByRole('link', { name: /PLAY NOW/i })).toBeVisible();
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
    await expect(page.getByText('YOUR PROGRESS')).toBeVisible();
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
