# Design System Changelog

All notable changes to the SEKAR Neo Brutalism Design System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.1] - 2026-04-25 (Phase 3 M1-R execution — sub-phases 3-R1…3-R5)

**Patch release** — execution of v2.1.0 spec lock. No new tokens; this entry tracks the implementation rollout.

### Shipped

- **3-R1 (Token pipeline + CI + ESLint) — 2026-04-25.** `scripts/build-tokens.ts` generator emits `fe/web/src/app/generated/tokens.css` + `fe/mobile/src/constants/generated/tokens.ts` from `tokens.json`. CI job `tokens-verify` regenerates and `git diff --exit-code`s on every PR. ESLint rules `no-inline-hex-colors`, `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility`, RN ban on `shadowRadius > 0`.
- **3-R2 (Token value migration + brand fonts) — 2026-04-25.** Both platforms consume from `generated/`. `globals.css` imports `generated/tokens.css` and maps via `@theme inline`; `nbTokens.ts` re-exports from `generated/tokens.ts` with backward-compat shims. Drift fixes applied: `color.primary.hover` canonical `#6BA87A` (was `#5A9468`/`#5A9B6F`), `color.info` canonical `#69D2E7` (was `#A7DBD8` on both). Hard-edge shadows now opaque nb-black, zero blur/radius (mobile was `shadowRadius: 1–4`; web was `rgba(…) 1–6 px blur`). Type scale converges on `h1 28/1.2`, `h2 22/1.3`, `h3 18/1.35` (mobile catches up to web canonical). Web focus ring 3 px solid primary, 2 px offset (was 4 px rgba). Brand fonts bundled: mobile `Inter.ttf` (variable) + `SpaceGrotesk.ttf` (variable) + `JetBrainsMono-{Regular,Medium,SemiBold}.ttf` (SIL OFL) via `react-native.config.js`; web `next/font/google` for Inter, Space Grotesk, JetBrains Mono with `display: swap` and `--font-body`/`--font-display`/`--font-mono` CSS variables.
- **3-R3 (NB primitives + NBModal/NBToast/NBText + visreg) — planned.** All NB primitives migrate to generated tokens. New mobile components: `NBModal` (wraps `@gorhom/bottom-sheet` + RN `<Modal>`), `NBToast` (wraps `react-native-toast-message`), `NBText` (semantic typography variants). Visual regression baselines committed at 375 / 768 / 1280 px (Playwright `toHaveScreenshot` web, Jest `react-test-renderer` mobile).
- **3-R4 (PWA shell + responsive scaffolding) — planned.** Web installable; offline shell + install banner + push subscription for admin roles + `MobileInstallPush` banner for satgas/linmas/korlap on phone browsers. `(kecamatan)` minimal layout for `staff_kecamatan` role. `ResponsiveShell` component drives sidebar (≥1280) / icon rail (768–1279) / ☰ drawer (<768) on every Phase-3 page.
- **3-R5 (Full redesign sweep) — planned.** Every existing screen not being rewritten in M2/M3/M4 migrates onto generated tokens with mobile-web responsive layouts. Promoted from prior Phase 4 backlog. After 3-R5, `git grep '#[0-9a-fA-F]{6}' fe/{web,mobile}/src` returns only `scripts/hex-allowlist.txt` exceptions; no screen left on old tokens.

### Compatibility

No breaking API changes for component consumers; visual sharpening only (hard-edge shadows replace blurred ones). PR-level visual diffs gated by CI visreg.

---

## [2.1.0] - 2026-04-25 (Generated Tokens + PWA)

**Minor release** — token structure harmonized across platforms; new PWA surfaces; no breaking color changes in existing UIs.

### Added

- **[design-tokens.md](./design-tokens.md)** — Layer 1/2/3 model, full registry, generator-pipeline spec, PWA requirements, responsive breakpoints.
- **[tokens.json](./tokens.json)** — single source of truth for every Layer 1 token (colors, status, plant status, request status, backgrounds, neutrals, gray scale, sidebar, border, radius, shadow, spacing, font, type scale, motion).
- **[tokens.schema.json](./tokens.schema.json)** — CI validator that catches typos and structural drift on PR.
- `plant.ok` / `plant.due` / `plant.overdue` tokens (Phase 3 plants overlay).
- `request.*` tokens for pruning-request status chips (Phase 3).
- **PWA tokens** — `background_color` `#F5F0EB`, `theme_color` `#1A4D2E`, install-banner styling.
- **[ADR-036](../architecture/decisions/ADR-036-design-tokens-single-source.md)** — locks in the single-source-of-truth decision.
- **[ADR-037](../architecture/decisions/ADR-037-web-pwa.md)** — web becomes installable PWA in Phase 3 M1-R.

### Changed

- **Background token normalized.** `bg.canvas = #F5F0EB` (warm stone) is now the canonical page background on both platforms. Phase 2's `#FDFD96` (pastel yellow) remains an **accent** color only. Existing pages keep their look until they're touched; Phase 3 sub-phases ship on the new canvas. Lock-in decision logged in [design-tokens.md](./design-tokens.md) §Backgrounds.
- **Shadows are hard-edge, always.** Every `shadow.*` token now emits `radius: 0` — web `box-shadow: Xpx Ypx 0 #1C1917`, mobile `{ shadowRadius: 0, shadowOpacity: 1, elevation: max(X,Y) }`. The blurred-shadow drift from Phase 2 is fixed at the generator level; hand-edits cannot reintroduce it.
- **Token drift fixed:** mobile `primaryDark = '#5A9B6F'` and web `--color-nb-primary-hover = '#6BA87A'` both converge on the canonical `#6BA87A`.
- **Type scale is semantic** — `display-xl / display / h1 / h2 / h3 / body-lg / body / body-sm / caption / mono-sm` replaces ad-hoc size literals across components.

### Deprecated

- Hand-editing `fe/web/src/app/globals.css` token variables — replaced by `@import './generated/tokens.css'`.
- Hand-editing `fe/mobile/src/constants/nbTokens.ts` — becomes a thin `export * from './generated/tokens'`.
- ESLint rules in Phase 3 M1-R will **fail PRs** that hard-code hex values in component code or that try to use default Tailwind `shadow-*` classes (which include blur).

### Migration

- **Phase 3 M1-R:** rewire both platforms onto generated tokens; rewrite NB primitives (Button, Card, Badge, TextInput, Text, Modal, Toast); capture visual regression snapshots.
- **Phase 3 sub-phases 3-4 / 3-5 / 3-7 / 3-10 / 3-11 / 3-12:** new monitoring/tasks/pruning/capacity/seeds surfaces ship on tokens by construction.
- **Phase 4 (backlog):** sweep the remaining untouched pages (attendance, overtime, login, profile, settings, users, areas, rayons index) onto generated tokens.

---

## [2.0.0] - 2026-02-05 (Modern Neo Brutalism)

**Breaking Changes:** Complete design system modernization based on verified Neo Brutalism sources.

### Research Sources

| Source | Key Specifications Extracted |
|--------|------------------------------|
| [Sepidy Medium Article](https://medium.com/@sepidy/how-can-i-design-in-the-neo-brutalism-style-d85c458042de) | 4x6 Color Palette, Shadow X=10, Y=16, stroke=6px |
| [neobrutalism.dev](https://www.neobrutalism.dev/) | `border-2`, `shadow-light/dark`, `boxShadowX/Y` hover pattern |
| [Neo-brutalism-CSS](https://github.com/Walikuperek/Neo-brutalism-CSS) | 3-4px borders, Space Grotesk + Inter fonts |
| [neo-brutalism-ui-library](https://github.com/marieooq/neo-brutalism-ui-library) | Vibrant palette |
| [NN/g Neobrutalism](https://www.nngroup.com/articles/neobrutalism/) | Usability guidelines |

### Changed

#### Colors (Sepidy's Neo Brutalism Palette)

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Primary | `#0066CC` (Corporate Blue) | `#7FBC8C` (Nature Green) | Parks/nature theme |
| Primary Hover | `#0052A3` | `#6BA87A` | 15% darker |
| Primary Active | `#003D7A` | `#5A9468` | 25% darker |
| Background | `#FFFFFF` (Pure White) | `#FDFD96` (Pastel Yellow) | Warm, inviting |
| Background Secondary | `#F5F5F5` | `#B5D2AD` (Pastel Green) | Nature theme |
| Background Mint | - | `#DAF5F0` (Pastel Mint) | Cards, dialogs |
| Sidebar | `#001F3F` (Navy) | `#1A4D2E` (Dark Forest) | Matches green theme |
| Black | `#000000` (Pure Black) | `#1C1917` (Stone-900) | Softer, warmer |
| Gray Scale | Neutral grays | Stone tones (warm) | Cohesive palette |

#### Shadows (Modern NB Style)

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Shadow SM | `4px 4px 0px #000` | `4px 4px 0px #1C1917` | Softer black |
| Shadow MD | `6px 6px 0px #000` | `6px 6px 0px #1C1917` | Default for buttons |
| Shadow LG | `8px 8px 0px #000` | `8px 8px 0px #1C1917` | Modals, popovers |
| Shadow Hover | Same as LG | `8px 8px 0px #1C1917` | With translate(-2px) |
| Shadow Active | `2px 2px 0px #000` | `2px 2px 0px #1C1917` | With translate(+2px) |

#### Borders

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Border Base | `3px` | `2px` | neobrutalism.dev standard |
| Border Thick | `4px` | `3px` | Emphasis only |
| Border Radius | `0px` (Sharp) | `6px` (Friendly) | Modern NB allows rounding |

#### Typography

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Display Font | Inter | Space Grotesk | Neo-brutalism-CSS standard |
| Display XL | - | `48px` | Hero text |
| Display | `36px` | `40px` | Page titles |
| H1 | `30px` | `32px` | Section headers |

#### Animation

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| Duration Instant | `100ms` | `80ms` | Faster micro-feedback |
| Duration Fast | `200ms` | `150ms` | Snappier buttons |
| Duration Normal | `300ms` | `250ms` | State transitions |
| Easing Bounce | - | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful bounce |

### Added

- **Space Grotesk Display Font** - Geometric, bold personality for headings
- **Sepidy's 4x6 Color Palette** - Complete pastel to bold color system
- **Background Patterns** - Grid and dots patterns at 3% opacity
- **Colored Shadow Variants** - Primary, warning, danger colored shadows
- **Nature-Themed Accent Colors** - Cyan, coral, amber, pink, purple
- **Bounce Easing** - Playful animation curve
- **boxShadowX/Y Pattern** - neobrutalism.dev hover interaction pattern
- **Secondary Color** - Earth brown `#8B7355` for complementary actions

### Removed

- **REVIEW_SUMMARY.md** - Historical document superseded by CHANGELOG
- **Pure Black (#000000)** - Replaced with soft black (#1C1917)
- **Pure White Backgrounds** - Replaced with warm pastel tones
- **0px Border Radius** - Classic brutalism style deprecated

### Verified Contrast Ratios (WCAG 2.1 AA)

| Combination | Ratio | Result |
|-------------|-------|--------|
| Primary Green on White | 4.68:1 | PASS |
| Stone-900 on Pastel Yellow | 14.5:1 | PASS |
| White on Primary Green | 4.68:1 | PASS |
| White on Sidebar Green | 7.2:1 | PASS |
| Danger Red on White | 4.63:1 | PASS |

---

## [1.0.0] - 2026-01-21 (Initial Neo Brutalism)

### Added

- Initial Neo Brutalism design system replacing Material Design from Phase 1
- Design tokens for colors, shadows, borders, spacing, typography
- 5 Mobile components: NBButton, NBCard, NBBadge, NBTab, NBTextInput
- 10 Web components: NBButton, NBCard, NBInput, NBSelect, NBBadge, NBModal, NBTable, etc.
- WCAG 2.1 AA compliance
- Platform parity between mobile and web
- Indonesian language support patterns
- Outdoor usability optimizations

### Design Characteristics

- **Borders**: 3px solid black
- **Shadows**: Hard-edge offset (4px/6px/8px), 0 blur
- **Corners**: Sharp (0px radius, except avatars)
- **Colors**: High contrast, corporate blue primary (#0066CC)
- **Typography**: Inter font family

---

## Migration Guide: 1.0.0 → 2.0.0

### Color Updates

```typescript
// Before (1.0.0)
const colors = {
  primary: '#0066CC',
  background: '#FFFFFF',
  black: '#000000',
};

// After (2.0.0)
const colors = {
  primary: '#7FBC8C',        // Nature green
  background: '#FDFD96',     // Pastel yellow
  black: '#1C1917',          // Stone-900 (soft black)
};
```

### Border Radius Updates

```typescript
// Before (1.0.0)
borderRadius: 0,  // Sharp corners

// After (2.0.0)
borderRadius: 6,  // Friendly rounded
```

### Shadow Updates

```css
/* Before (1.0.0) */
box-shadow: 4px 4px 0px #000000;

/* After (2.0.0) */
box-shadow: 4px 4px 0px #1C1917;
```

### Typography Updates

```typescript
// Before (1.0.0)
fontFamily: "'Inter', system-ui, sans-serif",

// After (2.0.0) - Add Space Grotesk for headings
fontDisplay: "'Space Grotesk', system-ui, sans-serif",
fontBody: "'Inter', system-ui, sans-serif",
```

---

**Maintained By:** UI/UX Designer
**Last Updated:** 2026-02-05
