# Implementation Plans

Two audit rounds are recorded here.

- **Round 1 (2026-06-11, commit `efb5a21`)** — plans 001–010, all DONE. Correctness,
  security, perf, tests, debt. See "Round 1" below.
- **Round 2 (2026-07-25, commit `700769d`)** — plans 011–019. **UX, game feel,
  visual design, navigation, audio.** All executed: 012–019 DONE, 011 REJECTED
  (wrong approach, superseded by 018). Four follow-up findings F1–F4 recorded
  below. See "Round 2" below.

All verification commands run from `/web` unless a plan says otherwise. Repo
conventions: branch `feature/<description>`, conventional-style commit messages
(`fix(game): ...`, `chore(web): ...`), never edit already-applied Supabase migrations.

---

# Round 2 — UX, game feel, and design taste (2026-07-25)

Audited at commit `700769d`. Scope: **gameplay UX, visual design, navigation/IA, and
audio.** Findings were vetted against source by the advisor, plus a hands-on play
session in a real browser at desktop (1280×800) and mobile (375×812).

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 011 | [Mobile hand fits without horizontal scroll](011-mobile-hand-fits-without-scroll.md) | P1 | M | — | **REJECTED** — wrong approach; superseded by 018 |
| 012 | [Turn timer + honest auto-discard](012-turn-timer-and-honest-auto-discard.md) | P1 | S | — | **DONE** |
| 013 | [Claim window reliability and feedback](013-claim-window-reliability-and-feedback.md) | P1 | M | 012 (soft) | **DONE** |
| 014 | [Pacing — separate speed from difficulty](014-pacing-separate-speed-from-difficulty.md) | P1 | M | 013 (soft) | **DONE** |
| 015 | [Table art direction — kill the generic green felt](015-table-art-direction.md) | P1 | M | — | **DONE** — see follow-up finding F1 |
| 016 | [Audio identity — replace oscillator chiptune](016-audio-identity.md) | P2 | M | operator asset approval | **DONE (run 1)** — architecture landed, awaiting assets |
| 017 | [Navigation shell and dead ends](017-navigation-shell-and-dead-ends.md) | P2 | M | — | **DONE** — approved after 1 revision |
| 018 | [Mobile hand wraps to two rows](018-mobile-hand-wraps-to-two-rows.md) | P1 | S | — | **DONE** — approved after 1 revision |
| 019 | [Felt-agnostic board chrome](019-felt-agnostic-board-chrome.md) | P1 | S | 015 | **DONE** — closes F1 |

### Round 3 — landing page, content, DX, multiplayer

Roadmap: [ROADMAP-round-3.md](ROADMAP-round-3.md). Written from four parallel
audits after PR #94 merged (`b6b570a`).

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 020 | [Scoring content truthfulness](020-scoring-content-truthfulness.md) | **P0** | M | — | TODO |
| 022 | [Tailwind v4 migration](022-tailwind-v4-migration.md) | P1 | M | 025, 026 | TODO |
| 025 | [Elevation ladder + glow fix](025-elevation-ladder-and-glow-fix.md) | P1 | S | — | **DONE** |
| 026 | [Landing page redesign — Direction A, "The Table"](026-landing-page-redesign.md) | P1 | M | 025 (done) | **DONE** |

Not yet written, in recommended order: `021` missing gameplay curriculum, `023` primitive extraction, `024` e2e on PRs, `027` replay + verified Daily Hand
leaderboard.

**Headline findings behind these** (all advisor-verified):
- The curriculum contradicts `engine/scoring.ts` on payment distribution
  (teaches 1×, engine pays 4×) and the limit cap (teaches 256, engine 8192 —
  and contradicts itself two lines apart).
- Adjacent chrome surfaces sit between 1.04:1 and 1.32:1 contrast. There is no
  elevation system, only a tint — that, not the hue, is the "ugly green".
- `components/ui/*` uses Tailwind v4 classes against a v3.4.19 runtime;
  `outline-hidden`, `ring-3` and `bg-sidebar` compile to nothing.
- Tokens are defined in both `tailwind.config.ts` and `globals.css :root` and
  do not read from each other — editing `--accent` does nothing to `bg-accent`.

### Execution record — round 2 (2026-07-25)

Executed via dispatched subagents in isolated worktrees; each diff reviewed by
the advisor against its done criteria before a verdict.

- **011 → REJECTED, superseded by 018.** The plan assumed `.tile-scale-root`
  was the hand row's direct flex child. It is not — the flex item is a
  `shrink-0` wrapper `<div>` that also contains the tutor label. The CSS
  shrank the tile to **2px** while the wrapper held at 39px, giving **0 of 14**
  tiles fully visible, worse than the 8/14 baseline. Executor correctly hit the
  STOP condition, diagnosed the root cause, and left the work uncommitted.
  Plan 018 replaces shrink-to-fit with wrapping to two rows.
- **016 run 1 — APPROVED.** Sample-playback path added behind the unchanged
  `play`/`stop`/`duck` API; `SAMPLE_ASSETS` empty so the oscillator path stays
  active. One file changed, no audio binaries added. Verified independently:
  typecheck exit 0, 587/587 tests. Executor also corrected two factual errors
  in the plan (see the CORRECTION notes in 016).
- **017 — APPROVED after one revision round.** First pass completed all six
  steps but removing `<main>` from `DeferredFeaturePage` left **7 routes with
  zero `<main>` landmarks** (worse than the nested-landmark bug it fixed).
  Executor flagged this itself in NOTES. Revision added `<main>` to
  `multiplayer/layout.tsx` and a centering `<main>` wrapper to the four
  standalone deferred pages — restoring both the landmark and the lost vertical
  centering. Verified: all nine routes at exactly 1 `<main>`, `/play/game`
  still chrome-free, 588/588 tests, 18 e2e pass.
- **Scope rulings**: `AppSidebar.tsx` (017 step 4) and `GameBoard.tsx`
  (011/018 step for the `game-hand-scroll` token) were both absent from their
  plans' Scope lists but explicitly required by the step bodies. Advisor ruled
  these plan oversights, not executor scope violations.

### F1 — NEW FINDING from executing 015: board chrome is colour-coupled to the green felt

Surfaced by the advisor's own visual check after merging 015, at 1280×800 on
the new `bamboo-mat` default. **Not a defect in 015** — 015 did exactly what it
was asked. This is an emergent issue the felt change exposed.

- **Evidence**: with the warm tan bamboo-mat felt active, the discard-pool
  panel (`ds-panel`) and the bottom dock still render in the dark-green
  `surface` / `elevated` tokens from `web/tailwind.config.ts:22-23`
  (`rgb(26 43 30)` / `rgb(36 53 40)`). The result is a warm tan upper table
  with a dark-green panel floating on it and a hard tan/green seam across the
  dock edge.
- **Why it was invisible before**: the chrome tokens were tuned when the felt
  was always green, so panel and felt blended. Any non-green felt breaks that
  assumption — `tournament-red` and `bamboo-mat` both clash; `casino-black`
  is the least affected.
- **Impact**: the felt itself is a clear improvement (real fibre texture,
  softer vignette, proper rail), but overall board coherence at the default
  setting is arguably worse than before, because two unrelated colour systems
  now sit adjacent.
- **Fix sketch**: make the in-game panel/dock surfaces felt-agnostic — either
  translucent (`bg-black/25` + `backdrop-blur`) so they read as a shadow on
  whatever felt is beneath, or derive them from a per-felt CSS variable the
  felt classes set. The translucent route is smaller and works for all four
  felts without per-felt tuning.
- **Effort**: S–M. **Risk**: LOW (presentation only). **Confidence**: HIGH
  (observed directly in a screenshot).

### F2 — NEW FINDING from executing 019: the cosmetics page's active-state indicator is unreliable

- **Evidence**: reported by the 019 executor while switching felts to take
  screenshots. Clicking a felt card on `/cosmetics` writes the correct value to
  the `table_felt` localStorage key (verified — the `felt-*` class on
  `.game-board-root` does change), but the page's own "ACTIVE" badge does not
  reliably reflect the selection on next load. A hydration-timing issue, not a
  persistence failure — the setting itself works.
- **Why this now matters more**: plan 017 added the first-ever inbound link to
  `/cosmetics` (from Settings). Before that the page was unreachable except by
  typing the URL, so the bug was invisible. It is now on a path users can
  actually walk.
- **Impact**: the player picks a felt, the page appears not to register it, so
  they click again or assume it is broken — while the setting has in fact
  applied. Confusing rather than destructive.
- **Effort**: S. **Risk**: LOW. **Confidence**: MED — reported by an executor
  as an incidental observation and not independently reproduced by the advisor.
  **Verify before planning.**
- **Fix sketch**: the page likely reads the stored value during render instead
  of after mount. `web/app/(main)/page.tsx:32-43` already uses a post-mount
  hydration guard for rank/daily/parlour state — apply the same pattern in
  `web/app/(main)/cosmetics/page.tsx`.

### F3 — NEW FINDING from executing 013: duplicate React keys in TileFlightLayer

- **Evidence**: `web/components/game/TileFlightLayer.tsx:175` — the flight key
  `discard-${lastTile.id}` collides when the same tile id produces two
  concurrent flights. Observed as live React console errors during manual play
  by the 013 executor.
- **Impact**: duplicate keys make React's reconciliation unreliable for the
  affected nodes — animations can attach to the wrong element or fail to clean
  up. This is the layer responsible for every discard/claim animation, so
  symptoms would read as intermittent "the tile animated weirdly" rather than
  as an obvious error.
- **Effort**: S. **Risk**: LOW. **Confidence**: MED — console errors observed
  directly, but the visual consequence was not isolated. Reproduce before
  planning.
- **Fix sketch**: include the flight's own sequence/nonce in the key rather
  than the tile id alone.
- **Note**: pre-existing, not introduced by any round-2 plan. Related to the
  already-recorded finding that `TileFlightLayer` re-measures every
  `[data-flight-tile]` in the document on each state change.

### F4 — NEW FINDING from executing 014: `web/lib/settingsStorage.ts` is dead code

- **Evidence**: `grep -rn "loadSettings" web/` returns exactly one hit — its own
  definition at `web/lib/settingsStorage.ts:8`. Nothing calls it. The module is
  a full-state mirror that no longer participates in the real persistence path.
- **The real path** every setting actually uses is `StorageService` +
  per-key constants in `web/constants/appConstants.ts`, driven from
  `web/store/actions/settingsActions.ts`. Plan 014 originally named
  `settingsStorage.ts` as the file to edit; that was an advisor error, caught
  and corrected by the executor, which followed the real pattern instead.
- **Impact**: a misleading module that reads as the settings-persistence layer
  and will send the next contributor (human or agent) down the wrong path —
  as it did here.
- **Effort**: S. **Risk**: LOW. **Confidence**: HIGH (grep is conclusive).
- **Fix sketch**: delete `settingsStorage.ts`, or if `saveSettings` still has a
  caller, reduce the module to just that and rename it to say so.

### Advisor plan errors found by executors (round 2)

Recorded honestly — these were defects in the plans, not the execution:

1. **011** assumed the wrong DOM (`.tile-scale-root` as flex child). Fatal;
   plan rejected and replaced by 018.
2. **016** claimed `docs/design/audio.md` did not exist. It does — the advisor
   checked `web/../docs/design/` from the wrong working directory.
3. **018 step 3** raised `--tile-base-w` on `.game-board-scene`, enlarging
   every tile surface when only the hand was intended. Caught in advisor review,
   fixed by scoping to `.game-hand-row`.
4. **017 / 018 / 012 / 013** all had Scope lists missing a file their own step
   bodies required (`AppSidebar.tsx`, `GameBoard.tsx`, `GameContent.tsx`).
   Executors flagged each rather than silently expanding scope.
5. **014** named `settingsStorage.ts` as the persistence path; it is dead code
   (F4 above).

Lesson for future rounds: verify the DOM/actual call path before writing CSS
selectors or naming files in Scope, and derive Scope from the step bodies
rather than writing it first.

### Environment traps found during execution (read before dispatching more work)

- **`preview_start({name})` reads `.claude/launch.json` from the MAIN REPO
  ROOT, not the worktree.** Worktree executors using it silently verify against
  stale main-branch code. Two executors hit this independently. Workaround:
  start `npx next dev -p <port>` from the worktree's `web/` via Bash, then drive
  the Browser pane with `navigate`/`javascript_tool` against that port.
- **The Browser pane is shared across concurrent agents.** One executor had its
  tab hijacked mid-task twice by another agent's navigation. Always confirm
  `window.location.href` before trusting a measurement.
- Fresh worktrees have no `node_modules`; `npm install` first is expected setup.
- Playwright may need `npx playwright install chromium` in a fresh worktree.

## Round 2 dependency notes

- **013 soft-depends on 012** — both touch timer/interval logic in
  `useGameController.ts`. Landing separately keeps each diff reviewable and makes it
  obvious which change caused any timing regression.
- **014 soft-depends on 013** — 014 changes AI delays, which changes how long 013's
  new "opponents deciding" state is visible. Get that state correct before tuning
  its duration.
- **015 and 016 are fully independent** of everything and of each other.
- **016 has an operator decision gate** — it cannot start until the audio direction
  and the asset source/licence are chosen. See Step 1 of that plan.
- **013 builds on round-1 plan 006.** That plan fixed the `pass()`-in-updater bug and
  added the `prev > 0` transition guard (both confirmed present in the code today).
  013 addresses a *different* failure on top of it: when the single auto-`pass()` is
  itself rejected, nothing retries and the hand wedges.

## Suggested batching

- **Batch 1 — "the game feels broken"**: 011, 012, 013, 014. What a player notices in
  their first two hands.
- **Batch 2 — "it looks and sounds generic"**: 015, 016.
- **Batch 3 — structural**: 017.

## Round 2 — what was NOT audited

Stated plainly so nobody assumes coverage that does not exist:

- **Security, dependencies, test coverage** — out of scope this round; covered in
  round 1. `npm audit` was not re-run.
- **Engine rule correctness** (`web/engine/**`) — not reviewed for Hong Kong rule
  authenticity. It has substantial existing test coverage.
- **Learning content** (`web/content/level*.ts`, 48 lessons) — not reviewed for
  pedagogical quality.
- **Profiled performance** — the render-cost findings below are read from code, not
  measured with a profiler. They are labelled accordingly.
- **Two subagents failed mid-run on an API spend limit** (design-system and
  competitor research). Both categories were re-audited directly by the advisor at
  lighter depth, so the design findings are less exhaustive than the navigation and
  gameplay ones.

## Round 2 direction findings — options, not defects

Deliberately kept out of the plans; these are the maintainer's calls.

### D1. The identity is split between "16 Bit" and "warm parlour"

The name, `BootOverlay.tsx`, `RetroTile.tsx`, and the oscillator chiptune engine all
point at a retro/pixel identity. The execution — Noto Serif SC display type,
jade/gold palette, felt tables, hand-drawn NPC portraits — is a warm Hong Kong
parlour. Neither is wrong; having both is. Every asset produced before this is
settled deepens the split. Plans 015 and 016 both commit to the parlour side because
that is where the existing execution already leans — but this deserves an explicit
decision, including whether the *product name* survives it.

### D2. The feature set is already competitive; the presentation is not

Research into leading Hong Kong mahjong apps found the category leader's headline
learning features are: a step-by-step beginner tutorial, a training mode with
colour-coded per-tile discard hints, and post-game AI coaching reports. **This app
already has all three** — Beginner Assist (GOOD/OK/KEEP), the discard-tip panel, and
`reviewAnalyzer.ts`. The gap versus the category is not capability; it is pacing,
mobile layout, art direction, and navigation — exactly what 011–017 address. That is
a strong position: the expensive part is built.

### D3. Learn / Practice / Reference take 3 of 7 nav slots; every play mode shares 1

Study gets three top-level destinations (plus Progress, which is study telemetry).
Free play, the training table, the Daily Hand, and the nine-floor Jade Parlour story
mode are all compressed behind one "Play" item and are undiscoverable from the nav.
Consider Reference as a slide-over available *during* play rather than a destination,
and Practice as a per-level drill tab inside Learn — freeing two slots for the play
modes that currently have none.

### D4. Onboarding fires after the configuration it should precede

`/play` asks a first-timer to choose Quick vs Full, Easy/Medium/Hard AI, and a
3-faan vs 1-faan minimum — *then* the 3-step intro explaining what a claim and a faan
are appears once tiles are dealt. It is also suppressed entirely for players entering
via the Jade Parlour, the most prominent CTA on Home. Moving it ahead of the config
screen is cheap. The deeper option: lead first-time users straight to the Training
table, which the codebase already describes as "best for your first few hands" but
places fourth on the page, below three config panels.

## Round 2 — findings NOT turned into plans

Recorded so they are not re-audited next round.

| Finding | Verdict |
|---|---|
| Duplicate ghost tiles — departure animation renders once per opponent section (`DiscardPool.tsx:118-127`, `ghostTiles.map` nested inside `playerIds.map`) | **Confirmed genuine visual bug**, ~5-line fix. Too small for its own plan; fold into 015 or fix standalone. |
| Toasts silently drop repeated identical messages (`GameToast` keys its effect on the message string, so a second identical "X claimed Pung" shows nothing) | **Confirmed.** Fix: give toasts a nonce. Fold into 013. |
| Round progress not shown — "東 · H1" has no denominator; `match.currentRound` is available one level up in `GameBoard` | **Confirmed.** Two-prop fix. Fold into any game-HUD work. |
| Kong is auto-selected with no chooser and no undo — fires on the first four-of-a-kind in Map order; `ChowSelector` is a working template | **Confirmed** but rare in play. Queue behind the P1s. |
| Whole match JSON-serialized to `localStorage` on every state change (~70–80 blocking writes per hand) | Real, and likely the best pure-perf win available. Deferred only because it is invisible next to the mobile-layout and pacing problems. **Promote if mobile stutter persists after 011 + 014.** |
| `TileFlightLayer` re-measures every `[data-flight-tile]` in the document on each state change | Real layout thrash, worsens as the discard pool fills. MED risk (stale rects → tiles fly from wrong positions). Revisit after 011. |
| Win-detection + scoring run unmemoized on every controller render | Real, read from code, **not measured**. Straightforward `useMemo`; do opportunistically alongside 013, not worth its own plan without a profile. |
| Daily-mode matches initialize twice on mount | MED confidence — dependency cycle visible in code, not confirmed at runtime, and the deal is seeded so the outcome is unaffected. Investigate before planning. |
| Two tile renderers — `MahjongTile` on learning surfaces, `RetroTile` in-game | Real divergence: players learn a tile in one visual language and play it in another. Worth unifying, but entangled with **D1** — do not consolidate before the identity question is settled. |
| `CLAUDE.md` documents Inter + Plus Jakarta Sans; the app actually loads Noto Sans SC + Noto Serif SC (`app/layout.tsx:2`) | **Confirmed stale docs.** One-line fix, no plan needed — but do it, because the design-system doc is what future contributors will trust. |
| `appConstants.LEARNING_LEVELS` has drifted from real level titles, and `learn/page.tsx` carries a comment claiming it derives from level data when it does not | **Confirmed.** Actively-wrong comment guarding a drift hazard, plus dead Firebase constants from the removed backend. Small cleanup. |
| Eight deferred placeholder routes with eight bespoke apology copies | Real duplication, but zero inbound links means near-zero user impact. Consolidate opportunistically. |
| Tenpai-badge 34-prototype scan | **Already rejected in round 1** ("dep array already keys on hand/meld signatures — not worth doing"). Re-surfaced by a round-2 subagent; the round-1 verdict stands. |

---

# Round 1 — correctness, security, perf, tests (2026-06-11)

Generated by the improve skill on 2026-06-11 (audit at commit `efb5a21`).

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | [useGameController game-flow integration tests](001-usegamecontroller-integration-tests.md) | P1 | M | — | DONE (commit `cdd2644`, 11 flow tests) |
| 002 | [Restrict player_rooms RLS to participants](002-player-rooms-rls-policy.md) | P1 | S | — | DONE (commit `5804d30` — migration authored, NOT yet applied to live Supabase) |
| 003 | [Memoize game-board hot-path components](003-gameboard-memoization.md) | P2 | S | — | DONE (commit `928da52`) |
| 004 | [Clear dev-dependency audit advisories](004-dev-dependency-advisories.md) | P1 | S | — | DONE (commit `24a9255`, merged via PR #86 branch) |
| 005 | [Remove dead soundService, archive stale RN docs](005-dead-code-stale-docs-cleanup.md) | P3 | S | — | DONE (commit `77f0977` — GEMINI.md kept at root, see note below) |
| 006 | [Claim-countdown hardening (pass() out of updater)](006-claim-countdown-hardening.md) | P2 | S | 001 | DONE (commit `5e5abb6`, +1 pinning test) |
| 007 | [Validate saved-game snapshots on revival](007-snapshot-revival-validation.md) | P2 | M | 001 (soft) | DONE (commit `203140d`, validator + 9 tests) |
| 008 | [Drop unsafe-eval from production CSP](008-csp-production-tightening.md) | P2 | M | — | DONE (commit `06330c6`) |
| 009 | [ESLint 9 flat-config migration](009-eslint-9-migration.md) | P3 | M | — | DONE (commit `29b6e75`) |
| 010 | [Design spike: seed + action-log replay format](010-replay-format-design-spike.md) | P2 | M | — | DONE (commit `042e194`, design doc at plans/spikes/replay-format-design.md) |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED
(with one-line rationale — finding fixed independently or approach abandoned).
Dependency modifiers: "(soft)" = recommended ordering, not a hard blocker — the plan
can proceed alone if the dependency is delayed.

## Execution record (2026-06-11)

All ten plans were executed on branch `feature/improve-plans-batch` (one commit per
plan), each reviewed and approved against its done criteria before the next dispatch.
Deviations from plan text, judged acceptable on review:

- **005**: `GEMINI.md` was NOT archived — review found it documents the current web
  app (it is the Gemini-agent counterpart of CLAUDE.md), so it stays at the root.
  Only the five genuinely-stale RN/Firebase docs moved to `docs/archive/`.
- **006**: executor added a `prev > 0` transition guard to the interval tick (the
  plan's pseudocode would have re-fired `pass()` on post-zero ticks). Correct fix.
- **007**: `web/lib/__tests__/storageService.test.ts` (out of scope) needed a fixture
  update — its minimal game used `players: []`, which the new validator rightly rejects.
- **009**: ESLint 9 surfaces 2 warn-only "unused eslint-disable directive" findings in
  `useGameController.ts` (inline disables shadowed by the file-level disable).
  Follow-up candidate, deliberately not fixed in the migration commit.
- **002**: the migration file is authored but must still be APPLIED to the live
  Supabase project by the operator (dashboard, `supabase db push`, or Supabase MCP).

## Round 1 dependency notes

- **006 requires 001**: the claim-countdown rewrite needs the flow-test suite as its
  regression net (and adds a test to it).
- **007 soft-depends on 001**: the resume-path tests in 001 cover the consumer of
  `loadGame`; 007 can proceed alone if 001 is delayed.
- **007 and 010 interact**: both touch the save-version gate in
  `web/lib/matchStorage.ts` (007 validates v1; 010 designs v2). Whichever lands second
  accounts for the other — both plans note this.
- 002, 003, 004, 005, 008, 009 are fully independent and can run in any order or in
  parallel worktrees.
- A future refactor of `useGameController` (deliberately NOT planned — see below) must
  not start before 001 and 006 are DONE.

## Round 1 — findings considered and rejected

Recorded so nobody re-audits them:

- **Claim-countdown interval "churn"** (`useGameController.ts:828` dep `claimTimer > 0`):
  the boolean dep only flips at the zero boundary — intentional and correct; the only
  real issue there is the updater side effect, covered by plan 006.
- **Tenpai-badge perf** (`useGameController.ts:587-626`): dep array already keys on
  hand/meld signatures, exactly as the inline comment says; the 34-prototype scan does
  not run per opponent action. Not worth doing.
- **TilePaletteContext re-render churn**: `getTilePalette` returns stable module-level
  constants (`web/lib/cosmetics.ts:111-114`) — context value identity is already stable.
- **"gameReducer has zero tests"**: false — `web/store/reducers/__tests__/gameReducer.test.ts` exists.
- **profiles / rooms public SELECT (`USING (true)`)**: by design for the public
  leaderboard and lobby listing. Restricting profile enumeration is a product
  decision, not a defect; revisit before ranked launch.
- **Explicit deny-write policies on match_history/leaderboard**: Postgres RLS already
  default-denies writes with no policy; adding `USING (false)` policies is
  documentation, not security. Fold into multiplayer build work instead.
- **Sentry org/project hardcoded in next.config.js**: public identifiers, also visible
  in built artifacts; no exploitable impact.
- **Various null-guard / audio-edge findings** (`turnManager.ts:388` non-null
  assertion after guard, musicEngine stop() ramp cleanup, scoring-effect winner-not-found
  silence): guards or try/catch already present; corruption-only scenarios; below the
  effort bar.
- **Result-screen layout duplication** (HandResultScreen / GameOverScreen /
  MatchOverScreen): real but presentation-only and MED-confidence on shareability;
  revisit if a fourth result screen appears.
- **Storage-helper consolidation** (matchStorage / settingsStorage / storageService):
  real divergence, ~10 call sites, MED risk on a critical persistence path — deferred
  in favor of higher-leverage work; reconsider after 007 lands (it adds the validator
  pattern a unified module would adopt).
- **useGameController monolith refactor** (887 lines): legitimate, but blocked on 001 +
  006 by policy; deliberately not planned this round to avoid a risky refactor with a
  brand-new safety net. Propose after the test suite has caught at least one real
  regression.
- **React 18 → 19**: deferred — HIGH risk, ~41 `React.FC`/type touchpoints, no
  forcing function yet. Reassess when a dependency requires it or before the Next 16
  upgrade.
- **Pre-commit hooks (husky/lint-staged)**: CI already gates lint/typecheck/tests on
  every PR; local hooks are developer preference, not a gap. Operator can request a
  plan if wanted.

## Round 1 — audit coverage notes

Audited at `standard` depth (4 parallel read-only agents: correctness, security,
perf+tests, debt/deps/DX/direction), findings vetted against source by the advisor.
NOT audited: the legacy React Native shell (`/src`, `/android`, `/ios` — frozen per
CLAUDE.md), Supabase edge functions (none in repo), deep e2e spec quality review.
Existing tracker `SECURITY_REMEDIATION.md` was treated as authoritative for
already-known items; one stale entry found (seedable RNG — see plan 010).
