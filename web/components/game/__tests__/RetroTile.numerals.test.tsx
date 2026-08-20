import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RetroTile from '../RetroTile';
import { TileDisplayProvider } from '../TileDisplayContext';
import { TileFactory, TileSuit, WindTile, DragonTile } from '@/models/Tile';
import type { Tile } from '@/models/Tile';

/**
 * The artwork carries no Arabic numerals, and the prototype that introduced it
 * called those a pedagogical feature rather than decoration. These pin that the
 * numeral comes back only where there is a rank to print, and only when asked
 * for.
 */

const find = (predicate: (t: Tile) => boolean): Tile => {
  const tile = TileFactory.getAllTiles().find(predicate);
  if (!tile) throw new Error('fixture tile not found');
  return tile;
};

const withNumerals = (tile: Tile, showNumerals: boolean) =>
  render(
    <TileDisplayProvider showNumerals={showNumerals}>
      <RetroTile tile={tile} />
    </TileDisplayProvider>,
  );

describe('rank numerals', () => {
  it('prints the rank on every suited tile', () => {
    for (const suit of [TileSuit.BAMBOO, TileSuit.CHARACTER, TileSuit.DOT]) {
      for (let n = 1; n <= 9; n++) {
        const { unmount } = withNumerals(find((t) => t.suit === suit && t.number === n), true);
        expect(screen.getByText(String(n)), `${suit} ${n} printed no rank`).toBeInTheDocument();
        unmount();
      }
    }
  });

  it('prints nothing on honours, which have no rank', () => {
    // A numeral on a dragon would be inventing information rather than
    // surfacing it.
    for (const tile of [find((t) => t.wind === WindTile.EAST), find((t) => t.dragon === DragonTile.RED)]) {
      const { container, unmount } = withNumerals(tile, true);
      expect(container.querySelector('.mahjong-tile-numeral')).toBeNull();
      unmount();
    }
  });

  it('prints nothing when the setting is off', () => {
    const { container } = withNumerals(find((t) => t.suit === TileSuit.DOT && t.number === 5), false);
    expect(container.querySelector('.mahjong-tile-numeral')).toBeNull();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('defaults to off outside a provider', () => {
    // Cosmetics thumbnails and isolated tests render tiles with no provider
    // above them, and should get the plain face rather than throwing.
    const { container } = render(<RetroTile tile={find((t) => t.suit === TileSuit.DOT && t.number === 5)} />);
    expect(container.querySelector('.mahjong-tile-numeral')).toBeNull();
  });

  it('keeps the numeral out of the accessibility tree', () => {
    // The tile's name already speaks the rank, so announcing the digit too
    // would read "Five Dot, 5".
    const { container } = withNumerals(find((t) => t.suit === TileSuit.DOT && t.number === 5), true);
    const numeral = container.querySelector('.mahjong-tile-numeral');

    expect(numeral).not.toBeNull();
    expect(numeral?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Five Dot');
  });

  it('sizes and places the numeral relative to the tile, not the root font', () => {
    // A fixed px size would stop tracking the tile at xs and lg.
    const { container } = withNumerals(find((t) => t.suit === TileSuit.BAMBOO && t.number === 3), true);
    const numeral = container.querySelector('.mahjong-tile-numeral');

    expect(numeral).not.toBeNull();
    // The class carries the relative sizing; the element must not override it
    // with a literal.
    expect(numeral?.getAttribute('style') ?? '').not.toMatch(/font-size:\s*\d+px/);
  });
});
