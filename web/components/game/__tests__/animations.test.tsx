import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ExposedMelds from '../ExposedMelds';
import RetroTile from '../RetroTile';
import { dot, bam } from '@/engine/__tests__/testHelpers';
import { MeldInfo } from '@/models/GameState';

const pung = (suit: 'dot' | 'bam', n: number): MeldInfo => ({
  type: 'pung',
  isConcealed: false,
  tiles: suit === 'dot' ? [dot(n, 1), dot(n, 2), dot(n, 3)] : [bam(n, 1), bam(n, 2), bam(n, 3)],
});

describe('ExposedMelds — newly-claimed flash (PRD visual round 3)', () => {
  it('flashes the most-recent meld with animate-tile-claim', () => {
    const { container } = render(
      <ExposedMelds melds={[pung('dot', 5), pung('bam', 3)]} />,
    );
    const flashing = container.querySelectorAll('.animate-tile-claim');
    // Only the latest meld carries the flash class — earlier melds stay still.
    expect(flashing).toHaveLength(1);
  });

  it('does not flash earlier melds in the same row', () => {
    const { container } = render(
      <ExposedMelds melds={[pung('dot', 5), pung('bam', 3)]} />,
    );
    const meldWrappers = container.querySelectorAll('div.flex.gap-px');
    expect(meldWrappers.length).toBe(2);
    expect(meldWrappers[0].className).not.toContain('animate-tile-claim');
    expect(meldWrappers[1].className).toContain('animate-tile-claim');
  });

  it('replays the flash by remounting wrappers when meld count grows', () => {
    // The component bumps a flashKey on growth, which is part of the React
    // key on every meld wrapper. Keys aren't visible in the DOM, but a new
    // mount means stable element identity changes — render two states and
    // assert the last meld element is a fresh node, not the same object.
    const { container, rerender } = render(<ExposedMelds melds={[pung('dot', 5)]} />);
    const before = container.querySelector('div.flex.gap-px');
    rerender(<ExposedMelds melds={[pung('dot', 5), pung('bam', 3)]} />);
    const wrappers = container.querySelectorAll('div.flex.gap-px');
    // Both wrappers should exist; the second is the newly-added one.
    expect(wrappers).toHaveLength(2);
    // The growth path remounts the existing meld too (key flashKey-prefixed),
    // so the original element identity is replaced.
    expect(before).not.toBe(wrappers[0]);
  });
});

describe('RetroTile — tile selection refinement (PRD visual round 3)', () => {
  const sampleTile = dot(5, 1);

  it('applies animate-select-pulse only when isSelected is true', () => {
    const { container, rerender } = render(<RetroTile tile={sampleTile} />);
    expect(container.querySelector('.animate-select-pulse')).toBeNull();

    rerender(<RetroTile tile={sampleTile} isSelected />);
    expect(container.querySelector('.animate-select-pulse')).not.toBeNull();
  });

  it('combines the lift, rotation, and pulse for a selected tile', () => {
    const { container } = render(<RetroTile tile={sampleTile} isSelected />);
    const tileEl = container.querySelector('.animate-select-pulse');
    expect(tileEl).not.toBeNull();
    const cls = tileEl!.className;
    expect(cls).toContain('-translate-y-2');
    expect(cls).toContain('-rotate-1');
  });
});
