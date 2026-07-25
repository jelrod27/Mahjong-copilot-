# Plan 016: Replace oscillator chiptune with real audio — parlour room tone and instrumentation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report. When done, update the
> status row in `plans/README.md`.
>
> **IMPORTANT**: This plan requires the operator to choose and supply licensed
> audio files. Step 1 is a decision gate — do not proceed past it on your own.
>
> **Drift check (run first)**: `git diff --stat 700769d..HEAD -- web/lib/musicEngine.ts web/lib/soundManager.ts`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction (audio design)
- **Planned at**: commit `700769d`, 2026-07-25

## Why this matters

The music is generated at runtime from **bare Web Audio oscillators with no
audio assets at all**. `web/lib/musicEngine.ts` is a 252-line procedural
chiptune sequencer: three channels (lead/bass/pad), each a raw oscillator, no
samples, no reverb, no instrument bodies. The compositions themselves are
reasonable — A minor pentatonic, sensible voice leading — but naked oscillators
have no timbre, so any melody played through them sounds thin and cheap. That
is not a composition problem; it is a synthesis problem, and it cannot be fixed
by rewriting patterns.

There is a second, deeper problem: **the audio and the visuals are telling
different stories.** The product is named "16 Bit Mahjong", which pushed the
audio toward chiptune. But the actual visual design is a warm Hong Kong parlour
— Noto Serif SC display type, jade and gold, felt tables, hand-drawn NPC
portraits. Chiptune fights that. Every additional hour spent polishing the
oscillator engine widens the split rather than closing it.

The good news: the engine was built anticipating this. Its own header comment
says commissioned tracks can replace the patterns behind the same
play/stop/duck API. The swap is architecturally cheap.

## Current state

### The engine — `web/lib/musicEngine.ts:1-8`

```ts
/**
 * Procedural chiptune music engine. Web Audio sequencer with a lookahead
 * scheduler (the "tale of two clocks" pattern), exact loop points, and a
 * ducking hook for the win sequence. No audio assets: every voice is an
 * oscillator, in keeping with the 16-bit fantasy. Commissioned tracks can
 * replace patterns later behind the same play/stop/duck API
 * (docs/design/audio.md).
 */
```

Note: `docs/design/audio.md` referenced there **does not exist** —
`ls web/../docs/design/` fails. Treat the comment as intent, not as a spec.

Structure: `MusicTrack` objects (`bpm`, `steps`, `notes`, optional `transpose`)
where each note is `[stepIndex, midiNote, durationInSteps, channel]`. Tracks
defined: `PARLOUR_THEME` (bpm 84, 64 steps) and `DANGER_MOTIF` (bpm 96, 32
steps).

### Sound effects — `web/lib/soundManager.ts:6-15`

The `SoundName` union: `tilePlace, tileDraw, claim, win, winSelfDraw,
winLimitHand, pass, turnAlert, kong`. Read this file to confirm whether these
are also synthesised or already sample-based before changing anything.

### No audio assets exist

```
find web/public -type f \( -name "*.mp3" -o -name "*.ogg" -o -name "*.wav" \)
→ (no results)
```

### Conventions

- `musicEngine.ts` and `soundManager.ts` are plain TypeScript singletons in
  `web/lib/` with no React dependency. Keep that.
- Sound is user-mutable — `GameHUD.tsx:138` has a mute control backed by
  `soundManager.isEnabled()`. Any new audio must respect it.

## Step 1 — DECISION GATE (operator input required)

**Do not write code until the operator has answered these.** Present the
options, get a decision, record it in this file, then proceed.

### Question A: what should this game sound like?

Three coherent directions. Pick one — mixing them reproduces the current
split-brain problem.

| Direction | What it is | Fits because | Cost |
|---|---|---|---|
| **A. Parlour room tone (recommended)** | No melodic loop by default. Ambient bed: distant tile clatter, low room hum, occasional muted chatter. Real tile-clack samples for actions. | Matches the visual identity exactly. Real parlours *are* the sound of tiles. Never becomes annoying on repeat, which a 64-step loop always does. Tenhou's minimalism is preferred by serious players for this reason. | Lowest — ambience is easy to license, small files |
| **B. Sparse traditional instrumentation** | Solo guzheng or pipa motif, long gaps, light reverb, over a quiet room bed. Optional; off by default. | Culturally grounded, warm, distinctive. Signals "Hong Kong" without cliché if kept sparse. | Medium — needs well-recorded samples or a commissioned loop |
| **C. Commit to the 16-bit name** | Proper chiptune with *sampled* SNES-era instruments, not raw oscillators. | Makes the name honest. | Highest — requires re-doing the visual identity to match, or living with the split |

**Recommendation: A, with B as an optional toggle.** It is the cheapest, it is
the hardest to get sick of, and it is the only option that requires no change
to the visual direction. If the operator wants music, ship A as the default bed
and B as an opt-in.

### Question B: where do the files come from?

Do **not** download anything until the operator picks a source and confirms the
licence covers commercial web distribution.

| Source | Licence | Notes |
|---|---|---|
| Pixabay Audio | Royalty-free, no attribution | Easiest; quality varies |
| OpenGameArt.org | CC0 / CC-BY (per asset) | Game-oriented; check each asset |
| Freesound.org | CC0 / CC-BY / CC-BY-NC (per asset) | Best for room tone and tile foley; **CC-BY-NC is unusable here** |
| incompetech.com (Kevin MacLeod) | CC-BY | Large library; attribution required in-app |
| itch.io asset packs | Varies | Many CC0 or low-cost commercial packs |
| Epidemic Sound / Artlist | Subscription | Safest for commercial; ongoing cost |
| Commissioned | Bespoke | Best result; the engine comment already anticipates this |

Whatever is chosen, the operator must confirm: commercial use permitted, web
distribution permitted, and whether attribution is required. **If attribution
is required, this plan must add a credits surface — flag that back before
proceeding.**

**STOP here until both questions are answered.**

## Commands you will need

From `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose   | Command                                | Expected |
|-----------|----------------------------------------|----------|
| Typecheck | `npm run typecheck`                    | exit 0   |
| Lint      | `npm run lint`                         | exit 0   |
| Unit test | `npm test`                             | all pass |
| Build     | `npm run build`                        | exit 0   |

## Scope

**In scope** (once the gate is passed):
- `web/lib/musicEngine.ts`
- `web/lib/soundManager.ts`
- `web/public/audio/**` (new directory for licensed assets)
- `web/app/(main)/settings/SettingsPageClient.tsx` (audio toggles)
- `docs/design/audio.md` (create — it is referenced but missing)

**Out of scope**:
- `web/components/game/**` — call sites should not need to change. The whole
  point of keeping the play/stop/duck API is that consumers are unaffected. If
  you find yourself editing a component, that is a STOP condition.
- `web/lib/tileVoice.ts` — the spoken tile-name feature is separate.
- Any change to when audio is triggered. This plan changes *what is heard*,
  not *when*.

## Git workflow

- Branch: `feature/audio-identity`
- Conventional commits, e.g. `feat(audio): replace oscillator chiptune with parlour room tone`
- Do NOT push or open a PR unless instructed.

## Steps (after the gate)

### Step 2: Add a sample-playback path behind the existing API

Add buffer-based playback to `musicEngine.ts` **without removing the oscillator
path yet**. Keep the exported `play` / `stop` / `duck` signatures byte-identical
so no consumer changes.

- Load audio via `fetch` + `AudioContext.decodeAudioData`, cached per URL.
- Loop the ambient bed with `AudioBufferSourceNode.loop = true`.
- Route through the existing gain node so `duck` continues to work.
- Lazy-load on first play — do not fetch audio during initial page load.

**Verify**: `npm run typecheck` → exit 0, and the game still runs with audio
unchanged (the oscillator path is still the active one at this step).

### Step 3: Add the assets

Place licensed files in `web/public/audio/`. Prefer `.ogg` with an `.mp3`
fallback for Safari. Keep the ambient bed **under 500KB** — it loads on a game
screen that must stay fast.

Record every file's source and licence in `docs/design/audio.md`.

**Verify**: `npm run build` → exit 0, and check the build output does not
regress the route size budget noticeably.

### Step 4: Switch the default and delete the oscillator path

Point the default ambient bed at the new asset. Once verified working, delete
`PARLOUR_THEME`, `DANGER_MOTIF`, the `PatternNote`/`MusicTrack` types, the
`midiToFreq` helper, and the oscillator scheduler.

Update the file header comment — it currently describes an oscillator engine
and will be wrong.

**Verify**: `grep -n "OscillatorNode\|midiToFreq\|PatternNote" web/lib/musicEngine.ts`
→ no matches. `npm test` → all pass.

### Step 5: Give the player control

In `SettingsPageClient.tsx`, add separate **Music** and **Sound effects**
toggles if they are not already separate (check first). Ambient audio that
cannot be turned off independently of gameplay sound is a common complaint.

Default the ambient bed to **on at low volume**; default any melodic loop to
**off**.

**Verify**: `npm run lint` → exit 0.

### Step 6: Listen

`npm run dev`, play a full hand with audio on. Judge:
- Does it sound like a place, rather than like a synthesiser?
- Is it still pleasant after four consecutive hands? (Loop fatigue is the
  failure mode — if you notice the loop point, the bed is too short or too
  melodic.)
- Do tile actions cut through the bed clearly?
- Do the mute controls work independently?

## Test plan

Audio is largely untestable in jsdom. Keep the surface honest instead:

- **Existing tests must keep passing** — `npm test`. If any test mocks
  `musicEngine`, its mock must still satisfy the unchanged public API. That
  the API is unchanged is the main thing worth asserting.
- **Add one unit test** if `web/lib/__tests__/` gains a musicEngine spec: that
  `play()` on an unsupported/missing asset fails soft (no throw, no unhandled
  rejection). Silent failure is correct for background audio; a crash is not.
- **Manual verification** is Step 6.

## Done criteria

ALL must hold:

- [ ] Decision gate answered and recorded in this file
- [ ] Licences recorded in `docs/design/audio.md`
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0
- [ ] `npm run build` exits 0
- [ ] `grep -n "OscillatorNode\|midiToFreq" web/lib/musicEngine.ts` → no matches
- [ ] No files under `web/components/game/` modified (`git status`)
- [ ] Ambient bed under 500KB
- [ ] Music and SFX independently mutable
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- The operator has not answered both gate questions.
- Any candidate asset's licence is unclear, non-commercial, or requires
  attribution with no credits surface in the app.
- You need to modify a file under `web/components/game/` — that means the
  public API changed and the swap is no longer transparent.
- Total audio payload would exceed ~1MB.
- Autoplay policy blocks the ambient bed. Browsers require a user gesture
  before audio; if the bed does not start, report rather than working around
  the policy — it likely needs to begin on the first tile tap.

## Maintenance notes

- **What interacts with this**: `duck` is called by the win sequence. Verify
  ducking still audibly works with a sustained ambient bed, which behaves
  differently from a sparse oscillator loop.
- **What a reviewer should scrutinise**: licence documentation completeness,
  and that assets are lazy-loaded rather than blocking the game route.
- **Deliberately deferred**: per-floor / per-NPC music variation. The Jade
  Parlour's floors could each have a different bed. Additive once the sample
  path exists; not worth doing before the base identity is settled.
- **Related**: `web/lib/tileVoice.ts` speaks tile names. If the chosen
  direction is a Hong Kong parlour, Cantonese tile calls would reinforce it
  strongly — Hong Kong Mahjong Club ships Cantonese voice and reviews cite it
  positively. Separate plan.
