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
 *   4. Every STATIC `t('ns:key')` call site resolves to a real string key.
 *      Invariants 1-3 all compare files against each other, so a key that is
 *      missing from BOTH locales passes every one of them -- which is exactly
 *      how `monitoring:breadcrumb.city` reached a device as a raw key, and how
 *      `layers.workers` stayed broken for five months. Unit tests cannot catch
 *      it either: `t` is mocked to echo keys, so a missing key is a truthy
 *      string that renders "fine". This invariant closes that gap.
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

// ── 4. Static t('ns:key') call sites resolve ────────────────────────────────
//
// Deliberately conservative -- it only judges what it can read literally:
//   * dynamic keys (`t(\`ns:${x}\`)`, string concat) are SKIPPED, not guessed;
//   * `{ returnObjects: true }` legitimately resolves to a subtree;
//   * comments are stripped, so an example in a docblock is not a call site.
// A false positive here would train people to ignore the gate, which is worse
// than the leak it plugs.
const SRC = { web: join(root, 'apps/web/src'), mobile: join(root, 'apps/mobile/src') };

/** Strip block comments and comment-only lines so docblock examples aren't scanned. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n');
}

function sourceFiles(dir, out = []) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (f.isDirectory()) {
      if (!/^(node_modules|__tests__|\.next|dist|build|coverage)$/.test(f.name)) {
        sourceFiles(join(dir, f.name), out);
      }
    } else if (/\.(ts|tsx)$/.test(f.name) && !/\.(test|spec)\./.test(f.name)) {
      out.push(join(dir, f.name));
    }
  }
  return out;
}

/** Walk a dotted path; returns the node, or undefined when absent. */
function resolve(obj, dotted) {
  let cur = obj;
  for (const part of dotted.split('.')) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

for (const [label, dir] of [['web', WEB], ['mobile', MOBILE]]) {
  const bundle = {};
  for (const ns of namespaces(dir, 'id')) bundle[ns] = readJson(join(dir, 'id', `${ns}.json`));

  const seen = new Set();
  for (const file of sourceFiles(SRC[label])) {
    const src = stripComments(readFileSync(file, 'utf8'));
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+):([a-zA-Z0-9_.]+)'([^)]{0,120})/g)) {
      const [, ns, key, tail] = m;
      const where = `${label}/${file.split('/src/')[1]}`;
      const id = `${label}:${ns}:${key}`;
      if (seen.has(id)) continue;
      seen.add(id);

      if (!bundle[ns]) { fail(`[${label}] ${where}: t('${ns}:${key}') — no such namespace '${ns}'`); continue; }
      const node = resolve(bundle[ns], key);

      // i18next appends plural/context suffixes, so `a.b` may legitimately live
      // as `a.b_one` / `a.b_other` only.
      if (node === undefined) {
        const parent = key.includes('.') ? key.slice(0, key.lastIndexOf('.')) : '';
        const leaf = key.slice(key.lastIndexOf('.') + 1);
        const siblings = parent ? resolve(bundle[ns], parent) : bundle[ns];
        const suffixed =
          siblings && typeof siblings === 'object' &&
          Object.keys(siblings).some((k) => k.startsWith(`${leaf}_`));
        if (!suffixed) fail(`[${label}] ${where}: t('${ns}:${key}') — key missing from locales`);
        continue;
      }

      // Resolving to a subtree renders "[object Object]" unless the caller asked
      // for the subtree on purpose.
      if (node !== null && typeof node === 'object' && !tail.includes('returnObjects')) {
        fail(`[${label}] ${where}: t('${ns}:${key}') — resolves to an object, not a string (add returnObjects, or point at a leaf)`);
      }
    }
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
