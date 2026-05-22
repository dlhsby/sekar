# Phase 4: UI/UX Revamp — Hi-Fi-Driven Specifications

**Date:** May 22, 2026 (replaces the March 12 polish-only spec)
**Status:** ⏳ Not Started
**Depends On:** Phase 3 M1-R complete (NB primitives + generated tokens v2.0); **4-0 token re-baseline must land first**
**Related Sub-Phases:** **4-0** (token re-baseline), **4-R** (revamp sweep), **4-8** (mobile/web production hardening — non-UI)
**Authoritative source:** [`design/project/hifi-mobile.html`](../../../design/project/hifi-mobile.html), [`design/project/hifi-web.html`](../../../design/project/hifi-web.html), [`design/project/design-system.html`](../../../design/project/design-system.html), [`design/project/illustrations.html`](../../../design/project/illustrations.html)

---

## 0. What changed (vs March-12 polish-only ui-ux.md)

The March-12 doc was a 22-row NB-compliance audit table (borders, shadows, touch targets, safe area, keyboard) per screen. That audit is **subsumed** by 4-R: every screen on the audit list will be rebuilt against its hi-fi mockup, and the hi-fi enforces all NB primitives by construction (every screen is rendered with `hifi-shared.css` primitives, so re-implementing to hi-fi automatically passes NB compliance). The accessibility floor (a11y / keyboard / focus-trap / sort-indicator) lives in §3 below — it's a checklist that gates every screen acceptance.

---

## 1. Design System v2.1 — token diff vs v2.0

Reference: [`design/project/hifi-shared.css`](../../../design/project/hifi-shared.css) lines 7-82 (token block).

### 1.1 Color palette diff

| Token | v2.0 (current generated) | v2.1 (Claude Design bundle) | Impact |
|-------|--------------------------|------------------------------|--------|
| `--primary` | `#FDFD96` (brand yellow) | `#7FBC8C` (sage green) | **High — repaints every primary CTA / active state** |
| `--primary-deep` | n/a | `#5A9468` | New active-state token |
| `--primary-hover` | n/a | `#6BA87A` | New hover-state token |
| `--primary-soft` | n/a | `#DAF5F0` | Mint surface tinted to primary |
| `--paper` (canvas) | `#FFFFF8` | `#F5F0EB` (warm stone) | **Medium — every app background** |
| `--brand-sun` / `--accent-yellow` | (was primary) | `#FDFD96` (now accent only) | Yellow demoted — kept for pinwheel center + tab-active highlight + masthead tint |
| `--navy` | n/a | `#1A4D2E` | Deep "edge" surface for headlines + select buttons |
| `--secondary` | n/a | `#8B7355` (warm brown) | New |
| `--success` / `--success-bg` / `--success-fg` | inconsistent | `#7FBC8C` / `#DCFCE7` / `#15803D` | Codified triplet |
| `--warning` / `-bg` / `-fg` | inconsistent | `#E3A018` / `#FEF3C7` / `#D97706` | Codified triplet |
| `--danger` / `-bg` / `-fg` | inconsistent | `#FF6B6B` / `#FEE2E2` / `#991B1B` | Codified triplet |
| `--info` / `-bg` / `-fg` | inconsistent | `#69D2E7` / `#DBEAFE` / `#1E40AF` | Codified triplet |

### 1.2 Monitoring 5-status palette (new)

Per `hifi-shared.css` lines 43-48 — codifies the existing mobile 5-status enum into reusable tokens:

| Status | Foreground | Background |
|--------|-----------|------------|
| `--status-active` (di area, hadir) | `#15803D` | `#DCFCE7` |
| `--status-idle` (belum jalan, telat) | `#D97706` | `#FEF3C7` |
| `--status-outside` (luar area) | `#9333EA` | `#F3E8FF` |
| `--status-missing` (tidak hadir) | `#DC2626` | `#FEE2E2` |
| `--status-offline` | `#6B7280` | `#F3F4F6` |

Every monitoring map pin, status pill, badge, KPI card uses these tokens — eliminates the current drift between `BoundaryOverlay`, `AreaStatusOverlay`, and `MonitoringStatusSheet` ad-hoc colours.

### 1.3 Role accents (new — 9 roles)

Per `hifi-shared.css` lines 51-59:

| Role | Accent |
|------|--------|
| satgas | `#7FBC8C` |
| linmas | `#2563EB` |
| korlap | `#E3A018` |
| admin_data | `#9333EA` |
| kepala_rayon | `#F48572` |
| top_management | `#1A4D2E` |
| admin_system | `#57534E` |
| superadmin | `#1C1917` |
| staff_kecamatan | `#FDFD96` |

Drives `.av.role`, role pill, role icon background, role-specific home backgrounds.

### 1.4 Typography (locked, no change from Phase 3)

`--ff-display: "Space Grotesk"` · `--ff-body: "Inter"` · `--ff-mono: "JetBrains Mono"` — Phase 3 M1-R 3-R2 already bundled these on both platforms.

### 1.5 Shadows — hard-edge offset (codified scale)

```
--sh-xs: 2px 2px 0 var(--black);
--sh-sm: 3px 3px 0 var(--black);
--sh-md: 4px 4px 0 var(--black);
--sh-lg: 6px 6px 0 var(--black);
--sh-xl: 10px 10px 0 var(--black);
```

**Zero blur on every level.** Existing tokens.json has soft-blur shadows in some places — 4-0 token re-baseline drops blur to `0` everywhere.

### 1.6 Radius

`--r-sm: 4px` · `--r-base: 10px` · `--r-md: 14px` · `--r-lg: 20px` · `--r-full: 999px` — codified scale; existing `--radius-*` tokens map 1:1.

### 1.7 Border width

`--bw: 2px` · `--bw-thick: 2.5px` — codified.

### 1.8 Spacing scale (unchanged)

4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 px (1/2/3/4/5/6/8/10) — already canonical in tokens.json.

---

## 2. UI/UX Revamp — hi-fi screen matrix

### 2.1 Mobile (39 screens across 12 sections)

Source: [`design/project/hifi-mobile.html`](../../../design/project/hifi-mobile.html). Detailed mapping to current code lives in [`mobile.md § UI/UX Revamp`](./mobile.md#ui-ux-revamp). Counts:

| Section | Screens | NEW | Revamp | Token-only pass |
|---------|---------|-----|--------|----------------|
| Pre-login carousel (WL-1…WL-5) | 5 | **5 NEW** | — | — |
| Login & auth (AS-1…AS-5) | 5 | **2 NEW** (AS-4, AS-5) | 3 (AS-1, AS-2, AS-3) | — |
| Onboarding & permissions (OB-1…OB-3) | 3 | **3 NEW** | — | — |
| Home (HOME-1…HOME-3, role-aware) | 3 | — | 3 | — |
| Absensi (ABS-1…ABS-3) | 3 | — | 3 | — |
| Monitoring (MON-1…MON-3) | 3 | — | 3 | — |
| Tugas (TUG-1…TUG-3) | 3 | — | 3 | — |
| Aktivitas (AKT-1…AKT-2) | 2 | — | 2 | — |
| Lembur (LBR-1…LBR-3) | 3 | — | 3 | — |
| Perantingan (PRT-1…PRT-4) | 4 | — | 3 | 1 |
| Profile & settings (PRF-1…PRF-3) | 3 | — | 2 | 1 |
| Notifikasi (NOTIF-1) | 1 | **1 NEW** | — | — |
| **Total** | **38** | **11 NEW** | **22 revamp** | **2 token-only** |

*(The bundle says "39 screens" — the 39th is the AS-5 success-state variant counted alongside its parent.)*

### 2.2 Web (11 frames across 13 routes)

Source: [`design/project/hifi-web.html`](../../../design/project/hifi-web.html). Detailed mapping in [`web.md § UI/UX Revamp`](./web.md#ui-ux-revamp).

| Hi-Fi frame | Existing route | Action |
|-------------|----------------|--------|
| LOG-1 Login page | `(auth)/login/page.tsx` | Revamp |
| DASH-1 Dashboard home · Superadmin | `(dashboard)/page.tsx` | Revamp |
| MON-1 Monitoring wall · Live map + drawer | `(dashboard)/monitoring/page.tsx` | Revamp |
| USR-1 Daftar pengguna | `(dashboard)/users/page.tsx` | Revamp |
| RAY-1 Rayon · detail (Pusat) | `(dashboard)/rayons/[id]/page.tsx` | Revamp |
| TSK-1 Tugas list · kanban + table | `(dashboard)/tasks/page.tsx` | Revamp |
| SCH-1 Jadwal · weekly grid | `(dashboard)/schedules/page.tsx` | Revamp |
| LBR-1 Lembur · approval queue | `(dashboard)/overtime/page.tsx` | Revamp |
| PRT-1 Detail permohonan | `(dashboard)/pruning-requests/[id]/page.tsx` | Revamp |
| SET-1 Pengaturan · sistem | `(dashboard)/settings/page.tsx` | Revamp |
| KEC-1 Ajukan perantingan · Kecamatan | `(kecamatan)/pruning-submit/page.tsx` | Revamp |

**New web pages (not in hi-fi but implied by mobile parity / FCM scope):**

| Route | Source | Action |
|-------|--------|--------|
| `(auth)/forgot-password/page.tsx` | mirrors mobile AS-4 | **NEW** — informational, no API |
| `(dashboard)/notifications/page.tsx` | mirrors mobile NOTIF-1 | **NEW** — full inbox |
| `(dashboard)/import/page.tsx` | 4-5 scope | **NEW** — KMZ + CSV |
| `(dashboard)/export/page.tsx` | 4-5 scope | **NEW** — multi-format export |

### 2.3 Sidebar redesign (web)

Per `hifi-shared.css` lines 423-451 + `hifi-web.html` web sidebar component. Visual changes:

- Brand mark: pinwheel SVG `30px × 30px` in green-bordered card top-left (was: text-only "SEKAR" logotype)
- Item state: `.active` = primary green background + 2 px black border + 1.5 px black offset shadow
- Section dividers: uppercase JetBrains Mono labels (e.g., "MONITORING", "PENGATURAN")
- Per-item count badges: monospace pill on the right of each item (e.g., active-tasks count)
- Bottom-pinned "me" card with avatar + role pill (replaces current floating user menu)

---

## 3. <a id="brand-illustrations"></a>Brand & Illustrations (4-0 B-tasks + 4-R asset integration)

**Source bundle:** [`design/project/illustrations.html`](../../../design/project/illustrations.html) — pinwheel mark, app icon, splash, 6 empty states, onboarding scenes, brand iconography (29 SVG icons), map markers, 5 brand patterns.

### 3.1 Logo — pinwheel (8 petals = 8 rayons, yellow DLH Surabaya center)

Per [ADR-040](../../architecture/decisions/ADR-040-design-system-v2.1.md). 8 tear-shaped petals rotated 45° apart, all pointing the same kinetic direction, radiating from a yellow circle.

| Asset | Output | Source |
|-------|--------|--------|
| Mobile primary mark | `fe/mobile/src/assets/brand/sekar-mark.svg` (24/36/48/72/96 px) | `illustrations.html` `#sekar-mark` |
| Web primary mark | `fe/web/public/brand/sekar-mark.svg` + ico/png raster | `illustrations.html` `#sekar-mark` |
| Monochrome variant | `*-mono.svg` | `illustrations.html` `#sekar-mark-mono` |
| Wordmark + mark lockup | `*-lockup.svg` (horizontal + stacked) | hi-fi headers |

Used everywhere `.sekar-mark` class appears in `hifi-shared.css` (line 512: `width: 22px; height: 22px;`).

### 3.2 App icon

Replace both platforms:

- **iOS:** `fe/mobile/ios/sekar/Images.xcassets/AppIcon.appiconset/` — 1024 px master + standard size set, pinwheel centered on warm-stone background with 2 px black border + 10 px offset shadow (rounded-square shape).
- **Android:** `fe/mobile/android/app/src/main/res/mipmap-*/ic_launcher*` (legacy raster) + adaptive icon (`ic_launcher_foreground.xml` = pinwheel SVG; `ic_launcher_background.xml` = warm-stone color).

### 3.3 Splash screen (3 variants)

Per `illustrations.html § Splash screen`:

- **Light** — warm-stone background, pinwheel hero, 2 px black border container, "SEKAR" wordmark in Space Grotesk 800.
- **Dark** — navy `#1A4D2E` background, pinwheel hero (white-stroked variant), wordmark in paper white.
- **Green** — sage primary background, pinwheel (yellow center prominent).

Mobile: iOS `LaunchScreen.storyboard` + Android `res/drawable/splash_*.xml` + `AndroidManifest.xml` themes (uses `react-native-bootsplash` config).

### 3.4 Empty-state illustrations (6 SVGs)

| ID | File | Used by |
|----|------|---------|
| illo-reports | `empty/illo-reports.svg` | "Belum ada laporan" — `ActivitiesScreen`, web `/activities` empty |
| illo-shifts | `empty/illo-shifts.svg` | "Belum ada shift hari ini" — `HomeScreen`, web `/schedules` empty |
| illo-offline | `empty/illo-offline.svg` | "Tidak ada koneksi" — offline page + connectivity banner |
| illo-location | `empty/illo-location.svg` | "GPS tidak tersedia" — clock-in screens |
| illo-search | `empty/illo-search.svg` | "Pencarian tidak ditemukan" — every list with search |
| illo-personnel | `empty/illo-personnel.svg` | "Belum ada satgas di area ini" — monitoring drawer |

Wire via existing `NBEmptyState` component (mobile + web) — accept `illustration` prop, default to `illo-search`.

### 3.5 Onboarding scenes (3 SVGs)

| ID | File | Screen |
|----|------|--------|
| onb-clockin | `assets/onboarding/onb-clockin.svg` | OB-1 Welcome |
| onb-photo | `assets/onboarding/onb-photo.svg` | OB-2 Permissions (camera context) |
| onb-monitor | `assets/onboarding/onb-monitor.svg` | OB-3 Area preview |

### 3.6 Brand iconography (29 icons in `illustrations.html`)

| Icons | Strategy |
|-------|----------|
| pin, clock, camera, check, tree, leaf, bell, shield, clipboard, user, users, map, warn, power, sync, trash, search, message, settings (and 10 more) | Use Lucide React (already a dep) where 1:1 match exists. Ship custom SVGs from `illustrations.html` only for icons Lucide doesn't have OR where the brand override is intentional (e.g., the `i-tree` mark used in perantingan + plant species). |

Custom SVGs land in `fe/mobile/src/assets/icons/` + `fe/web/public/icons/`; wire via a thin `BrandIcon` wrapper that falls through to Lucide for unknown names.

### 3.7 Map marker matrix

Per `illustrations.html § Map markers` — 3 roles (satgas / korlap / linmas) × 5 statuses (active / idle / outside / missing / offline) = 15 marker variants. Codify in `fe/mobile/src/components/monitoring/Marker.tsx` using `--status-*` tokens (see §1.2). Eliminates current ad-hoc colour drift.

### 3.8 Brand patterns (5 SVG patterns)

Subtle dot / dash / weave background patterns. Use as background fills on empty-state cards (optional polish).

---

## 4. Per-screen acceptance gate

Every revamp screen lands ✅ in [`status_reviews.md § Revamp Acceptance Checklist`](./status_reviews.md#revamp-acceptance-checklist) only when **all** of:

1. **Visual fidelity** — side-by-side diff with `design/project/hifi-mobile.html` (or `hifi-web.html`) shows pixel-aligned border / shadow / spacing / colour. Use the hi-fi rendered preview as reference.
2. **NB compliance** — borders 2 px (or 2.5 px for masthead-level), shadows match scale (`--sh-xs/sm/md/lg/xl`), radii match scale, all hard-edge.
3. **A11y floor:**
   - Hit targets ≥ 44 × 44 px (mobile) / ≥ 24 × 24 px (web with mouse), per WCAG 2.1 AA
   - Color contrast ≥ 4.5:1 on every body-text / pill / button
   - Focus-trap on every NBModal + bottom-sheet
   - Focus order matches visual order
   - Keyboard navigable (web) — `Tab` + `Enter` + `Esc` work
   - `aria-live` regions on dynamic status updates (monitoring, sync, FCM toast)
   - Sort indicators on every sortable table column
4. **Indonesian copy** — final-pass copy from hi-fi text content (every screen has locked copy). No English fall-back in user-facing strings.
5. **Token compliance** — `eslint-plugin-sekar-design` clean (no literal hex / borderWidth / shadowOffset values).
6. **No regression in tests** — affected `__tests__/` suite still green; snapshot updates explained in PR.

---

## 5. Animation & motion

Per chat transcripts (Phase 4 backlog from design discussion):

| Trigger | Duration | Easing |
|---------|----------|--------|
| Button press | 100 ms | ease-out |
| Modal / bottom-sheet appear | 220 ms | ease-out |
| Toast slide-in | 180 ms | ease-out |
| List stagger (≤ 5 items animate, rest land instant) | 60 ms per item, total ≤ 300 ms | ease-out |
| Screen transition (RN Stack) | 250 ms | default slide-from-right |
| Map pin breathing (active status) | 1.6 s loop | ease-in-out |
| FAB expand (monitoring tools) | 200 ms | ease-out |

Implement via Reanimated (mobile) + CSS transitions (web). No animation for users with `prefers-reduced-motion: reduce`.

---

## 6. Mobile-web responsive (Phase 3 deliverable — verify only)

Phase 3 M1-R 3-R4 + 3-R5 shipped the responsive shell at breakpoints 375 / 768 / 1280 px. Phase 4 verifies:

- Web at < 768 px shows install banner pointing satgas/linmas/korlap to the native app.
- Admin / korlap / kecamatan can complete their full workflow at any breakpoint.
- Tables collapse to card-list at < 768 px (already implemented in 3-R5).
- Sidebar collapses to icon-rail at 768-1024 px, hidden behind hamburger at < 768 px.

---

## 7. Dark mode (deferred to Phase 5)

Tokens are dark-mode-ready (paired -fg/-bg, neutral scale spans light + dark). Phase 4 does **not** implement dark-mode visual validation; it ships the tokens so Phase 5 can flip the switch cheaply.

---

## 8. Cross-references

- **Token re-baseline tasks:** [`README.md § 4-0`](./README.md#4-0--design-bundle-adoption--token-re-baseline-3-4-days)
- **Mobile per-screen matrix:** [`mobile.md § UI/UX Revamp`](./mobile.md#ui-ux-revamp)
- **Web per-screen matrix:** [`web.md § UI/UX Revamp`](./web.md#ui-ux-revamp)
- **Per-screen acceptance checklist:** [`status_reviews.md § Revamp Acceptance Checklist`](./status_reviews.md#revamp-acceptance-checklist)
- **Design tokens canonical doc:** [`specs/ui-ux/design-tokens.md`](../../ui-ux/design-tokens.md)
- **Design bundle entry point:** [`design/project/index.html`](../../../design/project/index.html)

---

**Last Updated:** 2026-05-22
