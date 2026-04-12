import { test, expect } from '@playwright/test';

test.describe('Multiplayer lobby', () => {
  test('navigate from /play to multiplayer lobby', async ({ page }) => {
    await page.goto('/play');

    // Click the MULTIPLAYER button on the play page
    await page.getByRole('button', { name: /MULTIPLAYER/i }).click();
    await expect(page).toHaveURL(/\/play\/lobby/);
  });

  test('lobby shows Create Room and Join Room options', async ({ page }) => {
    await page.goto('/play/lobby');

    await expect(page.getByText('MULTIPLAYER')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /CREATE ROOM/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /JOIN ROOM/i }),
    ).toBeVisible();
  });

  test('clicking Create Room shows room creation form', async ({ page }) => {
    await page.goto('/play/lobby');

    await page.getByRole('button', { name: /CREATE ROOM/i }).click();

    // Should see the create room view with game mode and difficulty options
    await expect(page.getByText('CREATE ROOM').first()).toBeVisible();
    await expect(page.getByText('GAME MODE')).toBeVisible();
    await expect(page.getByText('AI DIFFICULTY')).toBeVisible();

    // Mode buttons
    await expect(page.getByText('QUICK GAME')).toBeVisible();
    await expect(page.getByText('FULL GAME')).toBeVisible();

    // Create and Back buttons
    await expect(page.getByRole('button', { name: /CREATE/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /BACK/i })).toBeVisible();
  });

  test('clicking Join Room shows code entry form', async ({ page }) => {
    await page.goto('/play/lobby');

    await page.getByRole('button', { name: /JOIN ROOM/i }).click();

    // Should see the join room view with code input
    await expect(page.getByText('JOIN ROOM').first()).toBeVisible();
    await expect(page.getByText('ROOM CODE')).toBeVisible();
    await expect(page.getByText('DISPLAY NAME')).toBeVisible();
    await expect(page.getByPlaceholder('XXXXXX')).toBeVisible();
  });

  test('Back button returns to lobby menu', async ({ page }) => {
    await page.goto('/play/lobby');

    // Go to Create view, then back
    await page.getByRole('button', { name: /CREATE ROOM/i }).click();
    await expect(page.getByText('GAME MODE')).toBeVisible();

    await page.getByRole('button', { name: /BACK/i }).first().click();

    // Should be back at the menu with Create/Join options
    await expect(
      page.getByRole('button', { name: /CREATE ROOM/i }),
    ).toBeVisible();
  });

  test.skip('graceful handling when Supabase is not configured', async ({ page }) => {
    // This test is skipped because it requires Supabase to be intentionally
    // unavailable. In CI with fallback env vars, the lobby loads but room
    // creation will fail. This test documents the expected behavior.
    await page.goto('/play/lobby');
    await page.getByRole('button', { name: /CREATE ROOM/i }).click();
    await page.getByRole('button', { name: /CREATE/i }).last().click();

    // Should show an error message rather than crashing
    await expect(page.getByText(/error|failed|unavailable/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
