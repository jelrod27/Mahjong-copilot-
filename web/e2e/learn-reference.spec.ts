import { test, expect } from '@playwright/test';

test.describe('Learn page', () => {
  test('shows learning path and level cards', async ({ page }) => {
    await page.goto('/learn');
    await expect(page.getByText('LEARN MAHJONG')).toBeVisible();
    await expect(page.getByText('Hong Kong Mahjong')).toBeVisible();
    await expect(page.getByText('YOUR PATH')).toBeVisible();

    const levelCards = page.locator('.retro-card');
    await expect(levelCards).toHaveCount(7, { timeout: 10_000 });
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
    await expect(page.getByRole('cell', { name: 'Chicken Hand' })).toBeVisible();
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
    await expect(page.getByText('Chow', { exact: true })).toBeVisible();
    await expect(page.getByText('Pung', { exact: true })).toBeVisible();
    await expect(page.getByText('Kong', { exact: true })).toBeVisible();
  });
});

test.describe('Practice page', () => {
  test('shows quiz mode buttons', async ({ page }) => {
    await page.goto('/practice');
    await expect(page.getByRole('heading', { name: 'Sharpen Your Skills' })).toBeVisible();

    await expect(page.getByText('Tile Quiz')).toBeVisible();
    await expect(page.getByText('Scoring Quiz')).toBeVisible();
    await expect(page.getByText('Hand Recognition')).toBeVisible();
    await expect(page.getByText('Play with Hints')).toBeVisible();
  });

  test('start tile quiz, answer a question, verify feedback', async ({ page }) => {
    await page.goto('/practice');

    await page.getByText('Tile Quiz').click();

    await expect(page.getByText('TILE QUIZ')).toBeVisible();
    await expect(page.getByText('IDENTIFY THIS TILE')).toBeVisible();
    await expect(page.getByText(/Question 1 of 10/)).toBeVisible();

    const options = page.locator('button').filter({ hasText: /Dot|Bamboo|Character|Dragon|Wind|Flower|Season|Bonus/i });
    await options.first().click();

    await expect(
      page.getByText('Next Question').or(page.getByText('See Results')),
    ).toBeVisible();
  });
});
