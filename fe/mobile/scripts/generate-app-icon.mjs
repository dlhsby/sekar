/**
 * Generates SEKAR launcher/app icons from the brand pinwheel (design/project/
 * illustrations.html #sekar-mark). Outputs Android legacy + adaptive PNGs and the
 * iOS AppIcon 1024. Re-run after changing brand colors:  node scripts/generate-app-icon.mjs
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BLADE = 'M 0 -14 Q 18 -38 0 -42 Q -14 -38 0 -14 Z';
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const SAGE = '#7FBC8C';
const CENTER = '#FDFD96';
const INK = '#1C1917';
// The SEKAR mark sits on a white NB box (no stone field) — the canonical lockup.
const BG = '#FFFFFF';

const blades = ANGLES.map(
  (a) =>
    `<g transform="rotate(${a})"><path d="${BLADE}" fill="${SAGE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>`,
).join('');

// Pinwheel content centered at (cx,cy), scaled so its ~84px native diameter maps to `dia`.
const pinwheelAt = (cx, cy, dia) =>
  `<g transform="translate(${cx} ${cy}) scale(${(dia / 84).toFixed(3)})">${blades}` +
  `<circle r="12" fill="${CENTER}" stroke="${INK}" stroke-width="3"/></g>`;

// NB "3D" lockup (mirrors SekarLogoBox + splash tilt): white rounded box with a thick
// ink border and a hard-edge offset ink shadow, holding the pinwheel, tilted `tilt`°.
const TILT = -6;
const lockup = (view, box) => {
  const c = view / 2;
  const x = c - box / 2;
  const off = +(box * 0.075).toFixed(2);
  const rx = +(box * 0.2).toFixed(2);
  const bw = +(box * 0.06).toFixed(2);
  return (
    `<g transform="rotate(${TILT} ${c} ${c})">` +
    `<rect x="${(x + off).toFixed(2)}" y="${(x + off).toFixed(2)}" width="${box}" height="${box}" rx="${rx}" fill="${INK}"/>` +
    `<rect x="${x.toFixed(2)}" y="${x.toFixed(2)}" width="${box}" height="${box}" rx="${rx}" fill="#FFFFFF" stroke="${INK}" stroke-width="${bw}"/>` +
    pinwheelAt(c, c, box * 0.6) +
    `</g>`
  );
};

// Legacy square icon: TRANSPARENT field + centered tilted NB-box lockup (no white
// backdrop — just the box floating).
const squareSvg = (px) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 120 120">` +
  `${lockup(120, 84)}</svg>`;

// Round legacy icon: same transparent floating lockup.
const roundSvg = (px) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 120 120">` +
  `${lockup(120, 84)}</svg>`;

// Adaptive foreground: transparent, lockup kept inside the 66dp safe zone of 108dp.
const foregroundSvg = (px) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 108 108">` +
  `${lockup(108, 60)}</svg>`;

// iOS marketing icon must be opaque (no alpha) — Apple rejects transparency. The box
// fills the canvas so there is no separate backdrop behind it.
const iosSvg = (px) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 120 120">` +
  `${lockup(120, 88)}</svg>`;

// Transparent lockup for the native splash screens (white NB box on the sage canvas).
const splashLockupSvg = (px) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 120 120">` +
  `${lockup(120, 80)}</svg>`;

async function png(svg, size, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg(size))).resize(size, size).png().toFile(outPath);
  console.log('  ✓', outPath.replace(ROOT + '/', ''));
}

// ─── Android ──────────────────────────────────────────────────────────────────
const RES = join(ROOT, 'android/app/src/main/res');
const LEGACY = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };
const FG = { 'mipmap-mdpi': 108, 'mipmap-hdpi': 162, 'mipmap-xhdpi': 216, 'mipmap-xxhdpi': 324, 'mipmap-xxxhdpi': 432 };

async function android() {
  console.log('Android:');
  for (const [dir, size] of Object.entries(LEGACY)) {
    await png(squareSvg, size, join(RES, dir, 'ic_launcher.png'));
    await png(roundSvg, size, join(RES, dir, 'ic_launcher_round.png'));
  }
  for (const [dir, size] of Object.entries(FG)) {
    await png(foregroundSvg, size, join(RES, dir, 'ic_launcher_foreground.png'));
  }
  // Adaptive descriptors (API 26+)
  const adaptive = (round) =>
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n` +
    `    <background android:drawable="@color/ic_launcher_background" />\n` +
    `    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n` +
    `</adaptive-icon>\n`;
  const anydpi = join(RES, 'mipmap-anydpi-v26');
  mkdirSync(anydpi, { recursive: true });
  writeFileSync(join(anydpi, 'ic_launcher.xml'), adaptive(false));
  writeFileSync(join(anydpi, 'ic_launcher_round.xml'), adaptive(true));
  console.log('  ✓ mipmap-anydpi-v26/ic_launcher{,_round}.xml');
  // Background color in ic_launcher_background.xml (keep separate from colors.xml)
  writeFileSync(
    join(RES, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#00000000</color>\n</resources>\n`,
  );
  console.log('  ✓ values/ic_launcher_background.xml');
}

// ─── iOS ────────────────────────────────────────────────────────────────────
async function ios() {
  const iosDir = join(ROOT, 'ios');
  if (!existsSync(iosDir)) return;
  const app = readdirSync(iosDir).find((d) =>
    existsSync(join(iosDir, d, 'Images.xcassets', 'AppIcon.appiconset')),
  );
  if (!app) {
    console.log('iOS: AppIcon.appiconset not found — skipped');
    return;
  }
  console.log('iOS:');
  const set = join(iosDir, app, 'Images.xcassets', 'AppIcon.appiconset');
  // App Store marketing icon must be opaque (no alpha) — flatten onto white.
  const out1024 = join(set, 'icon-1024.png');
  mkdirSync(dirname(out1024), { recursive: true });
  await sharp(Buffer.from(iosSvg(1024)))
    .resize(1024, 1024)
    .flatten({ background: BG })
    .png()
    .toFile(out1024);
  console.log('  ✓', out1024.replace(ROOT + '/', ''));
  const contents = {
    images: [{ filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
    info: { author: 'xcode', version: 1 },
  };
  writeFileSync(join(set, 'Contents.json'), JSON.stringify(contents, null, 2) + '\n');
  console.log('  ✓ Contents.json (single 1024 universal)');
}

// ─── Native splash logos (box lockup on the sage canvas) ──────────────────────
async function androidSplash() {
  console.log('Android splash:');
  const sizes = { 'drawable-mdpi': 120, 'drawable-hdpi': 180, 'drawable-xhdpi': 240, 'drawable-xxhdpi': 360, 'drawable-xxxhdpi': 480 };
  for (const [dir, size] of Object.entries(sizes)) {
    await png(splashLockupSvg, size, join(RES, dir, 'splash_logo.png'));
  }
}

async function iosLaunch() {
  const iosDir = join(ROOT, 'ios');
  if (!existsSync(iosDir)) return;
  const app = readdirSync(iosDir).find((d) =>
    existsSync(join(iosDir, d, 'Images.xcassets', 'SekarPinwheel.imageset')),
  );
  if (!app) return;
  console.log('iOS launch:');
  const set = join(iosDir, app, 'Images.xcassets', 'SekarPinwheel.imageset');
  await png(splashLockupSvg, 120, join(set, 'pinwheel.png'));
  await png(splashLockupSvg, 240, join(set, 'pinwheel@2x.png'));
  await png(splashLockupSvg, 360, join(set, 'pinwheel@3x.png'));
}

await android();
await ios();
await androidSplash();
await iosLaunch();
console.log('Done.');
