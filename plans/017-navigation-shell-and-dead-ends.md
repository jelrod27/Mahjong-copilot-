# Plan 017: Fix navigation — keep the app shell on /play, kill the dead end, adopt the orphan routes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report. When done, update the
> status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 700769d..HEAD -- web/app/play web/constants/navItems.ts web/components/layout web/components/DeferredFeaturePage.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt (IA)
- **Planned at**: commit `700769d`, 2026-07-25

## Why this matters

Four navigation defects, each independently verified:

1. **The desktop sidebar disappears on `/play`.** The `/play` segment sits
   outside the `(main)` route group, so it never gets `SidebarShell`. Its own
   layout renders only `<BottomNav />`, which is `lg:hidden`. At ≥1024px the
   app's core route has **zero navigation chrome** — the user clicks "Play" in
   the sidebar and the sidebar ceases to exist.
2. **A guaranteed dead end sits on the highest-intent screen.** `/play` renders
   a "Multiplayer lobby" button, styled identically to the four working CTAs,
   that leads to a deferred placeholder page.
3. **`/cosmetics` is unreachable.** A complete 212-line settings surface (tile
   palette, table felt, NPC roster) has **zero inbound links anywhere in the
   app** — verified by grep. It can only be reached by typing the URL.
4. **Nested `<main>` landmarks** on the deferred play routes break screen-reader
   landmark navigation.

Fixing these is cheap and removes the "this app is unfinished" signal from the
two screens most likely to form a first impression.

## Current state

### 1. The shell gap — `web/app/play/layout.tsx` (full file)

```tsx
'use client';

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInGame = pathname.startsWith('/play/game') || pathname.startsWith('/play/multiplayer');

  return (
    <>
      <main className={
        isInGame
          ? 'min-h-dvh bg-background font-sans text-foreground'
          : 'min-h-dvh bg-background font-sans text-foreground pb-[env(safe-area-inset-bottom)]'
      }>
        <div className={isInGame ? '' : 'max-w-lg mx-auto pb-16'}>
          {children}
        </div>
      </main>
      {!isInGame && <BottomNav />}
    </>
  );
}
```

`web/components/layout/BottomNav.tsx:37` — the nav is `lg:hidden`.
`web/app/(main)/layout.tsx:8` — `SidebarShell` wraps `(main)` only.

**Important**: `/play/game` being chrome-free is **correct** — an immersive
table should not have a sidebar. Only the non-game `/play` routes need the
shell.

### 2. The dead end — `web/app/play/page.tsx:177-184`

A `ds-btn` labelled "Multiplayer lobby" routing to `/play/lobby`, which is a
`DeferredFeaturePage` ("Online rooms are deferred"). It carries
`data-testid="multiplayer-lobby-button"`.

### 3. The orphan

```
grep -rn "\"/cosmetics\"\|'/cosmetics'" --include="*.tsx" web/
→ (no results)
```

`/parlour` by contrast **is** linked (from `app/(main)/page.tsx:114,131`,
`app/play/page.tsx:155`, `app/play/game/GameContent.tsx:270,281,310`) but is
absent from `web/constants/navItems.ts`, so the sidebar shows no active item
when you are on it (`AppSidebar.tsx:37-38` matches by `startsWith` against the
seven hardcoded hrefs).

### 4. Nested landmarks

`web/app/play/layout.tsx:12` renders `<main>`; `web/components/DeferredFeaturePage.tsx:26`
also renders `<main>`. `/play/lobby` and `/play/multiplayer` render the latter
inside the former.

### Conventions

- Nav destinations are declared in `web/constants/navItems.ts` as `NavItem[]`.
- Route groups: `(main)` = shell'd learning surfaces; `play/` = play surfaces.
- E2E specs in `web/e2e/` assert on routes — `navigation.spec.ts` and
  `multiplayer-lobby.spec.ts` both reference deferred routes.

## Commands you will need

From `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose   | Command                                        | Expected |
|-----------|------------------------------------------------|----------|
| Typecheck | `npm run typecheck`                            | exit 0   |
| Lint      | `npm run lint`                                 | exit 0   |
| Unit test | `npm test`                                     | all pass |
| E2E       | `npm run test:e2e -- navigation.spec.ts`       | all pass |
| E2E       | `npm run test:e2e -- sidebar-responsive.spec.ts` | all pass |

## Scope

**In scope**:
- `web/app/play/layout.tsx`
- `web/app/play/page.tsx`
- `web/components/DeferredFeaturePage.tsx`
- `web/constants/navItems.ts`
- `web/app/(main)/settings/SettingsPageClient.tsx` (add a Cosmetics link)
- `web/e2e/navigation.spec.ts`, `web/e2e/multiplayer-lobby.spec.ts` (update)

**Out of scope** (do NOT touch):
- `/play/game` chrome. It must stay immersive. Do **not** give it a sidebar.
- `web/components/game/**` — no game-surface changes here.
- Merging or renaming the Learn / Practice / Reference nav items. That
  restructure is a product decision, not a bug fix — see
  `plans/README.md` direction findings.
- Deleting the deferred routes. Keep the URLs so external links do not 404.

## Git workflow

- Branch: `feature/navigation-shell`
- Conventional commits, e.g. `fix(nav): keep app shell on play routes and remove multiplayer dead end`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Give the non-game play routes the app shell

Render `SidebarShell` from `web/app/play/layout.tsx` for non-game paths, keeping
`/play/game` (and `/play/multiplayer`) chrome-free exactly as today.

Read `web/components/layout/SidebarShell.tsx` and `web/app/(main)/layout.tsx`
first so you compose it the same way `(main)` does.

Then remove the now-duplicated `<BottomNav />` from `play/layout.tsx` — the
shell already provides it. Confirm you have not ended up with two bottom navs
on mobile.

Two layout details to fix at the same time:
- `web/app/play/page.tsx` uses `min-h-screen flex items-center justify-center`,
  which assumes full-viewport width with no sidebar. With the sidebar present
  this will centre against the wrong box. Adjust the centring to work inside
  the shell's content area.
- `play/layout.tsx` applies `max-w-lg mx-auto` — verify that still reads well
  beside a sidebar at 1280px.

**Verify**: `npm run test:e2e -- sidebar-responsive.spec.ts` → passes. Then
manually: at 1280×800 go to `/play` and confirm the sidebar is present; go to
`/play/game` and confirm it is absent.

### Step 2: Remove the multiplayer dead end

Delete the "Multiplayer lobby" button from `web/app/play/page.tsx:177-184`.

Replace it with inert text in the page footer, e.g. "Online play is coming
after solo polish." — not a link, not a button.

Keep the `/play/lobby` route itself so existing links do not 404.

Then update any test referencing the removed control:

```bash
grep -rn "multiplayer-lobby-button" web/
```

**Verify**: `grep -rn "multiplayer-lobby-button" web/app web/components` →
no matches. `npm run test:e2e -- multiplayer-lobby.spec.ts` → passes
(update the spec if it asserted the button exists on `/play`; it may
legitimately still test the route directly).

### Step 3: Make `/cosmetics` reachable

Add a "Cosmetics" entry point in `web/app/(main)/settings/SettingsPageClient.tsx`
— tile palette, table felt and NPC roster are functionally settings, so that is
the natural home. Match the surrounding section markup and `ds-*` classes.

**Verify**: `grep -rn "/cosmetics" --include="*.tsx" web/app` → at least one
match in `SettingsPageClient.tsx`.

### Step 4: Fix the active-nav blind spot for `/parlour`

`/parlour` is linked from several places but matches no nav item, so the
sidebar highlights nothing while you are there.

Either add it to `navItems`, or map it to the Play item's active state in
`AppSidebar.tsx`. **Prefer the mapping** — the Parlour is a play mode, and
adding an eighth top-level item worsens an already-crowded nav.

**Verify**: manually visit `/parlour` at 1280px and confirm exactly one nav
item is highlighted.

### Step 5: Fix the nested `<main>` landmarks

In `web/components/DeferredFeaturePage.tsx:26`, change the root element from
`<main>` to `<div>` and drop its `min-h-screen` so it composes inside whatever
layout hosts it.

**Verify**: `npm run dev`, open `/play/lobby`, and run in the console:

```js
document.querySelectorAll('main').length
```

**Expected**: `1`.

### Step 6: Derive the bottom-nav arrays from one source

`web/constants/navItems.ts` declares four independent literals
(`navItems`, `bottomNavPrimaryItems`, `bottomNavMoreItems`, `bottomNavMoreTrigger`).
The invariant `primary ∪ more === navItems` is real but hand-maintained.

Add a `tier: 'primary' | 'more'` field to `NavItem`, keep a single `navItems`
array, and export the bottom-nav splits as filtered views.

**Verify**: `npm run typecheck` → exit 0, `npm test` → passes.

## Test plan

- **New unit test** in `web/components/layout/__tests__/BottomNav.test.tsx`
  (read it first, match its style): assert that the union of
  `bottomNavPrimaryItems` and `bottomNavMoreItems` equals `navItems`. This
  locks the invariant Step 6 introduces.
- **Existing e2e to keep green**: `navigation.spec.ts`,
  `sidebar-responsive.spec.ts`, `multiplayer-lobby.spec.ts`. Update route
  expectations only where this plan deliberately changed them.
- **Manual**: at 1280×800 confirm sidebar present on `/play`, absent on
  `/play/game`; at 375×812 confirm exactly one bottom nav.
- **Verify**: `npm test && npm run test:e2e -- navigation.spec.ts`.

## Done criteria

ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0, including the new nav-invariant test
- [ ] `npm run test:e2e -- navigation.spec.ts sidebar-responsive.spec.ts multiplayer-lobby.spec.ts` passes
- [ ] Sidebar present on `/play` at 1280px; absent on `/play/game`
- [ ] Exactly one `<main>` on `/play/lobby`
- [ ] `grep -rn "multiplayer-lobby-button" web/app web/components` → no matches
- [ ] `/cosmetics` linked from Settings
- [ ] Exactly one nav item highlighted on `/parlour`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- The excerpts above do not match the live code.
- Adding `SidebarShell` to `play/layout.tsx` causes a hydration mismatch or a
  duplicate sidebar. That means the shell assumes it is mounted once per tree —
  report rather than forking it.
- `/play/game` ends up with any nav chrome. That is a regression, not a fix.
- More than three e2e specs need changing. That signals this plan is touching
  more surface than intended.

## Maintenance notes

- **What interacts with this**: if `/play/game` ever needs a way out other than
  its in-page exit button, revisit deliberately — the immersive-table decision
  is intentional, not an oversight.
- **What a reviewer should scrutinise**: the mobile case. There are currently
  two overlapping mobile nav systems (a hamburger `Sheet` from `SidebarShell`
  listing all 7 items, plus `BottomNav`'s 4 + "More" sheet). Step 1 must not
  make that worse. Consolidating them is deliberately deferred.
- **Deliberately deferred**:
  - Consolidating the two mobile nav systems.
  - The Learn / Practice / Reference fragmentation (3 of 7 nav slots serve
    study, while every play mode shares one).
  - Collapsing the eight deferred placeholder routes to one shared config.
  - Surfacing "resume where you left off" on Home.
  All are real; none is a bug; each is a product call.
