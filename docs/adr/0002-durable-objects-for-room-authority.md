# Durable Objects hold authoritative room state

Each Room is one Cloudflare Durable Object. The DO owns the authoritative match
state, redacts per-seat views, enforces turn and claim deadlines via alarms, and
runs the AI that stands in for a disconnected occupant. The Next.js app stays on
Vercel and connects to the Worker over WebSocket.

The requirements are a description of a Durable Object rather than merely a fit
for one: a single-threaded owner per room (so claim resolution cannot race),
durable storage, millisecond-granularity alarms, and hibernation so an empty
room costs nothing. The engine is dependency-free TypeScript with no Node APIs,
so it runs in Workers unmodified.

## Considered options

- **Vercel Functions + Redis** — rejected. WebSocket connections close at the
  function's max duration (300s on Hobby), and connections are not guaranteed to
  reach the same instance, so there is no single owner for a room or its timers.
  Reproducing Durable Objects from Redis plus an external scheduler.
- **Always-on Node + `ws` server** — viable and simpler to operate, but pays for
  idle capacity and needs sticky routing the moment it scales past one instance.
- **Supabase Realtime + Edge Functions** — matches the archived schema in
  `docs/archive/supabase/`, but Realtime is pub/sub over Postgres changes rather
  than a game process; turn deadlines fall to cron granularity and AI takeover
  has nowhere to run.

## Consequences

Multiplayer introduces a second deploy target, with its own CI, secrets, and a
`wrangler` local-development story. This is the main cost of the decision and it
falls on a solo maintainer.
