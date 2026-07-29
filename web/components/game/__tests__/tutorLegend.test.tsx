import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerHand from '../PlayerHand';
import { Tile, TileSuit, TileType } from '@/models/Tile';

/**
 * Beginner Assist speaks in two places: a colour strip on each tile
 * (TUTOR_COLORS in RetroTile) and a legend under the hand (GameBoard). KEEP
 * carries no printed label, so if those two ever name different colours the
 * strip becomes unreadable — which is exactly what shipped once. Both sides
 * resolve the same design tokens; these tests pin that contract at the tile
 * end, where it is observable.
 */

function makeTile(id: string, overrides: Partial<Tile> = {}): Tile {
  return {
    id,
    suit: TileSuit.DOT,
    type: TileType.SUIT,
    number: 1,
    nameEnglish: '1 Dot',
    nameChinese: '一筒',
    nameJapanese: '一筒',
    assetPath: '',
    ...overrides,
  };
}

function renderHandWith(classification: 'green' | 'orange' | 'red') {
  const tile = makeTile('dot_1_1');
  return render(
    <PlayerHand
      tiles={[tile]}
      onTileSelect={vi.fn()}
      tileClassifications={new Map([[tile.id, classification]])}
    />,
  );
}

describe('Beginner Assist tutor strip colours', () => {
  it('marks a strong discard with the success token', () => {
    const { container } = renderHandWith('green');
    expect(container.innerHTML).toContain('var(--color-success)');
  });

  it('marks a neutral tile with the accent token', () => {
    const { container } = renderHandWith('orange');
    expect(container.innerHTML).toContain('var(--color-accent)');
  });

  it('marks a useful tile with the destructive token', () => {
    const { container } = renderHandWith('red');
    expect(container.innerHTML).toContain('var(--color-destructive)');
  });
});

describe('Beginner Assist printed labels', () => {
  it('prints GOOD under a strong discard', () => {
    renderHandWith('green');
    expect(screen.getByText('GOOD')).toBeInTheDocument();
  });

  it('prints OK under a neutral tile', () => {
    renderHandWith('orange');
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('prints no label under a useful tile, leaving the colour strip to say it', () => {
    renderHandWith('red');
    expect(screen.queryByText('KEEP')).not.toBeInTheDocument();
  });

  it('still reserves the label slot for a useful tile so the hand keeps one baseline', () => {
    const { container } = renderHandWith('red');
    const slot = container.querySelector('[aria-hidden="true"]');
    expect(slot).not.toBeNull();
    expect(slot?.textContent).toBe(' ');
  });

  it('still names the KEEP state in the tile accessible name', () => {
    renderHandWith('red');
    expect(
      screen.getByRole('button', { name: /Beginner Assist: KEEP/ }),
    ).toBeInTheDocument();
  });
});
