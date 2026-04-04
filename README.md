# Mahjong Copilot (16 Bit Mahjong)

Web-first mahjong learning and solo play. Production: [16bitmahjong.co](https://16bitmahjong.co).

## Repository layout

| Path | Description |
|------|-------------|
| `web/` | Next.js 14 app (primary) |
| `web/engine/` | Pure TypeScript game engine (deterministic, testable) |
| `src/` | Legacy React Native client (less active) |

## Web app quick start

```bash
cd web
npm ci
cp .env.example .env.local   # optional; see file for Supabase vars
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Playwright uses port **3100** by default (`npm run test:e2e` starts `next dev` there).

## Scripts (from `web/`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Vitest (unit / engine tests) |
| `npm run test:e2e` | Playwright |

## Environment

Copy `web/.env.example` to `web/.env.local`. Supabase URL and anon key enable auth and protected routes in middleware; without them, middleware passes through for local static use.

## CI

GitHub Actions runs lint, typecheck, tests, and build on pull requests and `main`. Optional Vercel preview browser tests live in `.github/workflows/e2e-preview.yml` (manual workflow dispatch).

## More detail

See [`CLAUDE.md`](./CLAUDE.md) for architecture, engine overview, and conventions.
