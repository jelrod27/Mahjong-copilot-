# Supabase Setup Guide

This guide walks you through setting up Supabase for the Hong Kong Mahjong app.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in the details:
   - **Name**: `hong-kong-mahjong` (or your preference)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup (~2 minutes)

## 2. Get Your API Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...` (long JWT string)

## 3. Run the Database Schema

1. In your project dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase/schema.sql`
4. Click "Run" to execute
5. Verify tables were created in **Table Editor**

You should see these tables:
- `profiles`
- `game_rooms`
- `room_players`
- `game_history`

## 4. Enable Authentication Providers

1. Go to **Authentication** → **Providers**
2. Enable these providers:
   - **Email**: Already enabled by default
   - **Anonymous**: Click and enable for guest mode

Optional providers (configure if needed):
- Google
- Apple
- Discord

## 5. Configure App Settings

### Option A: Environment Variables (Recommended for Development)

Run the app with dart-define:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://xxxxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJhbGci...
```

### Option B: VS Code Launch Configuration

Create/update `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Flutter",
      "type": "dart",
      "request": "launch",
      "program": "lib/main.dart",
      "args": [
        "--dart-define=SUPABASE_URL=https://xxxxx.supabase.co",
        "--dart-define=SUPABASE_ANON_KEY=eyJhbGci..."
      ]
    }
  ]
}
```

### Option C: Create a .env file (requires additional setup)

Create `.env` in project root:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

Then use `flutter_dotenv` package to load it.

## 6. Enable Realtime

1. Go to **Database** → **Replication**
2. Under "Realtime", ensure these tables have realtime enabled:
   - `game_rooms`
   - `room_players`

Or run this SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
```

## 7. Set Up Row Level Security (RLS)

The schema already includes RLS policies. Verify they're active:

1. Go to **Authentication** → **Policies**
2. Check that policies exist for each table
3. Ensure RLS is enabled (toggle should be ON)

## 8. Test the Connection

Run the app and check the debug console for:
- ✅ "Supabase initialized successfully"
- ❌ "Warning: Supabase not configured" means credentials are missing

## Troubleshooting

### "Invalid API key"
- Double-check you're using the `anon` key, not the `service_role` key
- Ensure no extra spaces in the key

### "Permission denied"
- Check RLS policies are correctly set up
- Verify the user is authenticated for protected operations

### "Realtime not connecting"
- Ensure realtime is enabled for the tables
- Check the Supabase project isn't paused (free tier pauses after inactivity)

### Tables not found
- Run the schema SQL again
- Check you're connected to the correct project

## Production Checklist

Before launching:

- [ ] Enable email confirmation in Authentication settings
- [ ] Set up custom SMTP for emails (optional)
- [ ] Review and tighten RLS policies
- [ ] Enable database backups (paid feature)
- [ ] Set up monitoring and alerts
- [ ] Consider upgrading from free tier for better performance

## Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Flutter Supabase Package](https://pub.dev/packages/supabase_flutter)
- [Supabase Dashboard](https://app.supabase.com)
