'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom, listOpenRooms, Room } from '@/lib/multiplayer/roomService';
import RoomCard from '@/components/multiplayer/RoomCard';

export default function LobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchRooms = useCallback(async () => {
    const openRooms = await listOpenRooms();
    setRooms(openRooms);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleCreateRoom = async (type: 'casual' | 'ranked') => {
    setCreating(true);
    setError(null);
    const result = await createRoom({ roomType: type });
    setCreating(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/multiplayer/game/${result.room.id}`);
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setError(null);
    const result = await joinRoom(joinCode.trim());
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/multiplayer/game/${result.room.id}`);
  };

  const handleJoinRoom = async (code: string) => {
    setError(null);
    const result = await joinRoom(code);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/multiplayer/game/${result.room.id}`);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-retro-panel to-retro-bg px-6 pt-8 pb-6">
        <p className="font-pixel text-[10px] text-retro-cyan tracking-[1.5px] mb-1">
          MULTIPLAYER
        </p>
        <h1 className="font-pixel text-lg text-retro-white mb-2">Game Lobby</h1>
        <p className="text-base text-retro-text/80 font-retro">
          Create a room or join an existing game.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="retro-card p-3 border-retro-accent/50 text-center">
            <p className="text-sm text-retro-accent font-retro">{error}</p>
          </div>
        )}

        {/* Create Room */}
        <div className="retro-card p-4">
          <p className="font-pixel text-[9px] text-retro-gold tracking-wider mb-3">CREATE ROOM</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleCreateRoom('casual')}
              disabled={creating}
              className="flex-1 retro-btn-green py-3 text-sm disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Casual'}
            </button>
            <button
              onClick={() => handleCreateRoom('ranked')}
              disabled={creating}
              className="flex-1 bg-retro-gold/20 border border-retro-gold/50 text-retro-gold rounded-lg py-3 text-sm font-retro hover:bg-retro-gold/30 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Ranked'}
            </button>
          </div>
        </div>

        {/* Join by Code */}
        <div className="retro-card p-4">
          <p className="font-pixel text-[9px] text-retro-gold tracking-wider mb-3">JOIN BY CODE</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              maxLength={6}
              className="flex-1 bg-retro-bgLight border border-retro-border/30 rounded-lg px-4 py-3 font-pixel text-sm text-retro-text placeholder:text-retro-textDim/40 focus:border-retro-cyan/50 focus:outline-none tracking-widest text-center"
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
            />
            <button
              onClick={handleJoinByCode}
              disabled={!joinCode.trim()}
              className="retro-btn-green px-6 py-3 text-sm disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>

        {/* Open Rooms */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-pixel text-[9px] text-retro-gold tracking-wider">OPEN ROOMS</p>
            <button
              onClick={fetchRooms}
              className="text-xs text-retro-cyan font-retro hover:retro-glow transition-all"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-retro-textDim font-retro animate-pulse">Loading rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 retro-card">
              <p className="text-retro-textDim font-retro">No open rooms. Create one!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map(room => (
                <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
