# 16 Bit Mahjong Visual Overhaul PRD

**Date:** 2026-05-08
**Status:** Draft PRD — implementation partially in flight (PRs #63–#65)
**Owner:** Justin Elrod
**Companion to:** `prd-mahjong-copilot-dx-ui-player-experience.md`

---

## 1. Executive Summary

The player-experience PRD made the game *legible* — beginners can now read the board, follow the rules, and progress through learning content. This PRD makes the game *feel*. It scopes the visual identity decisions, art-asset pipeline, NPC character system, animation depth, and rollout plan that take 16 Bit Mahjong from "competent learning tool with retro polish" to "a game players want to look at."

Four PRs have already shipped pieces of this work without a PRD: #63 (NPC system + felt table), #64 (animations), #65 (cosmetic palettes/felts/rosters + portrait art-swap mechanism — open). They built the *system*. The remaining work is mostly content and asset decisions — the kind of choices a PRD is for.

The single biggest open call is **art direction**. Stylized SVG portraits hand-drawn in code work for 3-6 characters but cap perceived quality. Real character art (commissioned, AI-curated, or stock CC-licensed) lifts the ceiling but introduces budget and pipeline cost. This document forces the choice and the trade-offs that follow.

---

## 2. Goals

### 2.1 Product Goals

- Establish a visual identity coherent enough that screenshots feel intentional, not placeholder.
- Give the table a sense of physicality — felt, frame, depth, light.
- Give opponents personality readable in 3 seconds (face, expression, voice line).
- Make on-table actions feel kinetic (tiles flip, claims pulse, wins celebrate).
- Provide cosmetic surface area (palettes, felts, rosters) without blocking on art commissions.
- Set up the pipeline so real character art can replace placeholders without code refactor.

### 2.2 Non-Goals

- Replacing the engine, the data model, or the route structure.
- Building a full character-collection or gacha system.
- Replacing the retro 16-bit identity wholesale (it's the brand spine; the goal is to elevate it, not erase it).
- Multiplayer-only visual states (rooms, lobby chrome, profile decoration). Multiplayer is deferred per the player-experience PRD §2.4.
- Localized voice acting. English / Cantonese-only is the realistic scope for any Round 5.
- Live game streaming, replay export, screenshot-share rendering.
- Mobile-first redesign. The current responsive layouts are kept; visual polish must adapt to both.

### 2.3 Audience Calibration

The Mahjong audience splits roughly into:
- **Beginners coming from the player-experience PRD.** Need legibility and warmth. Hostile/sexual aesthetics push them away.
- **Mahjong veterans** who came for the gameplay. Forgiving on visuals as long as nothing is *worse* than table standard.
- **Mahjong Soul / anime-game players** with high visual expectations. Will judge the game in 30 seconds against $50M+ production peers.

The visual overhaul must not alienate the first cohort to court the third. Tasteful stylized art with personality reaches all three. Anime-bait reaches one and burns the others.

---

## 3. Current State

### 3.1 What's Shipped

| Round | What | PR | Status |
|---|---|---|---|
| Round 1 | NPC system (Mei / Hana / Yuki) + emotion state machine + felt table foundation | #63 | Merged |
| Round 3 | Animations: portrait wiggle, AI thinking halo, tile select pulse, winner spotlight, score punch, tile-claim flash | #64 | Merged |
| Round 4 | Cosmetics: 4 tile palettes, 4 table felts, alt roster (Riko / Aki / Sora), `/cosmetics` page | #65 | Open |
| Round 2 mechanism | `portraitImageSet` field on `NpcCharacter` so PNG art can drop in per emotion with no refactor | #65 | Open |

### 3.2 What's NOT Shipped

- **Round 2 actual character art.** SVG-rendered portraits ship today; real PNG/WebP art is the missing asset.
- **Round 5 voice acting.** Voice lines exist as text strings; no audio yet.
- **Animated character portraits** (lip-sync, eye blink, idle breathing). Static expressions only.
- **Animated tile artwork.** Tiles render as CSS divs with palette-driven fills; no real tileset commissioned.
- **Per-NPC theme music or sound design.** Generated 8-bit sounds only.
- **Particle effects beyond confetti.** No tile sparkles, dust, ambient board atmosphere.
- **Per-character cosmetics** (alt costumes, win poses, signature animations).

### 3.3 Tech Stack Today

- **Tiles:** CSS divs + inline styles, palette-driven via `TilePaletteContext`
- **Portraits:** Hand-coded SVG with parameterized face / hair / expression rig (`CharacterPortrait.tsx`, ~190 lines)
- **Animations:** CSS keyframes in `globals.css`, key-swap pattern for replay
- **Sounds:** Web Audio API generated tones (`soundManager.ts`)
- **No external animation libs** (no Framer Motion, Lottie, GSAP, PixiJS)
- **No asset pipeline** beyond Next.js's built-in `/public` serving

This minimal stack is the right starting point. The PRD calls out where it needs to evolve.

---

## 4. The Art Direction Decision

This is the largest single call in the PRD. Three coherent paths, each with real trade-offs. **Pick one.**

### 4.1 Option A — Stylized SVG Forever

Keep the current SVG character + CSS-driven tile rendering. Polish what exists. No commissioned art.

**Pros:** $0 ongoing cost. Ships on weekends. Style is consistent because everything is code. Cosmetic system already supports it.

**Cons:** Hard ceiling on perceived quality. Will not compete visually with peer Mahjong apps. "Cute" not "premium." NPCs feel like placeholders forever.

**Realistic outcome:** A nicer-than-MVP indie game. Niche-appealing. Probably caps growth.

### 4.2 Option B — Commission Real Character Art

Hire a freelance illustrator (Vgen / Twitter / ArtStation / Skeb). Brief them on roster + emotion states. Drop PNG/WebP through the existing `portraitImageSet` slot. Optionally commission a tileset to match.

**Pros:** Genuine visual identity. The system in #65 is already built for this. Coherent style guide possible. One-time cost, lasting asset.

**Cons:** Real money. Real timeline (artists are 2-8 weeks). Commission management overhead. Brief writing matters — bad brief = wasted commission.

**Cost estimates:**
| Asset | Range |
|---|---|
| Single portrait, 1 expression | $80–250 |
| Character w/ 4 expressions (idle/happy/surprised/frustrated) | $200–600 |
| Character w/ 6 expressions (full emotion set) | $300–900 |
| Tileset commission | $400–1,200 |
| Table felt textures (4 variants) | $80–200 each |

Realistic visual-overhaul budget paths:
- **Lean ($600–900):** 3 portraits × 4 expressions, no tileset, current felts
- **Standard ($2,000–3,500):** 6 portraits × 6 expressions + tileset
- **Full ($4,500–7,000):** Above + voice acting (Round 5) + 3-4 alt cosmetic skins

### 4.3 Option C — AI-Generated + Curated

Use Stable Diffusion / Midjourney / Imagen / Flux to generate portrait sets. User curates for coherence. Drop into `portraitImageSet`.

**Pros:** Cheap (~$20-50/mo for a generation service). Fast iteration. Many variations explored.

**Cons:**
- **Coherence is the killer.** Getting the same character across 6 emotion states usually requires LoRA training or reference workflows that take real time to set up.
- **Legal fuzziness.** Commercial use of AI-generated art varies by service and jurisdiction. Stable Diffusion v1.x trained on copyrighted data is settled-uncertain.
- **Audience signal.** AI-generated art is increasingly recognizable and increasingly polarizing. Some segments specifically reject it.
- **Style consistency drift.** If you regenerate later you may not be able to match. Locks you into a single generation moment.

**Realistic outcome:** Works as a stopgap. Risky as a permanent identity.

### 4.4 Option D — Hybrid (Recommended)

Keep retro tile palettes (current SVG-driven system, the brand spine). Commission real character portraits. Keep felt textures CSS-driven (cheap and customizable). Voice acting in a later round.

**Pros:** Lowest commission scope. Keeps the retro identity intact. Adds the visual element players actually look at most (the opponents). Defers the expensive tileset choice until product-market fit signals are clearer.

**Cons:** Mixed-media risk — illustrated characters next to CSS-div tiles can feel inconsistent if not handled thoughtfully.

**Mitigation:** Pick a character art style that *complements* retro tiles (clean line art with limited palette, NOT photorealistic anime). The art direction brief becomes critical.

**Cost:** $600–1,500 for the character portraits, no tileset cost.

### Recommendation

**Option D — Hybrid.** Highest impact-per-dollar. Best fit for current scale (pre-launch, no revenue pressure). Lowest risk on style coherence. Easy to upgrade later if Round 5 voice acting and tileset commission become budgeted.

If the answer is "no commission budget at all," **Option A — Stylized SVG Forever**. It is dignified. Don't go to Option C unless the user is comfortable owning the legal and aesthetic risks of AI-generated character art on a public-facing brand.

---

## 5. NPC Character System Requirements

### 5.1 Roster Size

Currently: 6 characters across 2 rosters (Original Crew: Mei/Hana/Yuki; Night Shift: Riko/Aki/Sora).

**Recommendation:** Cap at 6 named characters for MVP. Adding more pre-revenue is content cost without learning value. After launch, characters become a cosmetic monetization lever (alt costumes for existing characters, not new characters).

### 5.2 Emotion Coverage

Currently: 6 emotions per character (idle / thinking / smug / surprised / frustrated / triumphant).

**Decisions needed:**
- Keep at 6, or expand to 8 (adding *concentrating*, *amused*, *defensive* for finer state grain)?
- For commissioned art (Option B/D), does every character need every emotion, or do "supporting" characters get 3-4 and the "primary" set gets 6-8?

**Recommendation:** Keep 6. Asymmetry between characters reads as production cuts, not creative variety.

### 5.3 Voice Acting (Round 5)

Currently: 5 voice *lines* per emotion as text. No audio.

**Acceptance criteria for Round 5 (when committed):**
- Each character has ~30 audio clips (6 emotions × ~5 lines)
- Clips are short (1-3 seconds), trash-talk-y, in character
- Volume integrates with existing `soundManager` master volume
- Players can mute voice independently of game sounds (settings toggle)
- Cantonese OR English (not both — pick one, polished)

**Cost estimate:** $50-200 per character for 30 clips from a freelance VO artist. Total $300-1,200 for 6 characters.

**Decision:** Voice acting is **deferred** — Round 5, not in this overhaul's MVP cutline. Audio cost only justified when the game has playtest validation that the silent-NPC experience is hitting the personality ceiling.

### 5.4 Animated Portraits

Currently: static SVG. No blink, no breathing, no lip-sync.

**Decision:** Out of scope for this PRD. Adds 3-5x art cost (animated PNGs are sprite sheets or short loops). Static expressions with the existing `portrait-react` wiggle on emotion change is the right level of motion for now.

---

## 6. Tile Rendering Decision

### 6.1 Current State

- `RetroTile.tsx` renders each tile as a CSS div with palette-driven fills
- 4 palettes available via `/cosmetics`
- 144 tiles total. Renders fine. Performance is good.

### 6.2 Options for the Future

**Option 1: Keep current SVG-driven CSS approach.** Cheap, customizable, ships today. Ceiling is "stylized indie game."

**Option 2: Commission a tileset.** Real bone-tile textures, flowers as illustrations. ~$400-1,200. Slot into the existing palette system with a `palette.tileImageSet?` field — same swap pattern as portraits.

**Option 3: Migrate to PixiJS / sprite-based rendering.** Required if/when we want particle effects, tile-flip animations with lighting, or 144 tiles on screen at once for large hand replays. Multi-week migration. Not justified at current scale.

**Recommendation:** Stay on Option 1 for this PRD. Add the `tileImageSet` swap mechanism (mirrors `portraitImageSet`) so a future commission slots in. Defer Option 3 until performance or animation requirements force it.

---

## 7. Animation Depth

### 7.1 What's Already In

Per PR #64: portrait wiggle, thinking halo, tile-select pulse, winner spotlight, score punch, tile-claim flash, confetti, fan-row stagger.

### 7.2 What's Missing

- **Tile-discard arc.** Currently a tile leaves the hand and "appears" in the discard pool. A flying-arc animation would sell the action.
- **Claim sweep.** When an opponent claims a discard, the tile teleports from pool to meld area. A traveling animation would sell it.
- **Drawing animation.** Wall draws are silent + teleport-y.
- **Win sequence.** Currently spotlight + confetti + sound. Could be elevated with character triumph animation, hand-reveal sequence, fan-by-fan score reveal with audio cue per fan.
- **Idle ambient.** No table breathing, no light flicker, no opponents shifting weight.

### 7.3 Decisions

- **MVP target:** ship discard arc + claim sweep. These are the two most-frequent visual events in a hand.
- **Skip:** ambient idle (over-engineered for stage), elaborate win sequences (post-MVP).
- **Tech:** continue with CSS keyframes + key-swap pattern. No need for Framer Motion at this scale.

---

## 8. Cosmetic System Requirements

### 8.1 Current Surface

`/cosmetics` page exposes 3 axes: tile palette × table felt × NPC roster.

### 8.2 Future Surface (Out of Scope for MVP)

- Alt costumes per character (e.g., "Mei in winter coat")
- Tile-back patterns (the face-down side)
- Avatar borders / frames
- Win-pose alternates
- Particle effect themes (cherry blossoms, snow, rain)
- Music themes per roster

These are post-launch monetization/retention features. Don't build until there are players.

### 8.3 Persistence

Already done — all cosmetic prefs persist via `storageService`. No further work.

---

## 9. Asset Pipeline

### 9.1 Current State

- `web/public/` for static assets (none for visuals yet — emoji-sized icons only)
- No build-time image optimization beyond Next.js defaults
- No CDN, no signed URLs, no admin upload flow

### 9.2 What's Needed for Real Art

- **Naming convention:** `web/public/art/portraits/{npcId}/{emotion}.webp`
- **Format:** WebP for portraits (small + good quality), PNG fallback only if needed
- **Sizes:** sm (56px), md (96px), lg (160px) — pre-resized at build time, not just CSS-scaled
- **Licensing folder:** `web/public/art/LICENSES.md` documenting source + usage rights for every committed asset
- **No external CDN** for MVP. Bundle assets with the Next.js build. Vercel serves them.

### 9.3 Decisions

- **Build-time optimization:** start with `next/image` + WebP source files. No need for a custom pipeline.
- **Asset budget:** 200KB target per character (6 expressions × ~30KB WebP).
- **Versioning:** if art is ever updated, append `-v2` suffix to filenames so cached old versions don't override.

---

## 10. Migration / Rollout Plan

### 10.1 Strategy

**Incremental, not big-bang.** The art-swap mechanism in #65 is built so PNG portraits can land per-character without code refactor. This means:

1. Land first character art (Mei). Ship. Players see Mei as PNG, others as SVG. Mixed style is acceptable for ~weeks.
2. Land Hana, then Yuki. Original Crew is now "real."
3. Land alt roster (Riko/Aki/Sora) PNGs.
4. Optionally commission tileset; slot in.
5. Round 5 voice acting if budgeted.

### 10.2 Why Incremental Beats Big-Bang

- No multi-week dark period waiting for all assets
- Each commission is testable in production before next is started
- Reduces risk of paying for a coherent set that turns out wrong
- Player feedback per character informs the next brief

### 10.3 Flag-Gate Posture

A settings toggle ("Use illustrated portraits") could let players preview real-art rounds before they're complete. **Not recommended.** Adds testing surface, splits player experience, dilutes focus. Just ship per character.

---

## 11. MVP Cutline

If budget or time is tight, ship this minimum visual-overhaul-complete set. Everything else can defer.

1. **Lock art direction** (Option D — Hybrid recommended). Document the brief.
2. **Commission Original Crew portraits** (3 characters × 4 emotions = 12 portraits). $300–600. 2-4 weeks.
3. **Land tile-discard arc + claim sweep animations.** Code-only, no commission.
4. **Add `tileImageSet` swap mechanism** to `RetroTile`. Mirrors portrait pattern. Code-only.
5. **Update README + branding screenshots** to reflect new art.

That set ships the visible-quality lift without committing to alt roster art, tilesets, or voice acting. Total cost ~$300-600.

If anything cuts further, drop the alt-roster commission. Original Crew with real art is enough.

If voice acting is in budget: add Round 5 immediately *after* art lands. Don't ship voice without faces.

---

## 12. Success Metrics

No external analytics required (per the player-experience PRD's discipline). Validate qualitatively:

### 12.1 Qualitative

- A first-time player can identify each opponent's personality after one hand
- Screenshots feel like screenshots from a finished game, not placeholders
- The retro identity is preserved — nothing in the new visuals feels like a different game
- A casual viewer scrolling Twitter would stop on a screenshot

### 12.2 Testable

- `/cosmetics` page shows visible differences between every palette, felt, and roster
- Real art (when shipped) renders in all 3 sizes (sm/md/lg) without distortion
- Page weight per game route stays under 500KB compressed
- LCP on `/play/game` stays under 2.5s on a mid-tier laptop

---

## 13. Open Questions

The PRD cannot land without answers to these. Each requires a yes/no or option choice from the product owner.

1. **Art direction option (§4):** A / B / C / D — pick one.
2. **Budget posture:** $0 / $600 / $2,000 / $5,000+ — what's the actual ceiling?
3. **NPC roster cap (§5.1):** 6 characters is the recommendation. Higher? Lower?
4. **Voice acting commitment (§5.3):** in the visual overhaul, or deferred to its own initiative?
5. **AI-generated art posture:** acceptable as commercial brand asset, or no?
6. **Alt costume / cosmetic monetization (§8.2):** Future Yes / Probably Not / Definitely Not?
7. **Tileset commission:** in this overhaul or later?

### Recommended Defaults

1. Option D (Hybrid)
2. Lean tier ($600-900) for the MVP cutline; revisit before Round 5
3. Cap at 6
4. Deferred — Round 5 separate, gated on art-round playtest signal
5. No
6. Future Yes (after launch + retention signals)
7. Later

---

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Commissioned art arrives wrong (off-style, off-tone) | Wasted budget, no asset | Pre-brief includes 2 reference images + 1 mood board; ask for sketch-stage check before color |
| Mixed-media inconsistency (illustrated characters next to CSS tiles) | Visual incoherence | Brief specifies "complements retro tiles" — clean line art, limited palette, similar saturation |
| AI-generated assets become unlicensable later | Forced asset rebuild | If user picks Option C, document generation provenance per file in `LICENSES.md` |
| Voice acting amplifies wrong personality | Hard to undo, audio is sticky | Ship one character first; validate with playtesters before committing remaining VO budget |
| Commissioning overruns the budget posture | Project drag | Set per-commission caps in advance; don't approve overruns mid-flight |
| Performance degrades when real PNGs replace SVG | Slow load on cheap devices | Pre-resize at build time; enforce 200KB per-character cap |
| Players prefer current SVG aesthetic | Player retention dip | Keep `portraitImageSet` opt-in via cosmetics toggle (free fallback) — acts as A/B without forcing migration |

---

## 15. Suggested Implementation Order

This is sequence guidance, not authorization to start. Each phase requires the previous phase's decisions locked.

### Phase A — Lock Direction (1 day, $0)

1. Pick art direction option (§13 Q1)
2. Pick budget tier (§13 Q2)
3. Sign off on roster cap + voice acting deferral (§13 Q3, Q4)
4. Document the art brief if going Option B/D (style refs, mood, color palette)

### Phase B — Code Round 2.5 Prep (1-2 sessions, $0)

1. Add `tileImageSet` swap mechanism to `RetroTile` (mirrors `portraitImageSet`)
2. Build `<CosmeticThumbnail>` for the cosmetics page that pre-renders future PNG variants
3. Set up `web/public/art/` folder structure + `LICENSES.md` skeleton
4. Add Playwright assertion that `portraitImageSet`, when present, takes precedence over SVG

### Phase C — Commission Round (2-6 weeks, $300-1,500 depending on tier)

1. Open commission(s) per the locked brief
2. While waiting: ship discard-arc + claim-sweep animations (code-only)
3. Receive art, drop into `web/public/art/portraits/`, wire `portraitImageSet` per character
4. Ship per character as it lands (incremental, not gated)

### Phase D — Polish + Launch Posture (1-2 sessions)

1. Update `/cosmetics` previews to show real art alongside SVG fallbacks
2. Update README screenshots
3. Remove explicit "stylized" language from any user-facing copy that contrasted with placeholder

### Phase E — Round 5 Voice Acting (Optional, post-launch)

1. Validate art lift with playtesters — does silent personality already feel "enough"?
2. If yes, defer indefinitely. If no, brief a VO artist with the existing voice line text.
3. Wire audio playback into the existing reaction toast trigger.

---

## 16. Final Recommendation

Go with **Option D (Hybrid)** at the **lean tier ($600-900)**. Keep the retro tile system, keep the SVG portraits as the free fallback, commission real character art for Original Crew (Mei/Hana/Yuki) at 4 expressions each. Ship per character. Skip the tileset commission and voice acting for now — those are levers for after launch + initial retention signal.

That path:
- Closes the visual identity gap that has the highest perceived-quality return
- Stays inside a defensible budget for a pre-revenue project
- Preserves the retro brand spine
- Reuses every system already shipped in #63–#65 with zero refactor
- Leaves clear future lanes (alt roster art, tileset, voice acting) for when the project earns the budget

Everything else in the PRD answers questions the product owner should answer first. Once §13 is filled in, this PRD becomes execution.
