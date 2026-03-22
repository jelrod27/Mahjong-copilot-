# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

16 Bit Mahjong — a mahjong learning and gaming platform with two codebases:
- **Web app** (`/web/`): Next.js 14 + TypeScript + Tailwind CSS + Redux Toolkit — this is the primary active codebase
- **Mobile app** (`/src/`): React Native 0.73 + Firebase + Redux — legacy, less actively developed

Production domain: 16bitmahjong.co

## Common Commands

All web commands run from the `/web` directory:

```bash
cd web
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
npm test             # Vitest (run all tests)
npm run test:watch   # Vitest watch mode
npm run test:coverage # Coverage report

# Run a single test file
npx vitest run engine/__tests__/scoring.test.ts
```

CI runs lint → type check → test → build in the `/web` directory (see `.github/workflows/ci.yml`).

## Architecture

### Game Engine (`/web/engine/`)

Pure TypeScript, zero dependencies, no side effects. The engine is framework-agnostic and deterministic.

- **`turnManager.ts`** — State machine. Core function: `applyAction(state, action) → newState`. Handles dealing, drawing, discarding, claiming, kong declarations, and win resolution.
- **`winDetection.ts`** — Validates winning hands. Supports standard decomposition, thirteen orphans, and seven pairs. Also calculates shanten (distance to win).
- **`scoring.ts`** — Hong Kong Mahjong fan-based scoring. Payment formula: `8 × 2^fan` (capped at 256 for limit hands).
- **`claiming.ts`** — Validates chow/pung/kong/win claims on discards. Handles claim priority resolution.
- **`ai/`** — Three AI tiers (easy/medium/hard) with increasing strategic depth.

### Data Flow

```
User Action → engine.applyAction() → new GameState → Redux store → React re-render
```

The `useGameController` hook (`/web/components/game/useGameController.ts`) bridges the engine and UI — it manages game state, orchestrates AI turns with delays, handles claim timeouts, and exposes action methods to components.

### Key Types

- **`Tile`** (`/web/models/Tile.ts`): 144-tile set — suits (bamboo/character/dot), honors (wind/dragon), bonus (flower/season)
- **`GameState`** (`/web/models/GameState.ts`): Full game state including players, wall, discards, melds, turn phase (`draw`/`discard`/`claim`/`endOfTurn`), and game phase (`waiting`/`dealing`/`playing`/`finished`)
- **Engine types** (`/web/engine/types.ts`): `GameAction` union type, `ScoringContext`, `ScoringResult`

### Web App Routing (Next.js App Router)

- `/(main)/` — Learning screens with bottom nav (home, learn, practice, reference, progress, settings)
- `/play/` — Difficulty selector
- `/play/game/` — Active game board (`GameContent.tsx` → `GameBoard.tsx`)

### State Management

Web uses Redux Toolkit (`/web/store/`). Reducers: `gameReducer`, `authReducer`, `settingsReducer`, `progressReducer`.

### Styling

Tailwind with a custom retro theme palette defined in `/web/tailwind.config.ts`. Key tokens: `retro-bg`, `retro-panel`, `retro-border` (hot pink), `retro-accent`, `retro-gold`, `retro-green`, `retro-cyan`. Uses "Press Start 2P" pixel font for headings.

## Testing

Tests live in `__tests__/` directories adjacent to source. Engine tests are in `/web/engine/__tests__/`. Framework: Vitest with jsdom environment. Config: `/web/vitest.config.ts`.

## Branching

Always create a feature branch before starting implementation work. Branch naming: `feature/<description>`.
