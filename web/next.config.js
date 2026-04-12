const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright uses 127.0.0.1 while dev may show localhost; avoids HMR /_next cross-origin noise.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

module.exports = withSentryConfig(nextConfig, {
  org: "16bitweather",
  project: "16bit-mahjong",

  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for better stack traces
  widenClientFileUpload: true,

  // Proxy route to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress non-CI output
  silent: !process.env.CI,
});
