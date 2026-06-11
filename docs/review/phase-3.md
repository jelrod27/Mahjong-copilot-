# Phase 3: Story, World, and NPCs

Date: 2026-06-10. Design docs delivered before implementation
(docs/design/story-bible.md, docs/design/npcs.md), then built and verified
live. Suite: 522 tests passing, typecheck and lint clean.

## The world

**The Jade Parlour**: a legendary nine-floor mahjong house gone quiet, with
one keeper left (Uncle Gam at the front desk) and a Master upstairs who
stopped taking challengers. Every floor you win re-lights that floor. The
climb is the curriculum: each rival's obsession is the skill their floor
teaches. Full premise, tone rules, floor table, slow-reveal structure, and
epilogue condition are in the story bible.

## The cast

Ten characters: the six existing NPCs recast as floor rivals (Mei, Riko,
Hana, Aki, Sora, Yuki) plus four new ones:

- **Uncle Gam** — the mentor and the ONLY teaching voice, per the bible's
  writing rules. Greets you at the Parlour desk, frames every win/loss.
- **Bo** (Floor 3) — pung-obsessed builder; distrusts chows on principle.
- **Auntie Pearl** (Floor 5) — never deals in; punishes loose discards.
- **Master Jin** (Floor 9) — thirty years undefeated; wants an opponent,
  not another win. Beat him with a 6+ faan hand for the epilogue.

Every rival now has: backstory, visual one-liner for the pixel artist,
3 rotating pre-match lines, win/lose post-match variants, and 2 barks per
trigger (you claim their discard, they reach tenpai, you deal into them) —
all under the bible's 3-line/60-char rules. No emojis.

## Personality is no longer skin-deep

- New engine layer `engine/ai/personality.ts`: `claimAppetite`, `fanGreed`,
  `defenseBias`, `speedBias` multipliers consumed by all three AI tiers
  (easy: pung-claim probability; medium: value retention, claim thresholds,
  chow reluctance, tempo; hard: defensive trigger threshold and weighting).
  Strictly inside the no-cheating envelope — personality reweights public
  information only.
- Each NPC carries tuned parameters (e.g. Riko 1.6 claim/1.8 speed races
  chicken hands; Pearl 2.0 defense feeds nothing; Aki 2.0 fanGreed refuses
  cheap wins). Personalities apply in BOTH Parlour and casual matches.
- Per-seat AI config (`MatchOptions.aiSeats`) lets one table mix tiers:
  floor rivals play their tier while support seats play one tier down.

## The Parlour, playable

- `/parlour` — the floor ladder: Gam's desk with progress-aware greetings,
  nine floor cards with rival portraits, lock states, LIT badges, progress
  bar, epilogue card. Entry from the Play menu ("The Jade Parlour").
- Floor matches (`/play/game?floor=N`): rival seated across from you,
  beaten rivals filling side seats, floor-appropriate min-faan ramp
  (floors 1-2 at 0, 3-5 at 1, 6-9 at 3), quick-match format, rank 1 to
  ascend.
- Pre-match dialogue overlay (rival line + portrait), post-match overlay
  with win/lose variants and Gam's framing, then the standings screen.
- Progress in localStorage (`16bit-mahjong-parlour`): highest floor,
  attempt counts, epilogue flag. Local-first; no account anywhere.
- ALL NINE floors are playable end to end (deliverable asked for 1-3).

## Barks wired to real events

`useNpcEmotion` now fires character barks on: someone claiming this NPC's
discard (frustrated bubble), the NPC reaching tenpai (their bark IS the
tell — by design), and the human dealing into their win (a pointed line
replaces the generic triumph). Tenpai detection uses the exact engine
check, gated to post-discard hand sizes for cost.

## Fixed along the way

- Casual matches no longer label seats "West AI / North AI / East AI" while
  portraits show characters — seats now carry the roster NPCs' real names
  and personalities (a Phase 0 axis finding).

## Known limitations (tracked)

- Pre-match dialogue overlays a live table; the 20s discard timer runs
  beneath it. One tap dismisses; revisit if players idle on the dialogue.
- New NPC portraits use the procedural SVG rig with placeholder trait
  combos; `portraitImageSet` is the slot for commissioned art (Bo and Gam
  especially deserve masculine rigs the current SVG set lacks).
- Saved matches from before this phase still show old seat names until
  finished.
