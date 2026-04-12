import { test, expect } from '@playwright/test';

test.describe('Learn page', () => {
  test('shows 6 levels with titles', async ({ page }) => {
    await page.goto('/learn');
    await expect(page.getByText('LEARN MAHJONG')).toBeVisible();
    await expect(page.getByText('Hong Kong Mahjong')).toBeVisible();

    // The learn page renders AllLevels (6 levels) as cards
    const levelCards = page.locator('.retro-card');
    await expect(levelCards).toHaveCount(6, { timeout: 10_000 });
  });

  test('clicking first level expands to show lessons', async ({ page }) => {
    await page.goto('/learn');

    // First level is always unlocked — click it to navigate to the level page
    const firstLevelLink = page.locator('a[href^="/learn/"]').first();
    await firstLevelLink.click();

    // Should navigate to level detail page showing lessons
    await expect(page).toHaveURL(/\/learn\/\d+/);
    await expect(page.getByText(/LEVEL \d/)).toBeVisible();
    await expect(page.getByText(/lessons/)).toBeVisible();

    // Lessons are rendered as cards within the level page
    const lessonCards = page.locator('.retro-card');
    const count = await lessonCards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Reference page', () => {
  test('shows all 4 tabs', async ({ page }) => {
    await page.goto('/reference');
    await expect(page.getByText('Quick Reference')).toBeVisible();

    // All 4 tab buttons should be visible
    for (const tab of ['Tiles', 'Scoring', 'Hands', 'Glossary']) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible();
    }
  });

  test('Tiles tab shows tile content by default', async ({ page }) => {
    await page.goto('/reference');

    // Tiles tab is active by default
    await expect(page.getByText('TILE COUNT')).toBeVisible();
    await expect(page.getByText('Total: 144 tiles')).toBeVisible();
  });

  test('Scoring tab shows fan table', async ({ page }) => {
    await page.goto('/reference');
    await page.getByRole('button', { name: 'Scoring' }).click();

    await expect(page.getByText('PAYMENT FORMULA')).toBeVisible();
    await expect(page.getByText('FAN TABLE')).toBeVisible();
    await expect(page.getByText('Chicken Hand')).toBeVisible();
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
    await expect(page.getByText('Chow')).toBeVisible();
    await expect(page.getByText('Pung')).toBeVisible();
    await expect(page.getByText('Kong')).toBeVisible();
  });
});

test.describe('Practice page', () => {
  test('shows quiz mode buttons', async ({ page }) => {
    await page.goto('/practice');
    await expect(page.getByText('PRACTICE MODE')).toBeVisible();

    // All 4 practice modes should be shown
    await expect(page.getByText('Tile Quiz')).toBeVisible();
    await expect(page.getByText('Scoring Quiz')).toBeVisible();
    await expect(page.getByText('Hand Recognition')).toBeVisible();
    await expect(page.getByText('Play with Hints')).toBeVisible();
  });

  test('start tile quiz, answer a question, verify feedback', async ({ page }) => {
    await page.goto('/practice');

    // Click Tile Quiz button
    await page.getByText('Tile Quiz').click();

    // Quiz should be active with a question
    await expect(page.getByText('TILE QUIZ')).toBeVisible();
    await expect(page.getByText('IDENTIFY THIS TILE')).toBeVisible();
    await expect(page.getByText(/Question 1 of 10/)).toBeVisible();

    // Click the first answer option
    const options = page.locator('button').filter({ hasText: /Dot|Bamboo|Character|Dragon|Wind|Flower|Season|Bonus/i });
    const firstOption = options.first();
    await firstOption.click();

    // After answering, feedback should appear (checkmark or X) and Next button
    await expect(
      page.getByText('Next Question').or(page.getByText('See Results')),
    ).toBeVisible();
  });
});
