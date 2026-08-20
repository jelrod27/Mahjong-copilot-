import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RetroTile from '../RetroTile';
import { TileFactory, TileSuit, TileType, WindTile, DragonTile } from '@/models/Tile';
import type { Tile } from '@/models/Tile';

/**
 * Names come from tile.nameEnglish, which spells suited ranks as words:
 * "Three Bamboo", not "3 Bamboo". Winds and dragons are already "East Wind"
 * and "Red Dragon". The word form is left alone deliberately, because
 * nameEnglish also feeds toasts, lessons and reference content, and a screen
 * reader speaks "Three" either way.
 *
 * The artwork replaced the Unicode glyph on the tile face, and that glyph was
 * doing accessibility work by accident: it was the only text a screen reader
 * could read on a tile with no click handler, which is the entire discard sea
 * and every exposed meld. The drawing is decorative, so the name now has to be
 * stated rather than inferred.
 */

const find = (predicate: (t: Tile) => boolean): Tile => {
  const tile = TileFactory.getAllTiles().find(predicate);
  if (!tile) throw new Error('fixture tile not found');
  return tile;
};

const threeBamboo = () => find((t) => t.suit === TileSuit.BAMBOO && t.number === 3);
const eastWind = () => find((t) => t.wind === WindTile.EAST);
const redDragon = () => find((t) => t.dragon === DragonTile.RED);

describe('tile accessible name', () => {
  it('names a non-interactive tile exactly once', () => {
    const { container } = render(<RetroTile tile={threeBamboo()} />);

    const named = container.querySelectorAll('[aria-label]');
    expect(named).toHaveLength(1);
    expect(named[0].getAttribute('aria-label')).toContain('Three Bamboo');
  });

  it('names an interactive tile exactly once, on the button', () => {
    // The face must not also carry a name: a button wrapping a labelled
    // element announces both, so every tile in hand would be read twice.
    const { container } = render(<RetroTile tile={threeBamboo()} onClick={vi.fn()} />);

    const named = container.querySelectorAll('[aria-label]');
    expect(named).toHaveLength(1);
    expect(named[0].tagName).toBe('BUTTON');
    expect(screen.getByRole('button', { name: /Three Bamboo/ })).toBeInTheDocument();
  });

  it('uses tile identity, not the drawing, for honours', () => {
    render(<RetroTile tile={eastWind()} />);
    expect(screen.getByRole('img', { name: /East Wind/ })).toBeInTheDocument();
  });

  it('names dragons by colour', () => {
    render(<RetroTile tile={redDragon()} />);
    expect(screen.getByRole('img', { name: /Red Dragon/ })).toBeInTheDocument();
  });

  it('keeps the artwork out of the accessibility tree', () => {
    const { container } = render(<RetroTile tile={threeBamboo()} />);
    const art = container.querySelector('img');

    expect(art).not.toBeNull();
    expect(art?.getAttribute('alt')).toBe('');
    expect(art?.getAttribute('aria-hidden')).toBe('true');
  });

  it('still names the tile when it carries assist state', () => {
    // The state is appended to the name rather than replacing it, so a tile
    // under review is still identifiable.
    render(<RetroTile tile={threeBamboo()} isSelected tutorLabel="KEEP" />);
    const named = screen.getByRole('img');

    expect(named.getAttribute('aria-label')).toContain('Three Bamboo');
    expect(named.getAttribute('aria-label')).toContain('selected');
    expect(named.getAttribute('aria-label')).toContain('KEEP');
  });

  it('does not name a face-down tile as its face', () => {
    render(<RetroTile tile={threeBamboo()} showBack onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Face-down tile' })).toBeInTheDocument();
    expect(screen.queryByText(/Three Bamboo/)).not.toBeInTheDocument();
  });
});
