import { describe, it, expect } from 'vitest';
import { shantenAfterClaim } from '../shantenPolicy';
import { calculateShanten } from '@/engine/winDetection';
import { bam, dot, char } from '@/engine/__tests__/testHelpers';
import { MeldInfo } from '@/models/GameState';

describe('shantenAfterClaim — like-for-like claim scoring', () => {
  const pungMeld: MeldInfo = {
    type: 'pung',
    tiles: [dot(9, 1), dot(9, 2), dot(9, 3)],
    isConcealed: false,
  };

  // What a claimant holds after committing two tiles to a pung: 11 concealed
  // tiles alongside the new meld — three chows and a pair, so the 14-tile
  // total is a complete hand.
  const handAfterPung = [
    bam(2, 1), bam(3, 1), bam(4, 1),
    bam(6, 1), bam(7, 1), bam(8, 1),
    dot(5, 1), dot(6, 1), dot(7, 1),
    char(1, 1), char(1, 2),
  ];

  it('does not score a pung on the 14-tile hand the claimant cannot keep', () => {
    // Read raw, this hand is complete: `calculateShanten` returns -1, because
    // 11 concealed tiles plus four melds is a winning 14. But a pung claimant
    // must discard before the turn passes, so -1 describes a state they never
    // hold. Winning off a discard is a *win* claim, evaluated separately.
    expect(calculateShanten(handAfterPung, [pungMeld])).toBe(-1);
    expect(shantenAfterClaim('pung', handAfterPung, [pungMeld])).toBe(0);
  });

  it('scores a kong where it stands, since its replacement draw restores the 14th', () => {
    const handAfterKong = handAfterPung.slice(0, 10);
    expect(shantenAfterClaim('kong', handAfterKong, [pungMeld]))
      .toBe(calculateShanten(handAfterKong, [pungMeld]));
  });

  it('never rates a claim better than the hand it actually leaves', () => {
    // The asymmetry this closes: a pung was measured at 14 effective tiles
    // against a 13-tile baseline, so it could only ever flatter itself, while
    // a kong — which leaves 13 — was measured honestly and lost the ties.
    expect(shantenAfterClaim('pung', handAfterPung, [pungMeld]))
      .toBeGreaterThanOrEqual(calculateShanten(handAfterPung, [pungMeld]));
  });
});
