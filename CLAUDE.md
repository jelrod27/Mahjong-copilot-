# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

16 Bit Mahjong — a Hong Kong Mahjong learning and solo/multiplayer platform. Live at 16bitmahjong.co.

Two codebases:
- **Web app** (`/web/`): Next.js 14 + React 18 + TypeScript + Redux Toolkit + Tailwind CSS + Supabase + Sentry. Primary active codebase.
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
- **`scoring.ts`** — Hong Kong fan scoring. Payment = `8 × 2^fan`, capped at 256 for limit hands.
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

Tailwind with a retro theme in `/web/tailwind.config.ts`. Tokens: `retro-bg`, `retro-panel`, `retro-border` (hot pink), `retro-accent`, `retro-gold`, `retro-green`, `retro-cyan`. Headings use the "Press Start 2P" pixel font.

## Testing

Tests live in `__tests__/` directories adjacent to source. Engine tests are in `/web/engine/__tests__/`. Vitest (jsdom) config is at `/web/vitest.config.ts`; setup in `/web/vitest.setup.ts`. Playwright e2e specs are in `/web/e2e/`.

## Branching

Always create a feature branch before starting implementation work. Branch naming: `feature/<description>`.
