-- Hong Kong Mahjong Game - Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    highest_faan INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GAME ROOMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    host_name TEXT NOT NULL,
    room_code TEXT UNIQUE,
    is_private BOOLEAN DEFAULT true,
    max_players INTEGER DEFAULT 4,
    current_players INTEGER DEFAULT 1,
    status TEXT DEFAULT 'waiting', -- waiting, playing, finished
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Policies for game_rooms
CREATE POLICY "Anyone can view game rooms"
    ON public.game_rooms FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create rooms"
    ON public.game_rooms FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Hosts can update their rooms"
    ON public.game_rooms FOR UPDATE
    USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their rooms"
    ON public.game_rooms FOR DELETE
    USING (auth.uid() = host_id);

-- Index for room code lookup
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_code ON public.game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON public.game_rooms(status);

-- ============================================================================
-- ROOM PLAYERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    seat_position INTEGER,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, player_id)
);

-- Enable RLS
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- Policies for room_players
CREATE POLICY "Anyone can view room players"
    ON public.room_players FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can join rooms"
    ON public.room_players FOR INSERT
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can leave rooms"
    ON public.room_players FOR DELETE
    USING (auth.uid() = player_id);

-- ============================================================================
-- GAME HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.game_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    winning_faan INTEGER,
    player_ids UUID[] NOT NULL,
    scores JSONB NOT NULL,
    played_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Policies for game_history
CREATE POLICY "Users can view games they played in"
    ON public.game_history FOR SELECT
    USING (auth.uid() = ANY(player_ids));

CREATE POLICY "Authenticated users can insert game history"
    ON public.game_history FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Index for history queries
CREATE INDEX IF NOT EXISTS idx_game_history_player_ids ON public.game_history USING GIN(player_ids);
CREATE INDEX IF NOT EXISTS idx_game_history_played_at ON public.game_history(played_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Increment room player count
CREATE OR REPLACE FUNCTION public.increment_room_players(room_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.game_rooms
    SET current_players = current_players + 1
    WHERE id = room_id AND current_players < max_players;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement room player count
CREATE OR REPLACE FUNCTION public.decrement_room_players(room_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.game_rooms
    SET current_players = GREATEST(0, current_players - 1)
    WHERE id = room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profile stats after a game
CREATE OR REPLACE FUNCTION public.update_player_stats(
    p_player_id UUID,
    p_won BOOLEAN,
    p_faan INTEGER,
    p_score INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET
        games_played = games_played + 1,
        games_won = CASE WHEN p_won THEN games_won + 1 ELSE games_won END,
        highest_faan = GREATEST(highest_faan, p_faan),
        total_score = total_score + p_score,
        updated_at = NOW()
    WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REALTIME SETUP
-- ============================================================================

-- Enable realtime for game_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;

-- ============================================================================
-- CLEANUP OLD ROOMS (optional scheduled job)
-- ============================================================================

-- Function to clean up old waiting rooms
CREATE OR REPLACE FUNCTION public.cleanup_old_rooms()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.game_rooms
    WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
