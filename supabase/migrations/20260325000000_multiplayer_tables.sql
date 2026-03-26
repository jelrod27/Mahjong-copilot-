-- =============================================================================
-- Multiplayer Tables for 16 Bit Mahjong
-- =============================================================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  placement_games_remaining INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Player'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  host_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'playing', 'finished', 'abandoned')),
  room_type TEXT NOT NULL DEFAULT 'casual'
    CHECK (room_type IN ('casual', 'ranked')),
  max_players INTEGER NOT NULL DEFAULT 4,
  turn_time_limit INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Player-room join table
CREATE TABLE player_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id),
  seat_index INTEGER NOT NULL CHECK (seat_index BETWEEN 0 AND 3),
  is_connected BOOLEAN NOT NULL DEFAULT true,
  disconnected_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, player_id),
  UNIQUE (room_id, seat_index)
);

-- Game state (one row per active game, JSONB for the engine state)
CREATE TABLE game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  turn_deadline TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Move log (append-only for audit/replay)
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id),
  action JSONB NOT NULL,
  state_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_player_rooms_player ON player_rooms(player_id);
CREATE INDEX idx_player_rooms_room ON player_rooms(room_id);
CREATE INDEX idx_moves_room ON moves(room_id);
CREATE INDEX idx_game_states_room ON game_states(room_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only own profile writable
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Rooms: anyone can read waiting rooms
CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update own room"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id);

-- Player rooms: players in the room can read
CREATE POLICY "Player rooms viewable by participants"
  ON player_rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join rooms"
  ON player_rooms FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update own connection"
  ON player_rooms FOR UPDATE
  USING (auth.uid() = player_id);

-- Game states: players in room can read
CREATE POLICY "Game states viewable by room participants"
  ON game_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_rooms
      WHERE player_rooms.room_id = game_states.room_id
        AND player_rooms.player_id = auth.uid()
    )
  );

-- Game states: service role only for insert/update (via Edge Functions)
CREATE POLICY "Service role can manage game states"
  ON game_states FOR ALL
  USING (auth.role() = 'service_role');

-- Moves: players in room can read
CREATE POLICY "Moves viewable by room participants"
  ON moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_rooms
      WHERE player_rooms.room_id = moves.room_id
        AND player_rooms.player_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage moves"
  ON moves FOR ALL
  USING (auth.role() = 'service_role');
