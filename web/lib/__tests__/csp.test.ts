import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy, sentryIngestOrigin } from '../csp';

const DSN = 'https://abc123@o4507999.ingest.us.sentry.io/456';

function directive(policy: string, name: string): string {
  const match = policy.match(new RegExp(`(?:^|;\\s*)${name} ([^;]*)`));
  return match ? match[1].trim() : '';
}

describe('sentryIngestOrigin', () => {
  it('returns the ingest origin embedded in a DSN', () => {
    expect(sentryIngestOrigin(DSN)).toBe('https://o4507999.ingest.us.sentry.io');
  });

  it('returns null when no DSN is configured', () => {
    expect(sentryIngestOrigin(undefined)).toBeNull();
  });

  it('returns null when the DSN is not a valid URL', () => {
    expect(sentryIngestOrigin('not-a-dsn')).toBeNull();
  });
});

describe('buildContentSecurityPolicy', () => {
  it('allows the configured DSN ingest origin in connect-src', () => {
    const policy = buildContentSecurityPolicy({ isDev: false, sentryDsn: DSN });

    expect(directive(policy, 'connect-src')).toContain('https://o4507999.ingest.us.sentry.io');
  });

  it('omits a Sentry origin from connect-src when no DSN is configured', () => {
    const policy = buildContentSecurityPolicy({ isDev: false, sentryDsn: undefined });

    expect(directive(policy, 'connect-src')).toBe("'self' https://vitals.vercel-insights.com");
  });

  it('allows blob: workers so Session Replay can compress off the main thread', () => {
    const policy = buildContentSecurityPolicy({ isDev: false, sentryDsn: DSN });

    expect(directive(policy, 'worker-src')).toBe("'self' blob:");
  });

  it("adds 'unsafe-eval' to script-src only in development", () => {
    const dev = buildContentSecurityPolicy({ isDev: true, sentryDsn: DSN });
    const prod = buildContentSecurityPolicy({ isDev: false, sentryDsn: DSN });

    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(prod, 'script-src')).not.toContain("'unsafe-eval'");
  });
});
