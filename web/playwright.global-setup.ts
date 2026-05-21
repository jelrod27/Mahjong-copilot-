import { chromium, type FullConfig } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

const STORAGE = join(__dirname, '.auth', 'storage-state.json');
const PLAY_ONBOARDING_KEY = 'mahjong_play_onboarding_v1';

function storageStateForOrigin(origin: string) {
  return {
    cookies: [] as { name: string; value: string; domain: string; path: string }[],
    origins: [
      {
        origin,
        localStorage: [{ name: PLAY_ONBOARDING_KEY, value: '1' }],
      },
    ],
  };
}

/**
 * Vercel Deployment Protection often ignores automated clients until the bypass
 * query param is hit once (sets a cookie). Headers alone are not always enough.
 * Always write a storage file so `use.storageState` is valid for every run.
 */
export default async function globalSetup(config: FullConfig) {
  await mkdir(dirname(STORAGE), { recursive: true });

  const baseURL =
    (config.projects[0]?.use?.baseURL as string | undefined) ??
    process.env.PLAYWRIGHT_BASE_URL ??
    '';
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  const remoteHttps =
    baseURL.startsWith('https://') && !!process.env.PLAYWRIGHT_SKIP_WEB_SERVER;

  if (remoteHttps && bypass) {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const url = new URL('/', baseURL);
    url.searchParams.set('x-vercel-protection-bypass', bypass);
    url.searchParams.set('x-vercel-set-bypass-cookie', 'true');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.evaluate((key) => localStorage.setItem(key, '1'), PLAY_ONBOARDING_KEY);
    await context.storageState({ path: STORAGE });
    await browser.close();
  } else {
    const origin = baseURL.replace(/\/$/, '') || `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? 3100}`;
    await writeFile(STORAGE, JSON.stringify(storageStateForOrigin(origin)));
  }
}
