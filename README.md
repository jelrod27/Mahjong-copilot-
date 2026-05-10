# 16 Bit Mahjong

A Hong Kong Mahjong learning and solo play platform. Live at [16bitmahjong.co](https://16bitmahjong.co).

The product centers on a deterministic, dependency-free game engine: dealing, drawing, discarding, claims (chow, pung, kong, win), Hong Kong fan scoring, and three AI difficulties. The web app adds learning paths, practice drills, an immersive solo table, cosmetics (tile palettes and table felts), tutor hints, a live faan meter, glossary tooltips, match persistence across reloads, and entry points for Supabase-backed multiplayer.

## Stack

**Web app** (`web/`): Next.js 14 (App Router), React 18, Redux Toolkit, Tailwind CSS, Supabase (auth and multiplayer), Sentry, Vercel Analytics.

**Game engine** (`web/engine/`): Pure TypeScript, no runtime dependencies, no side effects. Framework-agnostic and fully unit-tested.

**Mobile** (`src/`): Legacy React Native shell. Not actively developed.

## Running locally

```bash
cd web
npm ci
cp .env.example .env.local   # optional for offline play
npm run dev
```

The app runs on `localhost:3000`. Supabase environment variables are only required for auth and multiplayer; the solo game runs offline without them.

## Commands

All commands run from `web/`.

| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e` | Playwright (starts Next on port 3100) |
| `npm run test:e2e:ui` | Playwright UI mode |

## Testing

420+ unit tests across the engine, components, hooks, and app routes (Vitest). Engine tests live under `web/engine/__tests__/`. Playwright covers end-to-end flows under `web/e2e/`.

CI runs lint, typecheck, unit tests, and build on every push and pull request (`.github/workflows/ci.yml`). Playwright against a local dev server runs on pushes to `main`. A separate workflow can run e2e against Vercel previews on demand.

## Architecture

Game flow is driven by `applyAction(state, playerId, action)` in `web/engine/turnManager.ts`, which returns a new `GameState` or `null` for illegal actions. The `useGameController` hook in `web/components/game/useGameController.ts` bridges the engine to React: it owns hand state, schedules AI moves, handles claim timers, persists in-progress matches via `web/lib/matchStorage.ts`, and coordinates sound and optional tile voice.

```
User action -> engine.applyAction() -> new GameState -> React state -> re-render
```

Core engine modules:

- **turnManager.ts** -- Hand-level state machine: deal, draw, discard, declare kong, self-draw win, claim phase, wall exhaustion, robbing-the-kong path.
- **matchManager.ts** -- Multi-hand match: rounds, dealer rotation, score totals between hands.
- **winDetection.ts** -- Winning shapes (standard melds + pair, thirteen orphans, seven pairs), `canPlayerWin` with exposed melds, shanten helpers.
- **scoring.ts** -- Hong Kong fan scoring; payment uses base points times powers of two, capped at the limit hand payment.
- **claiming.ts** -- Valid claims on a discard and priority ordering.
- **tutor.ts** -- Learning-mode suggestions and tile classifications.
- **reviewAnalyzer.ts** -- Post-hand review over turn history.
- **ai/** -- Easy, medium, and hard opponents plus shared utilities.

Routing highlights: learning and practice under `web/app/(main)/`, solo and lobby play under `web/app/play/`, multiplayer under `web/app/multiplayer/`, auth and profile under `web/app/login`, `signup`, `auth/`, and `profile/`.

## Security and reliability tracking

`SECURITY_REMEDIATION.md` at the repo root tracks follow-ups from the security audit (snapshot validation, deterministic RNG for future competitive features, dependency watch items) and a separate **reliability and correctness** section (engine and controller issues, optional HK rule extensions, small hardening items). Contributors should check it when touching persistence, the engine boundary, or scoring.

## License

MIT
