import path from 'path';
import { defineConfig, devices } from '@playwright/test';

const storageStatePath = path.join(__dirname, '.auth', 'storage-state.json');

/** Dedicated port so local runs do not attach to an unrelated app on :3000. */
const PORT = Number(process.env.PLAYWRIGHT_PORT) || 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/** Vercel Deployment Protection bypass (same value as Vercel "Protection Bypass for Automation"). */
const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

/**
 * When real Supabase env vars are absent, supply minimal non-secret strings so
 * `middleware.ts` still runs `getUser()` (redirect tests need that). Values are
 * not JWTs — avoid JWT-shaped literals so GitGuardian does not false-positive.
 */
const PLAYWRIGHT_FALLBACK_SUPABASE_URL = 'http://127.0.0.1:54321';
const PLAYWRIGHT_FALLBACK_SUPABASE_ANON_KEY = 'anon-local-playwright-only';

function playwrightSupabaseEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) out[k] = v;
  }
  const url = (out.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (out.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const configured =
    url.length > 0 && /^https?:\/\//i.test(url) && key.length > 0;
  if (!configured) {
    out.NEXT_PUBLIC_SUPABASE_URL = PLAYWRIGHT_FALLBACK_SUPABASE_URL;
    out.NEXT_PUBLIC_SUPABASE_ANON_KEY = PLAYWRIGHT_FALLBACK_SUPABASE_ANON_KEY;
  }
  return out;
}

export default defineConfig({
  globalSetup: require.resolve('./playwright.global-setup.ts'),
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    storageState: storageStatePath,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    ...(vercelBypass
      ? {
          extraHTTPHeaders: {
            'x-vercel-protection-bypass': vercelBypass,
            // Vercel: persist bypass for document + subresource requests (see protection-bypass-automation docs).
            'x-vercel-set-bypass-cookie': 'true',
          },
        }
      : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: `npx next dev -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: playwrightSupabaseEnv(),
      },
});
