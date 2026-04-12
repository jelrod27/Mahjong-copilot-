-- 001_multiplayer.sql
-- Multiplayer game rooms, players, state, and action log.

-- Game rooms
create table game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- 6-char room code for joining
  host_id uuid references auth.users(id),
  status text not null default 'waiting', -- waiting, playing, finished
  difficulty text not null default 'medium',
  mode text not null default 'quick',     -- quick or full
  max_players int not null default 4,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Room players
create table room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references game_rooms(id) on delete cascade,
  user_id uuid references auth.users(id),
  display_name text not null,
  seat_index int not null,                -- 0-3
  is_ready boolean default false,
  joined_at timestamptz default now(),
  unique(room_id, seat_index),
  unique(room_id, user_id)
);

-- Game state (serialized)
create table game_states (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references game_rooms(id) on delete cascade unique,
  state jsonb not null,                   -- serialized GameState
  match_state jsonb,                      -- serialized MatchState
  version int not null default 0,         -- optimistic concurrency
  updated_at timestamptz default now()
);

-- Game actions log
create table game_actions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references game_rooms(id) on delete cascade,
  player_id uuid references auth.users(id),
  action jsonb not null,
  version int not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table game_rooms enable row level security;
alter table room_players enable row level security;
alter table game_states enable row level security;
alter table game_actions enable row level security;

-- RLS policies: game_rooms
create policy "Anyone can read rooms" on game_rooms for select using (true);
create policy "Auth users can create rooms" on game_rooms for insert with check (auth.uid() = host_id);
create policy "Host can update room" on game_rooms for update using (auth.uid() = host_id);

-- RLS policies: room_players
create policy "Anyone can read room players" on room_players for select using (true);
create policy "Auth users can join rooms" on room_players for insert with check (auth.uid() = user_id);
create policy "Players can update own status" on room_players for update using (auth.uid() = user_id);
create policy "Players can leave" on room_players for delete using (auth.uid() = user_id);

-- RLS policies: game_states
create policy "Players can read game state" on game_states for select using (
  exists (select 1 from room_players where room_id = game_states.room_id and user_id = auth.uid())
);

-- RLS policies: game_actions
create policy "Players can read actions" on game_actions for select using (
  exists (select 1 from room_players where room_id = game_actions.room_id and user_id = auth.uid())
);

-- Enable realtime
alter publication supabase_realtime add table game_rooms;
alter publication supabase_realtime add table room_players;
alter publication supabase_realtime add table game_states;
