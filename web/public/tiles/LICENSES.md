# Tile artwork licences

Everything under this directory is served to the browser, so its licence has to
be satisfiable by a public web app with no credits screen. The rule is the same
one recorded in `docs/design/audio.md` for audio: royalty free or CC0,
commercial use permitted, no attribution requirement. CC-BY and anything with
unclear terms is rejected, because an attribution requirement cannot be met by
an app that has nowhere to put the attribution.

## `hk/` (42 SVG files)

Hong Kong tile faces: 27 suited (bamboo, character, dot, 1 to 9), 4 winds,
3 dragons, 4 flowers, 4 seasons.

- Source: https://github.com/samoheen/mahjong-tiles
- Licence: Public Domain (CC0 1.0), https://creativecommons.org/publicdomain/zero/1.0/
- Upstream statement: "All files in this repository are Public Domain."
- Vendored copy of the upstream licence: `assets/HK-mahjong-tiles-master/LICENSE.md`

CC0 imposes no attribution requirement. The source is recorded here because
knowing where a vendored asset came from matters when it needs updating or
replacing, not because the licence demands it.

Each file draws a glyph on a transparent ground, occupying 246x315 of a 300x420
canvas. The transparency is load bearing: the tile face colour comes from the
active cosmetics palette painting behind the art, so the artwork does not need
one variant per palette.

## Not vendored here

`assets/tiles/` holds a different set (Riichi tiles from
https://github.com/FluffyStuff/riichi-mahjong-tiles) with its own licence file.
Those are not served: they sit outside `web/public/`, and nothing reads the
`assetPath` field on `Tile` that once pointed at them.
