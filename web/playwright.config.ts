import { defineConfig, devices } from '@playwright/test';

/** Dedicated port so local runs do not attach to an unrelated app on :3000. */
const PORT = Number(process.env.PLAYWRIGHT_PORT) || 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/** Vercel Deployment Protection bypass (same value as Vercel "Protection Bypass for Automation"). */
const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

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
      },
});
