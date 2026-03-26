'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RankedPage() {
  const router = useRouter();
  const [inQueue, setInQueue] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const joinQueue = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Please sign in to play ranked');
      return;
    }

    // Get player's ELO
    const { data: profile } = await supabase
      .from('profiles')
      .select('elo_rating')
      .eq('id', user.id)
      .single();

    if (!profile) {
      setError('Profile not found');
      return;
    }

    // Join matchmaking queue
    const { error: queueError } = await supabase
      .from('matchmaking_queue')
      .insert({
        player_id: user.id,
        elo_rating: profile.elo_rating,
      });

    if (queueError) {
      setError(queueError.message);
      return;
    }

    setInQueue(true);
    setWaitTime(0);
  }, []);

  const leaveQueue = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('player_id', user.id)
      .eq('status', 'waiting');

    setInQueue(false);
    setWaitTime(0);
  }, []);

  // Timer and poll for match
  useEffect(() => {
    if (!inQueue) return;

    const timer = setInterval(() => {
      setWaitTime(t => t + 1);
    }, 1000);

    const pollMatch = setInterval(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('matchmaking_queue')
        .select('status')
        .eq('player_id', user.id)
        .single();

      if (data?.status === 'matched') {
        // Find the room we were matched into
        const { data: playerRoom } = await supabase
          .from('player_rooms')
          .select('room_id, rooms!inner(room_type, status)')
          .eq('player_id', user.id)
          .eq('rooms.room_type', 'ranked')
          .order('joined_at', { ascending: false })
          .limit(1)
          .single();

        if (playerRoom) {
          router.push(`/multiplayer/game/${playerRoom.room_id}`);
        }
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(pollMatch);
    };
  }, [inQueue, router]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="retro-card p-8 max-w-sm w-full text-center">
        <p className="font-pixel text-[10px] text-retro-gold tracking-[1.5px] mb-2">
          RANKED MATCH
        </p>

        {error && (
          <p className="text-sm text-retro-accent font-retro mb-4">{error}</p>
        )}

        {!inQueue ? (
          <>
            <h1 className="font-pixel text-sm text-retro-white mb-4">
              Find a Match
            </h1>
            <p className="text-retro-text/80 font-retro text-base mb-6 leading-relaxed">
              Get matched with players of similar skill level.
              ELO rating changes based on your placement.
            </p>
            <button
              onClick={joinQueue}
              className="retro-btn-green w-full py-4 text-lg mb-3"
            >
              Find Ranked Match
            </button>
            <button
              onClick={() => router.push('/multiplayer/lobby')}
              className="font-retro text-sm text-retro-textDim hover:text-retro-text transition-colors"
            >
              Back to Lobby
            </button>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 border-4 border-retro-cyan/30 border-t-retro-cyan rounded-full animate-spin mx-auto mb-4" />
              <h1 className="font-pixel text-sm text-retro-cyan retro-glow mb-2">
                Searching...
              </h1>
              <p className="text-2xl font-retro text-retro-text mb-2">
                {formatTime(waitTime)}
              </p>
              <p className="text-sm text-retro-textDim font-retro">
                Looking for 3 more players
              </p>
            </div>
            <button
              onClick={leaveQueue}
              className="font-retro text-sm text-retro-accent hover:text-retro-accent/80 transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
