const PLAY_ONBOARDING_KEY = 'mahjong_play_onboarding_v1';

export function hasSeenPlayOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(PLAY_ONBOARDING_KEY) === '1';
  } catch {
    return true;
  }
}

export function markPlayOnboardingSeen(): void {
  try {
    localStorage.setItem(PLAY_ONBOARDING_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}
