# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

16 Bit Mahjong — a Hong Kong Mahjong learning and solo play platform. Live at 16bitmahjong.co.

**Active codebase:** `web/` only. Next.js 16 (App Router) + React 19 + TypeScript 6 + Redux Toolkit (settings/progress only) + Tailwind CSS v4 + Sentry. The root `package.json` is a proxy that forwards `dev`/`build`/`lint`/`typecheck`/`test` into `web/`.

Auth, multiplayer, ranked and profile routes exist as deferred placeholders (`DeferredFeaturePage`); `/auth/callback` just redirects to `/?accounts=deferred`. There is no Supabase client in the tree — `supabase` appears only as copy in the deferred lobby pages. Archived multiplayer SQL and Elo helpers live under `docs/archive/`.

The solo game runs fully offline.

## Common Commands

All web commands run from `/web` (Node >= 20.9; CI uses 22):

```bash
cd web
npm run dev           # Dev server at localhost:3000
npm run build         # Production build
npm run lint          # ESLint flat config (eslint.config.mjs) — `eslint .`, not `next lint`
npm run typecheck     # tsc --noEmit
npm test              # Vitest (run all)
npm run test:watch    # Vitest watch
npm run test:coverage # Coverage + enforced thresholds (this is what CI runs)
npm run test:e2e      # Playwright (starts `next dev` on port 3100)
npm run test:e2e:ui   # Playwright UI mode

# Run a single test file / a single test
npx vitest run engine/__tests__/scoring.test.ts
npx vitest run engine/__tests__/scoring.test.ts -t 'limit hand'
npm run test:e2e -- play-game.spec.ts
```

**Coverage is a gate, not a report.** `vitest.config.ts` sets thresholds (statements 67, branches 56, functions 60, lines 68) over `engine/`, `scene/`, `presentation/`, `models/`, `store/reducers/`, `components/`. CI runs `test:coverage`, so a change that adds substantial uncovered code fails the build. The thresholds are a floor set just under the measured baseline — raise them, never lower them. The four WebGL prototype files are excluded file-by-file (they need a real GPU); do not widen that to the whole directory.

CI (`.github/workflows/ci.yml`): lint → typecheck → `test:coverage` → build, on every PR and push to `main`. A second job runs Playwright against a local dev server after that job passes. `.github/workflows/e2e-preview.yml` runs Playwright against a Vercel preview URL on `workflow_dispatch` (protected previews need the `VERCEL_AUTOMATION_BYPASS_SECRET` secret to match Vercel's *Protection Bypass for Automation*).

Playwright visual snapshots are per-platform. `e2e/visual.spec.ts` skips loudly when the current platform has no committed baseline; darwin and linux baselines are both committed today. Regenerate with `UPDATE_SNAPSHOTS=1 npm run test:e2e -- visual.spec.ts --update-snapshots` — the env var is load-bearing, because a skipped test writes no snapshot.

## Architecture

The codebase is built as a series of **pure seams**: engine → presentation/scene → React. Each seam is framework-free and structurally tested to stay that way (`scene/__tests__/purity.test.ts` asserts no React/three.js/DOM imports). Respect the direction — engine and seam modules must never import React, Redux, three.js or a DOM API.

### Game engine (`/web/engine/`)

Pure TypeScript, zero runtime dependencies, no side effects, deterministic.

- **`turnManager.ts`** — Hand-level state machine. Core: `applyAction(state, playerId, action) → GameState | null`. **Returns `null` for an illegal action** rather than throwing; callers must handle it. Handles deal/draw/discard/claim/kong/win.
- **`matchManager.ts`** — Match-level state on top of turnManager. A full game is 4 rounds (E/S/W/N) of ≥4 hands each; a quick game is the East round only. Tracks per-hand scores and rotates dealer/seat winds.
- **`rng.ts`** — Seeded RNG (FNV-1a + LCG). Every hand carries a `seed`; wall shuffle and AI noise derive from it, so `(seed, action sequence)` fully determines a game. This is what makes replays, seeded puzzles and the Daily Hand possible — never reach for `Math.random()` in engine or AI code.
- **`redaction.ts`** — Per-seat redaction: `redactFor(state, seat) → RedactedState`. A **projection, not a filter** — no field is removed, only emptied or replaced with same-length `hiddenTile` placeholders, so renderers work unchanged on a redacted view. `RedactedState` is a compile-time branded type; the brand does not survive `JSON.stringify` and there is no runtime check. Every byte a remote client would receive must pass through here.
- **`winDetection.ts`** — Validates winning hands (standard decomposition, thirteen orphans, seven pairs) and computes shanten.
- **`scoring.ts`** — Hong Kong fan scoring. Payment = `8 × 2^fan`, monotonic, capped at the limit (8192 = 8 × 2^10).
- **`claiming.ts`** — Validates chow/pung/kong/win claims and resolves priority between competing claimants. Priority resolution has no notion of arrival order (see ADR 0003).
- **`tutor.ts`**, **`faanProjection.ts`**, **`shantenHeat.ts`** — Learning aids, not correctness code. Tile classification and danger scoring; live faan projection over an *incomplete* hand (deliberately conservative); per-discard shanten overlay.
- **`reviewAnalyzer.ts`** — Post-hand analysis over `turnHistory` for teacher mode.
- **`ai/`** — `easyAI` / `mediumAI` (shanten-driven) / `hardAI` (danger + opponent reading), plus `shantenPolicy.ts` (shared decision policy), `personality.ts` (per-opponent behaviour tuning) and `aiUtils.ts`.

### Presentation and scene seams

- **`/web/presentation/events.ts`** — Derives `PresentationEvent[]` from a `(previous state, action, next state)` triple: the ordered list of what visibly moved, since one engine transition can move many tiles. Sequence numbers come from a counter the caller owns, **never a clock**. Must derive correctly from a *redacted* view.
- **`/web/scene/`** — `projectScene(input) → SceneModel`: the settled truth a 3D renderer draws, complete on its own (a renderer that ignores all animation and draws the latest projection is correct; every animation must end exactly on these transforms). Two invariants: hidden information is filtered at projection time, not render time; renderer-local state (hover) is never an input, while authoritative selection is.

### Data flow

```text
User action → engine.applyAction() → new GameState → useGameController React state → re-render
                                          ↓
                        presentation/events.ts + scene/projectScene()
```

`useGameController` (`/web/components/game/useGameController.ts`) is the bridge. It owns game/match session state (**not** a Redux `game` slice), orchestrates AI turn timing (`aiTurnRunner.ts`), manages claim timeouts, persists in-progress matches through `lib/matchStorage.ts` (localStorage, versioned and validated by `lib/savedGameValidator.ts`), and coordinates sound and tile voice.

### Key types

- **`Tile`** (`/web/models/Tile.ts`) — 144-tile set: suits (bamboo/character/dot), honors (wind/dragon), bonus (flower/season). Also `hiddenTile()` / `isHiddenTile()`, used by redaction.
- **`GameState`** (`/web/models/GameState.ts`) — Per-hand state: players, wall, discards, melds, `seed`, `turnPhase` (`draw`/`discard`/`claim`/`endOfTurn`), `gamePhase` (`waiting`/`dealing`/`playing`/`finished`), `claimablePlayers`, `turnHistory`. Has explicit `…ToJson` / `…FromJson` codecs — keep them in sync when adding fields, or saved games silently lose data.
- **`MatchState`** (`/web/models/MatchState.ts`) — Round wind, hand number, per-player scores, hand-result history.
- **Engine types** (`/web/engine/types.ts`) — `GameAction` union, `ScoringContext`, `ScoringResult`, tutor and review output shapes.

### Web app routing (Next.js App Router)

- `/(main)/` — Learning shell with nav: home, learn, practice, reference, progress, settings, cosmetics, parlour.
- `/play/` — Solo play: difficulty selector, `/play/game` (`GameContent.tsx` → `GameBoard.tsx` stack).
- `/multiplayer/*`, `/play/lobby`, `/play/multiplayer`, `/login`, `/signup`, `/profile`, `/leaderboard` — Deferred placeholders.

### State management

Redux Toolkit in `/web/store/` for **settings** and **progress** only (`store/reducers/rootReducer.ts`). Live solo play state belongs to `useGameController` + `lib/matchStorage.ts` — do not move it into Redux.

### Styling

**Tailwind v4, CSS-first. There is no `tailwind.config.ts`** — the design system lives in `@theme` inside `/web/app/globals.css`. Tokens: `background`, `foreground`, `surface`, `elevated`, `muted`, `muted-foreground`, `border`, `accent`, `success`, `info`, `highlight`, `destructive`, `ring`, plus `mahjong-*`, `tile-*` and `suit-*` families.

Fonts are **Noto Sans SC** (body) and **Noto Serif SC** (display), wired through `next/font` in `app/layout.tsx` as `--font-noto-sans` / `--font-noto-serif`. Never set `--font-sans` to `var(--font-sans)` — `@theme` emits those same property names, so it self-references, resolves to nothing, and silently falls back to the browser default. This shipped broken once already; the warning is in `globals.css`.

Shared UI primitives are shadcn-style components in `/web/components/ui/` (`@base-ui/react` + `class-variance-authority` + `cn()` from `lib/utils.ts`). Prefer them over new one-off components. `ds-panel` is the one surviving legacy `ds-*` class.

### Observability

Sentry via `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`. Vercel Analytics via `@vercel/analytics`. CSP is assembled in `lib/csp.ts`.

## Testing

Tests live in `__tests__/` directories adjacent to source; Vitest (jsdom) config at `/web/vitest.config.ts`, setup in `/web/vitest.setup.ts`, `@` aliases the `web/` root. Playwright specs in `/web/e2e/` (Chromium only; `playwright.global-setup.ts` pre-seeds localStorage so the play onboarding dialog does not block flows).

## Docs and process

- `plans/` — Numbered implementation plans with a status tracker in `plans/README.md`. Substantial work gets a plan; update the tracker table when a plan lands. `plans/spikes/` holds design spikes.
- `docs/adr/` — Architecture decision records for choices with consequences (guest identity, Durable Objects for room authority, the simultaneous claim window).
- `web/CLAUDE.md` is just `@AGENTS.md`, whose contents are generated and re-added by `next dev`. Commit that block with your work rather than fighting it.
- CodeRabbit reviews PRs (`.coderabbit.yaml`, assertive profile, en-GB).

## Branching

Always create a feature branch before starting implementation work. Branch naming: `feature/<description>`. Commit messages are conventional-style with a scope: `fix(engine): ...`, `chore(web): ...`, `docs(plans): ...`.

## Behavioral Guidelines

Guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
