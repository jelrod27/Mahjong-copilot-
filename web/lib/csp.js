// CommonJS so next.config.js can require it at build time.

/**
 * The browser SDK posts events to the ingest origin embedded in the DSN, which
 * is org-specific. Deriving it from the configured DSN keeps connect-src in
 * sync instead of hardcoding one org's ingest host.
 */
function sentryIngestOrigin(dsn) {
  if (!dsn) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy({ isDev, sentryDsn }) {
  const ingestOrigin = sentryIngestOrigin(sentryDsn);
  const connectSrc = ["'self'", ingestOrigin, "https://vitals.vercel-insights.com"].filter(Boolean);

  return [
    "default-src 'self'",
    `script-src 'self' ${isDev ? "'unsafe-eval' " : ""}'unsafe-inline' https://vercel.live`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src ${connectSrc.join(" ")}`,
    // Session Replay compresses off the main thread in a blob: worker.
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join("; ");
}

module.exports = { buildContentSecurityPolicy, sentryIngestOrigin };
