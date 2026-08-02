import { expect, type Page } from '@playwright/test';

/**
 * Shared fixture + keyboard driver for the Daily Hand accessibility baseline
 * (issue #114). Everything here drives the real game: the engine, controller,
 * AI runner and persistence all run untouched — only the clock and the
 * player-facing game-speed preference are pinned.
 */

/**
 * The Daily Hand's wall and deal derive from a seed built off the UTC date
 * (`dailySeed()` in lib/dailyHand.ts), so the deal is only reproducible when
 * the page clock is pinned.
 *
 * Both calls are required. `clock.install` pins the date the seed is read
 * from; `clock.resume` immediately lets time flow again, because
 * `useGameController` debounces human actions against a 200ms `Date.now()`
 * window — under a frozen clock every action after the first is silently
 * rejected and the hand can never progress.
 */
export const DAILY_FIXTURE_DATE = new Date('2026-03-01T12:00:00Z');

/**
 * Measured tab-order baseline for the pinned Daily Hand seed, walked on the
 * default Desktop Chrome viewport at the opening discard turn with no tile
 * selected. See `e2e/README-a11y-baseline.md` for how these were derived and
 * why the tile count is 14 rather than the 13 quoted in issue #114.
 */
export const BOARD_TAB_STOPS = 23;
/** The dealer opens holding 13 concealed tiles + the drawn 14th, all buttons. */
export const OPENING_HAND_TILE_STOPS = 14;
/** Between turns the human holds a 13-tile concealed hand. */
export const CONCEALED_HAND_TILES = 13;

export type ActionablePhase = 'discard' | 'claim' | 'chow' | 'result';

export interface FocusInfo {
  tag: string;
  testid: string | null;
  /** Accessible-ish label: aria-label, else trimmed text. Used in failure output. */
  label: string;
  isHandTile: boolean;
  inBoard: boolean;
  /** A focus ring is actually painted (UA outline, or a ring via box-shadow). */
  hasVisibleFocusIndicator: boolean;
  visible: boolean;
}

/** Serialised in the page: returns a description of `document.activeElement`. */
function focusProbe() {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body || el.tagName === 'NEXTJS-PORTAL') return null;

  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  // A focus ring counts as painted if the UA draws an outline, or if any
  // box-shadow layer has a non-zero spread and a non-transparent colour —
  // which is how Tailwind's `focus-visible:ring-*` utilities render one.
  const outlineDrawn = cs.outlineStyle !== 'none' && cs.outlineStyle !== 'hidden';
  const shadowRing =
    cs.boxShadow !== 'none' &&
    cs.boxShadow
      .split(/,(?![^(]*\))/)
      .some((raw) => {
        const layer = raw.trim();
        const transparent = /rgba\([^)]*,\s*0\s*\)/.test(layer) || /\/\s*0\s*\)/.test(layer);
        const hasSpread = /\s[1-9]\d*(?:\.\d+)?px(?:\s+inset)?\s*$/.test(layer);
        return hasSpread && !transparent;
      });

  return {
    tag: el.tagName,
    testid: el.getAttribute('data-testid'),
    label: (
      el.getAttribute('aria-label') ??
      (el.innerText || el.textContent || '').trim().slice(0, 60)
    ).replace(/\s+/g, ' '),
    isHandTile: !!el.closest('[data-testid="human-hand-tile"]'),
    inBoard: !!el.closest('[data-testid="game-board-root"]'),
    hasVisibleFocusIndicator: outlineDrawn || shadowRing,
    visible: rect.width > 0 && rect.height > 0,
  };
}

/**
 * Reads whatever currently holds focus. Returns `null` when focus has fallen
 * back to the document body, so callers can tell "nothing is focused" from
 * "something unexpected is focused".
 */
export async function readFocus(page: Page): Promise<FocusInfo | null> {
  return page.evaluate(focusProbe);
}

export function describeFocus(f: FocusInfo | null): string {
  if (!f) return '<no focus / document body>';
  return `${f.tag}${f.testid ? `[${f.testid}]` : ''} "${f.label}"`;
}

/**
 * Asserts the focused control paints a focus ring.
 *
 * Polled rather than sampled once: the board's controls transition their ring
 * in over `duration-fast`, so reading the computed style in the same tick as
 * the Tab press catches a still-transparent ring.
 */
export async function expectVisibleFocusIndicator(page: Page, what: string): Promise<void> {
  await expect
    .poll(async () => (await readFocus(page))?.hasVisibleFocusIndicator ?? false, {
      message: `${what} must paint a visible focus indicator`,
      timeout: 2_000,
    })
    .toBe(true);
}

/**
 * Opens today's Daily Hand with a pinned seed and waits until the board is
 * interactive.
 *
 * Installs a pointer tripwire before any navigation: every trusted
 * pointer/mouse/touch event is counted, so a keyboard-only spec can *prove* it
 * never reached for the mouse rather than merely claiming so.
 */
export async function openDailyHand(
  page: Page,
  opts: { date?: Date; gameSpeed?: 'relaxed' | 'normal' | 'fast' } = {},
): Promise<void> {
  const { date = DAILY_FIXTURE_DATE, gameSpeed = 'fast' } = opts;

  await page.addInitScript((speed) => {
    // `game_speed` is an existing player-facing preference (Settings → Game
    // speed). Choosing the fastest AI pacing keeps a full hand inside a sane
    // CI budget without touching a single game rule.
    localStorage.setItem('game_speed', speed);

    const counter = { pointer: 0, lastType: '' };
    (window as unknown as { __pointerEvents: typeof counter }).__pointerEvents = counter;
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup']) {
      window.addEventListener(
        type,
        (e) => {
          if (e.isTrusted) {
            counter.pointer += 1;
            counter.lastType = type;
          }
        },
        { capture: true },
      );
    }
  }, gameSpeed);

  await page.clock.install({ time: date });
  await page.clock.resume();

  await page.goto('/play/game?daily=1');
  await expect(page.getByTestId('game-board-root')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('discard-tile-button')).toBeVisible({ timeout: 60_000 });
}

/** How many trusted pointer events the page has seen since load. */
export async function pointerEventCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (window as unknown as { __pointerEvents?: { pointer: number } }).__pointerEvents?.pointer ?? 0,
  );
}

/**
 * Walks the board's tab order from the top of a freshly-loaded document.
 *
 * Must run before anything else moves focus: Chromium resumes sequential
 * navigation from the last focused element, and `blur()` does not reset that
 * starting point, so a second walk on the same page silently starts mid-order.
 */
export async function walkBoardTabOrder(page: Page, max = 60): Promise<FocusInfo[]> {
  const stops: FocusInfo[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const f = await readFocus(page);
    if (!f) break; // reached browser chrome / wrapped out of the document
    if (!f.inBoard) continue;
    stops.push(f);
  }
  return stops;
}

/**
 * Presses Tab (or Shift+Tab) until focus lands on the element `match` accepts,
 * asserting it was actually reached and returning the trail of everything
 * focused along the way. Failure output names every stop, so a broken tab
 * order reports where it went instead of just timing out.
 */
export async function tabUntil(
  page: Page,
  what: string,
  match: (f: FocusInfo) => boolean,
  opts: { shift?: boolean; max?: number } = {},
): Promise<{ target: FocusInfo; trail: FocusInfo[] }> {
  const { shift = false, max = 40 } = opts;
  const key = shift ? 'Shift+Tab' : 'Tab';
  const trail: FocusInfo[] = [];

  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    const f = await readFocus(page);
    if (!f) continue; // passed through browser chrome — keep walking
    trail.push(f);
    if (match(f)) return { target: f, trail };
  }

  throw new Error(
    `Never reached ${what} after ${max} ${key} presses.\nFocus trail:\n` +
      trail.map((f, i) => `  ${i}. ${describeFocus(f)}`).join('\n'),
  );
}

/**
 * Blocks until the board offers the human something to do, and says what.
 * Polled inside the page, so waiting out an AI turn costs one round trip
 * rather than dozens and needs no arbitrary sleep.
 */
export async function waitForActionablePhase(
  page: Page,
  timeout = 45_000,
): Promise<ActionablePhase> {
  const handle = await page.waitForFunction(
    () => {
      const q = (sel: string) => document.querySelector(sel);
      if (q('[data-testid="daily-result-dialog"]')) return 'result';
      if (q('[data-testid="chow-pass-button"]')) return 'chow';
      if (q('[data-testid="claim-best-button"]')) return 'claim';
      if (q('[data-testid="discard-tile-button"]')) return 'discard';
      return null;
    },
    undefined,
    { timeout, polling: 50 },
  );
  return (await handle.jsonValue()) as ActionablePhase;
}

export interface PlayLog {
  discards: number;
  claimWindows: number;
  chowWindows: number;
  /** Identity labels of every tile the run selected, in order. */
  selectedTiles: string[];
  /** Controls the run actually operated (each had its focus ring asserted). */
  operated: string[];
  finished: boolean;
}

/**
 * Selects a tile and discards it, using only Tab / Shift+Tab / Enter.
 *
 * The retry is not padding. `useGameController` debounces human actions on a
 * 200ms `Date.now()` window, and the *machine-driven* auto-draw that hands the
 * player their 14th tile goes through that same guard — so a discard confirmed
 * within 200ms of the tile arriving is rejected, and the board answers with a
 * shake and an "invalid" cue. A real player presses again; so does this. The
 * discard must still land, or the helper fails loudly.
 */
async function discardOneTileByKeyboard(page: Page, log: PlayLog): Promise<void> {
  const handBefore = await page.locator('[data-testid="human-hand-tile"]').count();

  const tile = await tabUntil(page, 'a tile in the player hand', (f) => f.isHandTile);
  // The tile announces itself — that identity is what a screen-reader user
  // chooses on, so a silent tile is a failure even if the click would work.
  expect(tile.target.label, 'a hand tile must announce its own identity').toMatch(
    /^Mahjong tile: /,
  );
  await expectVisibleFocusIndicator(page, `hand tile "${tile.target.label}"`);
  await page.keyboard.press('Enter');
  log.selectedTiles.push(tile.target.label);
  log.operated.push(tile.target.label);

  const discardButton = page.getByTestId('discard-tile-button');
  await expect(discardButton, 'selecting a tile must arm the Discard button').toBeEnabled();

  const discard = await tabUntil(
    page,
    'the Discard button',
    (f) => f.testid === 'discard-tile-button',
    { shift: true },
  );
  await expectVisibleFocusIndicator(page, 'the Discard button');
  log.operated.push(discard.target.label);

  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.keyboard.press('Enter');
    try {
      await expect
        .poll(() => page.locator('[data-testid="human-hand-tile"]').count(), { timeout: 900 })
        .toBeLessThan(handBefore);
      log.discards += 1;
      return;
    } catch {
      if (attempt === 4) {
        throw new Error(
          `Discard never landed after ${attempt} keyboard confirmations ` +
            `(hand stayed at ${handBefore} tiles, tile "${tile.target.label}").`,
        );
      }
    }
  }
}

/**
 * Plays the Daily Hand to its end using nothing but Tab / Shift+Tab / Enter.
 *
 * Every control is navigated to, never focused programmatically and never
 * clicked, so the run doubles as proof that the whole hand is reachable and
 * operable by keyboard alone.
 */
export async function playDailyHandWithKeyboard(
  page: Page,
  opts: { maxTurns?: number; onClaim?: 'pass' | 'take' } = {},
): Promise<PlayLog> {
  const { maxTurns = 120, onClaim = 'pass' } = opts;
  const log: PlayLog = {
    discards: 0,
    claimWindows: 0,
    chowWindows: 0,
    selectedTiles: [],
    operated: [],
    finished: false,
  };

  for (let turn = 0; turn < maxTurns; turn++) {
    const phase = await waitForActionablePhase(page);

    if (phase === 'result') {
      log.finished = true;
      return log;
    }

    if (phase === 'claim' || phase === 'chow') {
      const testid =
        phase === 'chow' ? 'chow-pass-button' : onClaim === 'take' ? 'claim-best-button' : 'claim-pass-button';
      if (phase === 'chow') log.chowWindows += 1;
      else log.claimWindows += 1;

      const claim = await tabUntil(page, `the ${testid}`, (f) => f.testid === testid);
      await expectVisibleFocusIndicator(page, `the ${testid}`);
      log.operated.push(claim.target.label);
      await page.keyboard.press('Enter');
      // The claim window is time-boxed; wait for the board to leave it so the
      // next iteration classifies a fresh phase rather than the stale one.
      await page
        .waitForFunction(
          (id) => !document.querySelector(`[data-testid="${id}"]`),
          testid,
          { timeout: 15_000 },
        )
        .catch(() => undefined);
      continue;
    }

    await discardOneTileByKeyboard(page, log);
  }

  return log;
}
