# Plan 015: Replace the generic green felt — real table art direction

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report. When done, update the
> status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 700769d..HEAD -- web/app/globals.css web/lib/cosmetics.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction (visual design)
- **Planned at**: commit `700769d`, 2026-07-25

## Why this matters

The table is the largest continuous surface in the product — it is the entire
background of the screen the player spends nearly all their time on. Right now
it is the single most generic thing in the app: a dark green radial gradient
with fake stripe texture and a muddy brown border. It reads as "default mahjong
app", which undercuts everything else the design is trying to do.

Three specific, fixable taste problems, all in `web/app/globals.css`:

1. **The texture is fake and mostly invisible.** Every felt uses
   `repeating-linear-gradient` at 1px intervals. At device pixel ratios above
   1 those stripes either alias into moiré or vanish entirely. It is the
   classic CSS fake-texture tell — it costs render time and buys nothing.
2. **The vignette is heavy-handed.** A flat
   `radial-gradient(..., transparent 50%, rgba(0,0,0,0.35) 100%)` crushes the
   table edges to near-black, muddying the corner regions where opponent
   discards live.
3. **The frame is a CSS box, not a table.** A 2px `rgba(120,75,40,0.45)` inset
   border with an 8px radius reads as a div outline, not a wooden table rail.

Plus the strategic problem: **green is the default**, and green felt is the
most-copied visual cliché in the category. The app already has a warm, distinct
palette (jade, gold, bone, ink) that nothing on the table surface uses.

## Current state

### The shared frame — `web/app/globals.css:615-636`

```css
.game-table-felt {
  position: relative;
  background-blend-mode: multiply;
}

.game-table-felt::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.35) 100%);
}

.game-table-felt::after {
  content: "";
  position: absolute;
  inset: 6px;
  pointer-events: none;
  border: 2px solid rgba(120, 75, 40, 0.45);
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 1px rgba(180, 130, 80, 0.2),
    0 0 24px rgba(0, 0, 0, 0.5);
}
```

Note `background-blend-mode: multiply` on `.game-table-felt` is inert — the
felt classes set their own `background` shorthand, so there is nothing on this
element for it to blend against.

### The default felt — `web/app/globals.css:640-650`

```css
.felt-classic-green {
  background:
    radial-gradient(ellipse at center, #2a4d3a 0%, #1f3a2c 55%, #14271d 100%),
    repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.04) 0,
      rgba(0, 0, 0, 0.04) 1px,
      transparent 1px,
      transparent 3px
    );
}
```

The other three (`felt-tournament-red` :652, `felt-casino-black` :671,
`felt-bamboo-mat` :690) follow the identical structure with different hues.

### The registry — `web/lib/cosmetics.ts:117-161`

```ts
export const TABLE_FELTS: Record<TableFeltId, TableFelt> = {
  'classic-green': {
    ...
    description: 'Tournament-standard felt. Deep forest with cross-hatch.',
    className: 'felt-classic-green',
  },
  ...
};

export const DEFAULT_TABLE_FELT: TableFeltId = 'classic-green';
```

Each entry carries `className` — the CSS class applied to the GameBoard root
alongside `game-table-felt`. **The registry shape is good; keep it.** This plan
changes the rendering and the default, not the architecture.

### Existing palette to draw from — `web/tailwind.config.ts:49-66`

```ts
mahjong: {
  green: "#2D5016", red: "#B71C1C", gold: "#C9A84C",
  jade: "#4EADA0", wood: "#5C3D2E", felt: "#2E5938",
},
tile: { bg: "#FFF8E1", border: "#8B7355" },
```

### Conventions

- All felt styling lives in `web/app/globals.css`; the registry in
  `web/lib/cosmetics.ts` only names classes. Preserve that separation.
- A `prefers-reduced-motion` block exists at `web/app/globals.css:325`. Nothing
  in this plan should animate, so it should not need touching.
- `web/lib/__tests__/cosmetics.test.ts` exists — read it before changing the
  registry.

## Commands you will need

From `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose   | Command                                     | Expected |
|-----------|---------------------------------------------|----------|
| Typecheck | `npm run typecheck`                         | exit 0   |
| Lint      | `npm run lint`                              | exit 0   |
| Unit test | `npx vitest run lib/__tests__/cosmetics.test.ts` | all pass |
| Dev serve | `npm run dev`                               | port 3000 |

## Scope

**In scope**:
- `web/app/globals.css` (the `.game-table-felt` and `.felt-*` rules only)
- `web/lib/cosmetics.ts` (felt entries + default)
- `web/lib/__tests__/cosmetics.test.ts` (update if the default changes)

**Out of scope** (do NOT touch):
- `web/tailwind.config.ts` — the semantic token layer is fine; this plan uses
  it, it does not change it.
- `TILE_PALETTES` and anything about tile faces — tile rendering is a separate deferred
  finding, and changing both at once makes it impossible to judge either.
- `web/components/game/GameBoard.tsx` — it already applies the felt class
  correctly; no component change is needed.
- Adding image assets to `web/public/`. This plan is CSS/SVG-only. Raster
  textures would need licence review and a loading strategy — out of scope.

## Git workflow

- Branch: `feature/table-art-direction`
- Conventional commits, e.g. `feat(visual): replace fake felt texture with real fiber noise`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Replace fake stripes with real fiber noise

Delete every `repeating-linear-gradient` from the four `.felt-*` rules.

Add a shared noise overlay on `.game-table-felt` using an inline SVG
`feTurbulence` as a data URI. Fractal noise is what actually reads as woven
fibre, and unlike 1px stripes it survives any device pixel ratio:

```css
.game-table-felt::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.35;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

This repurposes the `::before` pseudo-element, which currently holds the
vignette. Move the vignette into the felt classes' own `background` stack
(Step 2) so `::before` is free for noise.

Tune `baseFrequency` between 0.6 and 0.9 and `opacity` between 0.2 and 0.45 by
eye. Higher frequency = finer weave.

**Verify**: `npm run lint` → exit 0, and
`grep -c "repeating-linear-gradient" web/app/globals.css` → count reduced by at
least 4 versus before your change (record the starting count first).

### Step 2: Soften the vignette

Move the vignette into each felt's own `background` stack as the topmost layer,
and make it far gentler — start the falloff later and end lighter:

```css
radial-gradient(ellipse 120% 100% at 50% 45%, transparent 55%, rgba(0,0,0,0.22) 100%)
```

Two changes from today's version: an explicit ellipse size wider than tall (a
table is wider than it is deep, so the falloff should be too), and 0.22 instead
of 0.35 so the corners stay readable where opponent discards sit.

Also delete the now-inert `background-blend-mode: multiply` from
`.game-table-felt`.

**Verify**: `npm run lint` → exit 0.

### Step 3: Make the frame read as a table rail

Replace the `::after` border with something that reads as a physical edge:
a warm wood tone drawn from the existing `mahjong.wood` (`#5C3D2E`), a soft
inner shadow implying the felt sits *below* the rail, and a larger radius.

```css
.game-table-felt::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 14px;
  box-shadow:
    inset 0 0 0 1px rgb(92 61 46 / 0.55),
    inset 0 0 0 6px rgb(46 30 22 / 0.5),
    inset 0 6px 18px rgb(0 0 0 / 0.35);
}
```

The layered `inset` shadows do the work a `border` cannot: an outer rail line,
a darker rail body, and a shadow the rail casts onto the felt.

**Verify**: `npm run lint` → exit 0.

### Step 4: Re-theme the felts and change the default

Retune the four felts so they are visually distinct and none is a flat green
field. Suggested directions — adjust by eye, these are starting points:

- **`felt-classic-green`** — keep for players who want tradition, but deepen
  and desaturate toward the app's own jade rather than grass green. Base around
  `#1d3b30`, not `#2a4d3a`.
- **`felt-tournament-red`** — keep; it is already the most characterful.
- **`felt-casino-black`** — keep; the near-black with a cool rim works.
- **`felt-bamboo-mat`** — keep; the warm woven mat is the most distinctive of
  the four and is the closest thing here to a real Hong Kong parlour table.

Then change the default in `web/lib/cosmetics.ts`:

```ts
export const DEFAULT_TABLE_FELT: TableFeltId = 'bamboo-mat';
```

Rationale to record in the commit message: green felt is the category default
and reads as generic; the bamboo mat is warm, matches the app's existing
gold/bone/wood palette, and makes the product look like a Hong Kong parlour
rather than a casino. Green remains available for players who want it.

Update the `description` strings so they read as taste, not spec — they are
player-facing in the cosmetics UI.

**Verify**: `npx vitest run lib/__tests__/cosmetics.test.ts` → passes. If a
test asserts the old default, update **that assertion only**.

### Step 5: Look at all four

`npm run dev`, open `http://localhost:3000/cosmetics` (note: this route has no
inbound links yet — see plan 017 — so navigate directly), and switch through
every felt. Then open a game on each.

Judge, at both desktop (1280×800) and mobile (375×812):
- Does the texture read as woven material rather than stripes or flat colour?
- Are opponent discards in the corners still clearly readable?
- Do the bone-coloured tiles have enough contrast against the surface?

If tile contrast drops on any felt, lighten the vignette further rather than
changing tile colours — tiles are out of scope.

## Test plan

This is a visual change; automated coverage is limited to the registry.

- **Existing test to keep green**: `web/lib/__tests__/cosmetics.test.ts`.
  Update only the default-felt assertion if present.
- **Manual verification** is the real test — Step 5, at both viewports, on all
  four felts.
- **Regression to check**: `web/e2e/` specs that screenshot or assert on the
  game board. Run `npm run test:e2e -- play-game.spec.ts` and confirm it still
  passes; if it asserts on specific colours, report rather than loosening it.

## Done criteria

ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npx vitest run lib/__tests__/cosmetics.test.ts` passes
- [ ] `npm run test:e2e -- play-game.spec.ts` passes
- [ ] No `repeating-linear-gradient` remains in any `.felt-*` rule
- [ ] `DEFAULT_TABLE_FELT` is `'bamboo-mat'`
- [ ] All four felts visually checked at 1280×800 and 375×812
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- The excerpts above do not match the live code.
- The SVG noise data URI is blocked by a Content Security Policy. Check
  `web/next.config.*` and any Sentry/Next CSP headers. If CSP forbids
  `data:` URIs in `background-image`, report — do not weaken the CSP.
- The noise overlay measurably degrades frame rate on mobile. It is a static
  background image and should not, but if it does, report rather than
  reintroducing stripe gradients.
- An e2e test asserts on specific felt colours.

## Maintenance notes

- **What interacts with this**: the noise `::before` and the rail `::after` are
  both on `.game-table-felt`, so any new felt automatically inherits them —
  new felts only need to supply a `background`. Document that in a comment
  above the felt rules so the next person does not re-add per-felt texture.
- **What a reviewer should scrutinise**: corner readability. The vignette
  change is the one most likely to be judged differently by different eyes —
  screenshots at both viewports should be in the PR.
- **Deliberately deferred**: raster/photographic felt textures. They would look
  better still, but need licence review, a preload strategy, and a size budget.
  Revisit only if the SVG noise proves insufficient.
- **Related**: the app's visual identity is currently split between "16 Bit"
  (retro/pixel) and "warm parlour" (Noto Serif SC, jade, gold). This plan
  commits the table to the parlour side. That tension should be resolved
  product-wide — see the direction findings in `plans/README.md`.
