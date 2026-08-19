/**
 * The Content-Security-Policy served on every route.
 *
 * TypeScript rather than JS on purpose: next.config.ts is inside the tsc
 * program, so a typo in the options below is a build error rather than a
 * silently weakened header.
 */

interface CspOptions {
  /** Dev needs 'unsafe-eval' for React Refresh. */
  isDev: boolean;
  /** Client DSN, if one is configured for this build. */
  sentryDsn?: string;
}

/**
 * The origin a DSN points at, or null if it is absent or unparseable.
 *
 * Note this is belt-and-braces rather than load-bearing: next.config sets
 * `tunnelRoute`, so the browser posts envelopes same-origin to /monitoring and
 * never contacts the ingest host directly. It matters only if that tunnel is
 * ever removed.
 */
export function sentryIngestOrigin(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const { protocol, host } = new URL(dsn);
    // A non-http(s) scheme parses as an opaque origin whose `.origin` is the
    // string "null", which would ship as a literal host in the header.
    if (protocol !== 'https:' && protocol !== 'http:') return null;
    if (!host) return null;
    return `${protocol}//${host}`;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy({ isDev, sentryDsn }: CspOptions): string {
  const ingestOrigin = sentryIngestOrigin(sentryDsn);

  const scriptSrc = [
    "'self'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "'unsafe-inline'",
    'https://vercel.live',
    // @vercel/analytics loads its debug script from here in development.
    ...(isDev ? ['https://va.vercel-scripts.com'] : []),
  ];

  const connectSrc = ["'self'", ...(ingestOrigin ? [ingestOrigin] : [])];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    `connect-src ${connectSrc.join(' ')}`,
    // Session Replay compresses off the main thread in a blob: worker.
    "worker-src 'self' blob:",
    // Neither of these falls back to default-src, so both must be stated.
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}
