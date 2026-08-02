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

## Open — next session

- NPC plaques are clipped at the canvas edges in F (Hana's portrait cut off at
  the top, Mei/Yuki names truncated). They were positioned for the 2D layout;
  a 3D board wants them re-placed against projected world coordinates.
- No player attribution on the discard groups in D–F. `DiscardPool`'s
  "You / Yuki / Hana / Mei" headers have no 3D equivalent yet.
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
