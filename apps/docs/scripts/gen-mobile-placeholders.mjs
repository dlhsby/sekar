// Generate branded placeholder PNGs for the SEKAR mobile-app screenshots, so the
// docs reference real images (no broken <img>) until real device captures land.
// Re-run any time the manifest changes:  node apps/docs/scripts/gen-mobile-placeholders.mjs
//
// To replace a placeholder with a real screenshot, just overwrite the PNG of the
// same name (see capture-mobile.sh). Playwright resolved from apps/web.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(pathToFileURL(resolve(__dirname, '../../web/package.json')));
const { chromium } = require('playwright');

const manifest = JSON.parse(readFileSync(resolve(__dirname, 'mobile-screens.json'), 'utf8'));
const ILLO = resolve(__dirname, '../static/img/illustrations');
const OUT = resolve(__dirname, '../static/img/mobile');
mkdirSync(OUT, { recursive: true });

const SAGE = '#7FBC8C', INK = '#1C1917', CANVAS = '#F5F0EB', YELLOW = '#FDFD96';
const pinwheel = readFileSync(resolve(__dirname, '../static/img/pinwheel-navy.svg'), 'utf8');

function pageHtml(title, illoSvg) {
  return `<!doctype html><html><head><meta charset="utf8"><style>
    *{margin:0;box-sizing:border-box;font-family:'Space Grotesk',system-ui,sans-serif}
    body{width:390px;height:844px;background:${CANVAS};display:flex;flex-direction:column}
    .status{height:36px;background:#fff;border-bottom:2px solid ${INK};display:flex;align-items:center;justify-content:space-between;padding:0 16px;font:600 12px 'JetBrains Mono',monospace;color:${INK}}
    .header{background:${SAGE};border-bottom:3px solid ${INK};padding:18px 18px;display:flex;align-items:center;gap:12px}
    .header .mark{width:40px;height:40px;border:2px solid ${INK};border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 ${INK};transform:rotate(-6deg)}
    .header .mark svg{width:30px;height:30px}
    .header h1{font-size:20px;font-weight:800;color:${INK}}
    .body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:28px}
    .illo{width:240px;height:240px;background:#fff;border:3px solid ${INK};border-radius:16px;box-shadow:6px 6px 0 ${INK};display:flex;align-items:center;justify-content:center;padding:20px}
    .illo svg{width:100%;height:100%}
    .badge{background:${YELLOW};border:2px solid ${INK};border-radius:8px;box-shadow:3px 3px 0 ${INK};padding:10px 16px;font:700 13px 'JetBrains Mono',monospace;color:${INK};text-align:center}
    .cap{color:#57534E;font-size:13px;text-align:center;max-width:280px;line-height:1.5}
  </style></head><body>
    <div class="status"><span>09:41</span><span>SEKAR</span></div>
    <div class="header"><span class="mark">${pinwheel}</span><h1>${title}</h1></div>
    <div class="body">
      <div class="illo">${illoSvg}</div>
      <div class="badge">TANGKAPAN LAYAR MENYUSUL</div>
      <div class="cap">Screenshot coming soon — ganti berkas ini dengan tangkapan layar aplikasi yang sebenarnya.</div>
    </div>
  </body></html>`;
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
let n = 0;
for (const s of manifest.screens) {
  const illoSvg = readFileSync(resolve(ILLO, `${s.illustration}.svg`), 'utf8');
  await page.setContent(pageHtml(s.title, illoSvg), { waitUntil: 'networkidle' });
  await page.screenshot({ path: resolve(OUT, `${s.file}.png`) });
  console.log(`✓ mobile/${s.file}.png`);
  n++;
}
await browser.close();
console.log(`\nGenerated ${n} placeholder screenshots in ${OUT}`);
