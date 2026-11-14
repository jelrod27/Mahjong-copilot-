# Protect Saved Matches Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for this single task.

**Goal:** Prevent Start game and Training table from silently replacing an active save.

**Architecture:** Keep a pending launch URL in PlayClient. Check the real save
at click time and reuse the shared Modal before clearing it and navigating.

**Tech Stack:** Next.js, React, TypeScript, Base UI, Vitest, Playwright.

**Spec:** [Approved design](../docs/superpowers/specs/2026-11-14-protect-saved-matches-design.md).

## Global constraints

- Branch `feature/protect-saved-matches`; scope is the two `/play` launch buttons.
- Use the existing Modal and Button primitives; no dependencies or save-format changes.
- Cancel and Escape preserve the save; confirmation preserves the requested launch settings.

## Review focus

- Storage changes after mount: launch checks the current save.
- Cancel then choose another mode: stale pending URLs must not launch.
- Finished saves: launch directly without a misleading warning.
- Keyboard dismissal: preserve progress and return focus to the launch button.
- Resume: preserve storage and open `/play/game` directly.

## Task 1: Guard both replacement actions

**Files:** `web/app/play/PlayClient.tsx`, adjacent `__tests__/PlayClient.test.tsx`,
`web/e2e/play-game.spec.ts`.

**Interfaces:** Consume `canResume(): boolean`, `clearSavedGame(): void`,
`Modal` and `Button`. Produce no new public interface.

- [x] Add regression tests using real match storage for both actions, cancellation,
  confirmation URLs, no save, completed saves, post-mount saves and Resume.
- [x] Run `npx vitest run app/play/__tests__/PlayClient.test.tsx`; observe failures
  caused by immediate deletion/navigation before confirmation.
- [x] Add pending URL state and the shared confirmation modal in PlayClient.
- [x] Run the regression file; expect all tests to pass.
- [x] Add a browser regression covering save preservation, focus return and replacement.
- [x] Run lint, typecheck, `test:coverage`, build and the solo-play browser spec.
- [x] Review the complete diff and mark the plan complete with verification evidence.

## Verification — 2026-11-14

- Reproduced immediate deletion: six regression cases failed before the change;
  all 10 focused cases pass with real save storage.
- Full coverage run: 1,221 tests pass; statements 71.84%, branches 61.76%,
  functions 66.25%, lines 73.23%. Thresholds unchanged.
- Lint: zero errors, eight existing warnings in untouched files. Typecheck and
  production build pass.
- Solo-play browser spec: six tests pass, including desktop and mobile replacement,
  Cancel/Escape preservation, initial focus and focus return, and fresh-match creation.
- Independent read-only review found no functional issues. Its button-contrast
  finding was reproduced with axe (4.18:1), fixed locally, and covered by normal
  and hover contrast checks in both browser cases.
- Scope remains the approved two buttons; other launch routes and cross-tab Resume
  visibility are separate work. Next dev's generated AGENTS.md heading is retained
  as required by repository guidance.
