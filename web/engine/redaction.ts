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

import { GameState, GamePhase, ClaimRequest, Player } from '@/models/GameState';
import { Tile, hiddenTile } from '@/models/Tile';

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

function redactPlayer(player: Player, seat: number, isViewer: boolean): Player {
  if (isViewer) return player;
  return {
    ...player,
    // Length is public — a real table shows how many tiles each player holds.
    hand: hide(player.hand, `seat${seat}`),
  };
}

/**
 * The tiles a claimant commits from hand reveal part of their hand, so they
 * stay private to their owner until the window resolves. The claim itself
 * (who, and what kind) is public: everyone at a table hears "pung".
 */
function redactClaim(claim: ClaimRequest, viewerId: string): ClaimRequest {
  if (claim.playerId === viewerId) return claim;
  return { ...claim, tiles: [] };
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
  if (state.phase === GamePhase.FINISHED) {
    return state as RedactedState;
  }

  const viewer = state.players[viewerSeat];
  const viewerId = viewer?.id;

  const view: GameState = {
    ...state,
    // `id` is `game_${seed}` (turnManager.initializeGame), so shipping it
    // hands over the shuffle just as surely as shipping the seed does.
    id: `view_${viewerSeat}`,
    seed: undefined,
    wall: hide(state.wall, 'wall'),
    deadWall: hide(state.deadWall, 'deadWall'),
    players: state.players.map((p, i) => redactPlayer(p, i, i === viewerSeat)),
    // Only the drawer knows what they drew.
    lastDrawnTile:
      state.currentPlayerIndex === viewerSeat ? state.lastDrawnTile : undefined,
    pendingClaims: state.pendingClaims.map(c => redactClaim(c, viewerId)),
  };

  return view as RedactedState;
}
