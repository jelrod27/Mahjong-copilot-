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

  // `'unsafe-inline'` is load-bearing, not an oversight, and it cannot be
  // swapped for a nonce here.
  //
  // Next serves this app's pages as prerendered static HTML, and that HTML is
  // written at build time — before any request exists to carry a nonce. It
  // contains ten inline scripts, among them React's runtime and the
  // `self.__next_f` hydration payload. Measured on a production build: the
  // middleware nonce approach yields a header with a nonce and zero scripts
  // bearing one, so every inline script is refused and the app renders but
  // never hydrates. Nonces require dynamic rendering, which would cost this
  // site static generation everywhere to buy it.
  //
  // So the honest statement of the tradeoff: script-src is weaker than it
  // looks, and injected inline script would run. Closing it means either
  // rendering dynamically or moving the bootstrap out of line — a real change,
  // not a header edit.
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
