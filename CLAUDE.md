# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

16 Bit Mahjong — a Hong Kong Mahjong learning and solo/multiplayer platform. Live at 16bitmahjong.co.

Two codebases:
- **Web app** (`/web/`): Next.js 15 + React 18 + TypeScript + Redux Toolkit + Tailwind CSS + Supabase + Sentry. Primary active codebase.
- **Mobile app** (`/src/`): Legacy React Native 0.73 shell. Not actively developed.

Supabase powers auth and multiplayer. The solo game runs fully offline — Supabase env vars are optional for local dev.

## Common Commands

All web commands run from `/web`:

```bash
cd web
npm run dev           # Dev server at localhost:3000
npm run build         # Production build
npm run lint          # ESLint (next lint)
npm run typecheck     # tsc --noEmit
npm test              # Vitest (run all)
npm run test:watch    # Vitest watch
npm run test:coverage # Coverage report
npm run test:e2e      # Playwright (starts Next on port 3100)
npm run test:e2e:ui   # Playwright UI mode

# Run a single test file
npx vitest run engine/__tests__/scoring.test.ts
```

CI (`.github/workflows/ci.yml`) runs lint → typecheck → unit tests → build on every PR and push. Playwright against a local dev server runs only on pushes to `main`.

A second workflow (`.github/workflows/e2e-preview.yml`) runs Playwright against a Vercel preview URL on `workflow_dispatch`. For protected previews, set the `VERCEL_AUTOMATION_BYPASS_SECRET` GitHub secret to match Vercel's *Protection Bypass for Automation* value.

## Architecture

### Game engine (`/web/engine/`)

Pure TypeScript, zero runtime dependencies, no side effects. Framework-agnostic and deterministic — every engine module is unit-testable in isolation.

- **`turnManager.ts`** — Hand-level state machine. Core: `applyAction(state, action) → newState`. Handles deal/draw/discard/claim/kong/win.
- **`matchManager.ts`** — Match-level state on top of turnManager. A full game is 4 rounds (E/S/W/N) of ≥4 hands each; a quick game is the East round only. Tracks per-hand scores and rotates dealer/seat winds.
- **`winDetection.ts`** — Validates winning hands (standard decomposition, thirteen orphans, seven pairs) and computes shanten.
- **`scoring.ts`** — Hong Kong fan scoring. Payment = `8 × 2^fan`, monotonic and capped at the limit (8192 = 8 × 2^10) for limit hands.
- **`claiming.ts`** — Validates chow/pung/kong/win claims on discards and resolves priority between competing claimants.
- **`tutor.ts`** — Learning-mode helper: tile classifications, danger scoring, tenpai/wait detection, suggested discards.
- **`reviewAnalyzer.ts`** — Post-hand analysis over `turnHistory` that surfaces good plays and mistakes (teacher mode).
- **`ai/`** — Three tiers: `easyAI` (random-ish), `mediumAI` (shanten-driven), `hardAI` (danger + opponent reading). Shared helpers in `aiUtils.ts`.

### Data flow

```
User action → engine.applyAction() → new GameState → Redux store → React re-render
```

`useGameController` (`/web/components/game/useGameController.ts`) is the bridge between the engine and UI. It owns game state, orchestrates AI turn timing, manages claim timeouts, and exposes action methods to components. Engine modules never import React or Redux.

### Key types

- **`Tile`** (`/web/models/Tile.ts`) — 144-tile set: suits (bamboo/character/dot), honors (wind/dragon), bonus (flower/season).
- **`GameState`** (`/web/models/GameState.ts`) — Per-hand state: players, wall, discards, melds, `turnPhase` (`draw`/`discard`/`claim`/`endOfTurn`), `gamePhase` (`waiting`/`dealing`/`playing`/`finished`), `turnHistory`.
- **`MatchState`** (`/web/models/MatchState.ts`) — Multi-hand wrapper: round wind, hand number, per-player scores, hand-result history.
- **Engine types** (`/web/engine/types.ts`) — `GameAction` union, `ScoringContext`, `ScoringResult`, tutor and review output shapes.

### Web app routing (Next.js App Router)

- `/(main)/` — Learning screens with bottom nav (home, learn, practice, reference, progress, settings).
- `/play/` — Solo play: difficulty selector, `/play/game` (the `GameContent.tsx` → `GameBoard.tsx` stack), plus `lobby/` and `multiplayer/` entry points.
- `/multiplayer/` — Supabase-backed multiplayer: `lobby/`, `game/`, `ranked/`.
- `/login`, `/signup`, `/auth/*`, `/profile/` — Supabase auth flow.
- `/leaderboard/` — Ranked leaderboard.

`web/middleware.ts` handles Supabase session refresh. `web/supabase/` holds SQL migrations and edge-function code.

### State management

Redux Toolkit in `/web/store/`. Reducers: `gameReducer`, `authReducer`, `settingsReducer`, `progressReducer` (see `rootReducer.ts`).

### Observability

Sentry is wired via `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`. Vercel Analytics is enabled via `@vercel/analytics`.

### Styling

Tailwind semantic design system in `/web/tailwind.config.ts` and `/web/app/globals.css`. Core tokens: `background`, `foreground`, `surface`, `elevated`, `muted`, `muted-foreground`, `border`, `accent`, `success`, `info`, `highlight`, `destructive`, `ring`. Component classes: `ds-panel`, `ds-card`, `ds-card-elevated`, `ds-btn`, `ds-btn-accent`, `ds-input`. Body uses **Inter**; display / overlines use **Plus Jakarta Sans** (`font-display`). Motion: `duration-fast` / `duration-normal`, `ease-ds-out`, etc.

## Testing

Tests live in `__tests__/` directories adjacent to source. Engine tests are in `/web/engine/__tests__/`. Vitest (jsdom) config is at `/web/vitest.config.ts`; setup in `/web/vitest.setup.ts`. Playwright e2e specs are in `/web/e2e/`.

## Branching

Always create a feature branch before starting implementation work. Branch naming: `feature/<description>`.

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
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
