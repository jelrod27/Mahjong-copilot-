/**
 * Per-seat redaction — turning the engine's omniscient state into the view one
 * seat is entitled to.
 *
 * `GameState` carries the full wall in draw order and all four hands, because
 * the engine and the solo AI read from the same object. Sending it to a client
 * is not a partial leak, it is the whole game. Every byte a remote client
 * receives must pass through here first.
 *
 * A **projection, not a filter**: no field is ever removed, only emptied or
 * replaced with placeholders of the same length. Consumers keep working on
 * shape, which is why no renderer changes when redaction is introduced.
 *
 * Pure module: no React, no DOM, no clock, no I/O.
 *
 * See plans/029-redaction-layer.md and plans/027-multiplayer-architecture.md.
 */

import { GameState, GamePhase, ClaimRequest, MeldInfo, Player } from '@/models/GameState';
import { Tile, hiddenTile, isHiddenTile } from '@/models/Tile';

declare const redactedBrand: unique symbol;

/**
 * A `GameState` that has been through `redactFor`. Transports must accept only
 * this type, so handing one raw state is a compile error.
 *
 * The brand is a **compile-time** guarantee and nothing more: it does not
 * survive `JSON.stringify`, and there is no runtime check. It stops the mistake
 * at the call site, which is where it happens.
 */
export type RedactedState = GameState & { readonly [redactedBrand]: true };

/** Replace a run of tiles with same-length, stably-keyed placeholders. */
function hide(tiles: Tile[], keyPrefix: string): Tile[] {
  return tiles.map((_, i) => hiddenTile(`${keyPrefix}_${i}`));
}

/**
 * A concealed kong is laid with its outer tiles face down: the table knows a
 * kong was declared, not which tile it was made of, until scoring. Exposed
 * melds are genuinely public and pass through untouched.
 */
function redactMelds(melds: MeldInfo[], seat: number): MeldInfo[] {
  return melds.map((meld, i) =>
    meld.isConcealed && meld.type === 'kong'
      ? { ...meld, tiles: hide(meld.tiles, `seat${seat}_kong${i}`) }
      : meld,
  );
}

function redactPlayer(player: Player, seat: number, isViewer: boolean): Player {
  if (isViewer) return player;
  return {
    ...player,
    // Length is public — a real table shows how many tiles each player holds.
    hand: hide(player.hand, `seat${seat}`),
    melds: redactMelds(player.melds, seat),
  };
}

/**
 * A rival's pending claim is not visible while the window is open.
 *
 * "Everyone at a table hears pung" is true of a *resolved* claim. Under
 * ADR 0003 this window is simultaneous: nothing has been announced yet, and
 * seats are still deciding. Publishing `{playerId: 'ai-2', claimType: 'pung'}`
 * tells whoever has not answered that seat 2 holds two copies of the live
 * discard — a stronger statement about a concealed hand than the eligibility
 * that `redactFor` strips from `claimablePlayers` two lines below, and
 * actionable by the seat still choosing.
 *
 * Emptying `tiles` alone was not enough, because the claim type says what the
 * tiles must have been.
 */
function redactClaims(claims: ClaimRequest[], viewerId: string): ClaimRequest[] {
  return claims.filter(c => c.playerId === viewerId);
}

/**
 * Project `state` into the view `viewerSeat` is entitled to.
 *
 * A finished hand is returned whole, seed included, so every player can replay
 * it against the pure engine and verify the deal was never manipulated — the
 * reveal-at-hand-end decision recorded in
 * docs/adr/0003-simultaneous-claim-window.md.
 */
export function redactFor(state: GameState, viewerSeat: number): RedactedState {
  const viewer = state.players[viewerSeat];
  if (!viewer) {
    // Failing closed would hand the viewer a board of face-down tiles and look
    // like a rendering bug. A seat index this function cannot resolve is a
    // caller error, and it should say so where it happens.
    throw new Error(
      `redactFor: no seat ${viewerSeat} (state has ${state.players.length} players)`,
    );
  }

  if (state.phase === GamePhase.FINISHED) {
    // Copy, so both branches hand back something the caller may treat as its
    // own. Returning the engine's object only at hand end would make any
    // mutation bug appear exclusively there.
    return { ...state } as RedactedState;
  }

  const viewerId = viewer.id;

  const view: GameState = {
    ...state,
    // `id` is `game_${seed}` (turnManager.initializeGame), so shipping it
    // hands over the shuffle just as surely as shipping the seed does.
    id: `view_${viewerSeat}`,
    seed: undefined,
    wall: hide(state.wall, 'wall'),
    deadWall: hide(state.deadWall, 'deadWall'),
    players: state.players.map((p, i) => redactPlayer(p, i, i === viewerSeat)),
    // Only the drawer knows what they drew — and "the drawer" is not
    // `currentPlayerIndex`. `handleDiscard` leaves `lastDrawnTile` set, and
    // during a claim window `currentPlayerIndex` names the seat that will draw
    // next (see advanceClaimRound's invariant), so keying on the turn would
    // hand the next seat a tile still concealed in the previous player's hand.
    // Ownership is the only gate that stays correct as the phase moves.
    lastDrawnTile:
      state.lastDrawnTile && viewer.hand.some(t => t.id === state.lastDrawnTile!.id)
        ? state.lastDrawnTile
        : undefined,
    pendingClaims: redactClaims(state.pendingClaims, viewerId),
    // Who *could* claim is derived from hands: `handleDiscard` fills
    // `claimablePlayers` from `getAllClaims`, so it names exactly the seats
    // holding a legal chow/pung/kong/win on the live discard. Shipping it tells
    // a rival that seat 2 holds a pair of the discard without showing a tile.
    // Only prompted seats can pass, so `passedPlayers` is a subset of the same
    // set and leaks the same fact one beat later.
    //
    // The viewer's own membership is the whole of what a client needs:
    // `canPlayerClaim` tests `includes(playerId)` and the UI asks "have I
    // already acted?". Length is deliberately not preserved here, unlike the
    // tile arrays — no renderer draws these, and the count *is* the
    // eligibility signal we are removing.
    claimablePlayers: state.claimablePlayers.filter(id => id === viewerId),
    passedPlayers: state.passedPlayers.filter(id => id === viewerId),
  };

  return view as RedactedState;
}

/**
 * Throw if `state` is a redacted view rather than authoritative state.
 *
 * `RedactedState` is assignable to `GameState`, so nothing at the type level
 * stops a view reaching `applyAction`, `getLegalClaims` or `calculateShanten` —
 * where every placeholder reports as a dot and the answer comes back confidently
 * wrong. Authoritative code that accepts state from outside should call this
 * first; it is O(1) because the wall is hidden whenever anything is.
 */
export function assertAuthoritative(state: GameState): void {
  const sentinel = state.wall[0] ?? state.deadWall[0];
  if (sentinel && isHiddenTile(sentinel)) {
    throw new Error('Expected authoritative game state, received a redacted view');
  }
}
