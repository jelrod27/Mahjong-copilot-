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

## Open — next session

- On a phone the NPC plaques cover a lot of the 3D table. They are legible and
  on-screen, but the hybrid needs a compact plaque variant at that width.
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
- `ThreeTable.tsx` — the WebGL scene (`mode: 'sea' | 'full' | 'board'`)
- `tileArt.ts` — Tile → artwork URL (SVG for DOM, PNG for textures)
- `proto-check.mjs` — headless driver: screenshots + metrics. `node components/game/prototype/proto-check.mjs A,C,F`

Touches outside this directory, each marked `PROTOTYPE`: `RetroTile.tsx`,
`GameBoard.tsx`, `app/play/game/GameContent.tsx`. Plus `three` + `@types/three`
in `package.json` and tile art in `public/tiles/`.
