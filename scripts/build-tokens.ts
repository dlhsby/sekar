/**
 * SEKAR design-token generator.
 *
 * Reads specs/design-system/tokens.json (validated against tokens.schema.json),
 * emits two byte-identical artifacts:
 *
 *   - apps/web/src/app/generated/tokens.css
 *   - apps/mobile/src/constants/generated/tokens.ts
 *
 * Output is deterministic (stable key order, LF line endings, trailing newline)
 * so `tokens:build && git diff --exit-code` is the CI drift check.
 *
 * Modes:
 *   default        write outputs to disk
 *   --verify       generate in memory, diff against on-disk; exit 1 on drift
 *
 * Hand-rolled per ADR-036 (no Style Dictionary). Keep this file small.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const REPO_ROOT = resolve(__dirname, '..');
const TOKENS_PATH = join(REPO_ROOT, 'specs/design-system/tokens.json');
const SCHEMA_PATH = join(REPO_ROOT, 'specs/design-system/tokens.schema.json');
const WEB_OUT = join(REPO_ROOT, 'apps/web/src/app/generated/tokens.css');
const MOBILE_OUT = join(REPO_ROOT, 'apps/mobile/src/constants/generated/tokens.ts');

const BANNER_LINES = [
  'GENERATED FILE — DO NOT EDIT.',
  'Source of truth: specs/design-system/tokens.json',
  'Run `npm run tokens:build` from the repo root to regenerate.',
  'CI rejects drift via the `tokens-verify` job (ADR-036).',
];

interface ColorEntry { value: string; webVar?: string; mobileKey?: string; icon?: string }
interface StatusEntry { value: string; background: string }
interface PlantEntry { value: string; polygonOpacity: number }
interface RequestEntry { value: string; icon: string }
interface BgEntry { value: string; usage?: string }
interface ShadowEntry { x: number; y: number; color: string; radius: 0 }
interface TypeEntry { font: 'display' | 'body' | 'mono'; weight: number; size: number; lineHeight: number }
interface MotionEntry { duration: string; easing: string }

interface TokensFile {
  _meta: { version: string; lastUpdated: string; source?: string; notice?: string };
  color: Record<string, ColorEntry>;
  status: Record<string, StatusEntry>;
  plant: Record<string, PlantEntry>;
  request: Record<string, RequestEntry>;
  bg: Record<string, BgEntry>;
  neutral: Record<string, string>;
  gray: Record<string, string>;
  sidebar: Record<string, string>;
  border: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, ShadowEntry>;
  space: Record<string, string | { mobile: string; web: string }>;
  font: Record<string, string>;
  type: Record<string, TypeEntry | string>;
  motion: Record<string, MotionEntry>;
}

const kebab = (s: string): string => s.replace(/\./g, '-').replace(/_/g, '-');
const camel = (s: string): string => s.replace(/[.\-_]([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const cssBanner = (): string => `/*\n${BANNER_LINES.map((l) => ` * ${l}`).join('\n')}\n */\n`;
const tsBanner = (): string => `/**\n${BANNER_LINES.map((l) => ` * ${l}`).join('\n')}\n */\n`;
const sortedEntries = <V>(o: Record<string, V>): Array<[string, V]> => Object.entries(o).sort(([a], [b]) => a.localeCompare(b));

function emitWebCss(t: TokensFile): string {
  const lines: string[] = [];
  lines.push(cssBanner());
  lines.push(':root {');
  for (const [name, e] of sortedEntries(t.color)) {
    const varName = e.webVar ?? `--color-nb-${kebab(name)}`;
    lines.push(`  ${varName}: ${e.value};`);
  }
  for (const [name, e] of sortedEntries(t.status)) {
    lines.push(`  --color-status-${kebab(name)}: ${e.value};`);
    lines.push(`  --color-status-${kebab(name)}-bg: ${e.background};`);
  }
  for (const [name, e] of sortedEntries(t.plant)) {
    lines.push(`  --color-plant-${kebab(name)}: ${e.value};`);
    lines.push(`  --color-plant-${kebab(name)}-opacity: ${e.polygonOpacity};`);
  }
  for (const [name, e] of sortedEntries(t.request)) {
    lines.push(`  --color-request-${kebab(name)}: ${e.value};`);
  }
  for (const [name, e] of sortedEntries(t.bg)) {
    lines.push(`  --color-bg-${kebab(name)}: ${e.value};`);
  }
  for (const [name, v] of sortedEntries(t.neutral)) lines.push(`  --color-nb-${kebab(name)}: ${v};`);
  for (const [name, v] of sortedEntries(t.gray)) lines.push(`  --color-nb-gray-${kebab(name)}: ${v};`);
  for (const [name, v] of sortedEntries(t.sidebar)) lines.push(`  --color-nb-sidebar-${kebab(name)}: ${v};`);
  for (const [name, v] of sortedEntries(t.border)) lines.push(`  --border-${kebab(name)}: ${v};`);
  for (const [name, v] of sortedEntries(t.radius)) lines.push(`  --radius-${kebab(name)}: ${v};`);
  for (const [name, s] of sortedEntries(t.shadow)) {
    lines.push(`  --shadow-nb-${kebab(name)}: ${s.x}px ${s.y}px 0 ${s.color};`);
  }
  for (const [name, v] of sortedEntries(t.space)) {
    if (typeof v === 'string') lines.push(`  --space-${kebab(name)}: ${v};`);
    else lines.push(`  --space-${kebab(name)}: ${v.web};`);
  }
  for (const [name, v] of sortedEntries(t.font)) lines.push(`  --font-${kebab(name)}: ${v};`);
  for (const [name, e] of sortedEntries(t.type)) {
    if (typeof e === 'string') continue;
    lines.push(`  --type-${kebab(name)}-family: var(--font-${e.font});`);
    lines.push(`  --type-${kebab(name)}-weight: ${e.weight};`);
    lines.push(`  --type-${kebab(name)}-size: ${e.size}px;`);
    lines.push(`  --type-${kebab(name)}-line-height: ${e.lineHeight};`);
  }
  for (const [name, m] of sortedEntries(t.motion)) {
    lines.push(`  --motion-${kebab(name)}-duration: ${m.duration};`);
    lines.push(`  --motion-${kebab(name)}-easing: ${m.easing};`);
  }
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

interface ViewStyleShape {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

function parseSpace(v: string): number | string {
  const m = v.match(/^(\d+(?:\.\d+)?)px$/);
  if (m) return parseFloat(m[1]);
  if (v === '0') return 0;
  return v;
}

function stringifyConst(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => `${padInner}${stringifyConst(v, indent + 1)}`).join(',\n');
    return `[\n${items},\n${pad}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  if (keys.length === 0) return '{}';
  const lines = keys.map((k) => {
    const safeKey = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
    return `${padInner}${safeKey}: ${stringifyConst(obj[k], indent + 1)}`;
  });
  return `{\n${lines.join(',\n')},\n${pad}}`;
}

function emitMobileTs(t: TokensFile): string {
  const out: string[] = [];
  out.push(tsBanner());
  out.push(`import type { ViewStyle } from 'react-native';`);
  out.push('');

  const colorObj: Record<string, string> = {};
  for (const [name, e] of sortedEntries(t.color)) colorObj[camel(name)] = e.value;
  for (const [name, e] of sortedEntries(t.status)) {
    colorObj[`status${camel('-' + name)}`] = e.value;
    colorObj[`status${camel('-' + name)}Bg`] = e.background;
  }
  for (const [name, e] of sortedEntries(t.plant)) colorObj[`plant${camel('-' + name)}`] = e.value;
  for (const [name, e] of sortedEntries(t.request)) colorObj[`request${camel('-' + name)}`] = e.value;
  for (const [name, e] of sortedEntries(t.bg)) colorObj[`bg${camel('-' + name)}`] = e.value;
  for (const [name, v] of sortedEntries(t.neutral)) colorObj[camel(name)] = v;
  for (const [name, v] of sortedEntries(t.gray)) colorObj[`gray${name}`] = v;
  for (const [name, v] of sortedEntries(t.sidebar)) colorObj[`sidebar${camel('-' + name)}`] = v;
  out.push(`export const nbColors = ${stringifyConst(colorObj)} as const;`);
  out.push('');

  const shadowObj: Record<string, ViewStyleShape> = {};
  for (const [name, s] of sortedEntries(t.shadow)) {
    shadowObj[camel(name)] = {
      shadowColor: s.color,
      shadowOffset: { width: s.x, height: s.y },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: Math.max(s.x, s.y),
    };
  }
  out.push(`export const nbShadows: Record<string, ViewStyle> = ${stringifyConst(shadowObj)};`);
  out.push('');

  const spaceObj: Record<string, string | number> = {};
  for (const [name, v] of sortedEntries(t.space)) {
    if (typeof v === 'string') spaceObj[camel(name)] = parseSpace(v);
    else spaceObj[camel(name)] = parseSpace(v.mobile);
  }
  out.push(`export const nbSpacing = ${stringifyConst(spaceObj)} as const;`);
  out.push('');

  const borderObj: Record<string, string | number> = {};
  for (const [name, v] of sortedEntries(t.border)) borderObj[camel(name)] = parseSpace(v);
  out.push(`export const nbBorders = ${stringifyConst(borderObj)} as const;`);
  out.push('');

  const radiusObj: Record<string, number> = {};
  for (const [name, v] of sortedEntries(t.radius)) radiusObj[camel(name)] = parseSpace(v) as number;
  out.push(`export const nbRadius = ${stringifyConst(radiusObj)} as const;`);
  out.push('');

  const fontObj: Record<string, string> = {};
  for (const [name, v] of sortedEntries(t.font)) fontObj[camel(name)] = v;
  out.push(`export const nbFonts = ${stringifyConst(fontObj)} as const;`);
  out.push('');

  const typeObj: Record<string, { fontFamily: string; fontWeight: string; fontSize: number; lineHeight: number }> = {};
  for (const [name, e] of sortedEntries(t.type)) {
    if (typeof e === 'string') continue;
    typeObj[camel(name)] = {
      fontFamily: t.font[e.font],
      fontWeight: String(e.weight),
      fontSize: e.size,
      lineHeight: Math.round(e.size * e.lineHeight),
    };
  }
  out.push(`export const nbType = ${stringifyConst(typeObj)} as const;`);
  out.push('');

  const motionObj: Record<string, { duration: number; easing: string }> = {};
  for (const [name, m] of sortedEntries(t.motion)) {
    motionObj[camel(name)] = { duration: parseInt(m.duration, 10), easing: m.easing };
  }
  out.push(`export const nbMotion = ${stringifyConst(motionObj)} as const;`);
  out.push('');

  out.push(`export function nbShadow(level: keyof typeof nbShadows): ViewStyle {`);
  out.push(`  return nbShadows[level];`);
  out.push(`}`);
  out.push('');

  out.push(`export const nbTokens = {`);
  out.push(`  colors: nbColors,`);
  out.push(`  shadows: nbShadows,`);
  out.push(`  spacing: nbSpacing,`);
  out.push(`  borders: nbBorders,`);
  out.push(`  radius: nbRadius,`);
  out.push(`  fonts: nbFonts,`);
  out.push(`  type: nbType,`);
  out.push(`  motion: nbMotion,`);
  out.push(`} as const;`);
  out.push('');

  return out.join('\n');
}

function loadAndValidate(): TokensFile {
  const raw = readFileSync(TOKENS_PATH, 'utf8');
  const tokens = JSON.parse(raw) as TokensFile;
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate: ValidateFunction = ajv.compile(schema);
  if (!validate(tokens)) {
    const msg = (validate.errors ?? []).map((e) => `  ${e.instancePath || '/'} ${e.message}`).join('\n');
    throw new Error(`tokens.json failed schema validation:\n${msg}`);
  }
  return tokens;
}

function writeOut(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { encoding: 'utf8' });
}

function diffOrThrow(path: string, expected: string): void {
  if (!existsSync(path)) {
    throw new Error(`tokens-verify drift: ${path} is missing. Run \`npm run tokens:build\`.`);
  }
  const actual = readFileSync(path, 'utf8');
  if (actual !== expected) {
    throw new Error(
      `tokens-verify drift: ${path} differs from generator output.\n` +
        `Run \`npm run tokens:build\` and commit the regenerated file.`,
    );
  }
}

export function main(verify = false): void {
  const tokens = loadAndValidate();
  const webCss = emitWebCss(tokens);
  const mobileTs = emitMobileTs(tokens);
  if (verify) {
    diffOrThrow(WEB_OUT, webCss);
    diffOrThrow(MOBILE_OUT, mobileTs);
    process.stdout.write('tokens-verify: OK (no drift)\n');
    return;
  }
  writeOut(WEB_OUT, webCss);
  writeOut(MOBILE_OUT, mobileTs);
  process.stdout.write(`tokens:build wrote ${WEB_OUT}\ntokens:build wrote ${MOBILE_OUT}\n`);
}

if (require.main === module) {
  try {
    main(process.argv.includes('--verify'));
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(1);
  }
}

export { emitWebCss, emitMobileTs, loadAndValidate };
