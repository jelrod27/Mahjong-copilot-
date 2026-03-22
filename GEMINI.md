# 16 Bit Mahjong - Project Context

This project is a comprehensive mahjong learning and gaming platform, consisting of a primary Next.js web application and a legacy React Native mobile application.

## Project Overview

*   **Primary Codebase (`/web/`):** Next.js 14 + TypeScript + Tailwind CSS + Redux Toolkit + Vitest. This is the active development focus.
*   **Legacy Mobile Codebase (`/` and `/src/`):** React Native 0.73 + Firebase + Redux + Jest.
*   **Game Engine (`/web/engine/`):** A pure TypeScript, framework-agnostic, zero-dependency engine that handles the core mahjong logic (state machine, win detection, scoring).
*   **Architecture:**
    *   **Data Flow:** User Action → Engine `applyAction()` → New `GameState` → Redux Store → UI Render.
    *   **Game Engine:** Deterministic and side-effect free.
    *   **UI/Theme:** Retro-inspired aesthetic using a custom Tailwind palette and "Press Start 2P" pixel font.

## Building and Running

### Web App (Primary)
All web commands must be run from the `/web` directory:

```bash
cd web
npm run dev           # Start development server at localhost:3000
npm run build         # Create production build
npm run lint          # Run ESLint
npx tsc --noEmit      # Run TypeScript type check
npm test              # Run all tests using Vitest
npm run test:watch    # Run Vitest in watch mode
npm run test:coverage # Generate test coverage report
```

### Mobile App (Legacy)
Mobile commands are run from the root directory:

```bash
npm start             # Start Metro bundler
npm run android       # Run on Android emulator/device
npm run ios           # Run on iOS simulator/device
npm test              # Run tests using Jest
npm run lint          # Run ESLint for mobile code
```

## Development Conventions

*   **Branching Strategy:** Always use feature branches. Naming convention: `feature/<description>`.
*   **Testing:**
    *   Tests are located in `__tests__/` directories adjacent to the source code they test.
    *   Engine-specific tests are in `/web/engine/__tests__/`.
    *   CI/CD (GitHub Actions) runs lint, type-check, test, and build for the web directory on every push to `main`.
*   **Game Engine Integrity:** The engine in `/web/engine/` must remain pure TypeScript with no dependencies. Avoid adding side effects or framework-specific code here.
*   **Styling:** 
    *   Use Tailwind CSS with the custom retro theme tokens (`retro-bg`, `retro-border`, `retro-accent`, etc.).
    *   Favor Vanilla CSS or Tailwind utility classes; avoid introducing new CSS-in-JS libraries unless necessary.
*   **State Management:**
    *   Web: Use Redux Toolkit (`/web/store/`).
    *   Mobile: Use Redux with Redux Thunk (`/src/store/`).

## Key Directories

*   `/web/app/`: Next.js App Router pages and layouts.
*   `/web/components/`: Reusable React components for the web app.
*   `/web/engine/`: Core game logic (independent of UI).
*   `/web/models/`: TypeScript interfaces and types for game state and entities.
*   `/assets/tiles/`: SVG assets for mahjong tiles (used by both web and mobile).
*   `/src/`: Source code for the legacy React Native mobile app.
