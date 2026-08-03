/**
 * Presentation events — the transient stream that explains *how* the scene got
 * from one engine state to the next.
 *
 * The scene projection (`GameState → SceneModel`) is the settled truth: drop
 * every event here and the board is still correct. These events only describe
 * the movements between two settled states, so an animator can show them.
 *
 * Derived from the triple the controller's action funnel already holds
 * (previous state, action, next state). The engine is never modified and never
 * consulted for history: a single engine transition can move many tiles — a
 * flower loop reveals N flowers and draws N+1 replacements, a kong applies the
 * meld and its replacement atomically — and the ordering of those movements is
 * recovered here from the wall arrays, which are consumed from the front.
 *
 * Pure module: no React, no three.js, no DOM, no clock. Sequence numbers come
 * from a counter owned by the caller (see `startSeq`), never from a timestamp,
 * so the same transition always derives the same stream.
 */

import { GameState, GamePhase, MeldInfo, WinMethod } from '@/models/GameState';
import { Tile, TileType } from '@/models/Tile';
import { GameAction } from '@/engine/types';

/** `Tile.id` — the identity of one physical tile. */
export type TileId = string;

/** Index into `GameState.players` (0–3). Stable for the life of a hand. */
export type SeatId = number;

export type ClaimKind = 'chow' | 'pung' | 'kong' | 'win';

/** Which pile a tile was drawn from. */
export type WallSource = 'wall' | 'deadWall';

/** `meldIndex` for a claim that forms no meld — a win on a discarded tile. */
export const NO_MELD = -1;

export type PresentationEvent =
  | { kind: 'deal'; seq: number; tiles: readonly TileId[] }
  | { kind: 'draw'; seq: number; seat: SeatId; tile: TileId | null; source: WallSource }
  | { kind: 'discard'; seq: number; seat: SeatId; tile: TileId }
  | { kind: 'claim'; seq: number; seat: SeatId; claim: ClaimKind; tile: TileId; meldIndex: number }
  | { kind: 'flowerReveal'; seq: number; seat: SeatId; tile: TileId }
  | { kind: 'kongReplacement'; seq: number; seat: SeatId; tile: TileId | null }
  | { kind: 'turnChange'; seq: number; to: SeatId }
  | { kind: 'handEnd'; seq: number; winner: SeatId | null; method?: WinMethod };

/**
 * The deal is not an engine action — `initializeGame` produces the first state
 * outright — but it is a transition the scene has to show, so it gets its own
 * marker.
 */
export type PresentationAction = GameAction | { type: 'DEAL' };

type Unsequenced<T> = T extends unknown ? Omit<T, 'seq'> : never;

/**
 * Derive the ordered list of things that visibly happened in one transition.
 *
 * @param previous state before the action, or `null` for the initial deal
 * @param action the action that produced `next` (`{ type: 'DEAL' }` for a deal)
 * @param next state after the action
 * @param startSeq first sequence number to assign. The caller owns the counter
 *   and advances it by the number of events returned.
 */
export function deriveEvents(
  previous: GameState | null,
  action: PresentationAction,
  next: GameState,
  startSeq: number,
): PresentationEvent[] {
  const events: PresentationEvent[] = [];
  let seq = startSeq;
  const push = (event: Unsequenced<PresentationEvent>) => {
    events.push({ ...event, seq: seq++ } as PresentationEvent);
  };

  if (previous === null || action.type === 'DEAL') {
    pushDealEvents(next, push);
  } else {
    pushTransitionEvents(previous, next, push);
  }

  return events;
}

type Push = (event: Unsequenced<PresentationEvent>) => void;

/**
 * The deal reveals flowers for every seat and draws their replacements inside
 * the one transition, so it is multi-event on every run.
 *
 * Two details are not recoverable from the dealt state, because the engine
 * keeps no record of them: which of a seat's flowers came off the deal rather
 * than off a replacement draw, and which tile each replacement was. Both are
 * invisible on the table — every flower ends up on the rack either way — so
 * the deal is reported as if every flower was dealt, and the replacements are
 * reported with an unknown tile. Counts stay exact: a seat that shows F
 * flowers was dealt F of them among its 13 tiles and drew F replacements.
 */
function pushDealEvents(next: GameState, push: Push) {
  const dealt: TileId[] = [];
  for (const player of next.players) {
    const fromHand = player.hand.slice(0, player.hand.length - player.flowers.length);
    dealt.push(...fromHand.map(t => t.id), ...player.flowers.map(t => t.id));
  }
  push({ kind: 'deal', tiles: dealt });

  // HK convention, matching the engine: replacements proceed from the dealer.
  const dealerIndex = Math.max(0, next.players.findIndex(p => p.isDealer));
  for (let i = 0; i < next.players.length; i++) {
    const seat = (dealerIndex + i) % next.players.length;
    const { flowers } = next.players[seat];
    for (const flower of flowers) {
      push({ kind: 'flowerReveal', seat, tile: flower.id });
    }
    for (let f = 0; f < flowers.length; f++) {
      push({ kind: 'draw', seat, tile: null, source: 'deadWall' });
    }
  }

  push({ kind: 'turnChange', to: next.currentPlayerIndex });
}

function pushTransitionEvents(previous: GameState, next: GameState, push: Push) {
  const discard = findDiscard(previous, next);
  if (discard) {
    push({ kind: 'discard', seat: discard.seat, tile: discard.tile.id });
  }

  const meld = findMeldDelta(previous, next);
  if (meld) {
    push({
      kind: 'claim',
      seat: meld.seat,
      claim: meld.claim,
      tile: meld.tile.id,
      meldIndex: meld.meldIndex,
    });
  }

  const win = findClaimedWin(previous, next);
  if (win) {
    push({ kind: 'claim', seat: win.seat, claim: 'win', tile: win.tile.id, meldIndex: NO_MELD });
  }

  const ended = next.phase === GamePhase.FINISHED && previous.phase !== GamePhase.FINISHED;
  if (next.currentPlayerIndex !== previous.currentPlayerIndex && !ended) {
    push({ kind: 'turnChange', to: next.currentPlayerIndex });
  }

  pushWallEvents(previous, next, meld, push);

  if (ended) {
    const winnerIndex = next.players.findIndex(p => p.id === next.winnerId);
    push({
      kind: 'handEnd',
      winner: winnerIndex === -1 ? null : winnerIndex,
      ...(next.winMethod ? { method: next.winMethod } : {}),
    });
  }
}

/**
 * Walk the tiles this transition took off the walls, in the order the engine
 * took them, and name each movement.
 *
 * A kong takes its replacement first; anything else that consumes tiles starts
 * with a draw off the live wall. After that, every bonus tile is revealed and
 * pulls one more tile in — replacements come off the dead wall until it is
 * empty, then off the live wall.
 */
function pushWallEvents(
  previous: GameState,
  next: GameState,
  meld: MeldDelta | null,
  push: Push,
) {
  const fromWall = previous.wall
    .slice(0, previous.wall.length - next.wall.length)
    .map(tile => ({ tile, source: 'wall' as const }));
  const fromDeadWall = previous.deadWall
    .slice(0, previous.deadWall.length - next.deadWall.length)
    .map(tile => ({ tile, source: 'deadWall' as const }));

  const isKong = meld?.claim === 'kong';
  const taken = isKong
    ? [...fromDeadWall, ...fromWall]
    : [...fromWall.slice(0, 1), ...fromDeadWall, ...fromWall.slice(1)];

  if (!isKong && taken.length === 0) return;

  const seat = meld?.seat ?? previous.currentPlayerIndex;
  let drawn = taken[0] ?? null;

  if (isKong) {
    push({ kind: 'kongReplacement', seat, tile: drawn?.tile.id ?? null });
  } else {
    push({ kind: 'draw', seat, tile: drawn!.tile.id, source: drawn!.source });
  }

  let index = 1;
  while (drawn && drawn.tile.type === TileType.BONUS) {
    push({ kind: 'flowerReveal', seat, tile: drawn.tile.id });
    const replacement = taken[index];
    // No replacement left: the walls ran out mid-loop and the hand is over.
    if (!replacement) break;
    push({ kind: 'draw', seat, tile: replacement.tile.id, source: replacement.source });
    index++;
    drawn = replacement;
  }
}

function findDiscard(previous: GameState, next: GameState): { seat: SeatId; tile: Tile } | null {
  for (let seat = 0; seat < previous.players.length; seat++) {
    const id = previous.players[seat].id;
    const before = previous.playerDiscards[id]?.length ?? 0;
    const after = next.playerDiscards[id] ?? [];
    if (after.length > before) {
      return { seat, tile: after[after.length - 1] };
    }
  }
  return null;
}

interface MeldDelta {
  seat: SeatId;
  meldIndex: number;
  claim: ClaimKind;
  tile: Tile;
}

/**
 * The meld a transition created or upgraded, and the tile that completed it.
 * A claimed tile is the one meld tile that was not already in the claimant's
 * hand; a concealed kong is built entirely from hand, so it reports its own
 * first tile.
 */
function findMeldDelta(previous: GameState, next: GameState): MeldDelta | null {
  for (let seat = 0; seat < previous.players.length; seat++) {
    const before = previous.players[seat].melds;
    const after = next.players[seat].melds;

    if (after.length > before.length) {
      const meldIndex = before.length;
      const meld = after[meldIndex];
      const handIds = new Set(previous.players[seat].hand.map(t => t.id));
      const tile = meld.tiles.find(t => !handIds.has(t.id)) ?? meld.tiles[0];
      return { seat, meldIndex, claim: meldClaim(meld), tile };
    }

    for (let meldIndex = 0; meldIndex < before.length; meldIndex++) {
      const grew = after[meldIndex].tiles.length - before[meldIndex].tiles.length;
      if (grew > 0) {
        // Only a kong upgrades an existing meld (a pung gains its fourth tile).
        return {
          seat,
          meldIndex,
          claim: 'kong',
          tile: after[meldIndex].tiles[before[meldIndex].tiles.length],
        };
      }
    }
  }
  return null;
}

function meldClaim(meld: MeldInfo): ClaimKind {
  return meld.type === 'pair' ? 'pung' : meld.type;
}

/** A win taken off another player's tile — the claim forms no meld. */
function findClaimedWin(previous: GameState, next: GameState): { seat: SeatId; tile: Tile } | null {
  if (next.phase !== GamePhase.FINISHED || previous.phase === GamePhase.FINISHED) return null;
  if (!next.winnerId || next.isSelfDrawn || !next.winningTile) return null;
  const seat = next.players.findIndex(p => p.id === next.winnerId);
  if (seat === -1) return null;
  return { seat, tile: next.winningTile };
}
