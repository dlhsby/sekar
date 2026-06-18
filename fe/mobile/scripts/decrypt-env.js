#!/usr/bin/env node
/**
 * Decrypt a dotenvx-encrypted env file to a plaintext `.env.runtime` for
 * react-native-dotenv, which reads env files directly at babel time and cannot
 * decrypt `encrypted:…` ciphertext itself.
 *
 * Usage:  node scripts/decrypt-env.js .env.staging
 *
 * The build scripts (`android:staging`, `build:android:production`, …) run this
 * first, then point babel at the result via `ENVFILE=.env.runtime`. The output is
 * gitignored (.env.runtime) and written 0600. Decryption needs the matching
 * private key, taken from a local `.env.keys` (dev) or the `DOTENV_PRIVATE_KEY_<ENV>`
 * environment variable (CI). See specs/deployment/encrypted-secrets.md.
 */
const { execFileSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const src = process.argv[2];
if (!src) {
  process.stderr.write('usage: node scripts/decrypt-env.js <.env.file>\n');
  process.exit(1);
}

const out = resolve(process.cwd(), '.env.runtime');

try {
  // `decrypt --stdout` prints the fully-decrypted file to stdout WITHOUT rewriting
  // the encrypted source on disk. npx resolves the workspace-local dotenvx binary.
  const plaintext = execFileSync(
    'npx',
    ['--no-install', 'dotenvx', 'decrypt', '-f', src, '--stdout'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  writeFileSync(out, plaintext, { mode: 0o600 });
  process.stderr.write(`Decrypted ${src} -> .env.runtime\n`);
} catch (err) {
  process.stderr.write(
    `Failed to decrypt ${src}. Ensure the matching DOTENV_PRIVATE_KEY_* is set ` +
      `(env var or local .env.keys).\n${err.message}\n`,
  );
  process.exit(1);
}
