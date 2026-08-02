import { test, expect } from '@playwright/test';
import {
  expectFocusWithin,
  expectVisibleFocusIndicator,
  openDailyHand,
  playDailyHandWithKeyboard,
  pointerEventCount,
  readFocus,
} from './helpers/dailyHandKeyboard';

/**
 * The load-bearing promise of issue #114: a player using only a keyboard can
 * complete an entire Daily Hand, and CI proves it.
 *
 * The run uses nothing but Tab, Shift+Tab and Enter. No locator is clicked and
 * no element is focused programmatically, and a pointer-event tripwire
 * installed before navigation counts every trusted mouse/touch/pointer event
 * so the claim is checked rather than asserted.
 */
test.describe('Daily Hand — keyboard only', () => {
  test('completes a full Daily Hand from deal to result without a mouse', async ({ page }) => {
    // A full hand is ~20 human turns paced by the real AI turn runner.
    test.setTimeout(300_000);

    await openDailyHand(page);
    expect(await pointerEventCount(page), 'opening the board must not need a pointer').toBe(0);

    const log = await playDailyHandWithKeyboard(page);

    expect(log.finished, 'the Daily Hand should reach its defined completion state').toBe(true);

    // The player really played: they identified and selected legal tiles and
    // discarded them, turn after turn, rather than letting the auto-discard
    // timer play the hand for them.
    expect(log.discards, 'the player should have discarded on their own turns').toBeGreaterThan(5);
    expect(log.selectedTiles.length).toBe(log.discards);
    for (const label of log.selectedTiles) {
      expect(label, 'each selected tile announced its identity').toMatch(/^Mahjong tile: \S/);
    }

    // Claim opportunities are handled when they occur. The pinned seed opens
    // several; each was reached and operated by keyboard.
    expect(
      log.claimWindows + log.chowWindows,
      'the run should have handled at least one claim window',
    ).toBeGreaterThan(0);

    // The hand is over and its result is on screen.
    const dialog = page.getByTestId('daily-result-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(page.getByRole('button', { name: 'Back home' })).toBeVisible();

    // The proof: not one pointer event in the whole hand.
    expect(await pointerEventCount(page), 'the entire hand was played without a pointer').toBe(0);
  });

  test('the result dialog is dismissable by keyboard and leads somewhere sensible', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await openDailyHand(page);
    const log = await playDailyHandWithKeyboard(page);
    expect(log.finished).toBe(true);

    // Focus is already on the dialog when the hand ends, so Tab walks its own
    // controls rather than the board behind it.
    const dialog = page.getByTestId('daily-result-dialog');
    await expectFocusWithin(page, dialog, 'the hand ending should put focus on the result dialog');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await readFocus(page);
    expect(focused?.label, 'the second stop inside the dialog is Back home').toBe('Back home');
    await expectVisibleFocusIndicator(page, 'the Back home button');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/$|\/\?/);
    expect(await pointerEventCount(page)).toBe(0);
  });
});
