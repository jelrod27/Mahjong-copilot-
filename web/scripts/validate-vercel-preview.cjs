#!/usr/bin/env node
'use strict';

const PREVIEW_HOST = /^mahjong-copilot-[a-z0-9-]+-justin-elrods-projects\.vercel\.app$/;

/**
 * Validate that a preview URL targets this project's Vercel deployment host.
 * Returns the normalized origin so callers cannot retain a path or query.
 * @param {string} value
 * @returns {string}
 */
function validateVercelPreviewBaseUrl(value) {
  let url;
  try {
    if (typeof value !== 'string' || value !== value.trim()) throw new Error();
    url = new URL(value);
  } catch {
    throw new Error('Preview URL must be a valid HTTPS URL for this Vercel project.');
  }

  if (
    url.protocol !== 'https:' ||
    !PREVIEW_HOST.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Preview URL must be the HTTPS origin of this project’s Vercel deployment.');
  }

  return url.origin;
}

if (require.main === module) {
  try {
    process.stdout.write(`${validateVercelPreviewBaseUrl(process.argv[2] ?? '')}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { validateVercelPreviewBaseUrl };
