# Security Audit Remediation Tracker

The Mahjong-copilot security audit covered engine integrity, client persistence and snapshot revival, the App Router and shared UI, and build/runtime configuration across three passes. No Critical or High severity issues remain open from that audit. This document tracks Medium and Low remediation items plus watch items that apply when the codebase or threat model changes.

A separate **reliability and correctness** audit (below) reviewed the game engine and the `useGameController` bridge line-by-line; `web/components/`, `web/app/`, and the remainder of `web/lib/` were covered by pattern checks and spot reads, not full line-by-line audits. Component-level defects may still surface through normal use and should be triaged as they appear.

## Action Items

### [Deploy-soon] URL param whitelist on game init

- **Severity:** Low
- **Files:** web/app/play/game/GameContent.tsx:14-29 (allowlists and runtime checks; `GameMode` values match `web/models/MatchState.ts:5`; difficulty set matches `web/engine/ai/index.ts:18-25` switch arms)
- **Trigger:** N/A for initial fix; any future change to URL query contract for play should keep the allowlists in sync with those sources.
- **Description:** `difficulty` and `mode` were read from `searchParams` and cast to union types without a runtime allowlist. Invalid query strings were only narrowed at the type level; behavior could fall through to surprising `mode` strings in match initialization.
- **Fix:** Applied: module-level `URL_DIFFICULTIES` / `URL_MODES`, raw param read, `.includes` check, then typed value or default (`'easy'` / `'quick'`).
- **Status:** Fixed — PR [#76](https://github.com/jelrod27/Mahjong-copilot-/pull/76) ([web/app/play/game/GameContent.tsx](web/app/play/game/GameContent.tsx)).

### [On-next-touch] Schema validation on snapshot revival

- **Severity:** Medium
- **Files:** web/lib/matchStorage.ts:48-66, web/models/GameState.ts:148-189, web/models/MatchState.ts:73-91
- **Trigger:** When the persistence layer or `SavedGame` format is next modified, or before any feature where game state correctness matters beyond solo trust (ranked play, multiplayer, shared or verifiable replays).
- **Description:** `JSON.parse` in `loadGame` feeds `gameStateFromJson` / `matchStateFromJson` with only a version gate and narrow `minFaan` normalisation. A crafted localStorage payload can supply impossible walls, hands, or oversized arrays, causing incorrect play state, self-DoS, or silent inconsistency with engine invariants.
- **Fix:** Add Zod (or equivalent) schemas at the storage boundary, or extend `*FromJson` with validators: enforce 144-tile multiset legality, caps on array lengths (wall, deadWall, hands, discards, flowers, turnHistory), required fields, and reject the whole snapshot with `clearSavedGame()` plus user-visible reset rather than partial revival.

- **Status:** Fixed — hand-rolled validator at web/lib/savedGameValidator.ts, wired into loadGame; rejected snapshots are cleared whole.

### [Before-multiplayer] Seedable CSPRNG and seed+log replay format

- **Severity:** Medium
- **Files:** web/engine/turnManager.ts:126-130, web/engine/turnManager.ts:163, web/engine/ai/easyAI.ts:45-64
- **Trigger:** Before any of: multiplayer transport, ranked or competitive integrity requirements, shareable replay URLs, or any product promise of verifiable or cross-device replay.
- **Description:** Shuffle and `gameId` use `Math.random` and timestamps; easy AI adds non-deterministic jitter. Full-hand snapshots are the only replay artifact today, so there is no seed-plus-log path to re-simulate or verify a hand. Together that blocks a migration to verifiable replay without invalidating stored snapshot data.
- **Fix:** Introduce an injectable RNG (seeded from `crypto.getRandomValues` for new hands), thread it through `initializeGame` shuffle and any AI paths that use `Math.random`; persist seed plus append-only `applyAction` log for new saves; document that legacy snapshot-only saves are not cryptographically verifiable and may be dropped or one-way migrated. Treat as a multi-day refactor; do not start without the trigger above.

  **Update 2026-06-11:** The deterministic RNG half of this item is already
  complete. `web/engine/rng.ts` ships mulberry32 + FNV-1a (`createRng(seed)`),
  `deterministicNoise` (stateless AI randomness), and `shuffleInPlace`. Both the
  wall shuffle and AI noise are fully seed-derived — no `Math.random` anywhere in
  the engine except `randomSeed()` itself (the one sanctioned call site). This was
  verified empirically on 2026-06-11 by
  `web/engine/__tests__/replayDeterminism.spike.test.ts` (3/3 cases pass: same
  seed → identical deal; same seed + same action sequence → identical end state;
  `getAIDecision` is stateless). Non-deterministic fields confined to wall-clock
  timestamps (`createdAt`, `turnStartedAt`, `finishedAt`,
  `turnHistory[*].timestamp`) — see §5 of the design doc.

  Remaining open work: (a) replace `randomSeed()`'s `Math.random` with
  `crypto.getRandomValues`; (b) implement SavedGame v2 format with append-only
  action log; (c) implement `replayHand(seed, actions)` in a new
  `web/engine/replay.ts`. Full design in
  `plans/spikes/replay-format-design.md`.

- **Status:** Open (RNG half done; CSPRNG seed source + action-log persistence + replay function remain)

## Watch Items

### fast-uri transitive advisory

- **Type:** Dependency
- **Trigger:** `@sentry/nextjs` (or another parent) ships a dependency tree where `fast-uri` is bumped past the vulnerable range, or `npm audit` shows a one-command fix path that clears the advisory.
- **Action:** Bump the relevant packages in `web/`, run `npm audit` from `web/`, confirm the `fast-uri` high advisories are gone, run CI (lint, typecheck, tests, build).

### Accounts feature buildout

- **Type:** Future-feature
- **Trigger:** `web/app/auth/callback/route.ts` implements real OAuth (e.g. `exchangeCodeForSession` or equivalent), or `@supabase/supabase-js` is added to `web/package.json` for auth.
- **Action:** Re-run a Pass-1-class review on auth: open-redirect controls on any `next` / `redirect_to` style params, safe error responses on bad codes, PKCE verifier from cookies not query strings, and session boundaries versus game state.

### CSP tightening (script-src unsafe-eval, unsafe-inline)

- **Type:** Future-feature
- **Trigger:** Introduction of user-generated HTML, untrusted markdown rendering, or third-party scripts driven by untrusted input. Today there are no XSS sinks in the audited surface; CSP in `web/next.config.js` is defense-in-depth only.
- **Action:** Tighten `script-src` for production (nonces or hashes where Next allows), remove `unsafe-eval` if build and HMR constraints permit, and re-test the app behind the new CSP.

### CharacterPortrait dynamic src

- **Type:** Future-feature
- **Trigger:** NPC portrait `src` values come from user uploads, a CMS, or other untrusted sources instead of bundled static content in `web/content/npcs.ts`.
- **Action:** Validate every URL: allow only `https:` (and same-origin paths if applicable), reject `javascript:`, and treat `data:` as opt-in only if you truly need it.

## Reliability and Correctness Items

This section tracks bug findings from the reliability audit (separate pass from the security audit). Format matches Action Items above (Severity, Files, Trigger, Description, Fix, Status).

### [Action] AI follow-up setTimeout cleanup

- **Severity:** Medium
- **Files:** web/components/game/useGameController.ts:578-595
- **Trigger:** Action now or next time this file is touched
- **Description:** Inner `setTimeout(..., 500)` for `DECLARE_WIN` / `DECLARE_KONG` follow-up has no `clearTimeout` in the effect cleanup. On unmount mid-AI-turn, `doAction` can fire after teardown.
- **Fix:** Applied: store follow-up timer id; clear in outer effect cleanup alongside the draw timer.
- **Status:** Fixed — PR [#76](https://github.com/jelrod27/Mahjong-copilot-/pull/76).

### [Action] Swallowed scoring errors

- **Severity:** Medium
- **Files:** web/components/game/useGameController.ts:731-766
- **Trigger:** Action now (one-line fix, prevents future debugging black hole)
- **Description:** Bare `catch` on `calculateScore` swallows errors with no signal. When scoring breaks on edge cases, no surfaced error in production.
- **Fix:** Applied: `Sentry.captureException(e)` in the catch block.
- **Status:** Fixed — PR [#76](https://github.com/jelrod27/Mahjong-copilot-/pull/76).

### [Rules-decision] Four-kong abortive draw and responsibility/pao

- **Severity:** High (omission) or N/A (if not in target ruleset)
- **Files:** web/models/GameState.ts:91-93 (`totalKongsDeclared` field), web/engine/turnManager.ts (no kong counter increment), web/engine/scoring.ts:254-279 (no pao logic)
- **Trigger:** Before promoting this engine to "complete HK rules" or before any tournament/competitive use
- **Description:** Two HK variant rules are absent. (a) `totalKongsDeclared` field exists with comment about four-kong draw, but is never incremented anywhere. Some HK tables abort the hand on four kongs; many do not. (b) Responsibility/pao payment for limit hands built from a discard (Big Three Dragons, Big Four Winds completion via opponent discard) is not modeled. Common in some HK cash games.
- **Fix:** First confirm target HK ruleset for both rules. If neither applies, delete `totalKongsDeclared` field and comment to avoid confusion. If applicable, wire counter increments in `handleDeclareKong`, `resolveAndApplyClaim` kong path, and `applyDeferredKong`; for pao, add detection of limit-completion-by-discard and modify `calculatePayment` to accept single-payer mode.
- **Status:** Open

### [On-next-touch] In-place sort mutation in claim resolution

- **Severity:** Low
- **Files:** web/engine/claiming.ts:194-201, web/engine/turnManager.ts:565-570
- **Trigger:** Next time these files are touched
- **Description:** `claims.sort()` and `meldTiles.sort()` mutate caller arrays. Current callers pass fresh arrays so no live bug, but latent.
- **Fix:** Applied: `[...claims].sort(...)` and `[...meldTiles].sort(...)`.
- **Status:** Fixed — PR [#76](https://github.com/jelrod27/Mahjong-copilot-/pull/76).

### [Watch] Hydration randomness in sidebar skeleton and confetti

- **Severity:** Low (suspected)
- **Files:** web/components/ui/sidebar.tsx:605-608, web/components/game/Confetti.tsx:27-33
- **Trigger:** If either component is ever rendered in an SSR path
- **Description:** `Math.random` in initial render state. Hydration mismatch if SSR'd. Confetti is `'use client'` so likely safe; sidebar skeleton not confirmed.
- **Fix:** Confirm whether subtree is SSR'd; if yes, use deterministic value or `suppressHydrationWarning`.
- **Status:** Open

## Audit History

- Pass 1 (engine integrity): complete
- Pass 2 (App Router and shared UI): complete
- Pass 3 (config, CSP, dependencies): complete
- No Critical or High findings open
- Reliability audit (engine + bridge depth, components/app pattern check): complete
- Reliability fixes from audit (URL allowlist, AI timer cleanup, Sentry on scoring, copy-before-sort): merged in PR #76
