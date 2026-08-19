import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./lib/csp";

const isDev = process.env.NODE_ENV !== "production";

// Only the browser is subject to CSP, so this tracks the client DSN.
// Baked into the routes manifest at build time — changing the env var needs a
// rebuild, not just a restart.
const contentSecurityPolicy = buildContentSecurityPolicy({
  isDev,
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

const nextConfig: NextConfig = {
  // Playwright uses 127.0.0.1 while dev may show localhost; avoids HMR /_next cross-origin noise.
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "16bitweather",
  project: "16bit-mahjong",

  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for better stack traces
  widenClientFileUpload: true,

  // Proxy route to bypass ad-blockers. This is why connect-src does not need
  // the ingest origin: envelopes post same-origin and Next forwards them.
  tunnelRoute: "/monitoring",

  // Suppress non-CI output
  silent: !process.env.CI,
});
