# Tile rendering prototype — THROWAWAY

**Question:** Is the board's look fixable in 2D, or does it need a 3D renderer?

Six variants of the board render on the existing `/play/game` route, gated by
`?variant=`. Floating bar at bottom-centre cycles them; `←`/`→` also work.
Dev-only — `PrototypeVariantProvider` renders nothing in production.

```
npm run dev
open http://localhost:3000/play/game?difficulty=easy&variant=F
```

| Key | Name | What it is |
|-----|------|------------|
| A | Glyph (current) | Control. Unicode symbol + suit label + colour stripe. |
| B | Vector face | CC0 tile artwork fills the face. No stripe, no suit label. |
| C | Carved & tilted | B + box-shadow tile thickness + CSS-perspective discard sea. |
| D | Three.js sea | WebGL discard sea only; shadows fall on the real CSS felt. |
| E | Three.js table + hand | D + the human hand as upright 3D tiles, picked by raycast. |
| F | Three.js full board | Whole table in WebGL: felt + rim, live wall, all four seats, melds, discards. DOM keeps HUD, action bar, NPC plaques. |
| G | Three.js max | F + image-based lighting (RoomEnvironment/PMREM), UnrealBloom, a camera that fits the board to any viewport, and NPC plaques placed by projecting their 3D seat. Fixed camera. |

## Findings so far

- **B is a large, cheap upgrade.** One `<img>` inside the existing face element.
  The board stops reading as "numbers in boxes".
- **B/C cost the Arabic numerals**, which are a pedagogical feature, not
  decoration. Consider keeping numerals as a Beginner Assist toggle.
- **B/C already regress screen-reader access** and this is easy to miss: the
  Unicode glyph *was* the accessible text. Measured discard-sea text content:
  A = 84 chars (`"You 2 3 Yuki 中 7 Hana 白 北 Mei 東 …"`), C = 70 (player names
  survive, tile identities gone), D/F = **0 chars, 2 DOM elements**.
  Fix for B/C: `alt` text or an `sr-only` span. There is no cheap fix for D–F.
- **3D looks better than the written analysis predicted.** Real bevels under a
  key light, contact shadows, the wall, and the authentic four-sided layout do
  things CSS cannot fake.
- **The 3D asset pipeline is real work.** SVG textures failed twice:
  `<img>.decode()` does not guarantee rasterisation (honour tiles came out black
  ~half the time, non-deterministically), and Chrome's `createImageBitmap`
  rejects SVG blobs. Working path is the PNG set + `createImageBitmap`.
  DOM gets all of this free. Hence `tileArtSrc(tile, 'svg' | 'png')`.
- **No reflow in 3D.** A claim window opening reflowed the board and clipped the
  canvas, because the scene has fixed dimensions and no layout engine.

### From variant G

- **The camera is the layout engine.** With no flexbox in 3D, nothing reflows on
  resize, so `fitCamera()` solves the bounding sphere against whichever of the
  two FOVs is tighter. Verified: 390×844 and 1440×900 both fit with no page
  overflow. This code has no 2D counterpart — CSS did it for free.
- **IBL stacks on top of the direct lights.** Dropping RoomEnvironment in at the
  old light levels blew every tile face to flat white. Ambient had to come down
  0.85 → 0.18 and the key 2.7 → 1.35. Worth knowing before anyone assumes
  "add an environment map" is a one-liner.
- **Fitting the whole square table to a wide viewport makes the hand unreadable.**
  Framing had to bias toward the foreground (pitch 50° → 39°, look target pushed
  to z 2.4) so the hand dominates and the far rim crops — which is what real
  mahjong games do.
- **Projected DOM overlays need clamping.** Seat plaques placed by projecting
  their 3D position fall off-screen on a phone; they are clamped back inside the
  canvas. That clamp is the DOM-overlay tax the 2D rim layout never paid.

### Jitter, and what actually caused it

Three separate things, none of them the GPU:

1. **The settle animation was per-frame, not per-second.** `y += delta * 0.18`
   converged 2.4x faster on a 144Hz screen than at 60Hz and stuttered whenever
   the frame interval wobbled. Now `1 - exp(-11 * dt)`.
2. **The whole scene relaid out on every React render.** The claim and turn
   timers tick several times a second, so a board that had not changed was
   rebuilding its mesh maps constantly. `sync` is now gated on a signature of
   what the scene actually draws.
3. **It rendered 60x a second forever.** A shadow-mapped, bloomed, static board
   redrawn continuously keeps the GPU hot for no picture change. Now render-on-
   demand: draw only while something animates or after a change.

Measured after the fix, idle on the human's turn for 5s:
**584 rAF ticks → 0 GPU renders, 0 relayouts.** Whole session since load: 12
renders, 5 relayouts.

Gotcha that comes with render-on-demand: **async work must invalidate.** Tile
face textures resolve after the frames budgeted for their layout are spent, so
`makeFaceTexture`'s `.then` has to request its own redraw or the tile stays
blank until the next move.

### Easy mode — verified

Easy mode's help is `tutorAdvice` (the Discard Tip panel), per-tile GOOD/OK/KEEP
`tileClassifications`, `suggestedTileId`, the FaanMeter, the DiscardReadingPanel,
and an easy-only tenpai badge. Gated on `displayMode === 'tutor' && showTutor`,
and only live on the human's discard turn or an open claim — check for it at any
other moment and you will wrongly conclude it is broken.

- AI opponents confirmed playing: wall drains 2–4 per human turn in both A and G.
- Assist confirmed rendering in **A** and **G**, measured on the human's turn.
- **G originally dropped it entirely** — the variant hid the tutor panel and
  replaced the DOM hand, which is where the colour strips lived. Fixed: the
  panel is docked under the table, and advice is drawn as an unlit lozenge at
  each tile's foot. Unlit matters — a lit material shades the colour, which is
  exactly what breaks a colour-coded assist (and the Okabe-Ito palette).

### Sharpness — two real bugs, not a taste problem

1. **Post-processing silently disabled antialiasing.** `WebGLRenderer`'s
   `antialias: true` applies to the DEFAULT framebuffer only. `new
   EffectComposer(renderer)` allocates its own render target with `samples: 0`,
   so the moment variant G turned on bloom, every edge in the scene stopped
   being antialiased. Fixed by passing an explicitly multisampled
   `WebGLRenderTarget({ samples: 4 })`. This is the single biggest cause of the
   "pixelated" look and it is invisible in code review.
2. **The art was downscaled with one bilinear tap.** Source PNGs are 1200x1680
   drawn into a much smaller canvas; `ctx.drawImage` does that in a single pass
   and aliases hard. Now resampled via
   `createImageBitmap(bmp, { resizeQuality: 'high' })`.

Also raised: face textures 384x512 -> 640x854, anisotropy 8 -> GPU max, bevel
segments 3 -> 5, curve segments 10 -> 18, and the max-mode shadow map
2048 -> 4096 with radius 3 -> 1.6 (2048 over a 26-unit frustum was ~79
texels/unit, which mushed every contact edge).

**Texture memory is now the top risk.** 640x854 RGBA is 2.08 MB per face, 2.77
with mipmaps — about **94 MB** for the ~34 distinct tile types in a typical
hand. Fine on desktop, dangerous on a phone. The real fix is one KTX2/BasisU
compressed atlas instead of 34 separate canvas textures, which is an asset
pipeline, not a tweak. Do not ship the current approach to mobile.

### Discard blocks overlapped at the corners

Each seat's discards laid out as 6 columns starting at z=1.35, but the block's
own half-width is ~2.02 — so a block reached further sideways than its start
distance and crossed into the block rotated 90° from it. Late in a hand the two
piles merged and you could no longer read what had been played.

The invariant: **a discard block's start distance must exceed its own
half-width.** Now 7 columns (half-width 2.36) starting at 2.5, which also means
fewer rows. Everything outboard shifted to make room for four full rows:
melds 4.6 → 5.95, wall 5.7 → 6.75, hands 7.05 → 7.6, felt 17.2 → 18.6.
Verified with 36 discards on the table: four clean blocks, nothing merged.

### NPCs in the scene

Characters are now drawn in 3D at their seats, not as DOM cards floating over
the board. `portraitTexture.ts` renders the existing `CharacterPortrait` rig
through `renderToStaticMarkup` and rasterises it to a texture, so the 566-line
character rig stays the single source of truth — this only turns it into pixels.
Emotion follows the turn (`thinking` when it's theirs, `idle` otherwise).

Two deliberate choices:
- **Unlit material.** These are flat stylised 2D characters; shading them with
  the table's key light makes them read as cardboard standees.
- **Text stays in DOM.** Name, wind, score and turn cue remain a plaque anchored
  to the character's feet, because DOM text stays sharper than any texture and
  keeps the screen-reader content that a canvas cannot carry.

SVG rasterisation needs the `<img>` + `onload` + double-rAF path, not
`createImageBitmap` — Chrome rejects SVG blobs there, and an SVG can report
loaded before it has painted (the same race that made honour tiles black).

### Board depth — detail without dominance

The brief was that the board is *liked* but thin, and that the 3D table must not
become the focal point. Those pull against each other, and the resolution is
which register the detail goes in: **fine and low-contrast, not bigger shapes.**
Felt nap, wood grain and an edge falloff, all in `boardMaterials.ts`; no new
geometry beyond turning the rim from a hidden slab into a bevelled frame.

- **The edge falloff is the load-bearing piece.** Darkening the felt outward adds
  depth *and* pushes the eye back to the centre and the near hand, so it is the
  one addition that buys detail while actively reducing dominance.
- **GTAO is where depth actually reads.** Tile-to-felt contact, wall-stack
  crevices, meld rows. It only ever darkens, so unlike a brighter rim it costs
  no attention. `GTAOPass` between the render and the bloom.
- **Depth of field was cut.** Asked for explicitly: the whole board stays sharp.
- **The centre marking is geometry, not type.** A compass rose needs no font, and
  canvas cannot be relied on to have a CJK face for 東南西北.

#### The bug that made the first attempt look black

Writing `new THREE.Color('#1d5140').r * 255` into a canvas produces RGB(3,22,13),
near-black. With colour management on, `THREE.Color` holds **linear** values;
canvases are **sRGB**. The jade felt came out looking like slate and it read as a
lighting problem, which it was not. Textures authored in canvas space now parse
hex to sRGB bytes directly and never round-trip through `THREE.Color`.

### NPCs — 2.5D, and why the slices alone were not enough

Characters are four rasterised slices of the `CharacterPortrait` rig spaced along
z (`portraitTexture.ts` cuts them, `npcRig.ts` builds them). The rig gained
`<g data-layer>` groups; they paint nothing and the DOM is unchanged.

**The slices and the gaze are one feature.** Slices with nothing to turn them are
an expensive flat plane; a turning flat plane is a sliding sticker. Shipping
either alone is wasted work.

Three things had to be true before any of it read:

1. **The billboard had to go, but not entirely.** Facing a side seat inward is
   correct and makes them *invisible* — a flat plane at 90° is a line. The rig
   sits at a fixed blend (`INWARD_BIAS = 0.34`) between facing the camera and
   facing the table, so side seats read as three-quarter views.
2. **Yaw alone made them fall over.** A world-vertical plane seen off-centre
   through a camera that looks *down* projects with apparent roll — about 20° at
   the side seats. Not an orientation bug; it is what perspective does, and it is
   the real reason v1 billboarded. Each rig now pitches back by the camera's own
   pitch, which recovers what the billboard was buying while leaving yaw free.
3. **Grounding is the sink, not a shadow.** A drawn contact shadow was tried and
   removed: sinking the bust below the felt lets the table plane occlude its flat
   bottom edge, which *is* the contact. Moving the characters outboard of the
   felt to get a "table edge crop" does the opposite — out there nothing is left
   to crop against and they float with a visible hard cut.

`alphaTest` on the slices lets the silhouette write depth, so the wall and melds
occlude the characters instead of the characters hovering over the whole board.

### Reactions, and what the slicing bought

Emotion is confined to the `face` slice, so a reaction re-rasterises **one texture
of four**; `back`/`body`/`front` are cached per character for the session. Without
that, every reaction would re-render the full 566-line rig per character, which is
what would have made reactive emotion too expensive to use at all. A test pins the
invariant across every character × emotion, because an edit that moves an
emotion-driven element out of the face group would silently show a stale layer.

Characters react to *each other*: a claimer is smug, the seat whose tile was taken
is frustrated, onlookers are surprised — whether or not the human was involved.
All six rig emotions are now reachable; previously only `idle` and `thinking` ever
appeared.

`npcFocus.ts` is pure seat -> seat and unit-tested. It recovers events by diffing
snapshots. **The real implementation should consume `presentation/events.ts`**,
which already derives exactly this vocabulary and is tested — but `deriveEvents`
currently has **no consumers**, and wiring it into `useGameController` is a change
to the bridge layer that deserves its own PR, not a rider on a prototype.

### The idle cost, measured rather than estimated

Idle glances are the one thing that breaks the perfect-idle property. The first
estimate of ~6% was made by hand and was wrong in a structural way: three
characters easing independently means *someone* is nearly always moving.

Fix was a **single glance token** — only one character may hold an idle glance at
a time. That is both cheaper and better-looking; three heads swivelling in unison
reads as uncanny. Interval 10–18s, hold 1.3s.

Measured idle (variant G, 5s window after the board settles, counters zeroed):
**~19 renders / 5s, every one animation-driven, 0 relayouts.**

Careful reading the duty-cycle percentage from `proto-check`: under SwiftShader
the loop ticks ~6×/s, and the frame loop clamps `dt` to 50ms, so easing advances
at roughly a third of real time and every animation lasts ~3× longer in
wall-clock. The reported 60% duty is that artifact. Renders-per-second is the
honest number; the real-GPU figure is still unmeasured.

## Open — next session

- On a phone the NPC plaques cover a lot of the 3D table, and this got a little
  worse: plaques now anchor on the felt *in front of* each character rather than
  at their position, which fixed name cards sitting across their chests on
  desktop but pushes them further inboard on a narrow viewport. The side
  characters themselves are cropped out of frame at 390px. Still wants a compact
  plaque variant and a mobile-specific seat radius.
- Real-GPU cost of GTAO is unmeasured; SwiftShader runs variant G at 1-3 fps and
  those numbers mean nothing. Check before believing the AO is affordable.
- No player attribution on the discard groups in D–G. `DiscardPool`'s
  "You / Yuki / Hana / Mei" headers have no 3D equivalent yet.
- Bloom and IBL are on in G but subtle by design. Worth deciding whether they
  earn their cost on a real GPU.
- Operational: do not run two `next dev` servers at once. They share `.next` and
  corrupt each other's chunks (symptom: 404s on `/_next/static/...` and a board
  stuck on "Setting the table").
- Real GPU performance unmeasured. Headless is SwiftShader software rendering,
  so the FPS numbers from `proto-check.mjs` are meaningless. Check on a real
  machine and a phone.
- Production bundle delta from `three` unmeasured.

## Decision pending

3D is a genuine trade now rather than a lopsided one. What has not moved: the
accessibility loss is total, and the honest scope is *3D board + accessible DOM
mirror*, not *3D board*. Budget the mirror from the start.

## Files

- `PrototypeVariant.tsx` — variant registry, context, switcher, all prototype CSS
- `ThreeTable.tsx` — the WebGL scene (`mode: 'sea' | 'full' | 'board' | 'max'`)
- `boardMaterials.ts` — procedural felt, wood and rim geometry. Canvas in, texture out
- `npcRig.ts` — the 2.5D character rigs: slices, gaze, lean, emotion swap
- `npcFocus.ts` — pure: who looks at whom, and how they feel about it
- `portraitTexture.ts` — cuts the portrait rig into depth slices and rasterises them
- `tileArt.ts` — format shim over `lib/tileArt` (SVG for DOM, PNG for textures)
- `proto-check.mjs` — headless driver: screenshots + metrics.
  `PROTO_OUT=./shots node components/game/prototype/proto-check.mjs G,F`

Touches outside this directory, each marked `PROTOTYPE`: `RetroTile.tsx`,
`GameBoard.tsx`, `app/play/game/GameContent.tsx`. Plus `three` + `@types/three`
in `package.json` and tile art in `public/tiles/`.
