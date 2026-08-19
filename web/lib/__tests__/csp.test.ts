import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy, sentryIngestOrigin } from '../csp';

const DSN = 'https://abc123@o4507999.ingest.us.sentry.io/456';

function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split(';').map(part => {
      const trimmed = part.trim();
      const space = trimmed.indexOf(' ');
      return space === -1
        ? ([trimmed, ''] as [string, string])
        : ([trimmed.slice(0, space), trimmed.slice(space + 1)] as [string, string]);
    }),
  );
}

const prod = () => directives(buildContentSecurityPolicy({ isDev: false, sentryDsn: DSN }));

describe('sentryIngestOrigin', () => {
  it('returns the ingest origin embedded in a DSN', () => {
    expect(sentryIngestOrigin(DSN)).toBe('https://o4507999.ingest.us.sentry.io');
  });

  it('returns null when no DSN is configured', () => {
    expect(sentryIngestOrigin(undefined)).toBeNull();
  });

  it('returns null for a scheme typo rather than the string "null"', () => {
    // URL parses this as an opaque origin whose .origin is literally "null",
    // which would otherwise ship as a hostname in the header.
    expect(sentryIngestOrigin('htps://k@o1.ingest.us.sentry.io/456')).toBeNull();
  });

  it('returns null when the DSN is not a URL at all', () => {
    expect(sentryIngestOrigin('not-a-dsn')).toBeNull();
  });
});

describe('buildContentSecurityPolicy', () => {
  it('states every directive the policy relies on', () => {
    // base-uri and form-action have no default-src fallback, so omitting them
    // leaves both controls unenforced rather than merely permissive.
    const d = prod();
    for (const name of [
      'default-src', 'script-src', 'style-src', 'font-src', 'img-src',
      'connect-src', 'worker-src', 'base-uri', 'form-action', 'frame-ancestors',
    ]) {
      expect(d.has(name), `missing ${name}`).toBe(true);
    }
  });

  it('denies framing and restricts base and form targets', () => {
    const d = prod();
    expect(d.get('frame-ancestors')).toBe("'none'");
    expect(d.get('base-uri')).toBe("'self'");
    expect(d.get('form-action')).toBe("'self'");
  });

  it('allows the configured DSN ingest origin in connect-src', () => {
    expect(prod().get('connect-src')).toBe("'self' https://o4507999.ingest.us.sentry.io");
  });

  it('omits a Sentry origin when no DSN is configured', () => {
    const d = directives(buildContentSecurityPolicy({ isDev: false, sentryDsn: undefined }));
    expect(d.get('connect-src')).toBe("'self'");
  });

  it('allows blob: workers with or without a DSN, since Replay needs one', () => {
    expect(prod().get('worker-src')).toBe("'self' blob:");
    const noDsn = directives(buildContentSecurityPolicy({ isDev: false, sentryDsn: undefined }));
    expect(noDsn.get('worker-src')).toBe("'self' blob:");
  });

  it('keeps script-src sources separated', () => {
    // Guards the join: fusing two tokens into one silently drops a source.
    const sources = prod().get('script-src')!.split(' ');
    expect(sources).toContain("'self'");
    expect(sources).toContain("'unsafe-inline'");
    expect(sources).toContain('https://vercel.live');
  });

  it("adds 'unsafe-eval' and the analytics debug host only in development", () => {
    const dev = directives(buildContentSecurityPolicy({ isDev: true, sentryDsn: DSN }));
    const devSources = dev.get('script-src')!.split(' ');
    expect(devSources).toContain("'unsafe-eval'");
    expect(devSources).toContain('https://va.vercel-scripts.com');

    const prodSources = prod().get('script-src')!.split(' ');
    expect(prodSources).not.toContain("'unsafe-eval'");
    expect(prodSources).not.toContain('https://va.vercel-scripts.com');
  });
});
