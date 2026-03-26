'use client';

import { Room } from '@/lib/multiplayer/roomService';

interface RoomCardProps {
  room: Room;
  onJoin: (code: string) => void;
}

export default function RoomCard({ room, onJoin }: RoomCardProps) {
  const playerCount = room.player_count || 0;
  const isFull = playerCount >= room.max_players;

  return (
    <div className="retro-card p-4 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-pixel text-xs text-retro-cyan">{room.code}</span>
          <span className={`text-[10px] font-retro px-2 py-0.5 rounded ${
            room.room_type === 'ranked'
              ? 'bg-retro-gold/20 text-retro-gold'
              : 'bg-retro-cyan/20 text-retro-cyan'
          }`}>
            {room.room_type.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-retro-textDim font-retro">
          Host: {room.host_name || 'Unknown'}
        </p>
        <p className="text-xs text-retro-textDim/60 font-retro">
          {playerCount}/{room.max_players} players
        </p>
      </div>

      <button
        onClick={() => onJoin(room.code)}
        disabled={isFull}
        className={`font-retro text-sm px-4 py-2 rounded-lg border transition-colors ${
          isFull
            ? 'border-retro-border/20 text-retro-textDim/40 cursor-not-allowed'
            : 'border-retro-cyan/50 text-retro-cyan hover:bg-retro-cyan/10'
        }`}
      >
        {isFull ? 'Full' : 'Join'}
      </button>
    </div>
  );
}
