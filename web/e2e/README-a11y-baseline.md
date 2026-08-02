# DOM board accessibility baseline

Reference for `a11y-daily-hand.spec.ts`, `keyboard-daily-hand.spec.ts` and
`helpers/dailyHandKeyboard.ts` (issue #114).

These specs pin what the **current DOM board** already does, so the Three.js
slice (#113) cannot delete keyboard play or tile identity without CI saying so.

## How the fixture is made deterministic

The Daily Hand's wall and deal come from `dailySeed()`, which is derived from
the UTC date. The specs pin the clock to **2026-03-01T12:00:00Z**, giving a
reproducible deal.

Two calls are required, and the order matters:

```ts
await page.clock.install({ time: DAILY_FIXTURE_DATE }); // pins the seed
await page.clock.resume();                              // lets time flow again
```

`clock.setFixedTime()` alone does **not** work. `useGameController` debounces
human actions against a 200 ms `Date.now()` window, so under a frozen clock
every action after the first is silently rejected and the hand can never
progress.

The only other thing the fixture touches is `game_speed: 'fast'` — an existing
player-facing Settings preference — so a full hand fits in a sane CI budget.
No game rule, engine module or controller behaviour is altered for testing.

## Measured tab-order baseline

Walked with real `Tab` presses on the default Desktop Chrome viewport
(1280×720), at the human's opening discard turn, **no tile selected**:

| Measurement | Value |
| --- | --- |
| Board tab stops | **23** |
| …of which player-hand tiles | **14** |
| …other buttons | 7 |
| …scrollable regions | 2 |
| Concealed hand between turns | **13** tiles |

Order of the nine non-tile stops:

1. `What does Wall mean?` (glossary)
2. `Hide Beginner Assist hints`
3. `Mute game sounds`
4. `Leave game and return to play menu`
5. `Discard pool` (scrollable region)
6. `Discard tip` (scrollable region)
7. `Expand faan meter`
8. `Expand discard reading`
9. `Sort hand by suit and number`

…followed by the 14 hand tiles, contiguously and last.

### Discrepancy with issue #114

Issue #114 states "23 board tab stops, **13** of them tiles". The 23 total
reproduces exactly. The tile count does not, and the two numbers cannot both be
true at once — at **no instant** does this board offer 23 tab stops of which 13
are tiles.

What is actually measurable:

| Moment | Tiles in hand | Tile **tab stops** | Board tab stops |
| --- | --- | --- | --- |
| Opening discard turn | 14 | **14** | **23** |
| Between turns (opponents playing, claim windows) | 13 | **0** | — |

- The human is always dealer in hand 1, so at the opening discard turn the hand
  holds 14 tiles — 13 concealed plus the drawn 14th — and every one is its own
  `<button>` tab stop. 23 = 9 non-tile stops + 14 tiles.
- Between turns the concealed hand is 13 tiles, but `PlayerHand` renders them
  `disabled` outside the discard turn. **Disabled buttons are not focusable**,
  so those 13 tiles contribute *zero* tab stops.

So **13 is a hand size, never a tab-stop count.** The specs assert it as what it
is: 13 tiles present, all disabled, all still announcing their identity, and
zero of them focusable. Pinning "13 tile tab stops" would have meant asserting
something that has never been true of this board.

### What moves these numbers

- **The Discard button is not counted.** It is rendered but `disabled` until a
  tile is selected, so it takes no tab stop. Selecting a tile adds it, making
  24, positioned exactly two `Shift+Tab` stops back from the first hand tile.
  A dedicated spec pins this.
- **The count is seed-dependent.** Other dates measured 24, because a hand
  holding a flower renders an extra `What does Bonus Tile mean?` glossary
  button. This is why the fixture date is pinned rather than using "today".
- Kong / Mahjong buttons appear conditionally on the discard turn and would add
  stops on seeds that allow them.

## Tile states: what the board actually announces

Every tile is a real `<button>` whose `aria-label` is built in `RetroTile.tsx`
as `Mahjong tile: <name>. <states>.` The states the current UI can emit:

| State | Announced as | When |
| --- | --- | --- |
| Selected | `selected` | tile is the chosen discard |
| Suggested | `suggested discard` | the tutor's recommended discard |
| Beginner Assist grade | `Beginner Assist: GOOD \| OK \| KEEP` | display mode `tutor` (default) |
| Shanten heat | `Shanten heat: tenpai after discard \| close to winning \| far from winning \| all discards equal` | display mode `shantenHeat`; this is distance-from-winning, **not** a danger reading |
| Disabled | native `disabled` attribute | not the player's discard turn |

All five are asserted.

### States named in #114 that do not exist yet

Issue #114 asks for "**dangerous**" and "**unavailable**" tile states to be
announced. Neither has any representation in the current DOM board:

- `tileDangerScore()` (`engine/tutor.ts`) exists, but it is only an input to
  *ranking* the suggested discard — no per-tile danger reading reaches the DOM
  or the aria-label.
- There is no "unavailable" tile concept at all. The nearest thing is the
  native `disabled` state, which is covered above.

These are not silently skipped: there is nothing in the current board to pin,
so pinning them would mean inventing the feature, which this ticket explicitly
is not for. They belong with the accessibility work in #119.

## Axe scanning

`AxeBuilder` runs with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` at the
four phases the ticket requires: **initial deal**, **player discard turn**,
**claim window**, **hand result**.

**Threshold:** `serious` and `critical` impact fail the build. `minor` and
`moderate` findings are printed in the failure message but do not fail CI.

No rule is disabled and nothing is excluded globally.

## Production fixes made for this baseline

The required scans found three real defects. Each was repaired rather than
suppressed; all three are narrow and behaviour-preserving for mouse and touch.

1. **`scrollable-region-focusable` (serious, 2 nodes)** — the discard sea and
   the tutor tip are scroll containers with no focusable content. Chrome grants
   scrollers implicit focus, which is why they already appeared in the walked
   tab order, but Firefox and Safari do not, so those regions were unreachable
   by keyboard there. Fixed in `GameBoard.tsx` with explicit `tabIndex={0}`,
   `role="group"` and an `aria-label`. The tab-stop count is unchanged at 23.

2. **`color-contrast` (serious)** — the Daily result dialog's "Back home"
   button used `text-muted-foreground` on `bg-elevated`, measuring **3.93:1**
   against a 4.5:1 requirement at 12 px. Fixed in `DailyResultDialog.tsx` by
   letting it inherit `ds-btn`'s `text-foreground`.

3. **Focus stranded when the hand ends** — the result dialog is
   `role="dialog" aria-modal="true"` but never received focus. The dock the
   player was using unmounts, dropping focus to `<body>`: a keyboard player was
   left at the top of the document with no signal the hand was over.
   `DailyResultDialog.tsx` now focuses the dialog on open, so focus lands
   somewhere deterministic and documented.

## Known limitations, not fixed here

All belong with the accessibility work in **#119**; each would mean building
new behaviour, which a testing-and-baseline ticket is not for.

1. **The result dialog does not trap focus.** It now receives focus on open,
   but Tab can still reach the board behind an `aria-modal` dialog. Axe does
   not flag this. The glossary modal, built on `@base-ui/react/dialog`, does
   trap and restore focus correctly and is covered by a spec.
2. **The result dialog has no dismiss affordance.** There is no close button
   and no Escape handler; "dismissing" it means activating **Back home**, which
   navigates to `/`. The keyboard spec drives exactly that and asserts the
   navigation, so #114's "through to dismissing the daily result dialog" is
   satisfied by the only route the dialog offers — but Escape-to-close does not
   exist to be asserted.
3. **`dangerous` and `unavailable` tile states do not exist** (see above).

### A note on the two scroll regions

Fixing `scrollable-region-focusable` strictly needs only `tabIndex={0}`. The
`role="group"` + `aria-label` go one step further on purpose: a focus stop with
no accessible name announces as nothing, and the tab-order spec asserts every
stop is identifiable. Naming them costs nothing and keeps that guarantee true.

## Pre-existing behaviour worth knowing

`useGameController` debounces human actions on a 200 ms window, and the
*machine-driven* auto-draw that hands the player their 14th tile passes through
that same guard. A discard confirmed within 200 ms of the tile arriving is
therefore rejected — the board answers with a shake and an "invalid" cue, and
the player presses again. The keyboard driver retries the same way. This is
existing game behaviour, affects mouse and keyboard players equally, and was
deliberately left alone.
