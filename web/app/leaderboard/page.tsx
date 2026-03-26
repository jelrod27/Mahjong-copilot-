'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface LeaderboardEntry {
  player_id: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  is_placed: boolean;
  rank: number | null;
  display_name: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data, error } = await supabase
        .from('leaderboard')
        .select(`
          player_id,
          elo_rating,
          games_played,
          games_won,
          is_placed,
          rank,
          profiles(display_name)
        `)
        .eq('is_placed', true)
        .order('elo_rating', { ascending: false })
        .limit(100);

      if (data) {
        setEntries(data.map((e: any, i: number) => ({
          ...e,
          display_name: e.profiles?.display_name || 'Player',
          rank: e.rank || i + 1,
        })));
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-retro-bg">
      {/* Header */}
      <div className="bg-gradient-to-b from-retro-panel to-retro-bg px-6 pt-8 pb-6">
        <Link href="/" className="text-sm text-retro-cyan font-retro mb-3 block hover:retro-glow">
          ‹ Back
        </Link>
        <p className="font-pixel text-[10px] text-retro-gold tracking-[1.5px] mb-1">
          RANKINGS
        </p>
        <h1 className="font-pixel text-lg text-retro-white mb-2">Leaderboard</h1>
        <p className="text-base text-retro-text/80 font-retro">
          Top 100 ranked players
        </p>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-retro-textDim font-retro animate-pulse">Loading rankings...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 retro-card">
            <p className="text-retro-textDim font-retro mb-2">No ranked players yet.</p>
            <p className="text-sm text-retro-textDim/60 font-retro">
              Play 10 ranked games to appear on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className="flex items-center px-4 py-2 text-xs text-retro-textDim font-retro">
              <span className="w-10">#</span>
              <span className="flex-1">Player</span>
              <span className="w-16 text-right">ELO</span>
              <span className="w-16 text-right">Games</span>
              <span className="w-16 text-right">Win %</span>
            </div>

            {entries.map((entry, i) => {
              const winRate = entry.games_played > 0
                ? Math.round((entry.games_won / entry.games_played) * 100)
                : 0;
              const isMe = entry.player_id === userId;

              return (
                <div
                  key={entry.player_id}
                  className={`flex items-center retro-card px-4 py-3 ${
                    isMe ? 'border-retro-cyan/50' : ''
                  }`}
                >
                  <span className={`w-10 font-pixel text-xs ${
                    i === 0 ? 'text-retro-gold' :
                    i === 1 ? 'text-gray-300' :
                    i === 2 ? 'text-amber-600' :
                    'text-retro-textDim'
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`flex-1 font-retro text-sm ${isMe ? 'text-retro-cyan' : 'text-retro-text'}`}>
                    {entry.display_name}
                    {isMe && <span className="text-xs text-retro-cyan/60 ml-1">(you)</span>}
                  </span>
                  <span className="w-16 text-right font-retro text-sm text-retro-gold">
                    {entry.elo_rating}
                  </span>
                  <span className="w-16 text-right font-retro text-sm text-retro-textDim">
                    {entry.games_played}
                  </span>
                  <span className="w-16 text-right font-retro text-sm text-retro-textDim">
                    {winRate}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
