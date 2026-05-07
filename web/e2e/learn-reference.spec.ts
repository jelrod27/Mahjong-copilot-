import { test, expect } from '@playwright/test';

test.describe('Learn page', () => {
  test('shows learning path and level cards', async ({ page }) => {
    await page.goto('/learn');
    await expect(page.getByText('LEARN MAHJONG')).toBeVisible();
    await expect(page.getByText('Hong Kong Mahjong')).toBeVisible();
    await expect(page.getByText('YOUR PATH')).toBeVisible();

    const levelCards = page.getByTestId('learn-level-card');
    await expect(levelCards).toHaveCount(6, { timeout: 10_000 });
    await expect(levelCards.first()).toContainText('Know Your Tiles');
    await expect(page.getByText(/Locked — complete/)).toHaveCount(5);
  });

  test('clicking first level expands to show lessons', async ({ page }) => {
    await page.goto('/learn');

    const firstLevelLink = page.locator('a[href^="/learn/"]').first();
    await firstLevelLink.click();

    await expect(page).toHaveURL(/\/learn\/\d+/);
    await expect(page.getByText(/LEVEL/i).first()).toBeVisible();
    await expect(page.getByText(/lessons/i).first()).toBeVisible();

    const lessonCards = page.locator('.retro-card');
    const count = await lessonCards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Reference page', () => {
  test('shows all 4 tabs', async ({ page }) => {
    await page.goto('/reference');
    await expect(page.getByText('Quick Reference')).toBeVisible();

    for (const tab of ['Tiles', 'Scoring', 'Hands', 'Glossary']) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible();
    }
  });

  test('Tiles tab shows tile content by default', async ({ page }) => {
    await page.goto('/reference');

    await expect(page.getByText('TILE COUNT')).toBeVisible();
    await expect(page.getByText('Total: 144 tiles')).toBeVisible();
  });

  test('Scoring tab shows fan table', async ({ page }) => {
    await page.goto('/reference');
    await page.getByRole('button', { name: 'Scoring' }).click();

    await expect(page.getByText('PAYMENT FORMULA')).toBeVisible();
    await expect(page.getByText('FAN TABLE')).toBeVisible();
    // "Chicken Hand" is intentionally rendered twice on the Scoring tab
    // (once in the FAN TABLE, once as a row label in the PAYMENT TABLE),
    // so we just assert at least one is visible.
    await expect(page.getByText('Chicken Hand').first()).toBeVisible();
  });

  test('Hands tab shows limit hands', async ({ page }) => {
    await page.goto('/reference');
    await page.getByRole('button', { name: 'Hands' }).click();

    await expect(page.getByText('LIMIT HANDS')).toBeVisible();
    await expect(page.getByText('Thirteen Orphans')).toBeVisible();
    await expect(page.getByText('Nine Gates')).toBeVisible();
  });

  test('Glossary tab shows mahjong terms', async ({ page }) => {
    await page.goto('/reference');
    await page.getByRole('button', { name: 'Glossary' }).click();

    await expect(page.getByText(/\d+ terms/)).toBeVisible();
    // Exact-match to avoid matching the word "chow" inside other entries'
    // definitions (e.g. "A valid set of tiles: chow, pung, or kong.").
    await expect(page.getByText('Chow', { exact: true })).toBeVisible();
    await expect(page.getByText('Pung', { exact: true })).toBeVisible();
    await expect(page.getByText('Kong', { exact: true })).toBeVisible();
  });
});

test.describe('Practice page', () => {
  test('shows quiz mode buttons', async ({ page }) => {
    await page.goto('/practice');
    // Header label + heading — "PRACTICE" is the eyebrow, "Sharpen Your
    // Skills" is the h1 after the menu redesign.
    await expect(page.getByText('PRACTICE', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sharpen Your Skills' })).toBeVisible();

    await expect(page.getByText('Tile Quiz')).toBeVisible();
    await expect(page.getByText('Scoring Quiz')).toBeVisible();
    await expect(page.getByText('Hand Recognition')).toBeVisible();
    await expect(page.getByText('Play with Hints')).toBeVisible();
  });

  test('start tile quiz, answer a question, verify feedback', async ({ page }) => {
    await page.goto('/practice');

    await page.getByTestId('practice-card-tile-quiz').click();

    await expect(page.getByText('TILE QUIZ')).toBeVisible();
    // After PRACTICE-03 the round mixes three prompt types; the header is one of three.
    await expect(
      page
        .getByText('IDENTIFY THIS TILE')
        .or(page.getByText('WHAT IS THIS TILE?'))
        .or(page.getByText('PICK THE MATCHING TILE')),
    ).toBeVisible();
    await expect(page.getByText(/Question 1 of 10/)).toBeVisible();

    // Click the first answer option. For description-to-name and image-to-name
    // these are text buttons; for name-to-image they are tile buttons. Both
    // route to the same feedback panel.
    const optionButtons = page.locator(
      'button[aria-label^="Tile option:"], button:has-text("Dot"), button:has-text("Bamboo"), button:has-text("Character"), button:has-text("Dragon"), button:has-text("Wind"), button:has-text("Flower"), button:has-text("Season"), button:has-text("Bonus")',
    );
    await optionButtons.first().click();

    await expect(
      page.getByText('Next Question').or(page.getByText('See Results')),
    ).toBeVisible();
  });
});
