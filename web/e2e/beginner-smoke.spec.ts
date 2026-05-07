import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * DX-03 (PRD §5.3): single end-to-end smoke covering the beginner path on a
 * local install with no Supabase env vars. Existing specs cover the same
 * steps in fragments; this one walks the journey coherently and additionally
 * asserts the page never logs a console error or throws — so a future regression
 * that re-introduces a hard Supabase import (or any other crash on the happy
 * path) will fail this test instead of degrading the offline experience silently.
 */

test.describe.configure({ mode: 'serial' });

const IGNORABLE_CONSOLE_NOISE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /\[HMR\]/i,
  // Vercel Analytics's debug script is CSP-blocked in local dev — analytics
  // degrades gracefully and this is unrelated to the offline beginner path.
  /va\.vercel-scripts\.com.*Content Security Policy/i,
];

test.describe('Beginner smoke — offline solo path', () => {
  test('home → play → easy game → tile discard → reference, with no console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (IGNORABLE_CONSOLE_NOISE.some(rx => rx.test(text))) return;
      consoleErrors.push(text);
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // 1. Home page loads (no Supabase env required)
    await page.goto('/');
    await expect(
      page.getByRole('main').getByRole('heading', { name: /16 BIT MAHJONG/i }),
    ).toBeVisible();

    // 2. Navigate to Play (URL-driven; nav widget varies between desktop
    //    sidebar and mobile bottom nav and isn't what this smoke is verifying).
    await page.goto('/play');
    await expect(page.getByText('SELECT DIFFICULTY')).toBeVisible();

    // 3. Start an Easy solo game
    await page.getByRole('button', { name: /EASY — Random AI/i }).click();
    await page.getByRole('button', { name: '[ START GAME ]' }).click();
    await expect(page).toHaveURL(/\/play\/game\?difficulty=easy/);

    // 4. Game board renders the player's hand
    await expect(page.getByTestId('game-board-root')).toBeVisible({ timeout: 60_000 });
    const tiles = page.locator('[data-testid="human-hand-tile"]');
    await expect(tiles.first()).toBeVisible({ timeout: 60_000 });
    const initialTileCount = await tiles.count();
    expect(initialTileCount).toBeGreaterThan(0);

    // 5 + 6. Selecting a tile enables the discard CTA
    const discardBtn = page.getByRole('button', { name: /\[ DISCARD/ });
    await discardBtn.waitFor({ state: 'visible', timeout: 60_000 });
    await tiles.first().click();
    await expect(discardBtn).toBeEnabled();

    // 7. Discarding the selected tile completes the action — the button
    // returns to a disabled state (turn passes / no tile selected).
    await discardBtn.click();
    await expect(discardBtn).toBeDisabled({ timeout: 20_000 });

    // 8. Reference is reachable from the same session
    await page.goto('/reference');
    await expect(page.getByText('Quick Reference')).toBeVisible();
    await expect(page.getByText('TILE COUNT')).toBeVisible();

    // No silent crashes on the beginner path.
    expect(pageErrors, `uncaught page errors during journey: ${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `console errors during journey: ${consoleErrors.join('\n')}`).toEqual([]);
  });
});
