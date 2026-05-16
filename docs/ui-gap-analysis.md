# UI Gap Analysis: Mahjong Copilot vs Mahjong Soul

> **Task**: ui_plan_001 — Research-only audit of current visual design vs Mahjong Soul reference.  
> **Date**: 2026-05-06  
> **Status**: Research complete; no code changes made.

---

## 1. Visual Gap Analysis

### 1.1 Color Palette

| Element | Mahjong Copilot (Current) | Mahjong Soul (Reference) |
|---------|---------------------------|--------------------------|
| **Primary BG** | `#110e1a` deep purple-black | Rich dark green felt `~#1a4a2a` → `~#0d2b18` gradient |
| **Secondary BG** | `#1c1829` dark purple | Warm dark wood brown `~#3a2a1a` or soft cream/ivory `~#FAF0E0` |
| **Panel BG** | `#2a2240` muted purple | Warm brown wood grain or soft cream panels with gold trim |
| **Border Accent** | `#e8384f` hot pink/neon red | `#C9A94E` muted gold or `#8B0000` deep crimson |
| **Accent (buttons)** | `#e8384f` neon pink-red | `#D4AF37` warm gold, `#8B0000` deep red, `#2E8B57` emerald |
| **Gold** | `#f5b731` bright neon gold | `#C9A94E` / `#D4AF37` traditional warm gold, less saturated |
| **Green** | `#2ed8a3` neon mint/teal | `#2E8B57` forest green or `#228B22` table felt green |
| **Cyan** | `#45b7d1` electric cyan | N/A — MS doesn't use cyan; uses warm whites/parchment |
| **Text Primary** | `#ede4d3` warm parchment-cream | `#F5F0E0` warm ivory / `#FFD700` gold on dark |
| **Text Dim** | `#958a84` muted warm gray | `#A89070` warm brown-gray / `#8B7355` sepia tones |
| **Success** | `#2ed8a3` neon mint | `#4CAF50` natural green or `#8BC34A` light green |
| **Error/Fail** | `#e8384f` neon pink-red | `#B71C1C` deep dark red or `#8B0000` crimson |
| **Tile Face** | `#FFF8E1` cream | `#F5F0E0` warm ivory with 3D shading gradients |
| **Game BG gradient** | `radial-gradient(ellipse at center, #1e2a22 → #0f1610 → #110e1a)` (greenish black center → purple black) | Solid or subtle-gradient green felt cloth, often with a decorative tablecloth edge |

**Key Insight**: Our current palette is cyberpunk/neo-retro — cool neon on dark purple. Mahjong Soul uses warm, traditional Asian tones: green felt, warm wood browns, rich golds, deep reds, and parchment ivories. The entire mood shifts from "arcade cabinet" to "parlor game."

### 1.2 Typography

| Element | Mahjong Copilot | Mahjong Soul |
|---------|----------------|--------------|
| **Display/Heading** | `Press Start 2P` (pixel font, variable `--font-pixel`) | Elegant serif or Chinese calligraphic font; e.g., a brush-style font like `"Noto Serif SC"` or proprietary calligraphy |
| **UI/Body** | `Chakra Petch` (variable `--font-retro`) — angular, tech-inspired | Clean sans-serif body (system-like) with soft weights — `"Noto Sans SC"` or `"Hiragino Sans"` |
| **General Body** | `Inter` (variable `--font-inter`) | System sans-serif or custom clean Chinese-compatible font |
| **Pixel font usage** | Orbitron is defined but rarely used for actual rendering; Press Start 2P heads everything | No pixel fonts; instead uses stylized brush/serif for titles and clean sans for UI |

**Key Insight**: Our pixel-font identity (Press Start 2P, Orbitron, Chakra Petch) screams "16-bit arcade." Mahjong Soul uses brush-style/calligraphic fonts for headings and clean sans-serif for UI, evoking traditional mahjong parlors and Asian ink painting.

### 1.3 Imagery & Art Style

| Aspect | Mahjong Copilot | Mahjong Soul |
|--------|----------------|--------------|
| **Overall style** | Neon-retro/16-bit arcade | Anime-influenced with traditional Chinese/Japanese art motifs |
| **Character art** | None — just names like "East Bot," "South Bot" | 114+ fully voice-acted anime characters with portraits, emotes, skins, and Live2D |
| **Illustrations** | No illustrations — pure UI/chrome | Character portraits, event illustrations, seasonal art, animated cut-ins |
| **Decorative elements** | CSS glow effects (`retro-glow`), scanlines (`retro-scanline`), hard pixel borders | Floating sakura petals, gold lantern decorations, subtle cloth textures, animated particle effects |
| **Iconography** | Lucide icons (geometric, minimal) | Custom hand-drawn icons; calligraphic wind symbols; anime-style emotes |

### 1.4 Animation & VFX

| Aspect | Mahjong Copilot | Mahjong Soul |
|--------|----------------|--------------|
| **Tile draw** | `tile-draw` — 0.3s translateY(-12px) fade-in (simple CSS transition) | Smooth 3D rotation animation; tile slides in from wall with perspective transform |
| **Tile discard** | `tile-discard` — 0.25s scale bounce (simple CSS) | Tile slides to discard area with 3D flip and landing bounce |
| **Tile claim (pung/kong/chow)** | `tile-claim` — 0.5s box-shadow pulse by `#2ed8a3` | Flash of golden light + character voice callout + animated text banner |
| **Win** | `tile-win` — 1.2s gold `#f5b731` box-shadow pulse | Elaborate win animation: tiles fan out, golden particles, character portrait cut-in, score screen with fan breakdown |
| **Kong** | No special animation beyond claim | 3D tile stacking animation, blue/gold burst VFX, character exclamations |
| **Riichi/Tenpai** | `animate-pulse` cyan glow text — "TENPAI" | Riichi stick placed on table, glowing bet indicator, dramatic pause effect |
| **General mood** | Subtle, functional CSS animations | Polished, emotional, celebratory VFX that make each game event feel exciting |
| **Background** | Static gradient | Animated tablecloth patterns, subtle particle systems (falling petals, etc.) |

### 1.5 Atmosphere & Mood

| Aspect | Mahjong Copilot | Mahjong Soul |
|--------|----------------|--------------|
| **Mood** | Dark arcade cabinet, cyberpunk-meets-retro gaming | Warm, inviting mahjong parlor; mix of traditional elegance and anime charm |
| **Sound design** | Basic `tilePlace` sound via soundManager | Rich sound palette: tile clacks, bamboo wind chimes, character voice lines, ambient music loops |
| **Spatial feel** | Flat 2D cards on dark background — functional, minimal | Layered depth: tablecloth texture → tiles with 3D perspective → character portraits → particle overlays |
| **Emotional register** | Analytical, "gaming HUD" feel | Social, celebratory, dramatic — each win/loss feels like a story moment |

---

## 2. Tile Rendering Comparison

### 2.1 Current Implementation (RetroTile.tsx)

Our tiles are **purely text-based** with minimal visual treatment:

- **Shape**: Rectangle with `border-2`, `rounded-sm` — flat 2D box
- **Background**: Solid `#FFF8E1` (warm cream) uniform fill — no gradient, no depth
- **Content**: A single CJK character rendered via `getSymbol()` (e.g., `東`, `中`, `1`) plus an optional suit label underneath (`索`, `萬`, `筒`)
- **Color coding**: A thin 4px suit-color bar at the top: Bamboo=`#4CAF50`, Character=`#ef4444`, Dot=`#3b82f6`, Honor=`#a1a1aa`, Bonus=`#f5b731`
- **Size variants**: xs (24×36), sm (32×48), md (44×66), lg (56×84)
- **Interactivity**: Hover lifts tile `scale-105 -translate-y-0.5`; selected tile lifts `-translate-y-2` with cyan glow; suggested discards pulse gold
- **Tile back**: Diagonal hatching pattern (`repeating-linear-gradient(45deg, #2a2240, #1c1829)`) with `?` character
- **Tutor indicators**: Color bars (green/orange/red) below suit bar, tiny pixel-font labels ("GOOD"/"OK"/"KEEP")

### 2.2 Mahjong Soul Tiles

Mahjong Soul tiles are **richly illustrated 3D objects**:

- **Shape**: Rounded-corner ivory/cream tiles with visible 3D perspective, side-depth shading, and subtle shadows
- **Background**: Warm ivory with subtle gradient shading (lighter center, darker edges simulating 3D curvature)
- **Content**: Each suit has custom artwork — bamboo sticks with green strokes, character (wan) tiles with elegant red Chinese numerals over `萬` labels, circle/dot tiles with precisely arranged pip layouts; honor tiles feature bold calligraphic characters
- **3D depth**: Drop shadows, inner glow on white dragons, red highlight on red dragons, textured bamboo strokes
- **Dora indicators**: Glowing golden shimmer animation on dora tiles
- **Tile backs**: Various collectible designs — ornate patterns, character art, seasonal themes; all with subtle shimmer
- **Size**: Larger, more generous proportions that fill more of the screen; hands feel substantial

### 2.3 Rendering Gap Summary

| Feature | Our Tiles | MS Tiles |
|---------|-----------|----------|
| **Depth/shadow** | `border-2` flat border; no shadow | Multi-layer shadow + 3D perspective + edge highlight |
| **Background texture** | Solid `#FFF8E1` flat fill | Gradient ivory with light diffusion simulation |
| **Suit artwork** | Single character + color bar | Illustrations (bamboo sticks, pip arrangements, calligraphy) |
| **Honor tile treatment** | Same as numbered tiles — CJK character + gray color bar | Distinctive styling: red dragon gets red fill, green dragon gets green fill, white dragon gets blue-bordered blank |
| **Dragon tile distinction** | All honors use `#a1a1aa` generic gray | Each dragon has unique, recognizable visual identity |
| **Dora/glow** | Gold `#f5b731` pulse animation on select | Persistent golden shimmer VFX on dora tiles |
| **Tile back** | Diagonal hatch `?` | Collectible illustrated designs with subtle animation |
| **Responsive sizing** | 4 sizes (24px–56px wide) | Generally larger proportions; smoother scaling |
| **Interactivity** | Translate-Y lift, scale, box-shadow pulse | Hover glow, selection highlight, smooth spring animations |

---

## 3. Table/Board Atmosphere Comparison

### 3.1 Game Board (GameBoard.tsx)

**Current board background**:
```css
background: radial-gradient(ellipse at center, #1e2a22 0%, #0f1610 50%, #110e1a 100%);
```

This is a greenish-black center fading to purple-black — it *attempts* a table feel but reads as "dark void" rather than "green felt table."

**Mahjong Soul table atmosphere**:
- Centered green felt cloth with subtle weave texture
- Decorative tablecloth border with ornamental patterns (collectible/customizable)
- Warm wooden frame around the table edge
- Soft ambient lighting from above
- Character portraits in each of the 4 corners with current-turn glow
- Dora indicator displayed prominently at top

### 3.2 Layout & Information Display

| Element | Our Layout | MS Layout |
|---------|-----------|-----------|
| **Player positions** | 3 opponents shown as compact name+tile-count badges (mobile) or face-down stacks (desktop); player at bottom | 4 character portraits in fixed corner positions with animated expressions; hand tiles shown as face-down bundles |
| **Turn indicator** | Small `retro-panel` chip: `► YOUR TURN — Discard` or `⏳ Opponent` | Full character animation with glow; wind direction prominently displayed |
| **Discard pool** | Sectioned retro-panel grid per player, or flat grid fallback | Discard area divided into 4 quadrants around center, each labeled by player/seat wind |
| **HUD/scores** | Left sidebar panel with `╔══ GAME ══╗` pixel header | Integrated score display in each character's portrait area; clean numeric display with rank |
| **Action buttons** | `retro-btn-accent` / `retro-btn-green` / `retro-btn-gold` — hard pixel borders, bracket labels `[ DISCARD ]`, `[ CLAIM ]` | Rounded, modern buttons with soft gradients; character portrait appears during claim windows |
| **Faan/scoring** | `FaanMeter` panel with pixel-font headers, progress bars | Smooth animated scoring display; fan names appear with icons |
| **Claim timer** | Simple progress bar (`bg-retro-cyan` / `bg-retro-gold` / `bg-retro-accent`) | Animated countdown ring with character voice cue |

### 3.3 Component-by-Component Comparison

**GameHUD (sidebar panel)**:
- **Ours**: `retro-panel` box with pixel-font headers (`╔══ GAME ══╗`), blinking current-turn arrow, small wind chars
- **MS**: Integrated into table corners, each player has name/avatar/score in their seat position; no separate HUD panel

**ActionBar**:
- **Ours**: `retro-btn-accent` with `[ DISCARD SELECTED TILE ]` labels, neon styling
- **MS**: Clean rounded buttons with character callouts; claim window shows character portrait + voice line

**FaanMeter**:
- **Ours**: Expandable panel with pixel-font `LOCKED IN` / `IN PROGRESS` headers, cyan progress bars, retro-glow text
- **MS**: Floating overlay or sidebar; elegant score display with fan icons and animated numbers

**Play lobby (page.tsx)**:
- **Ours**: Centered `retro-panel` selectors with `► QUICK GAME` arcade-style buttons; `╔════════════════════╗` box-drawing borders
- **MS**: Character-select screen with large portrait, room selection with elegant scrollable room cards, warm gold accents

---

## 4. Character/Avatar System Gap

### 4.1 Current State: No Character System

Our game uses plain string names ("East Bot", "South Bot", or user-provided names) with no visual representation beyond a wind-direction label (`E`, `S`, `W`, `N`) and a colored dot for current turn.

### 4.2 Mahjong Soul's System

- **114+ unique anime characters** with distinct personalities, voice acting, and backstories
- **Character portraits** appear in each player corner during games
- **Live2D animated models** react to game events (joy on win, frustration on loss, thinking poses)
- **Voice callouts**: Characters announce pung, kong, chi, riichi, and winning hands
- **Emote system**: In-game sticker/emote panel with character expressions
- **Outfit customization**: Multiple outfits per character, seasonal/event costumes
- **Bond/affinity system**: Level up relationships with characters through gameplay and gifting

### 4.3 Adoptable Elements (Without Gacha)

Even without the gacha model, we should consider:
- **2–4 simple avatar icons** per seat (e.g., stylized wind animals: Dragon=E, Phoenix=S, Tiger=W, Tortoise=N)
- **Player name display** with seat wind badge and small avatar circle
- **Turn indicators** using avatar highlights rather than text blinking
- **Simple emote reactions** (👍, 😮, 😤, 🎉) for social play

---

## 5. What We Can Realistically Adopt (Without Full Rewrite)

### 5.1 High-Impact, Low-Effort Changes

1. **Color palette swap** — Replace the neon-retro palette with warm Asian tones in `tailwind.config.ts` and `globals.css`. This is the single biggest visual shift for the least code change:
   - `#110e1a` → `#0d2218` (deep forest green)
   - `#1c1829` → `#1a3028` (dark green)
   - `#2a2240` → `#2a4538` (muted forest) or `#3a2c1a` (warm wood)
   - `#e8384f` → `#C9A94E` (warm gold) or `#8B2020` (deep red)
   - `#45b7d1` → `#4CAF50` (natural green) or `#67B7A0` (jade)
   - `#f5b731` → `#D4AF37` (traditional gold)

2. **Board background gradient** — Change GameBoard's radial-gradient to warm green felt:
   ```css
   background: radial-gradient(ellipse at center, #2d5a3f 0%, #1a3a28 60%, #0d1f15 100%);
   ```
   Add a subtle CSS texture/pattern overlay for felt simulation.

3. **Font replacement** — Swap Press Start 2P/Orbitron for a calligraphic serif (e.g., `Noto Serif SC`, `Ma Shan Zheng`) for headings, and keep Inter/Chakra Petch as body fonts. This alone changes the entire mood from "arcade" to "parlor."

4. **Tile depth enhancement** — Add CSS box-shadow, inner gradient, and subtle border rounding to RetroTile:
   ```css
   box-shadow: 2px 3px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
   background: linear-gradient(135deg, #FFFFF0 0%, #F5F0E0 50%, #E8DCC8 100%);
   border-radius: 6px;
   ```

5. **Dragon tile special treatment** — Give each dragon a distinct background fill instead of generic gray:
   - Red Dragon → red-tinted tile with gold `中`
   - Green Dragon → green-tinted tile with gold `發`
   - White Dragon → blue-bordered tile with empty center or minimal `白`

6. **Replace bracket-style labels** — Change `[ DISCARD ]`, `[ CLAIM ]`, `╔══ GAME ══╗` to softer, rounded label styles.

7. **Wind symbol styling** — Replace CJK `東南西北` labels with larger, stylized calligraphic renderings.

### 5.2 Medium-Impact, Medium-Effort Changes

8. **Table texture/pattern** — Add a CSS background pattern for green felt weave using `background-image` with subtle noise overlay.

9. **Simple avatar system** — Create 4–8 simple avatar icons (animals or abstract masks). Add `avatarUrl` to Player model. Wire into OpponentHand and GameHUD.

10. **Tile back redesign** — Replace the diagonal hatch pattern with an ornate pattern (CSS-generated or SVG) that evokes traditional mahjong tile engravings.

11. **Win/claim VFX improvements** — Add more dramatic CSS animations for kong/riichi/win: particle effects using CSS pseudo-elements, screen flash overlays, etc.

12. **Sound palette expansion** — Add richer tile sounds: different clacks for draw/discard/claim, a gentle chime for tenpai, a celebratory sound for winning.

13. **Home page redesign** — Replace `16 BIT MAHJONG` pixel heading with an elegant heading using calligraphic fonts. Add decorative line art or SVG mahjong illustrations.

### 5.3 High-Impact, Higher-Effort Changes

14. **Illustrated tile assets** — Create or commission SVG/illustrated tile faces for each of the 34 unique tile types. This is the single biggest visual upgrade but requires significant asset work.

15. **Character portrait system** — Even a set of 4 static character illustrations would make the game feel more personal and less "bot arena."

16. **Animated win screen** — A dedicated win result screen with tile fan-out animation, scoring breakdown, and celebratory VFX.

---

## 6. What We Should NOT Adopt

1. **Gacha/monetization system** — MS's entire character acquisition model (Jade currency, summon scrolls, 5% drop rates) is antithetical to our educational/free-play mission.

2. **Anime character focus** — 114 voiced characters with Live2D rigs, bond stories, and costume unlocks is a massive production effort and changes the product's identity from "mahjong teacher" to "character collector." Not appropriate.

3. **Riichi-specific mechanics** — MS uses Japanese Riichi mahjong rules. We use Hong Kong rules. UI elements like riichi sticks, dora indicators, and furiten warnings don't map to our ruleset.

4. **Distracting animations during gameplay** — MS's character cut-ins on every pung/kong, while fun for entertainment, would slow down a learning experience. Keep animations quick and informative.

5. **Rank/competitive ladder emphasis** — MS centers around Bronze→Throne ranked rooms. Our focus is learning/solo play; competitive ranking is secondary.

6. **Premium currency/shop UI** — Jade/copper dual currency, shop pages, gacha pull animations — all unnecessary for our tool.

7. **Seasonal gacha events** — Event banners, limited-time character banners, login bonuses tied to gacha pulls are not part of our product mission.

8. **Excessive UI chrome** — MS has many decorative overlays (character emotes, animated backgrounds, victory screens) that, while beautiful, add complexity. We should add atmosphere but keep the interface clean and focused on gameplay.

---

## 7. Priority-Ranked Improvements for Biggest Visual Impact

| # | Change | Impact | Effort | Rationale |
|---|--------|--------|--------|-----------|
| 1 | **Swap color palette to warm green/gold/red** | ★★★★★ | ★☆☆☆☆ | Single biggest mood change. Replace ~15 color tokens in tailwind.config.ts + globals.css. |
| 2 | **Replace pixel fonts with calligraphic serif** | ★★★★★ | ★☆☆☆☆ | Changes identity from "arcade" to "parlor." Swap `Press Start 2P` → `Noto Serif SC` or `Ma Shan Zheng`. |
| 3 | **Add 3D depth to tiles (shadows, gradients, rounding)** | ★★★★☆ | ★★☆☆☆ | Makes tiles feel like real objects. CSS-only changes to RetroTile.tsx. |
| 4 | **Green felt board background with texture** | ★★★★☆ | ★☆☆☆☆ | One-liner gradient change + optional CSS pattern. Transforms the table feel. |
| 5 | **Dragon tile distinct styling** | ★★★☆☆ | ★☆☆☆☆ | Red/green/white dragons each get unique tile treatment. Small CSS change, big visual payoff. |
| 6 | **Replace bracket/box-drawing labels with rounded modern labels** | ★★★☆☆ | ★☆☆☆☆ | Remove `╔══`, `[`, `►` styling. Use softer rounded buttons and labels. |
| 7 | **Simple avatar system (4–8 icons)** | ★★★☆☆ | ★★★☆☆ | Gives opponents visual identity. Needs design + Player model change. |
| 8 | **Tile back ornamental pattern** | ★★☆☆☆ | ★★☆☆☆ | Replace hatch-pattern fallback with SVG ornamental design. |
| 9 | **Enhanced win/claim animations** | ★★☆☆☆ | ★★☆☆☆ | Add screen flash, particle CSS, and more dramatic transitions. |
| 10 | **Illustrated tile faces (SVG assets for 34 tiles)** | ★★★★★ | ★★★★★ | Highest impact possible but requires creating/commissioning 34 illustrative tile designs. Worth it long-term. |
| 11 | **Home page visual redesign** | ★★★☆☆ | ★★☆☆☆ | Replace neon headings with elegant calligraphy. Add decorative borders/art. |
| 12 | **Sound palette expansion** | ★★★☆☆ | ★★☆☆☆ | Richer tile sounds add significant atmosphere. Needs audio asset sourcing. |

---

## Appendix A: Current Color Token Map

```
Background:    #110e1a (bg), #1c1829 (bgLight), #1a1a2e (shadcn bg)
Panels:        #2a2240 (panel), rgba(42,34,64,0.7) (card)
Borders:       #e8384f (border/accent), rgba(233,69,96,0.3) (subtle)
Accent:        #e8384f (red-pink)
Gold:          #f5b731
Green:         #2ed8a3 (neon mint)
Cyan:          #45b7d1
Text:          #ede4d3 (primary), #958a84 (dim), #f7f0e3 (white)
Tile face:     #FFF8E1
Tile border:   #424242
Suit bamboo:   #4CAF50
Suit char:     #ef4444 (#B71C1C in config)
Suit dot:      #3b82f6 (#2196F3 in config)
```

## Appendix B: Proposed Warm Asian Palette (Target)

```
Background:    #0d2218 (deep forest), #132e22 (forest dark), #1a3a28 (forest)
Panels:        #1e4434 (felt panel), #2a4538 (panel hover)
Borders:       #C9A94E (warm gold), #8B4513 (saddle brown)
Accent:        #8B2020 (deep crimson) or #B71C1C (dark red)
Gold:          #D4AF37 (traditional gold)
Green-felt:    #2D5016 (table green — already in config!)
Text:          #F5F0E0 (warm ivory), #A89070 (warm dim), #D4C4A8 (secondary)
Tile face:     #FFF8E1 (keep — already good)
Tile border:   #8B7355 (warm brown)
Suit bamboo:   #2E7D32 (forest green)
Suit char:     #B71C1C (deep red)
Suit dot:      #1565C0 (deep blue)
Honor accent:  #D4AF37 (gold)
```

## Appendix C: Current Font Stack

```
--font-pixel: "Press Start 2P"  (pixel headings — ALL CAPS)
--font-retro:  "Chakra Petch"   (angular UI text)
--font-inter:  "Inter"           (body text — never used for headings)
```

## Appendix D: Proposed Font Stack

```
--font-heading: "Noto Serif SC" or "Ma Shan Zheng"  (calligraphic serif — Chinese/English)
--font-accent:  "ZCOOL XiaoWei" or "Playfair Display" (elegant serif for English headings)
--font-ui:      "Chakra Petch" or "Inter"             (keep as-is for body/UI)
--font-mono:    "JetBrains Mono"                      (technical data if needed)
```

---

*End of gap analysis. This document is research-only — no code changes were made.*