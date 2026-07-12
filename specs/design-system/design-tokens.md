# Design Tokens — Platform-Wide Foundation

**Version:** 2.1 (Phase 4 rebrand re-baseline — see [ADR-040](../architecture/decisions/ADR-040-design-system-v2.1.md))
**Status:** Accepted v2.1 (Phase 4 Sub-Phase 4-0, applied 2026-05-23) · reconciled to design/ as v2.1.1 (2026-05-25) · prior: Accepted v1.0 (Phase 3 M1-R)
**Last Updated:** 2026-05-25 (`tokens.json` `_meta.version` → 2.1.1: radius/shadow/border reconciled to `design/`, role + lilac tokens added — see §v2.1.1 below)
**Owner:** Design systems
**Design language:** [Neo Brutalism 2.0](neo-brutalism.md)
**See also:** [responsive-design.md](responsive-design.md), [typography.md](typography.md), [accessibility.md](accessibility.md)

---

## v2.1 — Phase 4 rebrand re-baseline (May 22, 2026)

A complete rebrand was iterated on Claude Design in May 2026 and vendored to [`design/`](mockups). Design System v2.1 supersedes the v2.0 palette but **keeps the v1.0/v2.0 generator architecture and three-layer model unchanged** (see [ADR-040](../architecture/decisions/ADR-040-design-system-v2.1.md)). Only the *values* in `tokens.json` change.

**Canonical source for v2.1:** [`design/project/hifi-shared.css`](mockups/project/hifi-shared.css) lines 7-82 (token block).

### Headline v2.0 → v2.1 changes

| Aspect | v2.0 (Phase 3 M1-R) | v2.1 (Phase 4 4-0) |
|--------|----------------------|---------------------|
| Primary | yellow `#FDFD96` | **sage green `#7FBC8C`** |
| Primary-deep / hover | absent | `#5A9468` / `#6BA87A` |
| Canvas | mixed yellow / off-white / warm stone | **warm stone `#F5F0EB`** uniform |
| Yellow `#FDFD96` | primary | accent (pinwheel center, tab-active, masthead) |
| Shadows | partial soft-blur | **zero-blur hard-edge** at `2/2/0` → `10/10/0` scale |
| Status palette | ad-hoc per component | codified 5-state (`active`/`idle`/`outside`/`missing`/`offline`) with paired -fg/-bg |
| Role accents | loose | codified 9 roles (incl. `staff_kecamatan`) |
| Brand mark | wordmark only | **pinwheel** (8 petals = 8 rayons + yellow DLH Surabaya center) |

Detailed token diff lives in [build history](../history/CHANGELOG.md).

### v2.1 migration impact

- `specs/design-system/tokens.json` regenerated from `design/project/hifi-shared.css` in Sub-Phase 4-0.
- `npm run tokens:build` produces a colour-shifted `tokens.css` (web) + `tokens.ts` (mobile). Most consumers repaint automatically; layout-level revamp happens screen-by-screen in Sub-Phase 4-R per the hi-fi.
- New tokens added: `--primary-deep`, `--primary-hover`, `--primary-soft`, `--brand-sun` / `--accent-yellow`, `--navy`, `--secondary`, full status-* and role-* sets.
- Brand identity ships alongside tokens: pinwheel SVG, app icons, splash variants, 6 empty-state illustrations, 3 onboarding scenes — see [`design/project/illustrations.html`](mockups/project/illustrations.html).
- App-store re-submission required (icon + splash change).

### v2.1.1 — design/ fidelity reconciliation (May 25, 2026)

A checkpoint audit of `tokens.json` against the canonical [`design/project/hifi-shared.css`](mockups/project/hifi-shared.css) found drift that this revision corrects. `_meta.version` bumped `2.1.0 → 2.1.1`. Amends [ADR-040](../architecture/decisions/ADR-040-design-system-v2.1.md) (values only; generator + three-layer model unchanged).

**Value corrections (now match `hifi-shared.css` exactly):**

| Token | was (2.1.0) | now (design/) |
|-------|-------------|---------------|
| `radius.base` | 6px | **10px** (`--r-base`) |
| `radius.md` | 8px | **14px** (`--r-md`) |
| `radius.lg` | 12px | **20px** (`--r-lg`) |
| `shadow.sm` | 4/4 | **3/3** (`--sh-sm`) |
| `shadow.md` | 6/6 | **4/4** (`--sh-md`) |
| `shadow.lg` | 8/8 | **6/6** (`--sh-lg`) |
| `shadow.hover` | 8/8 | **6/6** (tracks new `lg`) |
| `border.width.thick` | 3px | **2.5px** (`--bw-thick`) |

`shadow.xs` (2/2), `shadow.xl` (10/10), `shadow.active` (2/2) already matched.

**Additive (were defined + used in `design/` but missing from `tokens.json`):**

- 9 role accents under `color.role.*` → web `--color-role-{satgas,linmas,korlap,admin-data,kepala,top,admin-sys,superadmin,kecamatan}`, mobile `nbColors.role{Satgas,…}`. Values per `hifi-shared.css` lines 50-59 (used by `.av.*` avatar tints).
- `bg.accent.lilac` `#E8DFF5` → web `--color-bg-accent-lilac`, mobile `nbColors.bgAccentLilac` (used by `.pill.lilac` / `.card.lilac`).

**Generator note:** `scripts/build-tokens.ts` `parseSpace()` extended to parse decimal `px` (so `2.5px` emits the numeric `2.5` for RN `borderWidth`). No structural/schema change; role tokens ride the existing `color` map via explicit `webVar`.

> The radius/shadow value shift repaints every card/button/input (larger corners, slightly tighter shadows). Token consumers update automatically; no per-component code change was required.

---

## v1.0 — Phase 3 adoption (April 25, 2026)


## Purpose

A single source of truth for every design token used by **both** `apps/web` and `apps/mobile`. Enforces visual parity ("the SEKAR feel") while leaving room for platform-native primitives where parity would hurt UX.

This document supersedes the ad-hoc copies in `apps/web/src/app/globals.css` and `apps/mobile/src/constants/nbTokens.ts` — those files become **generated artifacts** of `specs/design-system/tokens.json` from Phase 3 onward.

---

## The Three-Layer Model

Every token falls into exactly one layer. The layer determines how strict parity is and where the token is physically defined.

### Layer 1 — Core brand DNA (100 % shared, byte-identical values)

Identical hex codes, pixel values, and font names across both platforms. This is the non-negotiable spine of the SEKAR visual identity.

- **Colors:** primary / success / warning / danger / info + their light/border siblings, backgrounds, grays, navy sidebar
- **Border color:** `#1C1917` (stone black)
- **Border widths:** `1 / 2 / 3 / 4`
- **Border radii:** `0 / 4 / 6 / 8 / 12`
- **Spacing scale:** `4 / 8 / 16 / 24 / 32 / 48 / 64`
- **Font families:** Space Grotesk (display), Inter (body), JetBrains Mono (mono/data)
- **Type-scale semantic names:** `display-xl / display / h1 / h2 / h3 / body-lg / body / body-sm / caption / mono-sm`
- **Motion timing:** 100 ms press, 150 ms hover, 200 ms enter, 250 ms exit
- **Icon set:** `lucide` — web = `lucide-react`, mobile = `lucide-react-native` (same SVG primitives)

### Layer 2 — Platform-adapted primitives (same intent, different syntax)

Same visual effect; different implementation because the platforms expose shadow/outline/hit-target/press APIs differently.

| Primitive | Web (`globals.css`) | Mobile (`nbTokens.ts`) | Shared rule |
|-----------|---------------------|-------------------------|-------------|
| **Shadow offsets** | `box-shadow: Xpx Ypx 0 #1C1917` | `shadowOffset: { width: X, height: Y }` | **Always hard-edge.** `shadowRadius: 0` on mobile; no blur token in CSS. Offsets match per step (2/4/6/8/12 px). |
| **Press animation** | `transform: translate(2px,2px); box-shadow: 2px 2px 0 #1C1917;` | `Animated.sequence(...)` with equivalent translate + shadow swap | Press reduces the shadow; hover enlarges it. |
| **Focus ring** | `outline: 3px solid var(--color-nb-primary); outline-offset: 2px` | `borderWidth: 3; borderColor: nbColors.primary` flash | 3 px, primary color, 2 px offset. |
| **Hit target** | `min-height: 44px` (touch contexts), 32 px (pointer contexts) | `minHeight: 48` always | Web scales with input; mobile is always touch. |
| **Safe areas** | `env(safe-area-inset-*)` in PWA standalone mode | `react-native-safe-area-context` | Both apps must respect notches. |

### Layer 3 — Platform-divergent patterns (intentionally different — NOT drift)

Patterns that *should* differ because of input model, screen real estate, or platform convention. No parity target.

| Pattern | Mobile | Web |
|---------|--------|-----|
| Primary navigation | Bottom tab bar (max 5) | Left sidebar (9 roles gated) |
| Data display | Vertical stacked cards | Data tables with sort/filter |
| Forms | Full-screen, single column, sticky CTA | Dialogs or 2-column pages |
| Modals | Bottom sheets (small), full-screen (complex) | Radix Dialog centered |
| Map interactions | Pinch-zoom + tap marker → bottom sheet | Scroll-zoom + click marker → right-rail drawer |
| Menus / overflow | Bottom action sheet | Dropdown menu |
| Overtime/task refresh | Pull-to-refresh gesture | Manual refresh button + WS patches |
| Keyboard shortcuts | None | `/` focus search, `⌘K` command palette, `Esc` close |
| Offline UX | Offline queue with per-item state | Toast + read-only degraded mode (last cache) |

---

## Source of Truth: `tokens.json`

All Layer 1 values live in a single JSON file committed at repo root under `specs/design-system/tokens.json`. Web and mobile consume **generated** files — editing `globals.css` or `nbTokens.ts` by hand is forbidden from Phase 3 onward.

### File location

```
specs/design-system/
├── design-tokens.md    # this document
├── tokens.json         # source of truth (Layer 1 values)
└── tokens.schema.json  # JSON Schema for tokens.json (CI validation)
```

### Build pipeline

```
                       ┌─────────────────────────────────┐
                       │   specs/design-system/tokens.json       │
                       │   (single source of truth)      │
                       └────────────────┬────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
             ▼                          ▼                          ▼
  ┌──────────────────┐     ┌──────────────────┐       ┌──────────────────┐
  │ build-tokens.ts  │     │ build-tokens.ts  │       │   CI validator   │
  │   --target web   │     │  --target mobile │       │  (schema + drift)│
  └────────┬─────────┘     └────────┬─────────┘       └──────────────────┘
           │                        │
           ▼                        ▼
  apps/web/src/app/           apps/mobile/src/constants/
  generated/tokens.css      generated/tokens.ts
           │                        │
           ▼                        ▼
  imported by globals.css   imported by nbTokens.ts
  (as `@import`)            (as `export * from`)
```

Generator script: `scripts/build-tokens.ts` at repo root (run via `npm run tokens:build`). Hand-rolled ~100-line TS script (no Style Dictionary dependency, per ADR-036 — locked in M1-R sub-phase 3-R1).

### Generated files are git-tracked

- ✅ **Commit** `generated/tokens.css` and `generated/tokens.ts` so reviewers see diffs, CI verifies they match source.
- ❌ **Do not edit** generated files — CI rejects PRs whose generated file drifts from what the generator produces.

### CI enforcement

`npm run tokens:verify` runs in CI on every PR:
1. Validates `tokens.json` against `tokens.schema.json`.
2. Re-runs the generator.
3. Diffs generator output against committed `generated/` files — fails the build on mismatch.

---

## Layer 1 Token Registry

Exact hex codes, pixel values, and string constants. Any change here requires an ADR.

### Colors — Actions

| Token | Hex | Web CSS var | Mobile key |
|-------|-----|-------------|------------|
| `color.primary` | `#7FBC8C` | `--color-nb-primary` | `nbColors.primary` |
| `color.primary.hover` | `#6BA87A` | `--color-nb-primary-hover` | `nbColors.primaryHover` |
| `color.primary.active` | `#5A9468` | `--color-nb-primary-active` | `nbColors.primaryActive` |
| `color.secondary` | `#8B7355` | `--color-nb-secondary` | `nbColors.secondary` |
| `color.secondary.hover` | `#725E45` | `--color-nb-secondary-hover` | `nbColors.secondaryHover` |

> **Drift fix:** mobile's current `primaryDark: '#5A9B6F'` and web's current `--color-nb-primary-hover: #5A9468` both lose to the canonical values above. Phase 3-0 overwrites them.

### Colors — Status

| Token | Hex | Paired icon (lucide) |
|-------|-----|----------------------|
| `color.success` | `#7FBC8C` | `check-circle` |
| `color.success.light` | `#BAFCA2` | — |
| `color.success.dark` | `#15803D` | (high-contrast text) |
| `color.warning` | `#E3A018` | `alert-triangle` |
| `color.warning.light` | `#FFDB58` | — |
| `color.danger` | `#FF6B6B` | `x-circle` |
| `color.danger.light` | `#FFA07A` | — |
| `color.danger.dark` | `#991B1B` | (high-contrast text) |
| `color.info` | `#69D2E7` | `info` |
| `color.info.light` | `#A7DBD8` | — |

Every status color is paired with an icon token so color-blind users are never excluded (see [accessibility.md](accessibility.md)).

### Colors — Monitoring status (WCAG AA on `#F5F0EB`)

Used by the monitoring map and status chips. Not the same as generic success/warning — monitoring has stricter contrast requirements for a11y.

| Token | Hex | Background pair |
|-------|-----|-----------------|
| `status.active` | `#15803D` | `#DCFCE7` |
| `status.idle` | `#92400E` | `#FEF3C7` |
| `status.outside` | `#9333EA` | `#F3E8FF` |
| `status.missing` | `#B91C1C` | `#FEE2E2` |
| `status.offline` | `#4B5563` | `#F3F4F6` |

### Colors — Plant status (Phase 3)

| Token | Hex | Location polygon fill opacity |
|-------|-----|---------------------------|
| `plant.ok` | `#15803D` | 0.15 |
| `plant.due` | `#D97706` | 0.25 |
| `plant.overdue` | `#DC2626` | 0.35 |

### Colors — Pruning request status (Phase 3)

| Token | Hex | Icon |
|-------|-----|------|
| `request.submitted` | `#6B7280` | `hourglass` |
| `request.under_review` | `#2563EB` | `eye` |
| `request.approved` | `#15803D` | `check` |
| `request.rejected` | `#DC2626` | `x` |
| `request.converted` | `#7C3AED` | `arrow-right-circle` |
| `request.in_progress` | `#D97706` | `loader` |
| `request.done` | `#16A34A` | `check-circle` |
| `request.cancelled` | `#9CA3AF` | `ban` |

### Colors — Backgrounds

| Token | Hex | Usage |
|-------|-----|-------|
| `bg.canvas` | `#F5F0EB` | **Default app background.** Warm stone. Chosen for outdoor legibility. |
| `bg.surface` | `#FFFFFF` | Card fill. |
| `bg.accent.yellow` | `#FDFD96` | Section headers, callouts, hero stripes. NOT a page bg. |
| `bg.accent.mint` | `#DAF5F0` | Info banners, tool panels. |
| `bg.accent.green` | `#B5D2AD` | Secondary surfaces. |
| `bg.accent.pink` | `#FCDFFF` | Elevated cards (e.g. modals over modals). |
| `bg.overlay` | `rgba(0,0,0,0.5)` | Modal scrim. |

> **Decision lock-in (Apr 25, 2026):** `bg.canvas = #F5F0EB` is canonical on both platforms. The spec's original `#FDFD96` remains an *accent* color only. See [CHANGELOG.md](CHANGELOG.md) entry 2.0.1.

### Colors — Neutrals

| Token | Hex |
|-------|-----|
| `neutral.black` | `#1C1917` |
| `neutral.white` | `#FFFFFF` |
| `neutral.navy` | `#1A4D2E` |
| `gray.50` | `#FAFAF9` |
| `gray.100` | `#F5F5F4` |
| `gray.200` | `#E7E5E4` |
| `gray.300` | `#D6D3D1` |
| `gray.400` | `#A8A29E` |
| `gray.500` | `#78716C` |
| `gray.600` | `#57534E` |
| `gray.700` | `#44403C` |
| `gray.800` | `#292524` |
| `gray.900` | `#1C1917` |

### Colors — Sidebar (web only, but shared tokens)

| Token | Hex |
|-------|-----|
| `sidebar.bg` | `#1A4D2E` |
| `sidebar.hover` | `#2D5233` |
| `sidebar.active` | `#0F3520` |
| `sidebar.fg` | `#FFFFFF` |
| `sidebar.border` | `#2D5233` |

### Borders

| Token | Value |
|-------|-------|
| `border.color` | `#1C1917` |
| `border.width.thin` | `1px` |
| `border.width.base` | `2px` |
| `border.width.thick` | `3px` |
| `border.width.extra` | `4px` |
| `border.style` | `solid` |

### Border radii

| Token | Value |
|-------|-------|
| `radius.none` | `0` |
| `radius.sm` | `4px` |
| `radius.base` | `6px` |
| `radius.md` | `8px` |
| `radius.lg` | `12px` |
| `radius.full` | `9999px` |

### Shadows (hard-edge, always)

All shadow tokens are **pure offset, zero blur**. This is the NB stamp.

| Token | X,Y offset | Color |
|-------|-----------|-------|
| `shadow.xs` | 2,2 | `#1C1917` |
| `shadow.sm` | 4,4 | `#1C1917` |
| `shadow.md` | 6,6 | `#1C1917` |
| `shadow.lg` | 8,8 | `#1C1917` |
| `shadow.xl` | 10,10 | `#1C1917` |
| `shadow.hover` | 8,8 | `#1C1917` |
| `shadow.active` | 2,2 | `#1C1917` |
| `shadow.none` | 0,0 | transparent |

Web emits: `box-shadow: 4px 4px 0 #1C1917`
Mobile emits: `{ shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, shadowColor: '#1C1917', elevation: 4 }`

> **Drift fix:** current implementations use `rgba()` with blur radius 1–6 px (web) and `shadowRadius: 1-4` (mobile). Phase 3-0 rewrites both to `shadowRadius: 0` + opaque black. This single change restores 70 % of the NB identity.

### Spacing (8-pt baseline with a 4-pt minor step)

| Token | Value |
|-------|-------|
| `space.xs` | `4px` |
| `space.sm` | `8px` |
| `space.md` | `16px` |
| `space.lg` | `24px` |
| `space.xl` | `32px` |
| `space.2xl` | `48px` |
| `space.3xl` | `64px` |

Touch target constant: `space.touch = 48px` (mobile min), `44px` web touch contexts.

**Vertical rhythm (standard — every screen/list follows this; never hard-code px):**

| Context | Token |
|---------|-------|
| Screen content horizontal padding | `md` |
| Top gap from the (navigator) header to first content / filter bar | `md` |
| Between major sections / blocks | `md` |
| Between list rows (card-to-card) | `sm` — via the card's own `marginBottom` (e.g. `ListItemCard` consumers pass `style={{ marginBottom: sm }}`) |
| Between rows/groups inside a card | `sm` |
| Inline / tight element gaps (icon+label, chip rows) | `xs` |

Sub-token values (`1–2px`) are allowed **only** for optical nudges (chevron/label baseline alignment), never for layout spacing. List screens share `components/common/FilterBar` (white, bottom-border, `shadows.md`, `marginBottom: sm`); standalone screens add `{ marginHorizontal: md, marginTop: md }` while padded `contentWrapper` screens (Tugas/Aktivitas) get the inset+gap from the wrapper.

### Typography

**Font families:**

| Token | Stack |
|-------|-------|
| `font.display` | `'Space Grotesk', ui-sans-serif, system-ui, sans-serif` |
| `font.body` | `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif` |
| `font.mono` | `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace` |

Bundling rules:
- **Mobile:** `.ttf` files in `apps/mobile/assets/fonts/`; `npx react-native-asset` links them at build time.
- **Web:** Loaded via `next/font/google` with `display: swap`. Subsets: `latin` + `latin-ext`.

**Type scale (semantic):**

| Token | Font | Weight | Size / Line-height |
|-------|------|--------|--------------------|
| `type.display-xl` | display | 800 | 56 / 1.0  |
| `type.display`    | display | 700 | 40 / 1.05 |
| `type.h1`         | display | 700 | 28 / 1.2  |
| `type.h2`         | display | 600 | 22 / 1.3  |
| `type.h3`         | display | 600 | 18 / 1.35 |
| `type.body-lg`    | body    | 500 | 18 / 1.55 |
| `type.body`       | body    | 400 | 16 / 1.5  |
| `type.body-sm`    | body    | 400 | 14 / 1.45 |
| `type.caption`    | body    | 500 | 12 / 1.4  |
| `type.mono-sm`    | mono    | 500 | 12 / 1.4  |

> **Reconciled with `design-tokens.html` prototype (2026-04-25):** sizes tightened (h1 32→28, h2 24→22, h3 20→18); caption weight 600→500; display-xl line-height 1.05→1.0; display line-height 1.1→1.05.

Web exposes these as Tailwind utility classes: `text-nb-display-xl`, `text-nb-h1`, etc.
Mobile exposes them as `NBText` variants: `<NBText variant="h1">…</NBText>`.

### Motion

| Token | Duration | Easing |
|-------|----------|--------|
| `motion.press` | 100 ms | `ease-out` |
| `motion.hover` | 150 ms | `ease-out` |
| `motion.enter` | 200 ms | `ease-out` |
| `motion.exit` | 250 ms | `ease-in` |

No spring physics — NB aesthetic demands snappy, mechanical transitions.

---

## Layer 2 — Platform-adapted emitter rules

These are the rules the generator follows to translate Layer 1 into platform-native code.

### Shadow emitter

For each `shadow.*` token (X, Y, color):

**Web** emits a CSS custom property:
```css
--shadow-nb-{name}: {X}px {Y}px 0 {color};
```

**Mobile** emits a JS object:
```ts
{name}: {
  shadowColor: '{color}',
  shadowOffset: { width: {X}, height: {Y} },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: Math.max(X, Y),
}
```

### Press animation emitter

Every interactive component imports `pressStyle()` from the generated package. The function returns the correct syntax per platform:

**Web (Tailwind utility):**
```
hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-nb-hover
active:translate-x-0.5 active:translate-y-0.5 active:shadow-nb-active
transition-all duration-100
```

**Mobile (Animated.View wrapper):**
```ts
const press = useNBPress(); // returns { onPressIn, onPressOut, style }
<Animated.View style={[styles.base, press.style]} {...press}>
```

### Focus ring emitter

**Web:** `nbFocusRing` utility class (already exists) outputs `focus-visible:outline-3 focus-visible:outline-nb-primary focus-visible:outline-offset-2`.

**Mobile:** on focus of input components, `borderWidth` flashes to 3 for 150 ms via `Animated.timing`.

---

## Component Parity Matrix

For every shared component family, which platform owns the reference, where they diverge, and the parity target.

| Component | Mobile file | Web file | Parity target |
|-----------|-------------|----------|---------------|
| Button | `components/nb/NBButton.tsx` | `components/ui/button.tsx` | **Visual parity.** Same padding, shadow, corners, hover→active transition. |
| Card | `components/nb/NBCard.tsx` | `components/ui/card.tsx` | **Visual parity.** Same border, shadow, corner radius. |
| Badge | `components/nb/NBBadge.tsx` | `components/ui/badge.tsx` | **Visual parity.** Same uppercase text, fill, border. |
| TextInput | `components/nb/NBTextInput.tsx` | `components/ui/input.tsx` | **Visual parity for the input itself.** Labels/helpers may differ in layout. |
| Text | `components/nb/NBText.tsx` ✅ | Tailwind `text-nb-*` utilities ✅ | Same semantic names (`h1`, `body`, …). Different API. |
| Modal | `components/nb/NBModal.tsx` ✅ | `components/ui/dialog.tsx` ✅ | **Intentional divergence.** Mobile uses bottom sheet for short content, full-screen for complex; web uses centered dialog. Same border/shadow/type on the sheet chrome. |
| Toast | `components/nb/NBToast.tsx` ✅ | `components/ui/toast.tsx` | Visual parity. Position differs (mobile bottom / web top-right). |
| DataTable | — | `components/ui/data-table.tsx` | **Web only.** Mobile uses vertical cards. |
| BottomNav | `components/nav/BottomTabs.tsx` | — | **Mobile only.** |
| Sidebar | — | `components/layout/Sidebar.tsx` | **Web only.** |

---

## PWA Requirements (Web)

Web is installable as a PWA starting Phase 3 M1-R sub-phase 3-R4.

### Manifest (`apps/web/public/manifest.webmanifest`)

```json
{
  "name": "SEKAR — Sistem Evaluasi Kinerja Satgas RTH",
  "short_name": "SEKAR",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#F5F0EB",
  "theme_color": "#1A4D2E",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Monitoring", "url": "/monitoring", "icons": [{ "src": "/icons/shortcut-monitoring.png", "sizes": "96x96" }] },
    { "name": "Pruning Requests", "url": "/pruning-requests", "icons": [{ "src": "/icons/shortcut-pr.png", "sizes": "96x96" }] }
  ]
}
```

### Icons

- Hard-edged NB stamp: the SEKAR "S" glyph in Space Grotesk 800 on `#7FBC8C` with 2 px `#1C1917` border and 4 px shadow offset.
- Maskable variant has 20 % safe-zone padding (Android adaptive icons clip to various shapes).
- Apple touch icon at 180 × 180 px.

### Service worker

- Shell pre-cache: HTML, generated tokens.css, main JS bundle, icon set, Inter + Space Grotesk fonts.
- Runtime caching:
  - `/monitoring` snapshot: **stale-while-revalidate**, TTL 30 s (degraded mode shows last-good with a banner).
  - `/schedules` read: **cache-first**, TTL 5 min.
  - `/pruning-requests` detail: **network-first** (reviewers need fresh data), 2 s timeout falls back to cache.
- All POST/PUT/DELETE: **network-only** — never queue. Offline write support for web is **out of scope**.

### Install prompt

- Show SEKAR-branded install banner on the login page and on the `/monitoring` page (dismissible, `localStorage` suppresses for 14 days).
- Banner renders in the NB visual language: yellow `#FDFD96` bg, 2 px border, 4 px shadow, explicit "Install SEKAR" button that calls `prompt()` on the saved `beforeinstallprompt` event.
- iOS Safari: fallback banner linking to "How to install" page (Safari doesn't support `beforeinstallprompt`).

### Push notifications

- Same FCM project as the native app.
- Subscribed on login for `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin`.
- Notification types mirror mobile: `task_assigned`, `task_overdue`, `pruning_request_submitted`, `overtime_pending_review`, `area_plant_overdue`.
- Notification styling: hard-edge SEKAR icon + `theme_color` badge.

### Offline shell

When `navigator.onLine === false`:
- Shell still renders (cached HTML + CSS + JS).
- Monitoring shows last-good snapshot + yellow `#FDFD96` banner: *"Mode offline — menampilkan data terakhir 2 menit lalu."*
- Write actions are disabled and the button tooltip says "Butuh koneksi."
- Reconnect listener pings `/health`; on success, banner swaps to green and WS resubscribes.

---

## Responsive Breakpoints (Web)

Web is mobile-responsive — supervisors using a phone in the field must be able to use it. Three classes:

| Class | Width | Navigation | Content |
|-------|-------|-----------|---------|
| **Desktop** | ≥ 1280 px | Full sidebar (220 px) | Multi-column (map 65 / panel 35; data tables full) |
| **Tablet** | 768–1279 px | Collapsible icon-only sidebar (64 px); click ☰ expands | 1-col primary + optional drawer |
| **Mobile web** | < 768 px | Sidebar → bottom sheet menu (☰); bottom action bar on form pages | Stacked vertical cards; full-width |

Mobile web is an **escape hatch**, not the primary channel. Banner on mobile-web login for `satgas` / `linmas` / `korlap` roles:

> "Gunakan aplikasi SEKAR untuk pengalaman terbaik di lapangan. [Pasang aplikasi →]"

Link deep-links to Play Store (Android) or TestFlight/App Store (iOS).

Full layout details: [responsive-design.md](responsive-design.md).

---

## Adoption Rules

### New work (Phase 3 onward)

1. Every new component **must** import colors / spacing / shadows / type from the generated tokens package. Hard-coded hex / px values fail code review.
2. Every new shared component (not platform-divergent) **must** have a parity-matrix entry in this file.
3. Every new token goes into `tokens.json` first, then the consuming file. Direct edits to `generated/` are reverted by CI.

### Migration plan

| Group | Migrated in | Notes |
|-------|-------------|-------|
| Token pipeline + ESLint gates | Phase 3 M1-R sub-phase **3-R1** | `scripts/build-tokens.ts` generator + `tokens-verify` CI + lint rules. |
| Token value drift fixes + brand-font bundling | Phase 3 M1-R sub-phase **3-R2** | Hover/secondary/success/info corrected; type 28/22/18; opaque hard-edge shadows; Space Grotesk + Inter + JetBrains Mono loaded. |
| NB primitives (Button, Card, Badge, TextInput, Text, Modal, Toast) + new `NBModal`/`NBToast`/`NBText` | Phase 3 M1-R sub-phase **3-R3** ✅ shipped 2026-04-25 | `NBText` (10 variants, Space Grotesk/Inter/JetBrains Mono), `NBModal` (sheet + fullscreen), `NBToast` (4 levels, NB chrome). Canary: LoginScreen (NBText + NBToast), ProfileScreen (NBModal). Visual regression deferred to Phase 4 (unit-only test scope). |
| Web PWA shell + mobile-web responsive scaffolding | Phase 3 M1-R sub-phase **3-R4** | Manifest, SW, install banner, offline shell, push, `ResponsiveShell`, `(kecamatan)` layout. |
| **Full sweep** of every non-rewritten screen (login, attendance, overtime, profile, settings, users, areas, rayons, schedules, reports, audit logs, dashboard home + their mobile-web layouts) | Phase 3 M1-R sub-phase **3-R5** | **Promoted from prior Phase 4 backlog.** End-state: no screen on old tokens. |
| Monitoring screens | Phase 3 sub-phases 3-4 / 3-5 | Rewritten on new tokens as part of functional rewrite. |
| Task flows | Phase 3 sub-phase 3-7 | New typed task form ships on tokens; task detail migrated opportunistically. |
| Pruning request + capacity + seeds | Phase 3 sub-phases 3-10 / 3-11 / 3-12 | New pages, green-field on tokens. |

### Breaking change policy

A token value change is a **minor** version bump. A token rename or removal is a **major** bump, requires an ADR, and must land at a phase boundary.

---

## Open Questions (resolved during M1-R sub-phases 3-R1 / 3-R2 / 3-R4)

1. **Generator tool:** Style Dictionary vs. hand-rolled 100-line TS script? Recommendation: hand-rolled — Style Dictionary adds a dependency for what is essentially a JSON → (CSS, TS) transform.
2. **Mobile font licensing:** Confirm Space Grotesk + Inter + JetBrains Mono SIL OFL bundling is compliant with Play Store/App Store. (All three are OFL — expected clean.)
3. **Web font strategy:** `next/font/google` (self-hosted by Next at build) vs. Google Fonts CDN? Recommendation: `next/font/google` — no runtime request, CLS-safe.
4. **PWA icon source:** Need a high-res SEKAR logo mark. If not available, ship with the glyph-only fallback (the "S" in Space Grotesk 800 on `#7FBC8C`). Action: design team to deliver by start of 3-10.

---

## Related Documents

- [neo-brutalism.md](neo-brutalism.md) — design language reference
- [responsive-design.md](responsive-design.md) — breakpoint details
- [typography.md](typography.md) — type specimen
- [accessibility.md](accessibility.md) — WCAG requirements
- [icons-assets.md](icons-assets.md) — icon inventory
- [interaction-patterns.md](interaction-patterns.md) — motion + gesture patterns
- [CHANGELOG.md](CHANGELOG.md) — version history
- Phase 3: [README](../history/CHANGELOG.md) · [ui-ux](../history/CHANGELOG.md) · [mobile](../history/CHANGELOG.md) · [web](../history/CHANGELOG.md)

---

**Last Updated:** 2026-06-20
