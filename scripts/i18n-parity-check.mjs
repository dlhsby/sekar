#!/usr/bin/env node
/**
 * i18n parity guardrail.
 *
 * Enforces three invariants so translations can never silently drift:
 *   1. Every backend `ApiErrorCode` value has a copy key in BOTH platforms'
 *      `errors.json` (id + en). (Client-only codes are allowed extras.)
 *   2. For every namespace on each platform, the `id` and `en` key sets match
 *      exactly (no missing/extra keys between locales).
 *   3. Both platforms expose the same set of namespaces.
 *
 * Run: `node scripts/i18n-parity-check.mjs` (exit 1 on any violation).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(root, 'apps/web/src/lib/i18n/locales');
const MOBILE = join(root, 'apps/mobile/src/i18n/locales');
const ENUM = join(root, 'apps/be/src/common/enums/api-error-codes.enum.ts');

const errors = [];
const fail = (m) => errors.push(m);

/** Flatten nested JSON keys to dotted paths ('priority.low'). */
function flatKeys(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatKeys(v, key));
    else out.push(key);
  }
  return out;
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const namespaces = (dir, lng) =>
  readdirSync(join(dir, lng))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));

// ── 1. Backend enum → errors.json coverage ──────────────────────────────────
const enumSrc = readFileSync(ENUM, 'utf8');
const enumValues = [...enumSrc.matchAll(/=\s*'([^']+)'/g)].map((m) => m[1]);

for (const [label, dir] of [['web', WEB], ['mobile', MOBILE]]) {
  for (const lng of ['id', 'en']) {
    const keys = new Set(Object.keys(readJson(join(dir, lng, 'errors.json'))));
    for (const code of enumValues) {
      if (!keys.has(code)) fail(`[${label}/${lng}] errors.json missing backend code: ${code}`);
    }
  }
}

// ── 2. id/en key parity per namespace, per platform ─────────────────────────
for (const [label, dir] of [['web', WEB], ['mobile', MOBILE]]) {
  const nsList = namespaces(dir, 'id');
  for (const ns of nsList) {
    const idKeys = new Set(flatKeys(readJson(join(dir, 'id', `${ns}.json`))));
    const enKeys = new Set(flatKeys(readJson(join(dir, 'en', `${ns}.json`))));
    for (const k of idKeys) if (!enKeys.has(k)) fail(`[${label}] ${ns}: 'en' missing key '${k}'`);
    for (const k of enKeys) if (!idKeys.has(k)) fail(`[${label}] ${ns}: 'id' missing key '${k}'`);
  }
}

// ── 3. Same namespaces on both platforms ────────────────────────────────────
const webNs = new Set(namespaces(WEB, 'id'));
const mobileNs = new Set(namespaces(MOBILE, 'id'));
for (const ns of webNs) if (!mobileNs.has(ns)) fail(`mobile is missing namespace present on web: ${ns}`);
for (const ns of mobileNs) if (!webNs.has(ns)) fail(`web is missing namespace present on mobile: ${ns}`);

// ── Report ──────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`✖ i18n parity check failed (${errors.length} issue(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('✓ i18n parity check passed');
