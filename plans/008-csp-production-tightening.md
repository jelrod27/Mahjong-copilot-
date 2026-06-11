# Plan 008: Drop 'unsafe-eval' from the production Content-Security-Policy

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat efb5a21..HEAD -- web/next.config.js`
> If the file changed since this plan was written, compare the "Current state"
> excerpt against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `efb5a21`, 2026-06-11

## Why this matters

The CSP currently ships `script-src 'self' 'unsafe-eval' 'unsafe-inline'` to
**production**. `unsafe-eval` is typically only required by Next.js dev-mode tooling
(HMR/eval source maps); in production it serves no purpose and removes a meaningful
layer of XSS defense — if any injection vector ever appears, `eval`-based payloads run
unhindered. There are no `dangerouslySetInnerHTML`/`innerHTML` sinks in the app today,
so this is defense-in-depth, but it is cheap defense. `unsafe-inline` is a different
story: Next.js injects inline bootstrap scripts and removing it requires nonce
plumbing — that stays, documented as a known limitation.

## Current state

- `web/next.config.js:1-11` — the CSP is a single static template string applied to
  all routes via `headers()`:

  ```js
  const ContentSecurityPolicy = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob:;
    connect-src 'self' https://o123.ingest.us.sentry.io https://vitals.vercel-insights.com;
    frame-ancestors 'none';
  `;
  ```

- The headers block (next.config.js:~22-30) sets `Content-Security-Policy` with
  `ContentSecurityPolicy.replace(/\n/g, " ").trim()` for `source: "/(.*)"`.
- The config is wrapped in `withSentryConfig` (Sentry rewrites with a `/monitoring`
  tunnel route — same-origin, already covered by `connect-src 'self'`).
- Deployment target is Vercel (live at 16bitmahjong.co); `https://vercel.live` in
  script-src is for Vercel's preview-feedback toolbar.
- Build/serve commands: `npm run build`, `npm run start` (port 3000), `npm run dev`.
- E2E smoke exists: `web/e2e/beginner-smoke.spec.ts` (Playwright config starts Next on
  port 3100).

## Commands you will need

All from `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build | `npm run build` | exit 0 |
| Serve prod build | `npm run start` (background) | serves on :3000 |
| Check header | `curl -sI http://localhost:3000 \| grep -i content-security-policy` | no `unsafe-eval` |
| Dev still works | `npm run dev` (background), load page | no CSP console errors |
| E2E (recommended) | `npm run test:e2e` | passes (starts its own server on :3100) |

## Scope

**In scope**:
- `web/next.config.js` — ONLY the `ContentSecurityPolicy` constant (make it
  environment-aware).

**Out of scope** (do NOT touch):
- Removing `'unsafe-inline'` from `script-src` — requires nonce-based CSP threaded
  through Next middleware; explicitly deferred.
- `style-src 'unsafe-inline'` — styled inline by Tailwind/Next; leave it.
- The Sentry config block, other headers (X-Frame-Options etc.), or any other part of
  next.config.js.
- `web/middleware.ts` — no nonce work in this plan.

## Git workflow

- Branch: `feature/csp-drop-unsafe-eval-prod`
- Commit message style: `fix(security): drop unsafe-eval from production CSP`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make the CSP environment-aware

In `web/next.config.js`, replace the static constant with:

```js
const isDev = process.env.NODE_ENV !== "production";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' ${isDev ? "'unsafe-eval' " : ""}'unsafe-inline' https://vercel.live;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self' https://o123.ingest.us.sentry.io https://vitals.vercel-insights.com;
  frame-ancestors 'none';
`;
```

(Everything else in the file stays byte-identical. Note `next.config.js` is evaluated
at build/server start, so `NODE_ENV` correctly distinguishes `next dev` from
`next build`/`next start`.)

**Verify**: `npm run build` → exit 0.

### Step 2: Verify the production header and runtime

Start the prod server (`npm run start`, background). Then:

1. `curl -sI http://localhost:3000 | grep -i content-security-policy` →
   header present, contains `script-src 'self' 'unsafe-inline' https://vercel.live`,
   does NOT contain `unsafe-eval`.
2. Load `http://localhost:3000` and `http://localhost:3000/play/game?difficulty=easy&mode=quick`
   in a browser context (Playwright is fine) and check the console for CSP violation
   errors (`Refused to evaluate a string of JavaScript because 'unsafe-eval'...`).
   The game board must render and a tile must be discardable.

If a CSP eval violation appears in the PRODUCTION build, identify the source from the
console message. If it comes from a first-party dependency that genuinely needs eval
at runtime, STOP and report — do not re-add `unsafe-eval` silently.

**Verify**: header check passes AND no CSP violations on the two pages.

### Step 3: Verify dev mode is unharmed

`npm run dev` (background), load `http://localhost:3000` — HMR connects, no CSP errors
(dev keeps `unsafe-eval`).

**Verify**: page loads, no CSP console errors.

### Step 4: Run e2e

`npm run test:e2e` → all specs pass (Playwright builds/serves on :3100; this exercises
the full app under the new header). If Playwright browsers are not installed in the
environment, run `npx playwright install chromium` first; if that is impossible, note
it in the report and rely on Step 2's manual checks.

## Test plan

No unit tests — this is runtime-header behavior. The verification IS Steps 2–4:
header assertion via curl, console-clean page loads in prod and dev, and the e2e
suite. Optionally add a Playwright assertion to an existing spec checking the
response header lacks `unsafe-eval` (nice-to-have, not required).

## Done criteria

- [ ] Prod header (curl check) contains no `unsafe-eval`
- [ ] Dev mode works with HMR (keeps `unsafe-eval`)
- [ ] Game page renders and plays under the prod build with zero CSP console violations
- [ ] `npm run build` exits 0; e2e passes (or documented as environmentally unavailable)
- [ ] Only `web/next.config.js` modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The production build emits CSP eval violations from Next.js itself or a core
  dependency (report the offending script URL from the console message).
- The CSP constant in next.config.js no longer matches the excerpt (drifted).
- You are tempted to also remove `unsafe-inline` or add nonces — out of scope.

## Maintenance notes

- Follow-up explicitly deferred: nonce-based CSP to eliminate `'unsafe-inline'` from
  `script-src` (requires generating a nonce in middleware and a `headers()` →
  middleware migration; only worth it if user-generated content ever ships).
- Anyone adding a third-party script (analytics, ads, embeds) must extend
  `script-src`/`connect-src` deliberately — the reviewer should reject blanket
  re-additions of `unsafe-eval`.
- Sentry's `connect-src` entry (`https://o123.ingest.us.sentry.io`) looks like a
  placeholder org id — if Sentry events ever fail CSP in production, that allowlist
  entry is the first thing to re-check against the real DSN host.
