# Plan 009: Migrate from EOL ESLint 8 to ESLint 9 flat config

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat efb5a21..HEAD -- web/package.json web/.eslintrc.json`
> If lint config changed since this plan was written, re-assess before proceeding.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `efb5a21`, 2026-06-11

## Why this matters

`web/package.json` pins `"eslint": "^8.0.0"`. ESLint 8 reached end-of-life in
October 2024 — no security fixes, and the plugin ecosystem (including
`@typescript-eslint`) now targets v9+. Separately, Next.js has deprecated `next lint`
(removal announced for Next 16), so the migration to ESLint 9 + flat config is coming
either way; doing it now, decoupled from a framework upgrade, keeps it a small
mechanical change. CI runs lint on every PR (`.github/workflows/ci.yml`), so the gate
is already in place to prove equivalence.

## Current state

- `web/package.json` devDependencies: `"eslint": "^8.0.0"`,
  `"eslint-config-next": "^15.5.18"`.
- `web/.eslintrc.json` — the entire config:

  ```json
  {
    "extends": "next/core-web-vitals"
  }
  ```

- Lint script: `"lint": "next lint"` (package.json scripts).
- `eslint-config-next` 15.x supports ESLint 9 and ships a flat-config export. The
  Next-recommended flat config for this setup (per Next 15 docs) uses `FlatCompat`:

  ```js
  // eslint.config.mjs
  import { FlatCompat } from "@eslint/eslintrc";

  const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

  const eslintConfig = [
    ...compat.extends("next/core-web-vitals"),
  ];

  export default eslintConfig;
  ```

- Source files use targeted disables that must keep working, e.g.
  `web/components/game/useGameController.ts:5`
  `/* eslint-disable react-hooks/exhaustive-deps */` and inline
  `// eslint-disable-next-line react-hooks/exhaustive-deps` comments — the
  `react-hooks` plugin rules must remain active after migration.

## Commands you will need

All from `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Baseline (before changes) | `npm run lint` | exit 0 — record this |
| Install | `npm install --save-dev eslint@^9 @eslint/eslintrc` | exit 0 |
| Lint after | `npm run lint` | exit 0, same (empty) finding set |
| Sanity: rules active | see Step 4 | warning appears, then disappears |
| Tests/build | `npm test && npm run build` | exit 0 |

## Scope

**In scope**:
- `web/package.json` / `web/package-lock.json` (eslint version, `@eslint/eslintrc` dev dep)
- `web/eslint.config.mjs` (create)
- `web/.eslintrc.json` (delete after flat config proves equivalent)

**Out of scope** (do NOT touch):
- Any source-file changes to satisfy NEW lint rules — if ESLint 9 surfaces new
  violations, STOP and report them rather than auto-fixing app code (rule-set changes
  need human review).
- The `lint` script (`next lint` still works on Next 15 with ESLint 9; switching to
  the raw `eslint` CLI is a follow-up for the Next 16 upgrade).
- Root-level legacy RN app lint setup.
- Adding new plugins/rules beyond `next/core-web-vitals` parity.

## Git workflow

- Branch: `feature/eslint-9-flat-config`
- Commit message style: `chore(web): migrate to eslint 9 flat config`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Record the baseline

`npm run lint` on the unmodified tree → expect exit 0 with no findings. Record the
output.

**Verify**: exit 0.

### Step 2: Bump eslint and add the compat shim

`npm install --save-dev eslint@^9 @eslint/eslintrc`

**Verify**: `npx eslint --version` → `v9.x`.

### Step 3: Create the flat config and remove the legacy file

Create `web/eslint.config.mjs` with the exact content from "Current state". Then
delete `web/.eslintrc.json` (ESLint 9 ignores `.eslintrc.*` by default; leaving it
invites confusion).

**Verify**: `npm run lint` → exit 0, no findings (identical to the Step 1 baseline).
If `next lint` errors about config discovery, STOP (see STOP conditions).

### Step 4: Prove the rules are actually running

A passing lint can mean "no findings" or "no rules loaded". Temporarily add an
obvious violation to any component — e.g. in `web/components/game/Confetti.tsx`, add a
`useEffect(() => { console.log(x); }, [])` referencing an undeclared dependency, or
simpler: add `<img src="/x.png" />` to JSX (triggers `@next/next/no-img-element`).
Run `npm run lint` → the warning/error MUST appear. Revert the change.

**Verify**: violation detected while present; `git status` clean after revert;
`npm run lint` → exit 0 again.

### Step 5: Full verification

`npm test` → exit 0; `npm run build` → exit 0 (Next builds also consult lint config);
`npm run typecheck` → exit 0.

## Test plan

No unit tests — the lint baseline equivalence (Steps 1 vs 3) plus the
rules-are-active probe (Step 4) constitute the verification.

## Done criteria

- [ ] `npx eslint --version` → v9.x; `web/eslint.config.mjs` exists; `web/.eslintrc.json` deleted
- [ ] `npm run lint` exits 0 with the same findings as the ESLint 8 baseline (none)
- [ ] Step 4 probe proved `next/core-web-vitals` rules fire
- [ ] `npm test`, `npm run build`, `npm run typecheck` all exit 0
- [ ] No app source files modified (`git status` — only config/lockfile/package.json)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `next lint` cannot load the flat config on the installed Next version (report the
  exact error — the fallback decision between keeping `.eslintrc.json` on ESLint 9's
  `ESLINT_USE_FLAT_CONFIG=false` escape hatch vs switching the script to the raw
  `eslint .` CLI is the operator's call).
- ESLint 9 reports NEW violations in app code under the same ruleset — list them in
  the report; fixing app code is out of scope.
- `eslint-config-next`'s peer-dependency range rejects eslint 9 at install time
  (would indicate the installed minor is older than expected — report versions).

## Maintenance notes

- When Next 16 lands, `next lint` goes away — switch the script to
  `eslint .` (the flat config created here is already what the raw CLI consumes).
- The file-level `eslint-disable react-hooks/exhaustive-deps` in
  `useGameController.ts` is intentional (hand-curated dep arrays); reviewers should
  not let a future lint-cleanup PR remove it.
