'use client';

import { RoomPlayer } from '@/lib/multiplayer/roomService';

interface WaitingRoomProps {
  roomCode: string;
  players: RoomPlayer[];
  maxPlayers: number;
  isHost: boolean;
  onLeave: () => void;
}

const SEAT_LABELS = ['East', 'South', 'West', 'North'];

export default function WaitingRoom({ roomCode, players, maxPlayers, isHost, onLeave }: WaitingRoomProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="retro-card p-8 max-w-md w-full text-center">
        <p className="font-pixel text-[10px] text-retro-cyan tracking-[1.5px] mb-2">
          WAITING FOR PLAYERS
        </p>
        <h1 className="font-pixel text-lg text-retro-gold retro-glow mb-1">
          Room {roomCode}
        </h1>
        <p className="text-sm text-retro-textDim font-retro mb-6">
          Share this code with friends to join
        </p>

        {/* Seats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {Array.from({ length: maxPlayers }).map((_, i) => {
            const player = players.find(p => p.seat_index === i);
            return (
              <div
                key={i}
                className={`retro-card p-3 text-center ${
                  player ? 'border-retro-green/50' : 'border-retro-border/20'
                }`}
              >
                <p className="font-pixel text-[9px] text-retro-textDim mb-1">
                  {SEAT_LABELS[i]}
                </p>
                {player ? (
                  <p className="font-retro text-sm text-retro-green">
                    {player.display_name || 'Player'}
                  </p>
                ) : (
                  <p className="font-retro text-sm text-retro-textDim/40 animate-pulse">
                    Waiting...
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-sm text-retro-textDim font-retro mb-4">
          {players.length}/{maxPlayers} players joined
        </p>

        {players.length === maxPlayers && (
          <p className="text-sm text-retro-gold font-retro mb-4 animate-pulse">
            Starting game...
          </p>
        )}

        <button
          onClick={onLeave}
          className="font-retro text-sm text-retro-accent hover:text-retro-accent/80 transition-colors"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
