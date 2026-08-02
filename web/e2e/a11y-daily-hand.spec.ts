import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  BOARD_TAB_STOPS,
  CONCEALED_HAND_TILES,
  OPENING_HAND_TILE_STOPS,
  expectVisibleFocusIndicator,
  openDailyHand,
  playDailyHandWithKeyboard,
  readFocus,
  tabUntil,
  waitForActionablePhase,
  walkBoardTabOrder,
} from './helpers/dailyHandKeyboard';

/**
 * Accessibility baseline for the DOM board (issue #114).
 *
 * These specs pin the behaviour the current board already has, so the
 * Three.js slice cannot quietly delete it. They drive the real Daily Hand —
 * real engine, real controller, real AI — and assert on roles, accessible
 * names and where focus actually lands, never on CSS classes or coordinates.
 */

/**
 * Threshold: serious and critical impact fail. Minor/moderate findings are
 * reported in the failure message but do not fail CI, so the gate is
 * meaningful on day one without freezing every cosmetic nit into a baseline.
 */
const FAILING_IMPACTS = new Set(['serious', 'critical']);
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoSeriousViolations(page: Page, phase: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  const failing = results.violations.filter((v) => FAILING_IMPACTS.has(v.impact ?? ''));
  const detail = failing
    .map(
      (v) =>
        `  [${v.impact}] ${v.id} — ${v.help}\n` +
        v.nodes
          .slice(0, 5)
          .map((n) => `      ${n.target.join(' ')}\n        ${n.html.slice(0, 140)}`)
          .join('\n'),
    )
    .join('\n');

  expect(failing, `axe found serious/critical violations at the "${phase}" phase:\n${detail}`).toEqual([]);
}

test.describe('Daily Hand — automated accessibility scanning', () => {
  test('has no serious violations at deal, discard turn, claim window or hand result', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await openDailyHand(page);

    // Phase 1 — initial deal. Flowers for all four players are revealed and
    // replaced inside the opening transition, so this is the settled board.
    await expectNoSeriousViolations(page, 'initial deal');

    // Phase 2 — the player's discard turn, with a tile selected so the armed
    // Discard button and the selected-tile state are both in the tree.
    const tile = await tabUntil(page, 'a tile in the player hand', (f) => f.isHandTile);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('discard-tile-button')).toBeEnabled();
    expect(tile.target.label).toMatch(/^Mahjong tile: /);
    await expectNoSeriousViolations(page, 'player discard turn');

    // Phase 3 — a claim window. Play on with the keyboard until an opponent's
    // discard opens one; the pinned seed reaches this reliably.
    let scannedClaim = false;
    for (let turn = 0; turn < 60 && !scannedClaim; turn++) {
      const phase = await waitForActionablePhase(page);
      if (phase === 'result') break;
      if (phase === 'claim' || phase === 'chow') {
        await expectNoSeriousViolations(page, 'claim window');
        scannedClaim = true;
        break;
      }
      await playDailyHandWithKeyboard(page, { maxTurns: 1 });
    }
    expect(scannedClaim, 'the pinned Daily Hand seed should open a claim window').toBe(true);

    // Phase 4 — the hand result. Finish the hand from wherever the claim scan
    // left off.
    const log = await playDailyHandWithKeyboard(page);
    expect(log.finished, 'the Daily Hand should reach its result dialog').toBe(true);
    await expect(page.getByTestId('daily-result-dialog')).toBeVisible();
    await expectNoSeriousViolations(page, 'hand result');
  });
});

test.describe('Daily Hand — player hand semantics', () => {
  test('every tile in hand is a button that announces its own identity', async ({ page }) => {
    await openDailyHand(page);

    const tiles = page.locator('[data-testid="human-hand-tile"] button');
    await expect(tiles).toHaveCount(OPENING_HAND_TILE_STOPS);

    const labels = await tiles.evaluateAll((els) =>
      els.map((el) => ({
        role: el.tagName,
        label: el.getAttribute('aria-label') ?? '',
      })),
    );

    for (const { role, label } of labels) {
      expect(role, 'tiles must be real buttons, not clickable divs').toBe('BUTTON');
      // "Mahjong tile: Five Character. ..." — identity first, state after.
      expect(label).toMatch(/^Mahjong tile: \S/);
    }

    // Identity is the tile's own name, not a shared placeholder: a hand holds
    // at least a few different tiles.
    const names = new Set(labels.map((l) => l.label.split('.')[0]));
    expect(names.size).toBeGreaterThan(3);
  });

  test('selected, suggested and beginner-assist states are announced on the tile', async ({
    page,
  }) => {
    await openDailyHand(page);

    const tiles = page.locator('[data-testid="human-hand-tile"] button');
    const labelsOf = () =>
      tiles.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));

    // The tutor marks exactly one tile as its suggested discard, and grades
    // every tile GOOD / OK / KEEP. Both reach a screen reader via aria-label.
    const initial = await labelsOf();
    expect(
      initial.filter((l) => l.includes('suggested discard')),
      'the tutor should mark exactly one suggested discard',
    ).toHaveLength(1);
    expect(
      initial.filter((l) => /Beginner Assist: (GOOD|OK|KEEP)/.test(l)).length,
      'every tile should carry a Beginner Assist grade',
    ).toBe(initial.length);

    // Selecting a tile announces the selection on that tile and no other.
    const { target } = await tabUntil(page, 'a tile in the player hand', (f) => f.isHandTile);
    const tileName = target.label.replace(/^Mahjong tile: /, '').split('.')[0];
    await page.keyboard.press('Enter');

    await expect
      .poll(async () => (await labelsOf()).filter((l) => l.includes('selected')).length, {
        message: 'exactly one tile should announce itself as selected',
      })
      .toBe(1);

    const selected = (await labelsOf()).find((l) => l.includes('selected'))!;
    // The announcement keeps the tile's identity and adds the state to it.
    expect(selected).toBe(`Mahjong tile: ${tileName}. selected, Beginner Assist: GOOD.`);
  });

  test('tiles are disabled — and stay identifiable — when it is not the discard turn', async ({
    page,
  }) => {
    await openDailyHand(page);

    // Discard, then wait for the turn to pass to the opponents.
    await playDailyHandWithKeyboard(page, { maxTurns: 1 });
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="discard-tile-button"]'),
      undefined,
      { timeout: 30_000 },
    );

    const tiles = page.locator('[data-testid="human-hand-tile"] button');
    await expect(tiles).toHaveCount(CONCEALED_HAND_TILES);

    const states = await tiles.evaluateAll((els) =>
      els.map((el) => ({
        disabled: (el as HTMLButtonElement).disabled,
        label: el.getAttribute('aria-label') ?? '',
      })),
    );
    for (const s of states) {
      expect(s.disabled, 'tiles are not operable outside the discard turn').toBe(true);
      // Disabled must not mean anonymous — the hand is still readable.
      expect(s.label).toMatch(/^Mahjong tile: /);
    }
  });
});

test.describe('Daily Hand — focus behaviour', () => {
  test('a modal traps focus on open and restores it to its trigger on close', async ({ page }) => {
    await openDailyHand(page);

    const trigger = await tabUntil(
      page,
      'the Wall glossary trigger',
      (f) => f.label === 'What does Wall mean?',
    );
    await expectVisibleFocusIndicator(page, 'the Wall glossary trigger');
    await page.keyboard.press('Enter');

    const modal = page.getByTestId('glossary-modal');
    await expect(modal).toBeVisible();

    // Focus moves into the dialog rather than being left behind it.
    await expect
      .poll(() => modal.evaluate((m) => m.contains(document.activeElement)), {
        message: 'focus should move inside the glossary dialog',
      })
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();

    // ...and comes back to the control that opened it.
    const restored = await readFocus(page);
    expect(restored?.label, 'focus returns to the trigger after the modal closes').toBe(
      trigger.target.label,
    );
  });

  test('focus lands on the result dialog when the hand ends', async ({ page }) => {
    test.setTimeout(300_000);
    await openDailyHand(page);

    const log = await playDailyHandWithKeyboard(page);
    expect(log.finished).toBe(true);

    const dialog = page.getByTestId('daily-result-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Deterministic and documented: the end of a hand puts focus on the
    // result dialog, not back at the top of the document.
    await expect
      .poll(
        async () =>
          dialog.evaluate((d) => d === document.activeElement || d.contains(document.activeElement)),
        { message: 'focus should land on the Daily result dialog when the hand ends' },
      )
      .toBe(true);

    // Both of the dialog's actions are reachable from there by keyboard.
    const share = await tabUntil(page, 'the Share result button', (f) =>
      /Share result|Copied to clipboard/.test(f.label),
    );
    expect(share.target.tag).toBe('BUTTON');
    const home = await tabUntil(page, 'the Back home button', (f) => f.label === 'Back home');
    expect(home.target.tag).toBe('BUTTON');
  });
});

test.describe('Daily Hand — tab order baseline', () => {
  test('the board offers its measured number of tab stops, in a stable order', async ({ page }) => {
    await openDailyHand(page);

    // Must be the first thing to move focus: Chromium resumes sequential
    // navigation from the last focused element.
    const stops = await walkBoardTabOrder(page);

    const readable = stops.map((s) => `${s.tag} "${s.label}"`).join('\n  ');
    expect(
      stops.length,
      `board tab-stop baseline drifted. Walked order was:\n  ${readable}`,
    ).toBe(BOARD_TAB_STOPS);

    const tileStops = stops.filter((s) => s.isHandTile);
    expect(
      tileStops.length,
      'every tile in the opening hand must be its own tab stop',
    ).toBe(OPENING_HAND_TILE_STOPS);

    // Each stop is a real, visible target — not a hidden or zero-size node.
    for (const s of stops) {
      expect(s.visible, `tab stop ${s.tag} "${s.label}" must be visible`).toBe(true);
      expect(s.label.length, `tab stop ${s.tag} must be identifiable`).toBeGreaterThan(0);
    }

    // Tiles come last and are contiguous — the hand is not interleaved with
    // board chrome, so a player can walk their hand without leaving it.
    const firstTile = stops.findIndex((s) => s.isHandTile);
    expect(firstTile).toBeGreaterThan(0);
    expect(stops.slice(firstTile).every((s) => s.isHandTile)).toBe(true);

    // The non-tile controls, in the order a keyboard player meets them.
    expect(stops.slice(0, firstTile).map((s) => s.label)).toEqual([
      'What does Wall mean?',
      'Hide Beginner Assist hints',
      'Mute game sounds',
      'Leave game and return to play menu',
      'Discard pool',
      'Discard tip',
      'Expand faan meter',
      'Expand discard reading',
      'Sort hand by suit and number',
    ]);
  });

  test('every board tab stop paints a visible focus indicator', async ({ page }) => {
    await openDailyHand(page);

    for (let i = 0; i < BOARD_TAB_STOPS; i++) {
      await page.keyboard.press('Tab');
      const f = await readFocus(page);
      expect(f, `tab stop ${i} should focus something inside the board`).not.toBeNull();
      await expectVisibleFocusIndicator(page, `tab stop ${i} (${f?.tag} "${f?.label}")`);
    }
  });

  test('the Discard button joins the tab order only once a tile is selected', async ({ page }) => {
    await openDailyHand(page);

    const discard = page.getByTestId('discard-tile-button');
    await expect(discard).toBeVisible();
    // Visible but disabled, so it is deliberately not a tab stop yet.
    await expect(discard).toBeDisabled();

    const stops = await walkBoardTabOrder(page);
    expect(stops.some((s) => s.testid === 'discard-tile-button')).toBe(false);

    // Selecting a tile arms it, and it sits two stops back from the hand.
    const tile = page.locator('[data-testid="human-hand-tile"] button').first();
    await tile.focus();
    await page.keyboard.press('Enter');
    await expect(discard).toBeEnabled();

    await page.keyboard.press('Shift+Tab');
    expect((await readFocus(page))?.label).toBe('Sort hand by suit and number');
    await page.keyboard.press('Shift+Tab');
    expect((await readFocus(page))?.testid).toBe('discard-tile-button');
  });
});
