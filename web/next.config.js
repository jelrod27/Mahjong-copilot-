/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright uses 127.0.0.1 while dev may show localhost; avoids HMR /_next cross-origin noise.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

module.exports = nextConfig;
