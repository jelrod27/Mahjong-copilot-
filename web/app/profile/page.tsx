'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface ProfileData {
  display_name: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  placement_games_remaining: number;
}

interface MatchEntry {
  id: string;
  elo_before: number;
  elo_after: number;
  elo_change: number;
  placement: number;
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profileData }, { data: matchData }] = await Promise.all([
        supabase.from('profiles')
          .select('display_name, elo_rating, games_played, games_won, placement_games_remaining')
          .eq('id', user.id).single(),
        supabase.from('match_history')
          .select('id, elo_before, elo_after, elo_change, placement, created_at')
          .eq('player_id', user.id)
          .order('created_at', { ascending: false }).limit(20),
      ]);

      if (profileData) setProfile(profileData);
      if (matchData) setMatches(matchData);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-retro-bg flex items-center justify-center">
        <p className="text-retro-textDim font-retro animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-retro-bg flex items-center justify-center">
        <p className="text-retro-textDim font-retro">Please sign in to view your profile.</p>
      </div>
    );
  }

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  // Simple ELO chart from match history
  const eloHistory = matches.length > 0
    ? [...matches].reverse().map(m => m.elo_after)
    : [profile.elo_rating];

  return (
    <div className="min-h-screen bg-retro-bg">
      {/* Header */}
      <div className="bg-gradient-to-b from-retro-panel to-retro-bg px-6 pt-8 pb-6">
        <Link href="/" className="text-sm text-retro-cyan font-retro mb-3 block hover:retro-glow">
          ‹ Back
        </Link>
        <h1 className="font-pixel text-lg text-retro-white mb-1">{profile.display_name}</h1>
        <p className="text-base text-retro-text/80 font-retro">Player Profile</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="ELO Rating" value={String(profile.elo_rating)} color="text-retro-gold" />
          <StatCard label="Games Played" value={String(profile.games_played)} color="text-retro-cyan" />
          <StatCard label="Games Won" value={String(profile.games_won)} color="text-retro-green" />
          <StatCard label="Win Rate" value={`${winRate}%`} color="text-retro-text" />
        </div>

        {profile.placement_games_remaining > 0 && (
          <div className="retro-card p-4 border-retro-gold/30 text-center">
            <p className="text-sm text-retro-gold font-retro">
              {profile.placement_games_remaining} placement games remaining
            </p>
            <p className="text-xs text-retro-textDim font-retro mt-1">
              Complete 10 ranked games to appear on the leaderboard
            </p>
          </div>
        )}

        {/* ELO Chart (simple SVG) */}
        {eloHistory.length > 1 && (
          <div className="retro-card p-4">
            <p className="font-pixel text-[9px] text-retro-gold tracking-wider mb-3">ELO HISTORY</p>
            <EloChart data={eloHistory} />
          </div>
        )}

        {/* Match History */}
        <div>
          <p className="font-pixel text-[9px] text-retro-gold tracking-wider mb-3">RECENT MATCHES</p>
          {matches.length === 0 ? (
            <div className="retro-card p-4 text-center">
              <p className="text-retro-textDim font-retro text-sm">No matches yet. Play some games!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map(match => (
                <div key={match.id} className="retro-card p-3 flex items-center justify-between">
                  <div>
                    <p className="font-retro text-sm text-retro-text">
                      {getPlacementLabel(match.placement)}
                    </p>
                    <p className="font-retro text-xs text-retro-textDim">
                      {new Date(match.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-retro text-sm font-bold ${
                    match.elo_change > 0 ? 'text-retro-green' : 'text-retro-accent'
                  }`}>
                    {match.elo_change > 0 ? '+' : ''}{match.elo_change}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="retro-card p-4 text-center">
      <p className="text-xs text-retro-textDim font-retro mb-1">{label}</p>
      <p className={`text-xl font-retro font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EloChart({ data }: { data: number[] }) {
  const min = Math.min(...data) - 50;
  const max = Math.max(...data) + 50;
  const range = max - min || 1;
  const width = 300;
  const height = 100;

  const points = data.map((elo, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((elo - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
      <polyline
        fill="none"
        stroke="var(--retro-cyan, #00d4ff)"
        strokeWidth="2"
        points={points}
      />
      {/* Start and end labels */}
      <text x="0" y={height - 5} fill="var(--retro-textDim, #999)" fontSize="10" fontFamily="monospace">
        {data[0]}
      </text>
      <text x={width} y={height - 5} fill="var(--retro-gold, #ffd700)" fontSize="10" fontFamily="monospace" textAnchor="end">
        {data[data.length - 1]}
      </text>
    </svg>
  );
}

function getPlacementLabel(placement: number): string {
  switch (placement) {
    case 1: return '1st Place 🥇';
    case 2: return '2nd Place 🥈';
    case 3: return '3rd Place 🥉';
    case 4: return '4th Place';
    default: return `${placement}th Place`;
  }
}
