// Capture real SEKAR web-dashboard screenshots for the docs site.
//
//   node apps/docs/scripts/capture-web.mjs [baseURL]
//
// Logs into the live site as superadmin (sees every page) + a staff_kecamatan
// pass, and writes PNGs to apps/docs/static/img/web/. Defaults to staging.
// Playwright is resolved from apps/web (its workspace owns the dep + browser).
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(__dirname, '../../web');
const require = createRequire(pathToFileURL(resolve(webDir, 'package.json')));
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'https://sekar.wahyutrip.com';
const OUT = resolve(__dirname, '../static/img/web');
mkdirSync(OUT, { recursive: true });

// Software WebGL so the Google Maps monitoring map renders in headless.
const LAUNCH = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] };
const VIEWPORT = { width: 1440, height: 900 };

async function login(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="identifier"]', { timeout: 20000 });
  await page.fill('input[name="identifier"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

async function dismissBanners(page) {
  // Best-effort: close PWA install / update toasts so they don't cover content.
  for (const label of [/nanti/i, /tutup/i, /lain kali/i, /dismiss/i]) {
    const b = page.getByRole('button', { name: label }).first();
    if (await b.count()) await b.click({ timeout: 1000 }).catch(() => {});
  }
}

async function shot(page, path, name, extraWaitMs = 2500) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await dismissBanners(page);
  await page.waitForTimeout(extraWaitMs);
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
  console.log(`✓ ${name}.png  (${path})`);
}

const ADMIN_PAGES = [
  ['/', 'dashboard'],
  ['/monitoring', 'monitoring', 6000],
  ['/users', 'users'],
  ['/areas', 'areas'],
  ['/rayons', 'rayons'],
  ['/tasks', 'tasks'],
  ['/schedules', 'schedules'],
  ['/reports', 'reports'],
  ['/analytics', 'analytics', 4000],
  ['/export', 'export'],
  ['/import', 'import'],
  ['/pruning-requests', 'pruning-requests'],
  ['/plants', 'plants'],
];

const browser = await chromium.launch(LAUNCH);
const results = { ok: [], failed: [] };
try {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  // Public login page (no auth).
  try { await shot(page, '/login', 'login', 1500); results.ok.push('login'); }
  catch (e) { results.failed.push(['login', e.message]); }

  // Admin/superadmin surfaces.
  await login(page, 'superadmin', 'password123');
  for (const [path, name, wait] of ADMIN_PAGES) {
    try { await shot(page, path, name, wait); results.ok.push(name); }
    catch (e) { results.failed.push([name, e.message]); }
  }
  await ctx.close();

  // staff_kecamatan surfaces (separate role/login).
  const ctx2 = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page2 = await ctx2.newPage();
  try {
    await login(page2, 'kecamatan1', 'password123');
    await shot(page2, '/pruning-submit', 'pruning-submit', 2500);
    results.ok.push('pruning-submit');
  } catch (e) { results.failed.push(['pruning-submit', e.message]); }
  await ctx2.close();
} finally {
  await browser.close();
}

console.log(`\nDONE — ${results.ok.length} captured, ${results.failed.length} failed`);
if (results.failed.length) {
  for (const [n, m] of results.failed) console.log(`  ✗ ${n}: ${String(m).split('\n')[0]}`);
  process.exitCode = 1;
}
