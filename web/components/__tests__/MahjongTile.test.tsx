import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MahjongTile, TileHand } from '../MahjongTile';
import { TileSuit, TileType, WindTile, DragonTile, Tile } from '@/models/Tile';

function makeTile(overrides: Partial<Tile> = {}): Tile {
  return {
    id: 'test-tile',
    suit: TileSuit.DOT,
    type: TileType.SUIT,
    number: 5,
    nameEnglish: 'Five Dot',
    nameChinese: '五筒',
    nameJapanese: '五筒',
    assetPath: '',
    ...overrides,
  };
}

describe('MahjongTile', () => {
  it('renders number for suit tiles', () => {
    const { container } = render(<MahjongTile tile={makeTile({ number: 5 })} />);
    expect(container.textContent).toContain('5');
  });

  it('renders Chinese symbol for wind tiles', () => {
    const tile = makeTile({
      suit: TileSuit.WIND, type: TileType.HONOR, wind: WindTile.EAST,
      number: undefined, nameEnglish: 'East Wind',
    });
    const { container } = render(<MahjongTile tile={tile} />);
    expect(container.textContent).toContain('東');
  });

  it('renders Chinese symbol for dragon tiles', () => {
    const tile = makeTile({
      suit: TileSuit.DRAGON, type: TileType.HONOR, dragon: DragonTile.RED,
      number: undefined, nameEnglish: 'Red Dragon',
    });
    const { container } = render(<MahjongTile tile={tile} />);
    expect(container.textContent).toContain('中');
  });

  it('renders English name when width > 50', () => {
    render(<MahjongTile tile={makeTile()} width={60} />);
    expect(screen.getByText('Five Dot')).toBeInTheDocument();
  });

  it('does not render English name when width <= 50', () => {
    render(<MahjongTile tile={makeTile()} width={50} />);
    expect(screen.queryByText('Five Dot')).not.toBeInTheDocument();
  });

  it('shows back face when showBack is true', () => {
    const { container } = render(<MahjongTile tile={makeTile()} showBack />);
    expect(container.textContent).toContain('🀄');
    expect(container.textContent).not.toContain('5');
  });

  it('renders as button with onPress and fires handler', () => {
    const handler = vi.fn();
    render(<MahjongTile tile={makeTile()} onPress={handler} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders as div without onPress', () => {
    render(<MahjongTile tile={makeTile()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('TileHand', () => {
  it('renders all tiles', () => {
    const tiles = [
      makeTile({ id: 't1', number: 1 }),
      makeTile({ id: 't2', number: 2 }),
      makeTile({ id: 't3', number: 3 }),
    ];
    const { container } = render(<TileHand tiles={tiles} />);
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('3');
  });
});
