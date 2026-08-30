# Provenance — Hong Kong tile artwork

## Source

| | |
|---|---|
| Upstream | <https://github.com/samoheen/mahjong-tiles> |
| Path used | `hongkong/svg/` — 42 SVG files |
| Licence | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) (public domain dedication) |
| Vendored | Committed into this repository rather than fetched at build time |
| Provenance recorded | 2026-08-02 |

The upstream `LICENSE.md`, vendored here unchanged, reads: *"All files in this
repository are Public Domain."* `README.md` repeats the dedication with a CC0
badge.

## Why this source

It is the only surveyed set that is both **complete for Hong Kong** and
**free of a share-alike obligation**.

| Source | Licence | HK complete? | Verdict |
|---|---|---|---|
| **samoheen/mahjong-tiles** (this one) | **CC0 1.0** | **42/42**, flowers and seasons included | **in use** |
| FluffyStuff/riichi-mahjong-tiles | CC0 | 34/42 — no flowers or seasons | rejected: incomplete |
| perthmahjongsoc / Cangjie6 / DemChing | CC BY-SA 4.0 | yes | rejected: share-alike |
| I.Mahjong-HK font | M+ Font Licence | yes | rejected: monochrome outlines |
| OpenGameArt "Mahjong Tileset" | CC BY | likely | rejected: attribution in perpetuity, lower quality |

An earlier survey (`docs/tile-rendering-research.md`, 2026-05-06) concluded that
a share-alike source was unavoidable, because it never evaluated this set. That
conclusion is superseded.

**Policy, recorded so it is not re-litigated: the tile-art pipeline accepts
CC0 and public-domain sources only.** CC BY-SA art is excluded by decision, not
by oversight. This build pipeline creates adapted material — it derives a height
map from the artwork — so a share-alike obligation would attach to every derived
texture and propagate to anyone who forked them, permanently.

## Face coverage

All 42 distinct Hong Kong faces are present. A 144-tile set contains only 42
distinct designs; the remaining 102 tiles are duplicates.

- Characters 萬 1–9 (9)
- Circles 筒 1–9 (9)
- Bamboo 索 1–9 (9)
- Winds 東南西北 (4)
- Dragons 中發白 (3)
- Flowers — Plum, Orchid, Chrysanthemum, Bamboo (4)
- Seasons — Spring, Summer, Autumn, Winter (4)

The white dragon (`01-white-dragon.svg`) is the **bordered blank** 白板, a nested
rounded-rectangle frame on a blank ground. That is the standard Hong Kong
physical tile, and it is deliberately not the Riichi fully-blank tile.

## Effect on the repository licence

None. The repository `LICENSE` is MIT and stays MIT. CC0 imposes no attribution
requirement and no copyleft, so no carve-out or mixed-licence notice is needed,
and the derived `.ktx2` artefacts in `web/public/tiles/` carry no downstream
obligation.

## Attribution shipped anyway

CC0 requires none, but a credit line is cheap insurance and good practice:

> Tile artwork: samoheen/mahjong-tiles, released into the public domain (CC0 1.0).

## Residual risk

Upstream asserts CC0 for the repository as a whole with no per-file provenance.
If any individual glyph had been traced from a third-party work, the dedication
would be ineffective for that file. The mitigation is already in place: the art
is vendored into this tree rather than pulled at build time, so the exact bytes
relied on are fixed and auditable.

## What is built from this

See `docs/tile-texture-pipeline.md`. The artwork is rasterised and encoded into
`web/public/tiles/*.ktx2`; nothing else in the repository derives from it.
