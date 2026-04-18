# 16 Bit Mahjong

A mahjong learning and solo play platform. Live at [16bitmahjong.co](https://16bitmahjong.co).

Built around a deterministic, dependency-free game engine that handles the full Hong Kong Mahjong ruleset -- dealing, drawing, discarding, claiming (chow/pung/kong/win), scoring, and three AI tiers.

## Stack

**Web app** (`web/`): Next.js 14, React 18, Redux Toolkit, Supabase, Tailwind CSS

**Game engine** (`web/engine/`): Pure TypeScript, no dependencies, no side effects. Framework-agnostic and fully testable.

**Mobile** (`src/`): Legacy React Native shell. Not actively developed.

## Running locally

```bash
cd web
npm ci
cp .env.example .env.local   # optional for offline play
npm run dev
```

The app runs on `localhost:3000`. Supabase env vars are only needed for auth and multiplayer -- the solo game works without them.

## Commands

All commands run from `web/`.

| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e` | Playwright (starts dev server on port 3100) |

## Testing

221 tests across the engine, components, and pages. Engine tests live in `web/engine/__tests__/`. Vitest runs unit tests; Playwright handles e2e.

CI runs typecheck, lint, unit tests, and build on every PR. See `.github/workflows/ci.yml`.

## Architecture

The engine is the core. Everything flows through `applyAction(state, action) -> newState` in `turnManager.ts`, which acts as the state machine. The `useGameController` hook bridges the engine to React -- managing game state, AI turn timing, and claim timeouts.

```
User action -> engine.applyAction() -> new GameState -> Redux store -> React re-render
```

Key engine modules:

- **turnManager.ts** -- State machine. Dealing, drawing, discarding, claiming, kong, win resolution.
- **winDetection.ts** -- Validates winning hands. Standard decomposition, thirteen orphans, seven pairs. Calculates shanten distance.
- **scoring.ts** -- Hong Kong Mahjong fan scoring. Payment formula: 8 * 2^fan, capped at 256.
- **claiming.ts** -- Validates discard claims. Priority resolution between competing players.
- **ai/** -- Three tiers. Easy plays randomly, medium uses shanten, hard evaluates danger and opponent reading.

## License

MIT