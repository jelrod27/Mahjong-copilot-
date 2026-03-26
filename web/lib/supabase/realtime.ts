/**
 * Supabase Realtime channel management for multiplayer games.
 */

import { createClient } from './client';
import { FilteredGameState } from '@/lib/multiplayer/stateFilter';

export type GameEvent =
  | { type: 'game-state-update'; state: FilteredGameState; version: number }
  | { type: 'player-joined'; playerId: string; displayName: string; seatIndex: number }
  | { type: 'player-left'; playerId: string }
  | { type: 'game-started' }
  | { type: 'game-finished'; winnerId?: string }
  | { type: 'chat-message'; playerId: string; message: string; timestamp: string };

export type PresenceState = {
  [key: string]: { playerId: string; displayName: string; online_at: string }[];
};

export function joinGameChannel(
  roomId: string,
  onEvent: (event: GameEvent) => void,
  onPresenceSync?: (state: PresenceState) => void,
) {
  const supabase = createClient();

  const channel = supabase.channel(`game:${roomId}`, {
    config: { broadcast: { self: true } },
  });

  // Listen for broadcast events
  channel
    .on('broadcast', { event: 'game-event' }, (payload) => {
      onEvent(payload.payload as GameEvent);
    });

  // Presence tracking
  if (onPresenceSync) {
    channel
      .on('presence', { event: 'sync' }, () => {
        onPresenceSync(channel.presenceState() as PresenceState);
      });
  }

  channel.subscribe();

  return channel;
}

export function leaveChannel(channel: ReturnType<ReturnType<typeof createClient>['channel']>) {
  const supabase = createClient();
  supabase.removeChannel(channel);
}

export function broadcastGameEvent(
  channel: ReturnType<ReturnType<typeof createClient>['channel']>,
  event: GameEvent,
) {
  channel.send({
    type: 'broadcast',
    event: 'game-event',
    payload: event,
  });
}

export function trackPresence(
  channel: ReturnType<ReturnType<typeof createClient>['channel']>,
  playerId: string,
  displayName: string,
) {
  channel.track({
    playerId,
    displayName,
    online_at: new Date().toISOString(),
  });
}
