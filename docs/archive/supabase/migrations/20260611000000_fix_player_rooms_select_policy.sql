-- Fix: "Player rooms viewable by participants" was USING (true), letting any
-- authenticated user enumerate all player-room associations.
--
-- A participant check on player_rooms cannot subquery player_rooms directly
-- (RLS would recurse), so route it through a SECURITY DEFINER function, which
-- evaluates without RLS.

CREATE OR REPLACE FUNCTION public.is_room_participant(check_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM player_rooms
    WHERE player_rooms.room_id = check_room_id
      AND player_rooms.player_id = auth.uid()
  );
$$;

-- Function must be callable by clients evaluating the policy.
GRANT EXECUTE ON FUNCTION public.is_room_participant(UUID) TO authenticated;

DROP POLICY IF EXISTS "Player rooms viewable by participants" ON player_rooms;

CREATE POLICY "Player rooms viewable by participants"
  ON player_rooms FOR SELECT
  USING (public.is_room_participant(room_id));
