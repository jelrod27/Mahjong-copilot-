-- =============================================================================
-- Ranked System Tables for 16 Bit Mahjong
-- =============================================================================

-- Seasons
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false
);

-- Match history
CREATE TABLE match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  season_id UUID REFERENCES seasons(id),
  player_id UUID NOT NULL REFERENCES profiles(id),
  elo_before INTEGER NOT NULL,
  elo_after INTEGER NOT NULL,
  elo_change INTEGER NOT NULL,
  placement INTEGER NOT NULL CHECK (placement BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leaderboard
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id),
  season_id UUID REFERENCES seasons(id),
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  is_placed BOOLEAN NOT NULL DEFAULT false,
  rank INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, season_id)
);

-- Matchmaking queue
CREATE TABLE matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id),
  elo_rating INTEGER NOT NULL,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'matched', 'cancelled'))
);

-- Indexes
CREATE INDEX idx_leaderboard_elo ON leaderboard(season_id, elo_rating DESC);
CREATE INDEX idx_leaderboard_player ON leaderboard(player_id);
CREATE INDEX idx_match_history_player ON match_history(player_id);
CREATE INDEX idx_match_history_room ON match_history(room_id);
CREATE INDEX idx_matchmaking_status ON matchmaking_queue(status, queued_at);

-- RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons are viewable by everyone"
  ON seasons FOR SELECT USING (true);

CREATE POLICY "Match history viewable by participant"
  ON match_history FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Leaderboard viewable by everyone"
  ON leaderboard FOR SELECT USING (true);

CREATE POLICY "Matchmaking queue: players manage own entries"
  ON matchmaking_queue FOR ALL
  USING (auth.uid() = player_id);
