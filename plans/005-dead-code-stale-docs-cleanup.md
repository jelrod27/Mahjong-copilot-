# Plan 005: Remove dead soundService module and archive stale RN/Firebase docs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat efb5a21..HEAD -- web/lib/soundService.ts web/lib/soundManager.ts`
> Also re-run the dead-code grep in Step 1 — if `soundService` has gained an
> importer since this plan was written, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / docs
- **Planned at**: commit `efb5a21`, 2026-06-11

## Why this matters

Two kinds of cruft confuse contributors and agents working in this repo. First,
`web/lib/soundService.ts` is a dead module — an older static-class audio wrapper fully
superseded by `web/lib/soundManager.ts` (10+ importers); a developer debugging sound
can easily land in the wrong file. Second, seven root-level markdown docs describe the
**legacy React Native + Firebase** app as if it were current (the active app is
Next.js + Supabase in `/web`); following them wastes real setup time. The fix is
deletion for the dead module and archival (not deletion) for the docs.

## Current state

- `web/lib/soundService.ts` — 40-line static class `SoundService` playing mp3s from
  `/sounds/*.mp3`. Verified at planning time: **zero imports** anywhere in
  `web/app`, `web/components`, `web/lib`, `web/hooks`, `web/store`.
- `web/lib/soundManager.ts` — the real, actively imported sound implementation. Do not touch.
- Stale root-level docs, all verified to describe the RN/Firebase stack:
  - `FIREBASE_SETUP.md` (Firebase project setup)
  - `SETUP_GUIDE.md` (RN + Firebase setup)
  - `SETUP_CHECKLIST.md` (begins "## ✅ Firebase Setup")
  - `IMPLEMENTATION_SUMMARY.md` (titled "...Implementation Summary (React Native)")
  - `QUICK_REFERENCE.md` (titled "...Quick Reference Card (React Native)")
  - `GEMINI.md` (agent instructions for the RN era)
- Verified: zero references to these filenames from `README.md`, `CLAUDE.md`, or
  `docs/` — archiving them breaks no links.
- `CURSOR.md` at the root is **untracked** in git (`?? CURSOR.md` in status) — it may
  be actively in use by the operator's tooling. **Leave it alone.**
- The web app has zero matches for `firebase`/`firestore`/`google-services` —
  confirming these docs describe only the legacy app. Note `firestore.rules` at the
  root belongs to the legacy app too, but it is **out of scope** (runtime config, not
  a doc; removing it is a separate decision).

## Commands you will need

All from `/Users/justinelrod/Projects/Mahjong-copilot-/web` unless noted:

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Dead-code check | `grep -rn "soundService" --include="*.ts" --include="*.tsx" app components lib hooks store \| grep -v "lib/soundService.ts"` | no output |
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | exit 0 |
| Build | `npm run build` | exit 0 |
| Doc link check (repo root) | `grep -rn "FIREBASE_SETUP\|SETUP_GUIDE\|SETUP_CHECKLIST\|IMPLEMENTATION_SUMMARY\|QUICK_REFERENCE\|GEMINI" README.md CLAUDE.md docs/ 2>/dev/null` | no output |

## Scope

**In scope**:
- Delete: `web/lib/soundService.ts`
- Move (via `git mv`) to `docs/archive/`: the six tracked stale docs listed above
- Create: `docs/archive/README.md` (3-line explanation)

**Out of scope** (do NOT touch):
- `CURSOR.md` (untracked — possibly in active use)
- `web/lib/soundManager.ts`, `web/lib/musicEngine.ts`, `web/lib/tileVoice.ts`
- `firestore.rules`, `/src`, `/android`, `/ios`, root `package.json` — the legacy app
  itself stays; this plan only quarantines misleading *documentation*
- `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `TESTING.md`, `SECURITY_REMEDIATION.md`,
  `DOCUMENTATION_UPDATE.md`, `mahjong-learning-app-spec.md` — current or historical-record docs

## Git workflow

- Branch: `feature/dead-code-stale-docs-cleanup`
- Commit message style: `chore: remove dead soundService, archive legacy RN/Firebase docs`
- Use `git mv` for the doc moves so history follows the files.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Re-verify soundService is dead, then delete it

Run the dead-code grep from the commands table. If empty, `git rm web/lib/soundService.ts`.

**Verify**: `npm run typecheck` → exit 0, and `npm run build` → exit 0.

### Step 2: Verify each doc is stale, then archive

For each of the six docs: `head -10 <file>` and confirm it references Firebase or
React Native (they all did at planning time). Then:

```bash
mkdir -p docs/archive
git mv FIREBASE_SETUP.md SETUP_GUIDE.md SETUP_CHECKLIST.md IMPLEMENTATION_SUMMARY.md QUICK_REFERENCE.md GEMINI.md docs/archive/
```

**Verify**: `ls docs/archive/` → 6 files; `ls *.md` at root no longer lists them.

### Step 3: Add the archive README

Create `docs/archive/README.md`:

```markdown
# Archived docs

These describe the legacy React Native + Firebase app (pre-2026). The active
codebase is the Next.js + Supabase app in `/web` — see the root `README.md`
and `CLAUDE.md`. Kept for historical reference only.
```

**Verify**: file exists.

### Step 4: Confirm no broken references

Run the doc link check from the commands table (expect no output), then `npm test`
from `/web` (exit 0).

## Test plan

No new tests. Typecheck + build prove the deleted module was unreferenced; the grep
proves no doc links broke.

## Done criteria

- [ ] `web/lib/soundService.ts` deleted; `npm run typecheck`, `npm test`, `npm run build` all exit 0
- [ ] Six stale docs moved to `docs/archive/` via `git mv`; `docs/archive/README.md` created
- [ ] `CURSOR.md` untouched
- [ ] Doc link-check grep returns no output
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The dead-code grep finds ANY importer of `soundService`.
- Any of the six docs does NOT reference Firebase/React Native in its first ~10 lines
  (archive only the ones that do; report the exception).
- You are tempted to also delete `/src`, `firestore.rules`, or other legacy app code —
  that is a bigger decision for the operator.

## Maintenance notes

- The legacy RN app itself (`/src`, `/android`, `/ios`, root config) remains; if the
  operator ever decides to remove it, the root `package.json`, `jest.config.js`,
  `babel.config.js`, `metro.config.js`, `app.json`, `index.js`, and `firestore.rules`
  go with it — that should be its own reviewed change.
- Reviewer: check the commit uses `git mv` (renames, not delete+add) so blame survives.
