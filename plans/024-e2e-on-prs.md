# Plan 024: Let CI see the UI

> **Executor instructions**: Follow step by step. Run every verification
> command. If a STOP condition occurs, stop and report — do not improvise.
>
> **Drift check**: `git diff --stat b6b570a..HEAD -- .github/workflows/`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (CI config; no app code)
- **Depends on**: none
- **Category**: DX / tooling
- **Planned at**: `feature/visual-facelift`, 2026-07-26

## Why this matters

`.github/workflows/ci.yml` gates **every real step** of the `e2e-local` job on
`github.event_name == 'push' && github.ref == 'refs/heads/main'`. On a pull
request the job runs, emits a `::notice`, and exits green without executing a
single test. `e2e-preview.yml` is `workflow_dispatch` only.

So a PR gets lint, typecheck, unit tests and a build — and **none of the 11
Playwright specs**, including `home.spec.ts`, `sidebar-responsive.spec.ts`,
`mobile.spec.ts` and `tile-scaling.spec.ts`. Those are precisely the specs that
would catch a UI regression.

This round proved the cost. The Tailwind v4 migration shipped with **every font
in the app broken** — the whole product rendering in Times. Unit tests passed,
the build passed, and a computed-style diff reported "byte-identical" because it
checked colours and radii but not `fontFamily`. A human reviewer caught it.
Running the real browser specs on PRs is the cheap structural fix for that class
of miss.

## What to build

Two things:

1. **Run the existing e2e specs on pull requests**, not only on pushes to main.
2. **Add a small set of visual-regression snapshots** for the surfaces this
   round rebuilt, so a silent visual change fails a check rather than a review.

Playwright is already a dependency and already configured. This is config work,
not a new tool.

## Current state

Read `.github/workflows/ci.yml` before changing anything. The relevant shape:

- a `quality` job: lint → typecheck → unit tests → build
- an `e2e-local` job whose steps each carry an `if:` gating them to
  `push` + `refs/heads/main`
- npm caching is already configured via `actions/setup-node`

`web/playwright.config.ts` exists and `npm run test:e2e` starts Next on port
3100.

Eleven specs live in `web/e2e/`.

## Commands you will need

From the repo's `web/` directory unless stated:

| Purpose | Command | Expected |
|---|---|---|
| All e2e | `npm run test:e2e` | all pass |
| One spec | `npm run test:e2e -- home.spec.ts` | passes |
| Install browsers | `npx playwright install chromium` | exit 0 |
| Update snapshots | `npm run test:e2e -- --update-snapshots` | writes baselines |

## Scope

**In scope**:
- `.github/workflows/ci.yml`
- `web/playwright.config.ts` — only if snapshot config requires it
- `web/e2e/visual.spec.ts` — new
- `web/e2e/__screenshots__/` or Playwright's default snapshot dir — new baselines
- `web/.gitignore` — only if snapshot artefacts need excluding

**Out of scope** (do NOT touch):
- Any application code. If a spec fails, that is a finding to report, not a
  reason to edit the app.
- Existing spec assertions — **with one exception**: an assertion that encodes a
  contract the app has since legitimately changed may be corrected, because
  enabling the suite on PRs is impossible while it is red. This ran twice in
  practice (`beginner-smoke.spec.ts`'s landing heading, `tile-scaling.spec.ts`'s
  desktop/mobile ratio). Report each such fix with evidence that the app, not
  the assertion, is the current truth.
- `e2e-preview.yml`.

## Git workflow

- Branch: `feature/e2e-on-prs`
- Conventional commits, e.g. `ci: run e2e on pull requests`
- Do NOT push or open a PR.

## Steps

### Step 1: Confirm the specs actually pass locally first

```bash
npx playwright install chromium
npm run test:e2e
```

**If any spec fails before you have changed anything, STOP and report which.**
Enabling a broken suite on PRs would block every future PR, and diagnosing a
pre-existing failure is not this plan's job.

Report the observed pass count.

### Step 2: Ungate the e2e job for pull requests

Remove the `push` + `refs/heads/main` conditions from the `e2e-local` job's
steps so it runs on `pull_request` too. Keep it running on pushes to main.

Add Playwright browser caching — the download dominates the job otherwise:

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('web/package-lock.json') }}
```

Leave the `::notice` step only if it still says something true; otherwise delete
it rather than leaving a message claiming e2e was skipped when it wasn't.

**Verify**: `cat .github/workflows/ci.yml` and confirm no step is still gated to
main-only. Report the diff.

### Step 3: Add visual snapshots for what this round rebuilt

Create `web/e2e/visual.spec.ts` covering, at 1280×800 and 375×812:

- `/` — the rebuilt landing page (plan 026)
- `/play/game?table=training&mode=quick&difficulty=easy&minFaan=0` — the board
  (plans 015/019)
- `/learn` — a representative learning surface

Use `expect(page).toHaveScreenshot()`.

**The board is a live game with randomised deals and animations.** A naive
screenshot will be flaky. Mitigate:
- seed or freeze where the app allows it,
- mask volatile regions with the `mask:` option (tiles, opponent portraits,
  wall count),
- allow a small `maxDiffPixelRatio`.

If you cannot make the board shot stable in a reasonable number of attempts,
**drop that one case, keep the others, and say so.** A flaky check is worse than
no check — it trains everyone to ignore red.

Generate baselines with `--update-snapshots` and commit them.

**Verify**: run the spec twice in a row; it must pass both times unchanged.

### Step 4: Prove the snapshots actually catch a regression

Temporarily change a visible token — e.g. `--color-card` in the `@theme` block
of `web/app/globals.css` — and re-run the visual spec. It must fail.

Restore, re-run, confirm green.

**Report the failure output.** A snapshot suite that cannot fail is decoration.

### Step 5: Note the font gap explicitly

Add a comment at the top of `visual.spec.ts` recording *why* it exists: the v4
migration shipped with every font falling back to Times while unit tests, the
build, and a computed-style diff all passed. Screenshots are the check that
would have caught it.

This is the institutional memory that stops someone deleting these as slow.

## Test plan

- The deliverable *is* test infrastructure.
- Existing unit tests must stay green and untouched.
- The visual spec must pass twice consecutively (Step 3) and fail on a real
  change (Step 4).

## Done criteria

- [ ] `npm run test:e2e` passes locally; observed count reported
- [ ] `ci.yml` runs e2e on `pull_request`, with Playwright caching
- [ ] No step remains gated to main-only
- [ ] `visual.spec.ts` exists with baselines committed
- [ ] Snapshots pass twice consecutively
- [ ] Step 4's deliberate-regression failure output is in the report
- [ ] `git diff --name-only` shows no application code changed

## STOP conditions

- Any spec fails before your changes (Step 1).
- The board snapshot cannot be stabilised — drop it and report, don't ship
  flake.
- CI config requires secrets you do not have.

## Maintenance notes

- **What a reviewer should scrutinise**: flakiness. Ask whether the board case
  was actually stabilised or merely passed twice by luck.
- **Cost**: e2e adds a couple of minutes to every PR. That is the price of CI
  being able to see the UI at all, and this round demonstrated what not paying
  it costs.
- **Related**: the roadmap's F2/F3 findings are UI defects that reached main
  because nothing screenshotted these pages.
