# Round 3 roadmap — landing page, content, DX, multiplayer

Written 2026-07-25 against `feature/ux-and-design-overhaul` (post plans 012–019).
Sources: four parallel audits (visual design, content/curriculum, component/DX,
multiplayer readiness), plus the advisor's own verification of every headline
claim. Findings marked **verified** were re-checked directly, not taken from an
agent report.

---

## The one-paragraph summary

The solo game now looks and feels good. Nothing else in the product does, and
two of the reasons are structural rather than cosmetic: **the curriculum
teaches scoring rules the engine does not implement**, and **the design system
has no elevation contrast, while half the UI primitives are styled with
Tailwind classes that do not compile**. Both are cheap to fix relative to their
blast radius, and both make the visible work land better. Multiplayer is
architecturally ready and should still wait — the binding constraint is finding
four simultaneous humans, not code.

---

## P0 — Truthfulness. The product's core claim is currently false.

The app promises "learn real HK mahjong." It teaches numbers the game will not
reproduce. This outranks every visual issue.

**Verified contradictions between `content/` and `engine/scoring.ts`:**

| Rule | Curriculum teaches | Engine implements |
|---|---|---|
| Discard win payout | "only that ONE player pays… other two pay nothing" (`level4.ts:253-266`) | discarder pays **2×**, others **1× each** = **4× base** (`scoring.ts:295-299`) |
| Self-draw payout | each pays full = 3× | all three pay **2×** = **6× base** (`scoring.ts:290-293`) |
| Limit cap | "cap at 10 fan — worth **256** points maximum" (`level4.ts:36`) — two lines after claiming a 7-fan hand is 1,024 (`:34`) | `MAX_PAYMENT = 8 × 2^10 = ` **8192** (`scoring.ts:13-16`) |

Reported by the content audit and not independently re-verified by the advisor
(treat as high-confidence, confirm before fixing): flower scoring taught as
+1/flower when the engine scores only the seat-matching flower; All Chows taught
with Japanese Pinfu restrictions the engine has no concept of; defence lessons
built on **Riichi**, which does not exist in HK mahjong or anywhere in `engine/`.

**Also verified:** the 3-faan minimum is enforced by the engine
(`DEFAULT_MIN_FAAN`, and `ActionBar` renders "This table needs 3+ to win") and
the curriculum never mentions it — it teaches chicken hands as valid wins.

**Structural gap:** nothing in 48 lessons explains how to take a turn. No
draw/discard loop, no claim priority, no chow-from-the-left, no dealer rotation.
`/learn` advertises a path ending in "Full Game"; no such level exists.

### The fix pattern already exists in the repo

`content/glossary.ts` is a proper single source of truth, consumed by both the
teaching surface and the live game via `GlossaryTerm`. The fan table, limit-hand
list, and payment rules should work the same way — **derived from
`engine/scoring.ts`, not hand-copied.** They currently exist as five drifted
copies (`level4.ts`, `level5.ts`, `reference/page.tsx`, `ScoringQuiz.tsx`,
`engine/scoring.ts`).

That makes this tractable: it is not "rewrite 48 lessons," it is "make the
numbers derive from one place, then write the missing gameplay lessons."

**Plans to write:** `020` (derive scoring content from the engine + fix the
verified contradictions), `021` (write the missing gameplay curriculum).

---

## P1 — Unblock the reskin. Three things must land before any visual work.

### 1. Tailwind v3 runtime vs v4-authored primitives — **verified**

`package.json` pins `tailwindcss@3.4.19`, but `components/ui/*` is authored
against v4 + shadcn `base-nova`. Measured against the built CSS:

| class | occurrences in compiled CSS |
|---|---|
| `outline-hidden` | **0** |
| `ring-3` | **0** |
| `bg-sidebar` | **0** |
| `bg-accent` (v3 control) | 9 |

Those classes are no-ops. The sidebar renders on ambient styling, not on what
its code says. **Any redesign built on these primitives fights invisible
failures.**

Related and verified: `globals.css` imports two Tailwind **v4** stylesheets
(`tw-animate-css`, `shadcn/tailwind.css`) which v3 cannot process, so they ship
verbatim — **55 `@utility`, 17 `@property`, 2 `@theme` blocks** inside an
**872 KB** app-global stylesheet loaded on every route.

Decision required: upgrade to v4, or regenerate the primitives against v3.
Either way, do it before the reskin, not during.

### 2. Tokens are defined twice and do not talk to each other — **verified**

`tailwind.config.ts` hardcodes RGB triples; `globals.css :root` separately
defines `--accent` etc. The config never reads the vars. **Changing `--accent`
does nothing to `bg-accent`.** Anyone told "the tokens are in globals.css" will
edit for an hour and see no change — plausibly why the green has resisted
fixing. Make the config read the CSS variables so there is one reskinnable
source.

### 3. Extract the primitives that do not exist

Ranked by call sites collapsed: `PageHeader` (5 byte-identical heroes + 2
variants), `Meter` (9 hand-rolled progress bars at 3 heights, while
`ui/progress.tsx` has **zero** importers), one real `Card` (`ds-card` 41 +
`ds-panel` 25 + `ui/Card` 2), `SectionLabel`, `Modal` (4 implementations, **no
dialog anywhere handles Escape**), `StatTile`, `EmptyState`, `LoadingState`.

Roughly a day, and they are precisely the surfaces being redesigned.

### 4. CI cannot see the UI

`.github/workflows/ci.yml` gates every e2e step on pushes to `main`. A reskin PR
gets lint, types, and unit tests — and none of the 11 Playwright specs that
would catch a visual break, including `home.spec.ts` and
`sidebar-responsive.spec.ts`. Playwright is already installed, so visual
snapshots are a config change, not a new tool.

**Plans to write:** `022` (Tailwind version decision + token unification +
CSS-weight fix), `023` (primitive extraction), `024` (e2e on PRs + visual
baselines).

---

## P2 — The facelift the maintainer actually asked for

### The real diagnosis: it is not the green, it is the flatness — **verified**

| adjacent surfaces | contrast |
|---|---|
| `card` vs `background` | **1.32:1** |
| `elevated` vs `card` | **1.12:1** |
| `border` vs `card` | **1.15:1** |
| `muted` vs `card` | **1.04:1** |

Five greens inside a 1.35:1 band. There is no elevation system, only a tint,
which is why every page compensates with 4px coloured left-edges and text glows
— decoration doing the job surface contrast should do. It would read equally
muddy in blue or grey.

**Note:** the visual audit proposed `white/4% → /7% → /10%` against a stated
target of ≥1.6:1. Those values measure **1.09 / 1.08 / 1.09** — flatter than
what they replace. Advisor-computed working values: **white/10% → /20% → /30%**
gives 1.28 → 1.42 → 1.46, and a cream-tinted variant (`#FFF8E1` at the same
alphas) ties the chrome to the board's tile colour while staying hue-neutral.

### Other verified-by-inspection items

- **Glow utilities point at a dead palette.** `.ds-text-glow` emits indigo
  `rgb(99 102 241)` applied to teal `text-info` headings; `.text-glow-info`
  emits sky blue. None match any token. ~52 call sites including the sidebar
  wordmark. One-file fix: `currentColor`.
- **Green is both neutral chrome and the success semantic**, so "complete"
  markers land green-on-green and stop signalling. Neutralising surfaces fixes
  this with no token change.
- **The `fontSize` scale has zero TSX usages.** Pages use `text-[10px]` ×41,
  `text-[9px]` ×11, `text-[8px]` ×5 instead. On `/`, the Tile-of-the-Day
  Chinese name renders larger than the page `<h1>`.
- **`/` is a dashboard, not a landing page** — no hero, no value proposition,
  seven equal-weight cards. The actual pitch sentence already exists but is
  stranded on `/play`.
- **`SetBuilder.tsx` is styled for a light-mode app** (`bg-white`,
  `bg-gray-50`, `text-gray-500`) and renders inside lessons.

**Plans to write:** `025` (elevation ladder + glow fix + type scale adoption),
`026` (landing page redesign around the existing pitch sentence).

---

## P3 — Multiplayer: ready, and should still wait

**The engine is genuinely ready.** Zero external imports, pure `applyAction`,
seeded deal, fully serialisable `GameState` with round-trip tests. It would run
server-side essentially unchanged.

**Two real blockers, both verified:**

1. **No hidden-information layer exists.** `GameState` carries the full wall,
   dead wall, and all four hands. Shipping it to a client is not a partial leak,
   it is the whole game. A `redactFor(state, playerId) → PlayerView` projection
   plus a type split is ~5–8 days.
   - **Verified leak vector already in the code:** `OpponentHand.tsx:50-56`
     passes the **real tile** into `RetroTile` and relies on `showBack` to hide
     it visually. Harmless in solo; a DOM-inspectable leak in multiplayer.
2. **Claims are a sequential poll, not a simultaneous window.** Three gates
   (`turnManager.ts:278, 346, 408`) reject any player who is not
   `currentPlayerIndex`. With a 10s window and three claimants, one discard
   could take 30 seconds. Converting to a simultaneous window is ~60–100 lines
   of engine change — and **it improves solo play on its own merits**, so it is
   not wasted if multiplayer stalls.

**What is free:** `claiming.ts` priority resolution is a pure function over a
set of claims with no notion of arrival order, with the correct HK turn-order
tie-break. Network jitter cannot change the outcome. That is the single most
valuable thing the existing code contributes.

**Estimate:** 38–60 dev-days ≈ **10–14 weeks** solo, full-time, for the smallest
credible slice (4 humans, private room, one quick match, basic reconnect).

**Recommendation: not yet.** The binding constraint is population, not
architecture — mahjong needs *four* simultaneous humans, and an unfillable lobby
is worse than no multiplayer. Engine readiness will not decay while you wait.

**The hedge worth taking instead:** a **verified-replay Daily Hand
leaderboard**. One human plus three AI, server-verified scores via re-running
the pure engine over `(seed, actionLog)`. Real competition against real people,
asynchronously, working with a user base of twelve. The prerequisite replay work
is ~3–5 days and is a hard prerequisite for competitive multiplayer anyway.

**Plans to write:** `027` (replay format + verified Daily Hand leaderboard),
and — only if it comes up naturally — `028` (simultaneous claim window).

---

## Recommended order

1. **020–021** content truthfulness — protects the core claim, smallest effort
2. **022** Tailwind decision + tokens — unblocks everything visual
3. **023–024** primitives + CI visibility — makes the reskin safe and cheap
4. **025** elevation ladder + glows — kills the "ugly green"
5. **026** landing page redesign — the thing that was asked for
6. **027** replay + verified leaderboard — the social hedge
7. multiplayer — revisit when a lobby fills in under a minute at the quiet hour

Items 1 and 2 are independent and can run in parallel.
