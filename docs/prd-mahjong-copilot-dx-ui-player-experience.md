# 16 Bit Mahjong DX, UI, and Player Experience PRD

**Date:** 2026-04-30  
**Status:** Draft PRD — implementation started  
**Owner:** Justin Elrod  
**Product:** 16 Bit Mahjong / Mahjong Copilot  
**Primary codebase:** `web/` — Next.js 14, React 18, TypeScript, Redux Toolkit, Tailwind CSS  
**Variant focus:** Hong Kong Mahjong first  

---

## 1. Executive Summary

16 Bit Mahjong already has the hard part: a real game engine, working Hong Kong Mahjong gameplay, AI opponents, learning screens, practice flows, and reference material. The next product push should make the app feel less like a Mahjong implementation with educational pages bolted on, and more like a true beginner-friendly Mahjong tutor.

The core problem is not engine depth. The core problem is comprehension. A new player can reach the game board, select tiles, discard, claim, and browse reference material, but the UI too often assumes the player already understands Mahjong vocabulary and decision logic.

This PRD defines the next major improvement package across three pillars:

1. **Developer Experience:** make local boot, testing, and contribution flow reliable.
2. **Game UI:** make the active game explain what is happening and what the player should do next.
3. **Player Experience:** turn learning, practice, quiz, reference, and progress into a coherent beginner journey.
4. **Scope Discipline:** remove authentication and multiplayer from this release instead of carrying half-working infrastructure through the core app.

No gameplay rule expansion is included in this PRD. This is a polish and learning-experience release, not a new ruleset release. One knife at a time.

---

## 2. Goals

### 2.1 Product Goals

- Help complete beginners understand what to do during an active Mahjong hand.
- Make recommended moves explainable, not just highlighted.
- Reduce confusion around Mahjong terms: fan, wall, chow, pung, kong, tenpai, flower, shanten, safe tile.
- Make learning progression obvious: where to start, what is locked, what unlocks next.
- Make practice feel like skill-building instead of isolated mini-games.
- Make reference material searchable and accessible without leaving the active game.
- Improve accessibility by reducing color-only state communication.

### 2.2 Developer Goals

- Allow the app to run locally without Supabase credentials or authentication setup.
- Remove Supabase/authentication from the MVP runtime until multiplayer and cloud sync are fully scoped.
- Eliminate known lint/test warnings.
- Add smoke coverage for the beginner gameplay path.
- Preserve the deterministic game engine architecture.
- Avoid rewriting the design system or navigation architecture unless required.

### 2.3 Non-Goals

- Add Riichi, American, Singaporean, or Chinese Classical variants.
- Add multiplayer.
- Add authentication.
- Add user profiles.
- Add cloud progress sync.
- Add real-time cloud sync.
- Add video lessons.
- Redesign the full visual identity.
- Replace Redux.
- Replace the engine.
- Build a full analytics backend.
- Build an AI chatbot tutor.

### 2.4 Scope Decision: Authentication and Multiplayer Deferred

Authentication is explicitly out of scope for this release.

The previous Supabase/auth/multiplayer surface created local development friction, runtime crash risk, and product ambiguity. That stack is being removed from the active app until the core solo game, learning flow, UI, accessibility, and gameplay experience are stable.

Requirements for this release:

- The app must boot and run with no Supabase environment variables.
- Core routes must not create Supabase clients.
- The app shell must not include auth listeners, sign-in state, account redirects, or login-gated routes.
- Progress is local-only for now.
- Multiplayer, ranked play, profiles, leaderboards, cloud sync, and account creation must show deferred/coming-later UX or be hidden from primary navigation.
- Reintroducing authentication must be a separate scoped PRD covering user identity, profile model, cloud progress sync, room ownership, realtime multiplayer, ranked state, and abuse prevention.

---

## 3. Target Users

### 3.1 Primary Persona: Complete Beginner

A user who has heard of Mahjong but does not understand tiles, sets, turn flow, claiming, scoring, or winning patterns.

**Needs:**
- Clear next action.
- Plain-English explanations.
- Visual examples.
- Feedback after mistakes.
- No unexplained jargon.

### 3.2 Secondary Persona: Casual Learner

A user who knows some basics but wants to improve strategy and scoring.

**Needs:**
- Move explanations.
- Practice stats.
- Scoring references.
- Pattern recognition drills.

### 3.3 Tertiary Persona: Developer / Contributor

A developer evaluating or improving the project locally.

**Needs:**
- Clone, install, run without secret setup.
- Reliable test commands.
- Clear env behavior.
- No avoidable runtime landmines.

---

## 4. Current State Summary

### 4.1 What Works

- Next.js web app is the active codebase.
- Deterministic TypeScript engine handles core Hong Kong Mahjong gameplay.
- Active game board supports selecting and discarding tiles.
- AI opponents exist with multiple difficulty tiers.
- Learn, Practice, Reference, Progress, and Play sections exist.
- Unit tests, typecheck, and lint are available.
- Retro 16-bit visual identity is coherent.

### 4.2 Known Problems From UX/DX Review

| Area | Problem | Impact |
|---|---|---|
| Local DX | App crashes without Supabase env vars despite docs saying solo play works offline | High contributor friction |
| Active game | Mahjong terms are shown without enough explanation | Beginners get lost |
| Active game | Recommended/discouraged discard logic is not concrete enough | Player clicks randomly instead of learning |
| Active game | Selection and tile states rely too heavily on color | Accessibility and comprehension issue |
| Active game | Discard CTA is generic | Player has less confidence in action |
| Learn | Progression and unlock criteria are too quiet | Learning path lacks momentum |
| Practice | Cards lack mastery, best score, attempts, and recommended next step | Practice feels disconnected |
| Quiz | Correct/incorrect feedback does not teach enough | Missed learning opportunity |
| Reference | No search or in-game quick reference | Players must leave context to understand terms |
| Navigation | Active page state could be stronger | Orientation issue |
| Code quality | Known hook dependency and ref warnings | Noise, future bug risk |

---

## 5. Product Requirements

## 5.1 DX-01: Offline / Local-First Supabase Fallback

### Problem

The README states Supabase env vars are optional for offline play, but the app currently crashes when those variables are missing.

### Requirement

The app must boot locally without real Supabase credentials for all offline-supported features.

### User Stories

- As a developer, I can run `npm run dev` after installing dependencies without creating a Supabase project.
- As a player, I can play solo mode locally even when auth/sync is unavailable.
- As a developer, I see a clear disabled/auth-unavailable state instead of a runtime exception.

### Functional Requirements

- Detect missing or placeholder Supabase env vars.
- Do not instantiate the browser Supabase client with invalid values.
- Auth-only features should degrade gracefully.
- Solo play, learn, practice, reference, and local progress screens should remain accessible.
- Any sign-in/sync UI should show an explicit offline/auth unavailable message.

### Acceptance Criteria

- Given no `.env.local`, when running the web app, the home page loads.
- Given no `.env.local`, when navigating to `/play`, the play page loads.
- Given no `.env.local`, when starting a solo game, the active game board loads.
- Given no Supabase env vars, no Supabase runtime exception appears in browser console.
- Given valid Supabase env vars, existing auth behavior continues to work.

### Priority

P0.

---

## 5.2 DX-02: Clean Warnings and Quality Gates

### Problem

The codebase currently has known warnings:

- `GameBoard.tsx` missing React hook dependency.
- Dialog/ref warning likely caused by a button component that does not forward refs.

### Requirement

Quality commands should run cleanly without known avoidable warnings.

### Functional Requirements

- Fix the `GameBoard.tsx` hook dependency issue or restructure the effect to make dependencies intentional.
- Update the shared `Button` component to support forwarded refs if used by Radix/dialog-style components.
- Add or update tests to cover the ref-compatible button behavior where practical.

### Acceptance Criteria

- `npm run typecheck` passes.
- `npm run lint` passes with no new warnings.
- `npm test` passes.
- Dialog/ref warning no longer appears during test runs.

### Priority

P0.

---

## 5.3 DX-03: Beginner Gameplay Smoke Tests

### Problem

The primary beginner path needs automated coverage so future UI changes do not silently break the core experience.

### Requirement

Add Playwright smoke tests for the local beginner flow.

### Functional Requirements

Smoke test should cover:

1. Home page loads without Supabase env vars.
2. User can navigate to Play.
3. User can start a quick/easy solo game.
4. Game board renders player hand.
5. User can select a tile.
6. Discard CTA updates.
7. User can discard selected tile.
8. Reference page or in-game reference modal can be opened.

### Acceptance Criteria

- `npm run test:e2e` passes locally.
- Smoke test does not require real Supabase credentials.
- Test uses stable selectors or accessible labels, not fragile CSS-only selectors.

### Priority

P1.

---

## 6. Game UI Requirements

## 6.1 GAME-01: Beginner Assist Mode

### Problem

The active game board is playable but assumes too much Mahjong knowledge.

### Requirement

Add a Beginner Assist layer that explains the current turn, visible terms, tile evaluations, and recommended actions.

### Default Behavior

- Beginner Assist is **on by default** for Easy mode.
- Beginner Assist can be toggled off in-game.
- Medium/Hard may default to off, but should allow enabling.

### Functional Requirements

Beginner Assist must include:

- Current objective text.
- Tile classification legend.
- Explanation for selected tile.
- Explanation for recommended discard.
- Glossary tooltips for common terms.
- Plain-English claim guidance.

### Example Current Objective Copy

```txt
Choose one tile to discard. Try to keep tiles that form pairs or sequences.
```

When claim is available:

```txt
Another player discarded 5 Bamboo. You can claim it to make a Chow. Claiming helps build a set, but it also reveals part of your hand.
```

### Acceptance Criteria

- Easy mode game board shows Beginner Assist by default.
- User can hide/show Beginner Assist.
- Selecting a tile updates the explanation panel.
- Claim prompts include a plain-English reason for each available claim.
- No required gameplay action is available only through unexplained iconography.

### Priority

P0.

---

## 6.2 GAME-02: Dynamic Discard CTA

### Problem

The discard flow works, but the button does not clearly confirm what tile will be discarded.

### Requirement

Update the discard button and helper text to reflect selected state.

### Functional Requirements

- Before selection, helper text should tell the player to choose a tile.
- Before selection, discard button should be disabled.
- After selection, helper text should name the selected tile.
- After selection, discard button should include the tile name.

### Example Copy

Before tile selection:

```txt
Choose one tile from your hand.
[ DISCARD SELECTED TILE ]
```

After selecting One Bamboo:

```txt
Selected: One Bamboo. Discard it or choose another tile.
[ DISCARD ONE BAMBOO ]
```

### Acceptance Criteria

- Button text updates when a tile is selected.
- Button returns to disabled state when no tile is selected.
- Button has an accessible label including the selected tile name.
- Existing discard behavior is unchanged.

### Priority

P0.

---

## 6.3 GAME-03: Tile Evaluation Legend and Non-Color Indicators

### Problem

Tile recommendation state relies heavily on border/color differences.

### Requirement

Tile evaluation states must use text/icon labels in addition to color.

### Functional Requirements

Provide a visible legend with three states:

| State | Meaning | Example Label |
|---|---|---|
| Recommended discard | Tile is least useful or safest to discard | `GOOD DISCARD` |
| Neutral discard | Discard is acceptable but not ideal | `OK` |
| Keep / risky discard | Tile contributes to hand or is dangerous | `KEEP` |

Tile state should be communicated through:

- Color.
- Icon or badge.
- Accessible label.
- Explanation in Beginner Assist panel.

### Acceptance Criteria

- A colorblind user can distinguish recommendation states without relying on color.
- Screen readers can announce the recommendation state.
- Legend is visible or easily expandable in Beginner Assist mode.

### Priority

P0.

---

## 6.4 GAME-04: Concrete Move Explanations

### Problem

Tips like “distance from winning” are useful to experienced players but vague for beginners.

### Requirement

Discard explanations must explain why a tile is good, neutral, or bad in concrete hand terms.

### Functional Requirements

Explanations should reference:

- Pair potential.
- Sequence potential.
- Set potential.
- Honor/dragon/wind value.
- Isolation.
- Safety/danger where available.
- Shanten/tenpai only after plain-English explanation.

### Example Copy

Bad:

```txt
Discarding this keeps your hand at the same distance from winning.
```

Better:

```txt
Discard 3 Dot: it does not pair with anything and does not help form a sequence. Your hand stays the same distance from winning.
```

Better:

```txt
Keep East Wind: you already have a pair. A pair can become your winning pair or grow into a pung.
```

### Acceptance Criteria

- Recommended discard includes at least one concrete reason.
- Selected tile explanation changes when selecting a different tile.
- Existing AI/game logic does not need to become perfect; explanations should honestly reflect the current heuristic.

### Priority

P0.

---

## 6.5 GAME-05: Contextual Glossary Tooltips

### Problem

The active board uses Mahjong terms without enough immediate help.

### Requirement

Common terms on the game board must have inline explanations available without leaving the game.

### Terms Required For MVP

- Wall.
- Fan.
- Chow.
- Pung.
- Kong.
- Tenpai.
- Shanten / distance from winning.
- Flower.
- Dragon.
- Wind.
- Meld.
- Claim.

### Functional Requirements

- Terms should use a small `?` or equivalent help affordance.
- Clicking/tapping opens a compact tooltip or modal.
- Modal must not navigate away from the active game.
- Modal should link to full Reference entry when available.

### Acceptance Criteria

- User can learn what `Wall` means from the game board.
- User can learn what `Fan` means from the game board.
- Opening and closing tooltip/modal preserves game state.
- Tooltip/modal is keyboard accessible.

### Priority

P1.

---

## 6.6 GAME-06: Claim Decision Guidance

### Problem

Chow/Pung/Kong claim prompts tell the user what is possible, but not whether it is wise.

### Requirement

Claim prompts should explain the consequence of claiming versus passing.

### Functional Requirements

For each claim option, show:

- What set will be formed.
- Which tiles from the user’s hand are involved.
- Whether the claim opens/reveals part of the hand.
- A beginner recommendation where possible.

### Example Copy

```txt
Pung: Use your two Red Dragons with the discarded Red Dragon to make a set of three. This is usually strong because dragon pungs score fan.
```

```txt
Pass: Keep your hand concealed. Passing may be better if this claim does not improve your hand shape.
```

### Acceptance Criteria

- Claim UI includes explanations for available claims.
- Passing is explained as a valid strategic option, not just a dismiss button.
- Claim behavior remains engine-driven and unchanged.

### Priority

P1.

---

## 7. Learning Experience Requirements

## 7.1 LEARN-01: Clear Learning Path

### Problem

The Learn page has modules, but the path and unlock logic are too quiet.

### Requirement

Make the learning path explicit and motivational.

### Functional Requirements

Add a top-level path visualization:

```txt
Tiles → Sets → Winning Hands → Scoring → Strategy → Full Game
```

Each module card should show:

- Level number.
- Title.
- Lesson count.
- Estimated time.
- Progress count.
- Lock/unlock status.
- Why locked, if locked.
- Recommended next action.

### Example Card Copy

```txt
Level 1
Know Your Tiles
8 lessons · ~12 min
Start here if you are new to Mahjong.
Progress: 0/8
[ START ]
```

Locked module:

```txt
Locked
Complete “Know Your Tiles” to unlock.
```

### Acceptance Criteria

- New user can identify the first recommended lesson in under 5 seconds.
- Locked modules explain exactly how to unlock them.
- Completed modules show completion state.
- Partially completed modules show continue state.

### Priority

P1.

---

## 7.2 LEARN-02: Lesson Completion Feedback

### Problem

Progression is less satisfying when completion does not clearly reinforce learning.

### Requirement

Lesson completion should provide short feedback and next-step guidance.

### Functional Requirements

On lesson completion, show:

- What the user learned.
- Progress gained.
- Next recommended lesson/practice.
- Optional quick review button.

### Acceptance Criteria

- Completing a lesson changes module progress.
- Completion state survives navigation.
- User is offered a clear next action.

### Priority

P2.

---

## 8. Practice and Quiz Requirements

## 8.1 PRACTICE-01: Practice Card Metadata

### Problem

Practice modes exist, but cards do not surface enough performance context.

### Requirement

Practice cards should show score, attempts, mastery, and recommendation state.

### Functional Requirements

Each practice card should support:

- Best score.
- Last score.
- Attempts.
- Mastery label.
- Recommended badge.
- Continue/start button state.

### Example Copy

```txt
Tile Quiz
10 questions · Best: 8/10 · Last: 6/10
Recommended
[ CONTINUE ]
```

Mastery labels:

- New.
- Needs Work.
- Improving.
- Mastered.

### Acceptance Criteria

- Tile Quiz card shows best score after at least one attempt.
- Recommended card is derived from weak area or next learning step.
- Empty state looks intentional for first-time users.

### Priority

P1.

---

## 8.2 PRACTICE-02: Quiz Explanation Feedback

### Problem

Quiz feedback confirms correctness but does not teach enough.

### Requirement

Every quiz answer should include an explanation.

### Functional Requirements

For correct answers:

- Confirm correctness.
- Explain why the answer is correct.
- Include a distinguishing detail.

For incorrect answers:

- Say why selected answer is wrong.
- Say why correct answer is right.
- Encourage retry or continue.

### Example Correct Feedback

```txt
Correct. The White Dragon is often shown as a blank tile or a tile with a blue/green frame depending on the set style.
```

### Example Incorrect Feedback

```txt
Not Flower. Flowers are bonus tiles numbered 1–4 and are not used in normal melds. This tile is the White Dragon.
```

### Acceptance Criteria

- Every Tile Quiz question has correct-answer explanation copy.
- Every Tile Quiz question has wrong-answer explanation copy or generated fallback copy.
- Feedback remains visible long enough to read before next question.
- Score behavior remains unchanged.

### Priority

P0.

---

## 8.3 PRACTICE-03: Bidirectional Tile Recognition

### Problem

Recognition should work both from visual tile to name and from name/description to tile.

### Requirement

Tile Quiz should include multiple recognition modes.

### Functional Requirements

Supported prompt types:

1. Tile image/symbol → choose name.
2. Tile name → choose image/symbol.
3. Tile description → choose name.

### Acceptance Criteria

- Quiz can generate at least two prompt types for MVP.
- Prompt type is visible to user.
- Score calculation handles all prompt types consistently.

### Priority

P2.

---

## 9. Reference Requirements

## 9.1 REF-01: Searchable Reference

### Problem

The reference page has useful tabs but no fast lookup.

### Requirement

Add search across tiles, scoring, hands, and glossary.

### Functional Requirements

Search should support:

- Term name.
- Alias/synonym.
- Category.
- Short description.

Initial searchable categories:

- Tiles.
- Scoring.
- Hands.
- Glossary.

Example searches:

- `dragon`.
- `fan`.
- `seven pairs`.
- `flower`.
- `kong`.
- `wall`.

### Acceptance Criteria

- Search input is visible on Reference page.
- Search returns matching entries across tabs/categories.
- Empty state suggests example searches.
- Selecting result opens the relevant entry.
- Search is keyboard accessible.

### Priority

P1.

---

## 9.2 REF-02: In-Game Reference Modal

### Problem

Players should not have to abandon an active hand to understand a term.

### Requirement

Add compact reference modal accessible from the game board.

### Functional Requirements

- Modal opens over active game.
- Modal can show glossary term, tile info, scoring info, or hand pattern summary.
- Modal includes link/button to full Reference page when appropriate.
- Modal preserves current game state.

### Acceptance Criteria

- Clicking `Fan ?` opens fan explanation in modal.
- Clicking `Wall ?` opens wall explanation in modal.
- Closing modal returns user to same game state.
- Modal focus is trapped and restored correctly.

### Priority

P1.

---

## 10. Navigation and Accessibility Requirements

## 10.1 A11Y-01: Active Navigation State

### Problem

Users need stronger orientation across Home, Learn, Practice, Reference, Progress, Settings, and Play.

### Requirement

Navigation must show clear active page state visually and semantically.

### Functional Requirements

- Add visible active marker, such as `►`, stronger background, or gold border.
- Add `aria-current="page"` for active nav item.
- Preserve existing retro visual style.

### Acceptance Criteria

- Sighted users can identify active section immediately.
- Screen readers announce current page.
- Active state works across main route group and play routes.

### Priority

P1.

---

## 10.2 A11Y-02: Reduce Color-Only UI State

### Problem

Difficulty selection, play mode selection, and tile recommendations rely too heavily on color.

### Requirement

All selected/recommended/disabled/risky states must have non-color indicators.

### Functional Requirements

- Selected play mode shows checkmark or selected label.
- Selected difficulty shows checkmark or selected label.
- Tile recommendation states show labels/icons.
- Disabled buttons include textual disabled reason where useful.

### Acceptance Criteria

- User can identify selected Play mode without color.
- User can identify selected difficulty without color.
- User can identify tile recommendation state without color.

### Priority

P1.

---

## 10.3 A11Y-03: Keyboard and Focus Audit

### Problem

Game and modal interactions need predictable keyboard behavior.

### Requirement

Core flows must be keyboard navigable.

### Functional Requirements

- Main nav reachable by keyboard.
- Play mode and difficulty cards reachable by keyboard.
- Game hand tiles reachable/selectable by keyboard where feasible.
- Discard button reachable by keyboard.
- Reference search usable by keyboard.
- Modal focus trap and restore work correctly.

### Acceptance Criteria

- User can start a game using keyboard only.
- User can open and close glossary modal using keyboard only.
- Focus indicator is visible on interactive elements.

### Priority

P2.

---

## 11. Content Requirements

## 11.1 Glossary MVP Entries

Create or normalize copy for these terms:

| Term | Short Definition Requirement |
|---|---|
| Wall | Remaining draw pile tiles |
| Fan | Scoring multiplier/unit in Hong Kong Mahjong |
| Chow | Sequence of three suited tiles |
| Pung | Three identical tiles |
| Kong | Four identical tiles |
| Tenpai | One tile away from winning |
| Shanten | Number of steps away from tenpai/winning readiness |
| Flower | Bonus tile that scores but does not form normal melds |
| Dragon | Honor tile category: Red, Green, White |
| Wind | Honor tile category: East, South, West, North |
| Meld | Revealed set made by claim or kong declaration |
| Claim | Taking another player's discard to complete a set or win |

### Acceptance Criteria

- Each term has short copy for tooltip/modal.
- Each term has expanded copy for Reference.
- Copy uses beginner-friendly language before technical language.

---

## 11.2 Quiz Explanation Copy

For Tile Quiz MVP, each tile or tile category should include:

- Correct answer explanation.
- Common wrong answer explanation.
- Visual distinguishing detail.

### Acceptance Criteria

- White Dragon includes explanation that it may appear blank or framed depending on set style.
- Flowers/Seasons are explained as bonus tiles.
- Winds and Dragons are explained as honor tiles.
- Suits explain sequence potential.

---

## 12. Data and State Requirements

## 12.1 Local Progress Support

### Requirement

Practice metadata and quiz mastery should work locally before requiring cloud sync.

### Functional Requirements

Track at minimum:

- Quiz attempts.
- Best score.
- Last score.
- Last attempted timestamp.
- Per-category weak areas where easy to derive.
- Lesson progress.

### Storage Approach

- Use existing Redux/progress architecture where possible.
- Persist locally using the app’s existing local persistence mechanism if available.
- Sync to Supabase only when auth is configured and user is signed in.

### Acceptance Criteria

- First-time user sees clean empty states.
- Completing quiz updates practice card metadata.
- Refreshing page does not lose local progress if local persistence already exists or is added as part of this scope.
- Missing Supabase does not block progress tracking.

### Priority

P1.

---

## 13. Analytics Requirements

No external analytics are required for this PRD.

If lightweight internal events already exist, add events for:

- Beginner Assist toggled.
- Tooltip opened.
- Reference search query submitted.
- Quiz answered.
- Practice card opened.

If no analytics infrastructure exists, do not add one just for this release. That would be scope creep wearing a fake mustache.

---

## 14. Technical Constraints

- Preserve engine purity: no UI or storage side effects in `web/engine/`.
- Keep rule logic engine-driven.
- Keep explanations honest to existing heuristics.
- Prefer reusable UI primitives over one-off components.
- Maintain Tailwind retro theme tokens.
- Do not require Supabase for offline/solo paths.
- Maintain TypeScript strictness and existing test standards.
- Avoid adding heavy dependencies unless clearly justified.

---

## 15. Proposed Implementation Phases

This section is a product implementation sequence, not authorization to start coding.

## Phase 1 — Trust Breakers and Baseline Quality

**Goal:** make the app honest, bootable, and clean.

Scope:

1. Supabase optional/offline mode guard.
2. Fix known React hook warning.
3. Fix shared button ref warning.
4. Add/update local boot smoke coverage.
5. Confirm core commands pass.

Exit Criteria:

- App boots without Supabase env vars.
- Typecheck, lint, unit tests pass cleanly.
- Beginner smoke path has automated coverage.

Priority: P0.

---

## Phase 2 — Active Game Beginner Clarity

**Goal:** make the game board self-explaining.

Scope:

1. Beginner Assist panel.
2. Dynamic discard CTA.
3. Tile evaluation legend.
4. Non-color indicators.
5. Concrete discard explanations.
6. Claim decision guidance.

Exit Criteria:

- A beginner can understand what to do next on their turn.
- Tile selection produces understandable feedback.
- Claim choices explain consequences.

Priority: P0/P1.

---

## Phase 3 — Learning and Practice Progression

**Goal:** make learning feel like a guided path.

Scope:

1. Learn page path visualization.
2. Module unlock explanations.
3. Lesson completion feedback.
4. Practice card metadata.
5. Quiz explanations.
6. Bidirectional tile recognition if time allows.

Exit Criteria:

- New user sees clear “start here” guidance.
- Practice shows performance context.
- Quiz teaches after each answer.

Priority: P1/P2.

---

## Phase 4 — Reference and Accessibility Polish

**Goal:** make help findable and UI state accessible.

Scope:

1. Reference search.
2. In-game reference modal.
3. Active nav state.
4. Keyboard/focus pass.
5. Color-only state audit.

Exit Criteria:

- User can search terms from Reference.
- User can open term help without leaving game.
- Core flows are more accessible.

Priority: P1/P2.

---

## 16. Suggested Work Breakdown

## Epic A: Developer Experience Foundation

- A1: Add Supabase env detection utility.
- A2: Make Supabase client nullable or provide safe no-op/offline wrapper.
- A3: Update auth UI to handle unavailable Supabase.
- A4: Verify solo paths do not depend on Supabase.
- A5: Fix `GameBoard` hook warning.
- A6: Convert shared `Button` to `forwardRef` if needed.
- A7: Add local no-env boot test.

## Epic B: Beginner Assist Gameplay

- B1: Define tile evaluation display model.
- B2: Add selected tile helper text.
- B3: Add dynamic discard CTA.
- B4: Add tile recommendation badges.
- B5: Add legend component.
- B6: Add Beginner Assist panel.
- B7: Add selected tile explanation copy.
- B8: Add claim explanation copy.
- B9: Add tests for state text and accessible labels.

## Epic C: Glossary and In-Game Help

- C1: Create glossary data source.
- C2: Add term tooltip/modal component.
- C3: Wire game board terms to glossary entries.
- C4: Add Reference deep-link support if needed.
- C5: Add modal focus tests.

## Epic D: Learn Page Progression

- D1: Normalize learning module metadata.
- D2: Add path visualization.
- D3: Add module card estimated time/progress.
- D4: Add lock/unlock reason copy.
- D5: Add completion next-step prompt.

## Epic E: Practice and Quiz Improvement

- E1: Define practice stats shape.
- E2: Persist quiz attempts/best/last score locally.
- E3: Add practice card metadata.
- E4: Add recommendation badge logic.
- E5: Add quiz explanation data.
- E6: Add post-answer explanation UI.
- E7: Add bidirectional quiz prompt support.

## Epic F: Reference Search

- F1: Normalize reference entries.
- F2: Add search index/filter utility.
- F3: Add Reference search input.
- F4: Add result list and empty state.
- F5: Add tests for example searches.

## Epic G: Accessibility Pass

- G1: Add active nav marker and `aria-current`.
- G2: Add non-color selected indicators to Play screen.
- G3: Audit focus states.
- G4: Add keyboard path smoke test where practical.

---

## 17. MVP Cutline

If time gets tight, ship this minimum package:

1. Offline Supabase guard.
2. Warning cleanup.
3. Dynamic discard CTA.
4. Beginner Assist panel with legend.
5. Concrete selected tile / discard explanation.
6. Quiz answer explanations.
7. Active nav state.
8. Basic Reference search.

Do not cut offline boot. If the app does not boot cleanly for a contributor, everything else is lipstick on a raccoon.

---

## 18. Success Metrics

Because no external analytics are required, success should be validated through product checks and optional manual testing.

### Qualitative Success

- A beginner can explain what `Wall`, `Fan`, `Chow`, `Pung`, and `Kong` mean after interacting with the app.
- A beginner can identify why the app recommends a discard.
- A beginner can complete Tile Quiz and understand mistakes.
- A developer can clone and run the app without Supabase setup.

### Quantitative / Testable Success

- `npm run typecheck`: pass.
- `npm run lint`: pass without new warnings.
- `npm test`: pass without known ref warnings.
- `npm run test:e2e`: pass for beginner smoke path.
- No runtime crash without Supabase env vars.
- Reference search returns results for required example terms.

---

## 19. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Explanations overpromise strategy quality | Players may learn wrong lessons | Tie explanations to known heuristics and phrase honestly |
| Scope creep into full tutoring AI | Delays release | Use deterministic explanations first |
| Supabase guard complicates auth code | Bugs in auth state | Centralize env/client availability logic |
| UI gets cluttered | Game board becomes harder to use | Make Beginner Assist collapsible |
| Accessibility work gets bolted on late | Rework | Include labels/focus in component acceptance criteria |
| Reference data duplicates glossary data | Drift | Use one glossary/reference data source where possible |

---

## 20. Open Questions

1. Should Beginner Assist be enabled by default only for Easy, or for all first-time games regardless of difficulty?
2. Should progress remain purely local when signed out, or should signed-in cloud progress supersede local progress?
3. Should Reference search be simple client-side filtering for now, or structured enough to support future fuzzy search?
4. Should tile explanation copy live in static data files, engine-adjacent utilities, or UI-only content modules?
5. Should active game support a “why not this tile?” explanation for every tile, or only selected/recommended tiles in MVP?
6. Should quiz mastery influence Learn unlocks, or should lesson completion alone unlock modules?

Recommended defaults:

1. Beginner Assist on for Easy and first-ever game.
2. Local-first progress, cloud sync later.
3. Simple client-side search now.
4. UI/content module outside engine.
5. Selected/recommended tile explanations for MVP.
6. Lesson completion unlocks modules; quiz mastery recommends practice but does not block progress.

---

## 21. Release Checklist

Before release:

- [ ] App boots locally with no Supabase env vars.
- [ ] App boots with valid Supabase env vars.
- [ ] Easy game starts successfully.
- [ ] Beginner Assist appears in Easy mode.
- [ ] Tile selection updates helper text.
- [ ] Discard CTA includes selected tile name.
- [ ] Tile recommendation legend is visible.
- [ ] Quiz answers show explanations.
- [ ] Reference search works for `fan`, `kong`, `flower`, `dragon`, `wall`.
- [ ] Active nav state is visible and semantic.
- [ ] Keyboard/focus check completed for modal and nav.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:e2e` passes or known failures are documented.
- [ ] README updated if local setup behavior changes.

---

## 22. Final Recommendation

Build this in the order listed: DX foundation first, active game clarity second, learning/practice polish third, reference/accessibility fourth.

The engine is already good enough to support a real tutor experience. The app does not need more Mahjong complexity yet. It needs to explain the Mahjong complexity it already has.
