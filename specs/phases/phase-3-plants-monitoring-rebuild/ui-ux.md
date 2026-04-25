# Phase 3: UI/UX Design

**Last Updated:** 2026-04-25
**Status:** ⏳ Not Started
**Design language:** Neo Brutalism 2.0 (WCAG 2.1 AA)
**Design foundation:** [specs/ui-ux/design-tokens.md](../../ui-ux/design-tokens.md) — **source of truth for every color, shadow, radius, and type token used below.**
**Related ADRs:** [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md), [ADR-031](../../architecture/decisions/ADR-031-task-typing-custom-fields.md), ADR-036 *(tokens)*, ADR-037 *(PWA)*
**See also:** [Mobile](./mobile.md), [Web](./web.md)

---

## Design Goals

1. **One visual spine, three presentations.** Mobile native app + mobile web (<768 px) + desktop web all consume the same `tokens.json` (colors, shadows, radii, type, fonts, motion). Differences between the three are intentional Layer-3 patterns (bottom nav vs. sidebar; bottom sheet vs. drawer; full-screen form vs. dialog) — never token divergence. **M1-R is the redesign-first foundation that makes this true.**
2. **Accessibility first** — every status color is paired with a Lucide icon so color-blind users are never excluded.
3. **Respect the Apr 24 fixes** — no visual pattern is allowed if it would require re-enabling `tracksViewChanges={true}` on the mobile map.
4. **Progressive disclosure** — monitoring v2 starts minimal (workers + area fill); plant/overdue overlays are opt-in via toggle sheet.
5. **Responsive web + PWA** — every Phase 3 page ships three layouts (mobile web < 768 px / tablet 768–1279 px / desktop ≥ 1280 px); web is installable with an offline shell. Mobile-web is a functional escape hatch for supervisors using a phone browser; the install banner for `satgas`/`linmas`/`korlap` redirects them to the native app.

---

## M1-R Redesign Foundation Scope (3-R1 → 3-R5)

Sub-phase 3-0 in earlier plans was a single 3-day slot mixing token plumbing, NB primitives, and the PWA shell. Phase 3 now opens with **M1-R**, a 14-day milestone broken into 5 checkpoint-sized sub-phases that ship the redesign before any feature work begins.

| Sub-Phase | Days | Scope | What changes for users |
|-----------|------|-------|------------------------|
| **3-R1** Token pipeline + CI + ESLint | 3 | `scripts/build-tokens.ts` generator; `tokens:verify` CI; ESLint `no-inline-hex-colors` / `no-tailwind-shadow-classes-with-blur` / `prefer-nb-shadow-utility`; `shadowRadius > 0` ban on RN | nothing user-visible; PR drift impossible |
| **3-R2** Token value migration + brand fonts | 3 | Both platforms consume from `generated/`; drifted values corrected (primary.hover, secondary, success, info); type scale 28/22/18; opaque hard-edge shadows; Space Grotesk + Inter + JetBrains Mono loaded | NB stamp visibly sharper; brand fonts on every screen; consistent colors across mobile native + web |
| **3-R3** NB primitives + NBModal/NBToast/NBText + visreg | 3 | All shared NB components on generated tokens; new `NBModal` (`@gorhom/bottom-sheet`-backed), `NBToast`, `NBText`; Playwright + Jest visual regression baselines | Components look identical mobile vs. web; sheets and toasts use NB chrome |
| **3-R4** Web PWA shell + responsive scaffolding | 2 | Manifest + SW + icons + InstallBanner + OfflineBanner + UpdateToast + push subscription + `/install-help` + `(kecamatan)` layout + `ResponsiveShell` | Web is installable; offline shell renders; mobile-web works; satgas mobile-web login banner directs to native app |
| **3-R5** Full redesign sweep | 3 | Every non-rewritten mobile screen + every non-rewritten web page migrates onto generated tokens with mobile-web layouts | Login / attendance / overtime / profile / users / reports / settings — all on the new visual language; no split-brain |

After M1-R, every UI PR in M2/M3/M4 must import tokens from `generated/`; CI blocks otherwise. There is no fallback path back to the old visual language.

---

## Cross-Platform Parity Matrix (native app / mobile web / desktop web)

For every key Phase 3 surface, what each presentation does. **All three share tokens, fonts, shadows, motion** — only Layer 3 patterns differ.

| Surface | Mobile native app | Mobile web (<768 px) | Desktop web (≥1280 px) |
|---------|-------------------|----------------------|------------------------|
| Primary navigation | Bottom tab bar (max 5, role-gated) | ☰ drawer from left | Left sidebar 220 px (9-role gating) |
| Monitoring map layout | Full map + sheets | Full-viewport map + drag-up bottom sheet (snap 10/45/90 %) | 220 px sidebar │ map 65 % │ panel 35 % |
| Monitoring filter UI | Bottom toggle sheet | Bottom toggle sheet | Right-rail panel |
| Pruning task form | Full-screen single-col | Full-screen single-col, sticky CTA | Dialog (convert flow) or full page (new) |
| Species autocomplete | Full-screen NBModal fuzzy match | Full-screen sheet | Combobox dropdown |
| Pruning request submission (kecamatan) | 5-step full-screen flow | 5-step full-screen flow on `(kecamatan)` layout | Same, plus breadcrumb |
| Pruning request review queue (admin_data) | Bottom-sheet detail drawer | Vertical card list + filter sheet | Sortable data table + right filter rail |
| Capacity calendar | Read-only summary in ReviewQueue | Vertical week cards (collapsible) + full-screen edit dialog | 7-column week grid editor |
| Modals | NBModal (`@gorhom/bottom-sheet` for ≤50 % / RN `<Modal>` full-screen) | Bottom sheet | Centered Radix Dialog |
| Toasts | NBToast bottom position | NBToast bottom position | Toast top-right |
| Form errors | `aria-live="polite"` + inline icon-text | Same | Same |
| Install prompt | (n/a — native) | NB callout w/ `beforeinstallprompt` + iOS fallback `/install-help` | NB callout (Chrome/Edge) + iOS fallback |

**Token consumption:** identical hex / px / line-height / weight on all three. The generator (`scripts/build-tokens.ts`) emits the same Layer-1 values to web CSS variables and mobile JS exports.

---

## NB Primitive Parity Smoke Test (3-R3 deliverable)

After 3-R3 lands, the following primitives MUST render as pixel-siblings on mobile native + desktop web (zoom-matched):

- Button (primary / secondary / ghost; default / hover / active / disabled / loading)
- Card (default / accent-yellow / accent-mint / accent-pink)
- Badge (success / warning / danger / info / neutral)
- TextInput (default / focus / error / disabled)
- Text (h1 / h2 / h3 / body / body-sm / caption / mono-sm)

Mobile-web rendering at 375 px is captured separately; the parity expectation is "same component, same chrome, narrower layout".

Reference: [specs/ui-ux/design-tokens.md §Component Parity Matrix](../../ui-ux/design-tokens.md).

---

## Token References (NOT the source of truth)

All token **values** (hex codes, pixel sizes, shadow offsets, type scale) live in [design-tokens.md](../../ui-ux/design-tokens.md). This file references them by **name only**.

If you need a value: open `specs/ui-ux/tokens.json` (or, for humans, the registry in design-tokens.md). If you need to *add* a value: add it to `tokens.json`, then reference it here.

Tokens used in Phase 3:

| Area | Tokens |
|------|--------|
| Backgrounds | `bg.canvas`, `bg.accent.yellow`, `bg.accent.mint`, `bg.accent.green` |
| Monitoring status | `status.active` / `.idle` / `.outside` / `.missing` / `.offline` |
| Plant status | `plant.ok` / `.due` / `.overdue` |
| Request status | `request.submitted` / `.under_review` / `.approved` / `.rejected` / `.converted` / `.in_progress` / `.done` / `.cancelled` |
| Shadows | `shadow.sm` (cards), `shadow.md` (buttons), `shadow.lg` (sheets), `shadow.xl` (modals) |
| Type | `type.h1` / `.h2` / `.h3` / `.body` / `.body-sm` / `.caption` |

---

## Mobile — Monitoring Toggle Sheet (3-5)

NB bottom sheet: `border.width.thick` `border.color`, `shadow.lg` offset, `bg.accent.yellow` on active toggles.

```
┌──────────────────────────────────┐
│  ═══                             │   grabber
│                                  │
│  TAMPILKAN                       │   type.caption (uppercase)
│                                  │
│  ▣ Pekerja           ●           │   NB toggle, yellow dot = on
│  ▢ Area boundaries               │
│  ▢ Tanaman (overlay)             │
│  ▢ Tanaman terlambat             │
│  ▢ Rayon boundaries              │
│                                  │
│  [ Terapkan ]                    │   NBButton primary
└──────────────────────────────────┘
```

Toggles persist in `monitoringV2.visibleLayers`. Sheet uses `useFocusEffect` for its data load.

---

## Supercluster Markers (mobile + web, 3-4 / 3-5)

| Zoom | Rendered | Size | Fill |
|------|----------|------|------|
| < 12 | Cluster bubble w/ count | 40 px mobile, 48 px web | majority `status.*` of children |
| 12–13 | Cluster bubble w/ count | 36 px mobile, 40 px web | same |
| ≥ 14 (`cluster_zoom_threshold`) | Per-user `UserMarker` (unchanged — preserves Apr 24 fixes) | 32 px | user `status.*` |

Cluster bubble: white fill, `border.width.base` `border.color`, bold count centered (`type.h3`). Border color mirrors majority status. **No animation on re-cluster** — re-rendering via a new `key` is fine and does not regress `tracksViewChanges={false}`.

---

## Area Polygon Overlay (plants, 3-4 / 3-5)

Polygon fill opacity from [design-tokens.md §Plant status](../../ui-ux/design-tokens.md):

```
ok       → fill plant.ok      @ 0.15 opacity, stroke plant.ok
due      → fill plant.due     @ 0.25 opacity, stroke plant.due
overdue  → fill plant.overdue @ 0.35 opacity, stroke plant.overdue
```

Area center marker carries an overdue-count badge (e.g. `3 overdue`) when the plant overlay toggle is on.

---

## Mobile — Pruning Task Form (3-7)

Full-screen NB form. `bg.canvas` page, `bg.surface` card, `shadow.sm` cards, `shadow.md` sticky CTA.

```
┌──────────────────────────────────┐
│  ←  Tugas Perantingan            │
│                                  │
│  Area: Jalan Darmo Sec 1 R       │
│  Rayon: Selatan                  │
│                                  │
│  Jenis pemeliharaan              │
│  ( ) PC — Preventif              │
│  (●) PM — Manajerial             │
│  ( ) PB — Bedah                  │
│                                  │
│  Target tanaman                  │
│  ┌──────────────────────┐        │
│  │ + Tambah spesies     │        │
│  └──────────────────────┘        │
│                                  │
│  • Trembesi         x 8  [—][+]  │
│  • Sono             x 2  [—][+]  │
│                                  │
│  Selesai sebagian?               │
│  [ Lanjutkan Besok ]             │   secondary button
│  [    SELESAI      ]             │   primary (bg.accent.yellow)
└──────────────────────────────────┘
```

Species autocomplete opens a full-screen sheet with fuzzy-match over `plant_species.name_id`.
Accessibility: `accessibilityLabel="Jumlah {species} (bisa dikurangi atau ditambah)"` on every quantity control.

---

## Mobile — Pruning Request Submission (3-10, kecamatan shell)

```
┌──────────────────────────────────┐
│  Laporan Perantingan             │
│                                  │
│  Kecamatan:  Wonokromo           │
│  Alamat:     [                 ] │
│  Tanggal harapan: [ 2026-05-10 ] │
│  Perkiraan jumlah: [ 5  pohon ]  │
│                                  │
│  Lokasi GPS:                     │
│  [ ●  Ambil lokasi saya       ]  │
│  ( -7.2575, 112.7521 )           │
│                                  │
│  Foto (3–5)                      │
│  [📷] [📷] [+]                   │
│                                  │
│  Catatan                         │
│  [                              ]│
│                                  │
│  [    KIRIM PERMOHONAN       ]   │
└──────────────────────────────────┘
```

Submits to `POST /pruning-requests`. Offline → queue entry `pruning_request.submit` with a `bg.accent.yellow` banner: *"Akan dikirim saat online"*.

---

## Web — Capacity Calendar (3-11)

Desktop (≥ 1280 px): seven-column week grid, full NB treatment.

```
┌──────────────────────────────────────────────────────────┐
│  Rayon Selatan — Kapasitas Perantingan (2026)            │
│                                                          │
│  Layanan: [ Perantingan ▾ ]                              │
│                                                          │
│   Minggu 18   Minggu 19   Minggu 20   Minggu 21          │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│  │ 5 / 10 │  │ 8 / 10 │  │ 0 / 12 │  │ — / —  │          │
│  │ ▓▓▓▓░░ │  │ ▓▓▓▓▓▓ │  │ ░░░░░░ │  │        │          │
│  │ [Edit] │  │ [Edit] │  │ [Edit] │  │ [+]    │          │
│  └────────┘  └────────┘  └────────┘  └────────┘          │
└──────────────────────────────────────────────────────────┘
```

Mobile web (< 768 px): same data, vertical list with collapsible week cards; edit opens a full-screen dialog (bottom-sheet-styled).
Booked/capacity bar visible at all widths; overflow (`booked > capacity`) renders in `status.missing` red.

---

## Web — Responsive Behavior (all Phase 3 pages)

Breakpoints from [responsive-design.md](../../ui-ux/responsive-design.md):

| Width | Layout | Navigation |
|-------|--------|-----------|
| ≥ 1280 px (desktop) | Full sidebar (220 px) + multi-column content | Sidebar always visible |
| 768–1279 px (tablet) | Icon-only rail (64 px) + single-column content; map 60/40 | Rail expands on hover/click |
| < 768 px (mobile web) | Content full-width; monitoring becomes map + bottom-sheet panel | ☰ opens bottom-sheet menu (same role gating as sidebar) |

Mobile-web monitoring specifically:
- Map = full viewport
- Worker list + area details open from a **drag-up bottom sheet** (mirrors the mobile app's sheet metaphor — feels native on a phone browser)
- Hierarchy filter panel collapses into a chip row at the top that opens a filter sheet when tapped

Mobile-web banner on `/login` for `satgas` / `linmas` / `korlap`:
> "Gunakan aplikasi SEKAR untuk pengalaman terbaik di lapangan. [Pasang aplikasi →]"

---

## PWA Surfaces (3-0, consumed by 3-4 / 3-10)

Full spec: [design-tokens.md §PWA Requirements](../../ui-ux/design-tokens.md). Phase-3 UI touchpoints:

### Install banner

Appears on `/login` and `/monitoring` when `beforeinstallprompt` fires and not suppressed.

```
┌──────────────────────────────────────────────────────────┐
│  📱  Pasang SEKAR di perangkat ini                       │
│      Akses cepat ke monitoring, tanpa buka browser.      │
│                                                          │
│      [ Pasang ]     [ Nanti saja ]                       │
└──────────────────────────────────────────────────────────┘
```

Styled as an NB callout: `bg.accent.yellow` fill, `border.width.base` `border.color`, `shadow.sm` offset. "Nanti saja" suppresses for 14 days in `localStorage`.

### Offline banner

Persistent top strip when `navigator.onLine === false`:

```
┌──────────────────────────────────────────────────────────┐
│  ⚠  Mode offline — data terakhir 2 menit lalu            │
└──────────────────────────────────────────────────────────┘
```

`bg.accent.yellow` fill, `border.width.thin` bottom border. Write CTAs are visually disabled (gray-200 fill, cursor `not-allowed`) with tooltip "Butuh koneksi."

### PWA splash / standalone mode

- Background: `bg.canvas` (`#F5F0EB`)
- Theme color: `sidebar.bg` (`#1A4D2E`) — sets Android status-bar tint
- Icon: SEKAR "S" in Space Grotesk 800 on `color.primary` (`#7FBC8C`) with `border.width.extra` border + `shadow.sm` offset

### Push notification (web, admins+)

Uses the same FCM types as mobile. Notification rendered by the OS, but its click-target deep-links into the PWA:

| Type | Click-target |
|------|--------------|
| `pruning_request_submitted` | `/pruning-requests/[id]` |
| `task_overdue` | `/tasks/[id]` |
| `area_plant_overdue` | `/monitoring?focus_area=[id]&overlay=plants` |

---

## Accessibility Checklist

- [ ] Every status color paired with a Lucide icon (per design-tokens.md)
- [ ] Text contrast ≥ 4.5:1 on all status badges (verified with contrast-checker against `bg.canvas` and `bg.surface`)
- [ ] Interactive elements ≥ 44 × 44 px touch target (mobile + mobile-web)
- [ ] Focus ring visible on keyboard navigation (web) — 3 px outline, 2 px offset, `color.primary`
- [ ] Form errors announced via `aria-live="polite"`
- [ ] Supercluster bubble: `accessibilityLabel="Kelompok {count} pekerja"`; expands on tap/Enter
- [ ] Plant overlay toggle announces state change
- [ ] Pruning request timeline readable by screen reader (ordered `<ol>`, not just visual)
- [ ] PWA install banner `role="dialog"` with `aria-labelledby` / `aria-describedby`
- [ ] Offline banner `role="status"` so SR announces it on state change
- [ ] Mobile-web bottom sheets trap focus when open; Esc closes

---

## Cross-Platform Parity Notes

| Element | Mobile app | Mobile web | Desktop web | Rationale |
|---------|-----------|------------|-------------|-----------|
| Monitoring layout | Full map + sheets | Full map + drag-up sheet | 65/35 split | Input model + screen real estate |
| Pruning task form | Full-screen single-col | Full-screen single-col | Dialog for convert-flow; full page for new | Reviewer mental model |
| Species picker | Full-screen fuzzy autocomplete | Full-screen fuzzy autocomplete | Combobox dropdown | Input method |
| Capacity calendar | Read-only summary (ReviewQueue) | Vertical list w/ collapsible weeks | Week grid editor | Admin desk work on desktop |
| Kecamatan submission | Full-screen form | Full-screen form on `(kecamatan)` layout | Same, plus breadcrumb | Primary channel is mobile; web is backup |

---

## Token-Migration Checklist (per sub-phase)

Every Phase 3 sub-phase that ships UI runs this checklist at review:

- [ ] No hard-coded hex values in new code (ESLint `no-magic-colors` rule)
- [ ] No hard-coded shadow values (ESLint `no-inline-shadow` rule)
- [ ] All new components import from `@sekar/tokens` (web) / `fe/mobile/src/constants/nbTokens` (mobile)
- [ ] Visual regression snapshot captured and reviewed
- [ ] `npm run tokens:verify` green in CI
- [ ] Screenshots posted in PR description (mobile + mobile-web + tablet + desktop widths for web changes; mobile only for mobile changes)

---

**Last Updated:** 2026-04-25
