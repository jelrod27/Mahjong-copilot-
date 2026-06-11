# Plan 002: Restrict player_rooms SELECT policy to actual room participants

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat efb5a21..HEAD -- supabase/migrations/`
> If the migrations directory changed since this plan was written, compare the
> "Current state" excerpts against the live SQL before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `efb5a21`, 2026-06-11

## Why this matters

The `player_rooms` table's SELECT policy is named "Player rooms viewable by
participants" but its body is `USING (true)` — any authenticated user can enumerate
every player-room association across all games: who is in which room, seat
assignments, and connection status. Multiplayer is currently deferred (all
`/multiplayer` routes render a placeholder), so this is latent, but the migration is
already in the repo and the table may exist in the live Supabase project. Fixing it
now means multiplayer cannot launch with the hole in place.

## Current state

- `supabase/migrations/20260325000000_multiplayer_tables.sql` — defines `profiles`,
  `rooms`, `player_rooms`, `game_states`, `moves` with RLS. The broken policy
  (lines 121-124):

  ```sql
  -- Player rooms: players in the room can read
  CREATE POLICY "Player rooms viewable by participants"
    ON player_rooms FOR SELECT
    USING (true);
  ```

- The repo's intended pattern for participant-scoped reads is visible on
  `game_states` (lines 134-143 of the same file):

  ```sql
  CREATE POLICY "Game states viewable by room participants"
    ON game_states FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM player_rooms
        WHERE player_rooms.room_id = game_states.room_id
          AND player_rooms.player_id = auth.uid()
      )
    );
  ```

- **CRITICAL — do not copy that EXISTS pattern onto `player_rooms` itself.** A policy
  on `player_rooms` whose body queries `player_rooms` is self-referential: Postgres
  applies the policy to the subquery too, causing an "infinite recursion detected in
  policy" error at query time. The standard Supabase fix is a `SECURITY DEFINER`
  helper function (it bypasses RLS inside the function body), which is what this plan
  creates.
- Migration naming convention in this repo: `YYYYMMDDHHMMSS_description.sql`
  (existing: `20260325000000_multiplayer_tables.sql`, `20260325000001_ranked_tables.sql`).
- `supabase/config.toml` exists at the repo root; the Supabase CLI may or may not be
  installed/linked in the executor environment.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Confirm current policy text | `grep -n -A 3 "Player rooms viewable" supabase/migrations/20260325000000_multiplayer_tables.sql` | shows `USING (true)` |
| Local stack (ONLY if Docker + supabase CLI available) | `supabase db start && supabase db reset` | migrations apply cleanly |
| Confirm no app-code references break | `grep -rn "player_rooms" web/ --include="*.ts" --include="*.tsx" \| grep -v node_modules` | review output (expected: few/no hits — multiplayer is stubbed) |

## Scope

**In scope** (the only files you should create):
- `supabase/migrations/20260611000000_fix_player_rooms_select_policy.sql` (create)

**Out of scope** (do NOT touch):
- `supabase/migrations/20260325000000_multiplayer_tables.sql` — already-applied
  migrations must never be edited; fixes ship as new migrations.
- The `rooms` table's `USING (true)` SELECT policy — intentional (public lobby listing).
- The `profiles` table's `USING (true)` SELECT policy — intentional (public leaderboard);
  changing it is a product decision, not a bug fix.
- **Applying the migration to the live Supabase project** — that is an operator
  action (dashboard SQL editor, `supabase db push`, or the Supabase MCP). This plan
  only authors the migration file.

## Git workflow

- Branch: `feature/fix-player-rooms-rls`
- Commit message style: `fix(supabase): restrict player_rooms SELECT to room participants`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Author the migration

Create `supabase/migrations/20260611000000_fix_player_rooms_select_policy.sql` with
exactly this content:

```sql
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
```

Adjust the `UUID` parameter type ONLY if `player_rooms.room_id` has a different type —
check the `CREATE TABLE player_rooms` statement in
`20260325000000_multiplayer_tables.sql` first and match it exactly.

**Verify**: `grep -c "SECURITY DEFINER" supabase/migrations/20260611000000_fix_player_rooms_select_policy.sql` → `1`

### Step 2: Validate locally if possible

If Docker and the `supabase` CLI are available: run `supabase db start` then
`supabase db reset` from the repo root and confirm all migrations (including the new
one) apply with no errors. If they are NOT available, state that in your report —
do not attempt to install Docker.

**Verify**: `supabase db reset` → "Applying migration 20260611000000..." with no error
(or a note in your report that local validation was unavailable).

### Step 3: Confirm nothing in the web app depends on open reads

Run the grep from the commands table. Multiplayer UI is stubbed
(`web/app/play/multiplayer/page.tsx` renders `DeferredFeaturePage`), so there should
be no client code selecting from `player_rooms`. If you find live query code that
reads `player_rooms` for non-participants, STOP.

**Verify**: grep output reviewed; no non-participant read paths found.

## Test plan

No JS tests — this is a SQL-only change validated by migration application (step 2).
The behavioral check, when an operator applies it to a live/staging project: user A
in room R can `select * from player_rooms where room_id = R`; user B (not in R)
gets zero rows; the query does not error with infinite recursion.

## Done criteria

- [ ] `supabase/migrations/20260611000000_fix_player_rooms_select_policy.sql` exists with the SECURITY DEFINER function, GRANT, DROP POLICY, and CREATE POLICY statements
- [ ] No edits to any pre-existing migration file (`git status`)
- [ ] Local `supabase db reset` passes, or report notes it was unavailable
- [ ] `plans/README.md` status row updated (note "migration authored — NOT yet applied to live project" in the status if applicable)

## STOP conditions

Stop and report back (do not improvise) if:

- The policy at lines 121-124 no longer reads `USING (true)` (already fixed).
- `player_rooms.room_id` is not a UUID and you are unsure how to adjust the function
  signature.
- `supabase db reset` fails on the NEW migration after one fix attempt.
- You find web-app code that actively queries `player_rooms` and depends on
  cross-room visibility.

## Maintenance notes

- When multiplayer is implemented, every new table keyed by `room_id` should reuse
  `public.is_room_participant(room_id)` instead of inlining EXISTS subqueries.
- Reviewer should scrutinize: `SET search_path = public` on the function (prevents
  search-path hijack of SECURITY DEFINER), and that the GRANT is to `authenticated`,
  not `anon`.
- The operator must apply this migration to the live Supabase project; until then the
  live database (if these tables exist there) still has the permissive policy.
- Related accepted-as-intentional policies: `rooms` and `profiles` public SELECT
  (lobby listing / leaderboard). Revisit `profiles` enumeration only as a product
  decision.
