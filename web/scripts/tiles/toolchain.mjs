/**
 * The pinned encoder toolchain.
 *
 * Texture artefacts are committed build outputs, so "which encoder built this"
 * has to be a fact rather than whatever happened to be on someone's PATH. The
 * version and the archive checksum are both pinned here; a mismatch fails
 * loudly instead of silently producing different blocks.
 *
 * The Linux tarballs install without root — they carry a RUNPATH of
 * `$ORIGIN/../lib`, so unpacking and invoking `bin/ktx` is the whole install.
 * On any other platform, supply a matching `ktx` on PATH (macOS: `brew install
 * ktx`, or the .pkg from the same release).
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const KTX_VERSION = '4.4.2';

const RELEASE_BASE = `https://github.com/KhronosGroup/KTX-Software/releases/download/v${KTX_VERSION}`;

/**
 * Checksums verified against the published release on 2026-08-02. Never edit
 * one without re-downloading and re-deriving it — that is the only thing
 * standing between this build and an unpinned binary.
 */
const ARCHIVES = {
  'linux-x64': {
    file: `KTX-Software-${KTX_VERSION}-Linux-x86_64.tar.bz2`,
    dir: `KTX-Software-${KTX_VERSION}-Linux-x86_64`,
    sha256: 'a8781bad05f9624edbf910b7f258cd0a4ba7d3e63b49ecc0a0ab440bf6a0a245',
  },
  'linux-arm64': {
    file: `KTX-Software-${KTX_VERSION}-Linux-arm64.tar.bz2`,
    dir: `KTX-Software-${KTX_VERSION}-Linux-arm64`,
    sha256: '60382e7b842177b8048bd58ccdc770383f8ef65b94452a25d3afdb55f2405c5a',
  },
};

const CACHE_DIR = path.join(here, '.toolchain');

/** @returns {string | null} */
function platformKey() {
  const key = `${process.platform}-${process.arch}`;
  return key in ARCHIVES ? key : null;
}

/** @param {string} bin @returns {string | null} version string, or null if unusable */
function probeVersion(bin) {
  try {
    const out = execFileSync(bin, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const match = out.match(/v?(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** @param {Buffer} buf @returns {string} */
function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Locate the pinned `ktx`, downloading it if this platform has a pinned
 * tarball and it is not already cached.
 *
 * @param {{ allowDownload?: boolean }} [options]
 * @returns {Promise<string>} absolute path to the `ktx` executable
 */
export async function ensureKtx({ allowDownload = true } = {}) {
  const key = platformKey();

  if (key) {
    const cached = path.join(CACHE_DIR, ARCHIVES[key].dir, 'bin', 'ktx');
    if (existsSync(cached) && probeVersion(cached) === KTX_VERSION) return cached;
  }

  // A matching system install is acceptable; a non-matching one is not, because
  // encoder output is version-dependent.
  const systemVersion = probeVersion('ktx');
  if (systemVersion === KTX_VERSION) return 'ktx';

  if (!key) {
    throw new Error(
      `No pinned KTX-Software archive for ${process.platform}-${process.arch}.\n` +
        `Install KTX-Software v${KTX_VERSION} and put \`ktx\` on PATH ` +
        `(macOS: \`brew install ktx\`), then re-run.` +
        (systemVersion ? `\nFound ktx v${systemVersion} on PATH, which is not the pinned version.` : ''),
    );
  }

  if (!allowDownload) {
    throw new Error(
      `KTX-Software v${KTX_VERSION} is not installed and downloading is disabled.\n` +
        `Run \`npm run tiles:toolchain\` first.`,
    );
  }

  return downloadKtx(key);
}

/** @param {string} key @returns {Promise<string>} */
async function downloadKtx(key) {
  const archive = ARCHIVES[key];
  const url = `${RELEASE_BASE}/${archive.file}`;

  process.stderr.write(`Fetching pinned KTX-Software v${KTX_VERSION} (${key})…\n`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  const buf = Buffer.from(await response.arrayBuffer());

  const digest = sha256(buf);
  if (digest !== archive.sha256) {
    throw new Error(
      `Checksum mismatch for ${archive.file}.\n  expected ${archive.sha256}\n  actual   ${digest}\n` +
        `Refusing to install an unverified encoder.`,
    );
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  const tarball = path.join(CACHE_DIR, archive.file);
  writeFileSync(tarball, buf);
  rmSync(path.join(CACHE_DIR, archive.dir), { recursive: true, force: true });
  // bzip2 is not in Node's standard library; `tar -j` is present on every
  // platform that has a pinned archive here.
  execFileSync('tar', ['-xjf', tarball, '-C', CACHE_DIR], { stdio: 'inherit' });
  rmSync(tarball, { force: true });

  const bin = path.join(CACHE_DIR, archive.dir, 'bin', 'ktx');
  const installed = probeVersion(bin);
  if (installed !== KTX_VERSION) {
    throw new Error(`Installed ktx reports v${installed}, expected v${KTX_VERSION}`);
  }
  process.stderr.write(`Installed ${bin}\n`);
  return bin;
}

/**
 * Run the pinned encoder. Throws with the tool's own stderr on failure, which
 * is far more useful than a wrapped exit code.
 *
 * @param {string} bin
 * @param {string[]} args
 * @returns {string} stdout
 */
export function runKtx(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : '';
    throw new Error(`ktx ${args.join(' ')} failed:\n${stderr.trim() || String(error)}`);
  }
}

/** @param {string} file @returns {string} */
export function fileSha256(file) {
  return sha256(readFileSync(file));
}

// `node toolchain.mjs` installs and reports, for CI and for a fresh checkout.
if (import.meta.url === `file://${process.argv[1]}`) {
  const bin = await ensureKtx();
  process.stdout.write(`${bin}\n`);
}
