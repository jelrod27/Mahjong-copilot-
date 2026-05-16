# Tile Rendering Research: Making Mahjong Tiles Look Real

**Task:** ui_plan_003 — Research how to render mahjong tiles that look like real physical tiles instead of colored rectangles with text.

**Date:** 2026-05-06

---

## 1. Current State Analysis

### RetroTile.tsx
- Flat colored rectangle with border (`border-2 border-retro-textDim`)
- Ivory background (`#FFF8E1`)
- Suit color bar at top (thin `h-1`)
- Chinese character as main symbol (e.g., `東`, `中`, `1`-`9`)
- Suit label below symbol (e.g., `索`, `萬`, `筒`) for md/lg sizes
- 4 size presets: xs (24×36), sm (32×48), md (44×66), lg (56×84)
- Supports: `showBack`, `isSelected`, `isSuggested`, `isLastDiscarded`, `isNewlyDrawn`, `onClick`, `disabled`, `tutorColor`, `tutorLabel`

### MahjongTile.tsx
- Improved 3D block effect using `box-shadow` for side/depth simulation
- Face color `#f7f0e3`, side color `#d3c9b5`, edge color `#ede4d3`
- Gradient gloss overlay (`bg-gradient-to-br from-white/20 via-transparent to-black/5`)
- Suit color bar at top (`h-1.5`)
- English name shown below symbol for wider tiles
- Size via `width`/`height` props (default 60×90)
- Supports: `showBack`, `isSelected`, `isSuggested`, `onPress`, `borderColor`
- **Missing**: `isLastDiscarded`, `isNewlyDrawn`, `tutorColor/tutorLabel` — these only exist in RetroTile

### Interaction States Needed
1. ✅ **Selection highlight** — `isSelected` → gold border, lift, glow
2. ✅ **Suggestion highlight** — `isSuggested` → cyan/gold border, pulse animation
3. ⚠️ **Tutor color overlay** — `tutorColor` (green/orange/red) + label — only in RetroTile
4. ⚠️ **Newly drawn animation** — `isNewlyDrawn` + `animate-tile-draw` — only in RetroTile
5. ⚠️ **Discard animation** — `isLastDiscarded` + `animate-pulse-gold` — only in RetroTile
6. ❌ **Claim highlight** — mentioned in task but not yet in either component
7. ✅ **Size variants** — xs/sm/md/lg in RetroTile, freeform w×h in MahjongTile
8. ✅ **Back face** — `showBack` in both
9. ✅ **Disabled** — RetroTile only
10. ✅ **Hover** — scale-105 + translateY in both

### Problem Statement
Both components render tiles as flat/semi-3D rectangles with Chinese text characters. They look functional but not like *real* mahjong tiles. Real tiles have:
- Engraved/printed pictorial designs (bamboo sticks, circles/dots, Chinese characters with calligraphic style, wind/dragon symbols with color fills)
- Ivory/bone-white faces with subtle texture
- 3D depth/relief effect (the design sits *in* the tile, not on top)
- Rounded edges/bevels
- Physical weight/shadow

---

## 2. Approach Comparison

### A. SVG Tile Sets (External Asset Files)

**How it works:** Import pre-made SVG files for each tile design as React components or `<img>`/`<svg>` elements. Wrap them in a styled container for the tile body, depth, and interaction states.

**Pros:**
- **Most realistic appearance** — full pictorial tile art (dots, bamboo sticks, characters with proper proportions)
- Resolution-independent (scales perfectly to xs through lg)
- Can modify fill colors via SVG `<symbol>` and CSS `fill` for dynamic coloring (tutor overlays)
- Mature ecosystem — multiple high-quality open source sets exist
- Composable with CSS for interaction states (box-shadow, borders, animations)
- Accessibility via `aria-label` on wrapper (SVG art alone isn't accessible)
- Smallest bundle if using SVG sprite sheet or `<use>` references
- Easy to swap tile art style (traditional, modern, pixel, etc.)

**Cons:**
- Asset file size — each SVG tile is 2-10KB; 42-44 unique face designs ≈ 84-440KB total
- Need to handle dynamic sizing (SVG `viewBox` solves this)
- Must create/find assets for ALL 42+ unique tile faces (9×3 suits + 7 honors + 8 bonus + back)
- Integration work: wrap each SVG in a React component with interaction props
- Asset management (organizing, bundling, lazy-loading)

**Performance:** Excellent. SVGs are rendered as vector graphics by the browser. With `<use>` references or a sprite sheet, only one DOM definition per tile type. 13 tiles × 4 players = 52 visible tiles at most = trivial for SVG.

**Mobile:** Outstanding. Vector scaling handles all screen densities. Touch targets easy to implement via the wrapper.

---

### B. CSS-Only Depth Effects (No External Assets)

**How it works:** Keep the current text-based approach but add sophisticated CSS to create a 3D tile illusion: multiple box-shadows, inset shadows, gradients, pseudo-elements, emboss/deboss text effects, border bevels.

**Pros:**
- **Zero additional assets** — everything is inline CSS
- Fastest initial load — no image/font downloads
- Easiest to implement incrementally (just add CSS classes)
- Full control over every pixel via Tailwind/custom CSS
- Works offline immediately
- Lightweight — few KB total

**Cons:**
- **Still looks like text on a rectangle** — you can add depth but bamboo sticks won't look like bamboo, dots won't look like circles, dragons won't have their characteristic designs
- Chinese text rendering varies across browsers/OSes — different fonts, different glyph styles
- Can't represent the rich pictorial art that makes mahjong tiles recognizable
- Inconsistent appearance across platforms (font fallback, CJK rendering)
- Limited visual identity — tiles look like "a rectangle with a Chinese character," not "a mahjong tile"

**Performance:** Best possible. Pure CSS, no network requests, no parsing.

**Mobile:** Good, but text rendering differences between iOS/Android mean tiles may look subtly different.

---

### C. Canvas Rendering

**How it works:** Draw tiles onto an HTML5 `<canvas>` element using the Canvas 2D API. Tiles are rendered as pre-composited bitmaps.

**Pros:**
- Best raw performance for complex animations (discard, draw, claim animations)
- Full pixel control
- Can render SVG assets to canvas for best of both worlds (load SVG once, rasterize at runtime)
- Offscreen canvas for pre-rendering tile sprites

**Cons:**
- **Massive implementation complexity** — must implement hit detection, state management, cursor styles, hover effects manually
- Hard to integrate with React's declarative paradigm (need refs, imperative updates)
- Breaks accessibility — no native DOM elements for screen readers
- Must handle responsive sizing manually (re-render on resize)
- Difficult to combine with existing Tailwind/CSS animations (`animate-pulse-gold`, `animate-tile-draw`)
- Overkill for a turn-based card game — mahjong is not a 60fps action game
- 14 tiles in a hand is not a performance concern for DOM/SVG

**Performance:** Theoretically fastest, but unnecessary for this use case. DOM manipulation for 14-60 tiles is trivial.

**Mobile:** Canvas rendering differences between browsers can cause subtle issues. Touch event handling is more manual.

---

### D. Unicode Emoji Mahjong Characters (U+1F000–U+1F02B)

**How it works:** Use Unicode mahjong characters (🀇🀐🀙 etc.) as tile content, styled with CSS depth effects.

**Unicode range:** U+1F000–U+1F02B covers 44 characters:
- Winds: 🀀🀁🀂🀃 (East, South, West, North)
- Dragons: 🀄🀅🀆 (Red, Green, White)
- Characters (萬): 🀇–🀏 (1-9)
- Bamboos (索): 🀐–🀘 (1-9)
- Circles (筒): 🀙–🀡 (1-9)
- Flowers: 🀢🀣🀤🀥 (Plum, Orchid, Bamboo, Chrysanthemum)
- Seasons: 🀦🀧🀨🀩 (Spring, Summer, Autumn, Winter)

**Pros:**
- Zero asset download
- Instant rendering — just a text character
- Covers the full HK 144-tile set (all needed characters exist)
- Each character is a standardized glyph

**Cons:**
- **Rendering is browser/OS dependent** — each platform (macOS, Windows, Android, iOS, Linux) renders these characters differently, often as plain monochrome text, NOT as emoji pictographs
- These are NOT emoji — U+1F004 (🀄 Red Dragon) is the only one that gets emoji presentation on some platforms. The rest render as text glyphs
- **No browser renders them as full-color mahjong tile illustrations** — they appear as small outlined or filled rectangular symbols, nothing like a real tile
- On many systems, they show as □ (tofu) unless a specialized font like Symbola or HanaMin is installed
- Font loading required for consistent cross-platform rendering (defeats the "zero asset" advantage)
- I.Mahjong font exists as a specialized font for this, but it's a font download + the glyphs are monochrome tile outlines, not colorful illustrations
- Small and difficult to see on mobile
- Can't apply tutor color overlays, suggestion highlights within the character
- Size inconsistency across platforms

**Performance:** Fastest possible — text rendering.

**Mobile:** Very poor. Android often shows tofu/empty boxes. iOS shows basic monochrome. No consistency.

---

### E. Hybrid: SVG + CSS (Recommended)

**How it works:** Use SVG tile face artwork imported into React components, wrapped in CSS-styled containers that handle the tile body, 3D depth, and all interaction states. The SVG provides the realistic tile art; CSS provides the physical tile frame, lighting, shadows, animations, and overlays.

**Pros:**
- **Best-of-both-worlds**: realistic tile art (SVG) + full control over tile body, depth, and animations (CSS)
- SVG art scales to any size (xs through lg) without quality loss
- CSS handles: 3D tile frame, inset shadows for depth, gradient overlays for lighting, border-bevel effects, glow/highlight animations, tutor color overlay via semi-transparent `<div>` overlays, selection/glow effects, hover transitions, draw/discard animations
- Maintainable: tile art (SVG) separated from interaction logic (CSS/React)
- SVG can be loaded as a sprite sheet for efficient bundling
- Tutor overlay works naturally: a colored semi-transparent `<div>` over the SVG art
- Animation states reuse existing CSS animation system (`animate-pulse-gold`, `animate-tile-draw`)
- Accessible: wrapper has `aria-label`; decorative SVG marked `aria-hidden`
- Can hot-swap tile art styles without changing interaction code

**Cons:**
- Two systems to maintain (SVG assets + CSS/React wrapper)
- Slightly more complex than pure CSS
- Asset download required (but can be bundled/sprite-sheeted for small total size)
- Need to find or create SVG assets that cover the full HK 144-tile set

**Performance:** Very good. SVG sprite sheet + CSS = minimal rendering cost. React reconciliation handles state changes efficiently.

**Mobile:** Excellent. Vector scaling handles retina displays. Touch sizes configurable via wrapper dimensions.

---

## 3. Open Source Tile Assets Found

### 3.1 FluffyStuff/riichi-mahjong-tiles ⭐ BEST OPTION
- **URL:** https://github.com/FluffyStuff/riichi-mahjong-tiles
- **Stars:** 513+
- **License:** Public Domain (CC0)
- **Format:** SVG (vector) + PNG exports (regular and black variants)
- **Quality:** Very high — clean, modern, professionally designed vector art
- **Completeness:** **Partial for HK** — includes all 36 suit tiles + 7 honor tiles (dragons + winds). Does **NOT** include flowers/seasons (open issue #1 requesting them since 2017). A fork by @xhokir adds flower/season tiles.
- **HK Coverage:** 43 unique faces (9 dot + 9 bamboo + 9 character + 4 wind + 3 dragon = 34 base tiles, plus some bonus). Missing: 4 flower tiles, 4 season tiles, white dragon (Chinese style "白" vs Riichi blank rectangle)
- **Integration notes:** SVG files are well-organized, easy to import as React components. The art style is flat-topped (no 3D perspective on the tiles themselves), which is ideal for compositing with a CSS tile body.

### 3.2 perthmahjongsoc/mahjong-tiles-svg
- **URL:** https://github.com/perthmahjongsoc/mahjong-tiles-svg
- **License:** CC BY-SA 4.0
- **Format:** Minified SVG
- **Source:** Based on Cangjie6's "SVG Oblique illustrations of Mahjong tiles" on Wikimedia Commons
- **Quality:** Good — oblique/3D perspective style (tiles tilted as if viewed at an angle)
- **Completeness:** Full Unicode range (U+1F000–U+1F02B) = 44 characters including all flowers and seasons
- **HK Coverage:** ✅ **Complete** — includes all flowers (🀢🀣🀤🀥), seasons (🀦🀧🀨🀩), and white dragon (🀆)
- **Integration notes:** The oblique 3D perspective may be harder to composite with a flat CSS tile body. May need to extract just the face art and discard the tile base/perspective. File names match Unicode codepoints. Small repo, easy to embed.

### 3.3 DemChing Mahjong (itch.io) — Cangjie6-based SVG
- **URL:** https://demching.itch.io/mahjong
- **License:** CC BY-SA 4.0 (based on Cangjie6)
- **Format:** SVG
- **Quality:** Good
- **Completeness:** 167 tiles covering HK, Canton, Japan, Singapore, Malaysia, Thailand, Europe, US
- **HK Coverage:** ✅ **Complete** — includes all HK tiles including flowers and seasons
- **Cost:** Free (tile icons + bases separate). Combined tile packs are $2+ per color.
- **Integration notes:** Free version includes all tile face art + 6 tile base colors (vertical/horizontal). Need to combine face icons with bases. The bases are separate SVGs — could use CSS styling instead.

### 3.4 Cangjie6 SVG Oblique Illustrations (Wikimedia Commons)
- **URL:** https://commons.wikimedia.org/wiki/Category:SVG_Oblique_illustrations_of_Mahjong_tiles
- **License:** CC BY-SA 4.0
- **Format:** SVG
- **Quality:** High — detailed oblique 3D perspective style
- **Completeness:** Full set including flowers and seasons
- **HK Coverage:** ✅ **Complete**
- **Integration notes:** Same style as perthmahjongsoc/mahjong-tiles-svg (which is derived from this). Would need to extract face art from 3D perspective tiles.

### 3.5 I.Mahjong Font (SyaoranHinata)
- **URL:** https://github.com/SyaoranHinata/I.Mahjong
- **License:** M+ Font License (open source, free for commercial use)
- **Format:** OpenType font (.otf) with SVG glyphs
- **Variants:** I.Mahjong-JP, **I.Mahjong-HK**, I.Mahjong-TW, I.Mahjong-CAN
- **Quality:** Good — monochrome tile outlines rendered as font glyphs
- **Completeness:** Full set including flowers and seasons. Supports OpenType glyph substitution.
- **HK Coverage:** ✅ **Complete** — specifically designed for HK variant
- **Integration notes:** Would require web font loading. Renders as monochrome outlines (not full-color illustrations). Each tile face is a single character glyph, which means you get a recognizable tile shape but not the rich pictorial art of SVG tile sets. Best used as a text-based fallback rather than a primary rendering approach.

### 3.6 OpenGameArt Mahjong Tileset (Code Inferno)
- **URL:** https://opengameart.org/content/mahjong-tileset
- **License:** CC BY (attribution required to Code Inferno / codeinferno.com)
- **Format:** PNG at 64px, 96px, 128px, 618px + PSD source
- **Quality:** Good — raster art with realistic 3D tile look
- **Completeness:** Full mahjong set (appears to cover 144+ tiles for solitaire)
- **HK Coverage:** Likely complete (solitaire sets include all bonus tiles)
- **Integration notes:** Raster only — no vector format. Only specific pixel sizes. Needs attribution. PSD source allows modification.

### 3.7 WarL0ckNet/tile-art
- **URL:** https://github.com/WarL0ckNet/tile-art
- **License:** Not specified in repo
- **Format:** SVG sprite sheet (`tiles.svg`) with `<use>` references
- **Quality:** Good — Japanese riichi style
- **Completeness:** Riichi set (no flowers/seasons)
- **HK Coverage:** ❌ Incomplete — missing flowers and seasons
- **Integration notes:** Single SVG file with all tiles as `<symbol>` definitions. Uses CSS for styling. Demonstrates the SVG sprite sheet pattern.

### 3.8 Blueeyedrat Pixel Assets (itch.io)
- **URL:** https://blueeyedrat.itch.io/pixel-assets-mahjong-tiles
- **License:** Not specified (free download)
- **Format:** PNG sprite sheets (64×64 per tile)
- **Quality:** Pixel art style
- **Completeness:** 44×60 tiles including HK flowers/seasons + joker + blank
- **HK Coverage:** ✅ **Complete for HK**
- **Integration notes:** Pixel art aesthetic may not match the desired "realistic" look.

### 3.9 edave64/ED-Mahjong
- **URL:** https://github.com/edave64/ED-Mahjong
- **License:** Not specified
- **Format:** SVG tileset (converted to PNG via Inkscape)
- **Quality:** Reasonable
- **Notes:** Flutter-based game, not primarily a tile asset library. Contains SVGs that could be extracted.

---

## 4. Recommended Approach: Hybrid SVG + CSS

### Rationale

The **Hybrid SVG + CSS** approach is recommended because:

1. **Realism**: SVG tile art provides the pictorial, recognizable designs that make tiles look like real mahjong tiles. No amount of CSS depth effects can make the text "三" look like three bamboo sticks or "🀙" look like a single dot. The SVG art IS the tile identity.

2. **Separation of concerns**: Tile artwork (SVG face) is independent of tile interaction (CSS wrapper). This means:
   - Tile art can be swapped or upgraded without touching interaction logic
   - Interaction states are pure CSS/Tailwind — consistent across all tile types
   - Size variants are trivial (just change wrapper dimensions, SVG scales via viewBox)

3. **Practical asset availability**: FluffyStuff/riichi-mahjong-tiles (CC0/Public Domain) provides the best-quality suit and honor tile SVGs. For the missing flower/season tiles, the Cangjie6-based assets (CC BY-SA 4.0) from perthmahjongsoc/mahjong-tiles-svg or DemChing's itch.io pack fill the gap. Or the xhokir fork extends FluffyStuff with flowers/seasons.

4. **Performance**: With an SVG sprite sheet or `<use>` pattern, all 42-44 tile faces share one DOM definition. Active tiles (up to ~52 visible) are lightweight `<use>` references with CSS styling. This performs well on all devices.

5. **Mobile compatibility**: Vector SVG scales perfectly to any resolution. CSS animations and transitions work smoothly on mobile browsers.

### Implementation Plan

#### Phase 1: Create SVG Tile Assets
1. Clone FluffyStuff/riichi-mahjong-tiles for suit tiles and honor tiles (CC0)
2. Source flower/season tiles from perthmahjongsoc/mahjong-tiles-svg (CC BY-SA 4.0) or the xhokir fork
3. Create a unified SVG sprite sheet (one `<svg>` with `<symbol>` per tile face)
4. Map tile IDs to SVG symbol names
5. Optionally create a "HK white dragon" variant (`白` character on blank tile, different from Riichi blank tile)

#### Phase 2: Build TileWrapper Component
```
<TileWrapper
  size="md"              // xs|sm|md|lg
  isSelected={false}     // gold border, lift, glow
  isSuggested={false}    // cyan/gold ring, pulse
  isLastDiscarded={false}// gold pulse animation
  isNewlyDrawn={false}   // draw animation
  tutorColor={undefined} // green/orange/red overlay
  tutorLabel={undefined} // GOOD/OK/KEEP badge
  showBack={false}       // tile back design
  onClick={fn}           // click handler
  disabled={false}       // dimmed, no interaction
>
  <TileFace tile={tile} /> {/* SVG <use> reference */}
</TileWrapper>
```

#### Phase 3: Interaction State CSS
- **Tile body**: Ivory-white face (`#f7f0e3`), 3D depth via multi-layer `box-shadow` (light top edge, darker bottom/side edges), `border-radius: 3px`
- **Selected**: Gold border, -2px translateY, gold box-shadow glow
- **Suggested**: Animated gold ring, subtle pulse
- **Tutor overlay**: Semi-transparent color wash (`rgba(color, 0.25)`) over tile face + small label badge in corner
- **Newly drawn**: `animate-tile-draw` keyframe (scale bounce + fade-in)
- **Last discarded**: `animate-pulse-gold` keyframe
- **Back**: Rich green pattern with `🀄` or geometric design, same depth effect
- **Hover**: `scale-105`, slight lift, shadow enhancement

#### Phase 4: Sprite Sheet Integration
- Create `/web/public/tiles/` directory with SVG sprite sheet
- Use Next.js `<Image>` or inline `<svg><use xlinkHref="..."/></svg>` pattern
- Preload critical tile assets
- Bundle as a single HTTP request for the sprite sheet

### Implementation Complexity Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| SVG asset collection & sprite sheet | **2-3 days** | Download, normalize, organize 42-44 tile faces, create sprite sheet |
| TileFace component (SVG rendering) | **0.5 day** | Simple <use> reference mapping |
| TileWrapper component (CSS + states) | **1-2 days** | Port all interaction states from RetroTile/MahjongTile |
| Size variant system | **0.5 day** | CSS-based sizing with viewBox SVG |
| Tutor overlay system | **0.5 day** | Semi-transparent overlay div + badge |
| Animation system | **0.5 day** | Reuse existing keyframes, adapt for new component |
| Back tile design | **0.5 day** | SVG pattern or CSS-based |
| Testing & responsive polish | **1 day** | All sizes, all states, mobile testing |
| **Total** | **~6-8 days** | |

---

## 5. How Hybrid SVG + CSS Handles All Interaction States

| State | Implementation | Notes |
|-------|---------------|-------|
| **Selection highlight** | CSS: gold `border-2` + `box-shadow: 0 0 12px gold` + `translateY(-2px)` | Lifts tile slightly, golden glow |
| **Suggestion highlight** | CSS: `ring-2 ring-retro-cyan` + `animate-pulse-gold` | Pulsing highlight ring |
| **Tutor color overlay** | React: `<div className="absolute inset-0 rounded-sm" style={{backgroundColor: tutorColor + '40'}}>` on top of SVG + small text badge in corner | 25% opacity color wash preserves tile art visibility |
| **Newly drawn animation** | CSS keyframe: `animate-tile-draw` (scale from 0.5→1, opacity 0→1) | Same animation as current, applied to wrapper |
| **Discard animation** | CSS keyframe: `animate-pulse-gold` (glow pulse) | Applied to last-discarded tile |
| **Claim highlight** | CSS: bright border + scale bump (new state to add) | Similar to selection but different color |
| **Size variants** | CSS: `width`/`height` on wrapper; SVG uses `viewBox` to auto-scale | xs=24×36, sm=32×48, md=44×66, lg=56×84 (or custom) |
| **Back face** | SVG pattern (green with geometric lines) or CSS gradient in wrapper | Hides SVG face art entirely |
| **Disabled** | CSS: `opacity: 0.5; cursor: not-allowed; pointer-events: none` | Greys out tile |
| **Hover** | CSS: `transform: scale(1.05) translateY(-0.5px); transition: 100ms` | Subtle lift on hover |
| **3D depth** | CSS: multi-layer `box-shadow` (light top highlight, medium bottom shadow, dark corner shadow) | Gives physical tile appearance |

---

## 6. Key Technical Decisions

### 6.1 SVG Sprite Sheet vs. Individual Imports
**Recommendation: SVG Sprite Sheet**

A single sprite sheet file containing all tile faces as `<symbol>` elements, loaded once and referenced via `<use xlinkHref="#tile-1m">`. This:
- Reduces to 1 HTTP request for all tiles
- Enables browser caching
- Keeps DOM small (one `<svg>` hidden definition + multiple `<use>` references)
- Simplifies bundle management

Alternative: Import individual SVGs as React components (via `@svgr/webpack`). This works but creates more bundle entries and requires more build configuration.

### 6.2 Asset Licensing Strategy
- **FluffyStuff tiles** (CC0/Public Domain): Use as primary source for suit tiles + honor tiles. No attribution required, but nice to give credit.
- **Cangjie6/PerthMahjongSoc tiles** (CC BY-SA 4.0): Use for flower/season tiles that FluffyStuff lacks. Attribution required. If incorporated into a sprite sheet, the attribution must be preserved.
- **Best option**: Start with FluffyStuff + xhokir fork (which adds flowers/seasons). Determine if xhokir's additions are also CC0. If so, the entire set can be CC0.

### 6.3 White Dragon Design
The Riichi (Japanese) white dragon is a blank tile (no markings). The HK white dragon shows the Chinese character 白 (bái, "white"). The SVG set needs a custom 白 tile or use the perthmahjongsoc/Cangjie6 version which includes it as 🀆 (U+1F006).

### 6.4 Mobile Considerations
- Touch targets: Minimum 44×44px (Apple HIG), so xs tiles (24×36) may need a larger touch target wrapper
- SVG sprite sheet should be preloaded (via `<link rel="preload">`)
- Animations should respect `prefers-reduced-motion`
- Tutor overlay colors must meet WCAG contrast ratios for the badge text

---

## 7. Alternative Approach Consideration: I.Mahjong Font

As a simpler alternative, the **I.Mahjong-HK** font could be used instead of SVG artwork:

- **How:** Load the I.Mahjong-HK web font, render each tile by mapping tile IDs to Unicode codepoints (U+1F000–U+1F02B), then use CSS to style the tile container
- **Pros:** Simpler implementation (no sprite sheet), smaller total asset size, auto-handles all tile types including HK variants
- **Cons:** Monochrome tile outlines only (no colorful art), font rendering inconsistencies across platforms, large font file (~100KB), no pictorial bamboo/dot art (just simplified glyphs), font loading flash (FOUT/FOIT)

**Verdict**: I.Mahjong font is a viable **fallback** or **low-bandwidth** option, but doesn't achieve the "real physical tile" visual goal as well as SVG art.

---

## 8. Summary

| Approach | Realism | Performance | Mobile | Complexity | Completeness |
|----------|---------|-------------|--------|------------|-------------|
| **SVG + CSS (Hybrid)** ⭐ | ★★★★★ | ★★★★☆ | ★★★★★ | Medium (6-8 days) | ✅ Full HK set |
| CSS-only depth | ★★☆☆☆ | ★★★★★ | ★★★☆☆ | Low (1-2 days) | ✅ Full |
| Canvas | ★★★★★ | ★★★★★ | ★★★☆☆ | Very High (weeks) | ✅ Full |
| Unicode Emoji | ★☆☆☆☆ | ★★★★★ | ★☆☆☆☆ | Very Low (hours) | ⚠️ Platform-dependent |
| I.Mahjong Font | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | Low (2-3 days) | ✅ HK-specific |

**Recommendation: Hybrid SVG + CSS** — This provides the most realistic tile appearance while maintaining good performance, full mobile compatibility, and manageable implementation complexity. The FluffyStuff/riichi-mahjong-tiles (CC0) combined with Cangjie6-based flower/season assets (CC BY-SA 4.0) gives complete HK 144-tile coverage with professional-quality vector art.