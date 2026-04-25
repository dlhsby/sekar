# Phase 3: Web Requirements

**Last Updated:** 2026-04-25
**Status:** ⏳ Not Started
**Framework:** Next.js 16.1.6, React 19.2.3, TanStack Query 5, Mapbox GL JS 3, supercluster, @tanstack/react-virtual
**Design foundation:** [specs/ui-ux/design-tokens.md](../../ui-ux/design-tokens.md) — tokens consumed via generated `fe/web/src/app/generated/tokens.css`, imported by `globals.css`.
**Related ADRs:** [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md), [ADR-031](../../architecture/decisions/ADR-031-task-typing-custom-fields.md), [ADR-032](../../architecture/decisions/ADR-032-admin-data-pruning-disposition.md), [ADR-033](../../architecture/decisions/ADR-033-staff-kecamatan-role.md), [ADR-035](../../architecture/decisions/ADR-035-service-capacity-model.md), ADR-036 *(tokens)*, ADR-037 *(PWA)*
**See also:** [Backend](./backend.md), [UI/UX](./ui-ux.md), [README](./README.md)

---

## Current Codebase Facts

| Fact | Current state | Target |
|------|---------------|--------|
| Monitoring page | `fe/web/src/app/(dashboard)/monitoring/page.tsx:100-216` — full-refresh on filter change; no cluster; un-virtualized list | Incremental WS patches; supercluster; virtualized list |
| Sidebar | 8-role gating (Phase 2E) | 9-role gating (+`staff_kecamatan`, dedicated minimal shell) |
| Task create page | `(dashboard)/tasks/new/page.tsx` — single form | Dynamic form per `task_type` with species multi-select |
| Pages | 21 pages (+1 config) | 28 pages (+plants, +pruning-requests, +seeds, +rayons/[id]/capacity) |
| Design tokens | Hand-maintained in `globals.css` (:root { —color-nb-* }) | **Generated** from `specs/ui-ux/tokens.json` into `src/app/generated/tokens.css`; imported by `globals.css`. CI verifies no drift. |
| PWA | None | Installable PWA with service worker + offline shell + push notifications (M1-R sub-phase 3-R4) |
| Responsive | Desktop-only for monitoring/tasks | Every Phase 3 page responsive — mobile (<768 px), tablet (768–1279 px), desktop (≥1280 px) |

---

## New / Modified Pages

### Platform foundation (3-0)

| Path | Role gate | Responsibility |
|------|-----------|----------------|
| `/install-help` | public | iOS Safari PWA install instructions (screenshots + steps). Fallback for the missing `beforeinstallprompt`. |
| `/manifest.webmanifest` | public | PWA manifest — see [design-tokens.md §PWA](../../ui-ux/design-tokens.md). |
| `/sw.js` | public | Service worker (shell precache + SWR + network-first patterns). |

### Monitoring v2 (3-4)

| Path | Role gate | Responsibility |
|------|-----------|----------------|
| `/(dashboard)/monitoring` | `korlap`, `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin` | Rewritten with cluster + incremental WS + virtualized list + hierarchy panel |
| `/(dashboard)/monitoring/config` | `admin_system`, `superadmin` | Thresholds + debounce settings + sweep cron (existing page, add new fields) |

### Plants admin (3-8)

| Path | Role gate | Responsibility |
|------|-----------|----------------|
| `/(dashboard)/plants` | `admin_data`, `top_management`, `admin_system`, `superadmin` | Species catalog + area rollups |
| `/(dashboard)/plants/[areaId]` | same | Bulk upsert `area_plants`; notable plant list |

### Tasks (3-7)

| Path | Role gate | Responsibility |
|------|-----------|----------------|
| `/(dashboard)/tasks/new` | `korlap`, `admin_data`, `kepala_rayon`, admins | Dynamic form per `task_type`; species multi-select for pruning/planting |
| `/(dashboard)/tasks/[id]` | scoped | Lineage tree view; partial-complete history |

### Pruning requests (3-10)

| Path | Role gate | Responsibility |
|------|-----------|----------------|
| `/(dashboard)/pruning-requests` | `admin_data` (own rayon), `top_management` (read-all), `admin_system`, `superadmin` | Queue with status chips + rayon filter |
| `/(dashboard)/pruning-requests/[id]` | submitter / reviewer / admins | Detail, review actions, convert-to-task form, capacity chip |

### Service capacity (3-11)

| Path | Role gate | Responsibility |
|------|-----------|----------------|
| `/(dashboard)/rayons/[id]/capacity` | `admin_data` (own), `top_management`, `admin_system`, `superadmin` | Week-grid editor, `service_type` selector, booked bar |

### Seeds (3-12)

| Path | Role gate | Responsibility |
|------|-----------|----------------|
| `/(dashboard)/seeds` | `admin_data` (Taman Aktif), **`kepala_rayon`** (own rayon, read-only per Q2 Apr 25), `top_management`, `admin_system`, `superadmin` | Master list + low-stock alerts |
| `/(dashboard)/seeds/[id]` | same | Ledger view (kepala_rayon read-only) |
| `/(dashboard)/seeds/[id]/transactions/new` | `admin_data` (Taman Aktif), `top_management`, `admin_system`, `superadmin` — **`kepala_rayon` excluded** (read-only access only) | Record transaction |

---

---

## Design-Token Consumption (3-0)

Before any Phase 3 page is written, M1-R sub-phases 3-R1 (pipeline) + 3-R2 (values + fonts) rewire the web token layer. Details in [specs/ui-ux/design-tokens.md](../../ui-ux/design-tokens.md). Web-specific notes:

### File wiring

| File | Change |
|------|--------|
| `src/app/generated/tokens.css` | **NEW — generated.** Emitted by `scripts/build-tokens.ts` from `specs/ui-ux/tokens.json`. Contains every `--color-nb-*`, `--shadow-nb-*`, `--space-nb-*`, `--radius-nb-*`, `--type-nb-*` custom property. Committed to git. Never hand-edit. |
| `src/app/globals.css` | Rewritten to `@import './generated/tokens.css';` at the top; removes hand-maintained `:root { ... }` hex tables. Page `background: var(--color-nb-canvas);` swaps to `#F5F0EB`. |
| `tailwind.config.ts` | Theme extensions read CSS vars: `colors: { 'nb-primary': 'var(--color-nb-primary)', ... }`. No more TS-literal hex codes in the config. |
| `src/components/ui/button.tsx` | Shadow rewrites to `shadow-nb-md` utility (which expands to `box-shadow: 4px 4px 0 #1C1917`). No more `rgba()` blur. |
| `src/components/ui/card.tsx`, `badge.tsx`, `input.tsx`, `dialog.tsx` | Same treatment. |

### Lint rules installed in 3-0

```js
// eslint.config.mjs additions
rules: {
  'no-inline-hex-colors': ['error', { exclude: ['src/app/generated/**'] }],
  'no-tailwind-shadow-classes-with-blur': 'error', // forbid shadow-sm/md/lg from default Tailwind
  'prefer-nb-shadow-utility': 'error',             // require shadow-nb-* variants
}
```

### Page-level migration swept by Phase 3 touch-work

| Page | Swept by | Notes |
|------|----------|-------|
| `/(dashboard)/monitoring` | 3-4 | Full rewrite; ships on tokens. |
| `/(dashboard)/tasks/*` | 3-7 | Dynamic form + lineage view ship on tokens. |
| `/(dashboard)/plants/*`, `/pruning-requests/*`, `/rayons/[id]/capacity`, `/seeds/*` | 3-10 / 3-11 / 3-12 | Green-field pages on tokens from the start. |
| `(auth)/login`, `(dashboard)/` home, Users, Areas, Rayons (index), Overtime, Schedules, Reports, Profile, Settings, Audit Logs | **3-R5 (M1-R)** | Promoted from prior Phase 4 backlog: full sweep onto generated tokens + responsive layouts (mobile web / tablet / desktop) — see §Redesign Sweep below. |

---

## Redesign Sweep (M1-R sub-phase 3-R5)

Every web page that is **not** rewritten in 3-4 / 3-7 / 3-8 / 3-10 / 3-11 / 3-12 is swept onto the unified tokens + `ResponsiveShell` (from 3-R4) so the entire web app lives on the new visual language by the end of M1-R. **No screen left on old tokens.**

### Pages swept (with mobile-web + tablet + desktop layouts each)

| Route | Mobile web (<768 px) | Tablet (768–1279 px) | Desktop (≥1280 px) |
|-------|----------------------|----------------------|--------------------|
| `(auth)/login` | Single column, sticky CTA, install-push banner for satgas/linmas/korlap | Same, centered card | Centered card, branded sidebar |
| `(dashboard)/` (home) | Stacked cards, ☰ drawer | Icon rail, 2-col cards | Sidebar + 3-col cards |
| `(dashboard)/users` | Vertical card list, filter sheet | Compact table | Full table + right filter rail |
| `(dashboard)/areas` | Vertical card list | Map + list 50/50 | Map 65 / list 35 |
| `(dashboard)/rayons` | Vertical card list | Compact table | Full table |
| `(dashboard)/overtime` | Single col + sticky CTA | 2-col | 3-col + filter rail |
| `(dashboard)/schedules` | Vertical week list | Compact week grid | Full week grid |
| `(dashboard)/reports` | Vertical card list, filter sheet | Filterable table | Full table + chart panel |
| `(dashboard)/profile` | Single col | Single col | Centered card 720 px |
| `(dashboard)/settings` | Single col, section accordion | 2-col (nav + content) | 2-col (nav 240 px + content) |
| `(dashboard)/audit-logs` | Vertical card list, filter sheet | Compact table | Full filterable table |

### Sweep checklist (per page)

1. Wrap page in `ResponsiveShell` from 3-R4 (sidebar / icon rail / ☰ drawer at the three breakpoints).
2. Replace `#[0-9a-fA-F]{6}` and `rgba(...)` literals with `bg-nb-*` / `text-nb-*` / `shadow-nb-*` Tailwind utilities or generated CSS vars.
3. Replace any blur / soft-shadow Tailwind utilities (`shadow-sm`, `shadow-md`, etc.) with `shadow-nb-*` hard-edge variants.
4. Replace hand-set font sizes with `text-nb-h1|h2|h3|body|body-sm|caption|mono-sm` utilities.
5. Confirm focus state uses `.nb-focus-ring` utility class.
6. Verify every status uses icon + text (no color-only signalling — WCAG color-blind rule).
7. Add mobile-web layout (vertical cards, bottom-sheet filter, full-screen edit dialog) per the breakpoint table above.
8. Update Playwright `toHaveScreenshot` baselines at 375 / 768 / 1280 px.

### Acceptance criteria

- [ ] `git grep -nE '#[0-9a-fA-F]{6}' fe/web/src` returns zero hits outside `generated/` and `scripts/hex-allowlist.txt`.
- [ ] `git grep -nE 'shadow-(xs|sm|md|lg|xl)\b' fe/web/src` returns zero hits (only `shadow-nb-*` allowed).
- [ ] Every swept page renders correctly at 375 / 768 / 1280 px (visual regression CI green).
- [ ] Every swept page composes through `ResponsiveShell`.

---

## PWA Implementation (3-0)

Full spec: [design-tokens.md §PWA Requirements](../../ui-ux/design-tokens.md).

### Registration

Register the service worker from the root layout on first client render:

```ts
// src/app/layout.tsx (client component boundary)
useEffect(() => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => reg.update())
      .catch(console.error);
  }
}, []);
```

Use `next-pwa` for the build pipeline or a hand-rolled SW — decision in 3-0. Either way, the SW source lives in `src/sw/sw.ts` and is compiled to `/public/sw.js`.

### Caching strategy per route

| Pattern | Strategy | TTL | Rationale |
|---------|----------|-----|-----------|
| `/_next/static/**`, `/generated/**`, `/icons/**`, fonts | cache-first | 1 year | Immutable build assets |
| `GET /api/monitoring/snapshot` | stale-while-revalidate | 30 s | Always show last-good; banner when stale |
| `GET /api/pruning-requests/**` (detail) | network-first, 2 s timeout → cache | 5 min | Reviewers need fresh data |
| `GET /api/plant-species` | cache-first | 1 day | 131 rows rarely change |
| `GET /api/schedules/**` | cache-first | 5 min | |
| `POST`, `PUT`, `PATCH`, `DELETE` anywhere | **network-only** | — | Write queueing is out of scope; mobile owns offline writes |
| `GET /api/auth/**` | network-only | — | Never cache auth |

### New components

```
components/pwa/
├── InstallBanner.tsx     # captures beforeinstallprompt, renders NB callout, suppresses 14 days
├── OfflineBanner.tsx     # top strip when navigator.onLine === false; role="status"
├── UpdateToast.tsx       # "Versi baru tersedia — [Muat ulang]" when SW detects update
└── usePushSubscription.ts # hook: requests permission, registers FCM token via POST /api/push/register
```

### Push notifications

FCM web push for `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin`. Types mirror mobile:

| Type | Click deep-link |
|------|-----------------|
| `pruning_request_submitted` | `/pruning-requests/[id]` |
| `task_assigned` | `/tasks/[id]` |
| `task_overdue` | `/tasks/[id]` |
| `area_plant_overdue` | `/monitoring?focus_area=[id]&overlay=plants` |
| `overtime_pending_review` | `/overtime/[id]` |

Subscription lifecycle: on login success, check permission. If `default`, show in-app prompt (not the raw browser one) explaining benefits, then request. On logout, unsubscribe.

---

## Responsive Layouts

Breakpoints from [../../ui-ux/responsive-design.md](../../ui-ux/responsive-design.md): mobile `< 768`, tablet `768–1279`, desktop `≥ 1280`.

### Monitoring (`/(dashboard)/monitoring`)

| Width | Layout |
|-------|--------|
| Desktop | Sidebar (220 px) │ Map (flex 65 %) │ Side panel (flex 35 %, hierarchy + worker list + detail) |
| Tablet | Icon sidebar (64 px) │ Map 60 % │ Panel 40 % (narrower; no avatar grid — list only) |
| Mobile web | Full-viewport map + **drag-up bottom sheet** (3 snap points: 10 % / 45 % / 90 %) containing hierarchy chips, worker list, and detail drawer stacked. Sidebar becomes ☰ drawer from left. |

Bottom sheet component: `components/monitoring/MobileMonitoringSheet.tsx` — wraps [@silk-hq/components](https://silkhq.co) or `vaul` (react bottom-sheet library; decision in 3-4). Uses `pointer` events so it works with touch and mouse.

### Pruning requests queue (`/(dashboard)/pruning-requests`)

| Width | Layout |
|-------|--------|
| Desktop | Full data table with sortable columns, filter sidebar on right |
| Tablet | Table with fewer columns (drops submitter avatar, kecamatan code — shown in row hover) |
| Mobile web | Vertical card list, filter opens as bottom sheet |

### Pruning request detail (`/(dashboard)/pruning-requests/[id]`)

| Width | Layout |
|-------|--------|
| Desktop | Two-column: left = request details + timeline; right = review actions + capacity chip |
| Tablet | Same, narrower columns |
| Mobile web | Single column; review actions become sticky bottom bar |

### Capacity calendar (`/(dashboard)/rayons/[id]/capacity`)

| Width | Layout |
|-------|--------|
| Desktop | 7-column week grid, all 4–8 weeks visible horizontally |
| Tablet | 3-column week grid, horizontal scroll |
| Mobile web | Vertical list of weeks; each week is a collapsible NB card; edit opens full-screen dialog |

### Tasks (`/(dashboard)/tasks/*`)

| Width | Layout |
|-------|--------|
| Desktop | Dynamic form 2-column (fields left, preview/help right) |
| Tablet | Single column, help in accordion |
| Mobile web | Single column, sticky CTA at bottom |

### Navigation primitives

| Element | Desktop | Tablet | Mobile web |
|---------|---------|--------|-----------|
| Sidebar | Full (220 px) | Icon rail (64 px), expands on click | Hidden; ☰ opens left drawer |
| Breadcrumbs | Visible | Visible | Hidden (page title takes over) |
| Page actions ("Baru", "Export") | Top-right of content | Top-right | Floating action button bottom-right |
| Filter panels | Right rail | Right rail | Bottom sheet |
| Modals | Centered dialog | Centered dialog | Full-screen sheet from bottom |

### Role-gated mobile-web install banner

Login page checks `user.role` after authenticating; if `satgas` / `linmas` / `korlap` and the viewport is < 768 px, renders:

```
┌──────────────────────────────────────────────┐
│  ⚠  Aplikasi SEKAR dirancang untuk lapangan         │
│     [ Pasang aplikasi → ]                            │
│     [ Lanjutkan di browser saja ]                   │
└───────────────────────────────────────────────┘
```

---

## Component Structure

### Monitoring v2

```
components/monitoring/
├── MonitoringPage.tsx               # host; split layout 65% map / 35% panel
├── ClusterLayer.tsx                 # supercluster GL source + layers
├── HierarchyFilterPanel.tsx         # cascading rayon → area → worker toggles
├── PlantOverlayLayer.tsx            # notable plants + overdue counts on map
├── AreaStatusOverlay.tsx            # area fill by area_plants.status
├── WorkerListVirtual.tsx            # @tanstack/react-virtual
├── AreaDetailDrawer.tsx             # right-rail drawer on area click
└── PatchApplier.tsx                 # invisible WS patch consumer (hook wrapper)
```

### Plants

```
components/plants/
├── SpeciesCatalogTable.tsx          # CRUD on /plant-species — write enabled for admin_data (Q5 Apr 25), admin_system, superadmin
├── AreaInventoryGrid.tsx            # editable species × count for an area
├── NotablePlantMapPicker.tsx        # click-to-place with reverse geocode (CRUD: korlap+, read-only for satgas/linmas per Q4)
└── PlantStatusBadge.tsx             # ok / due / overdue chip
```

### Pruning requests

```
components/pruning-requests/
├── RequestQueueTable.tsx            # status-filtered queue
├── ReviewActionsPanel.tsx           # approve / reject / convert buttons
├── ConvertToTaskDialog.tsx          # form: area + capacity chip (booked/total for the chosen ISO-week) +
│                                    #   scheduled_date day-picker constrained to the booked week (Q3 Apr 25 —
│                                    #   weekly capacity, daily assignment) + target_plant_count + assignee
├── RequestTimeline.tsx              # status history + converted task link
└── PhotoGallery.tsx                 # before/after photos from outcome
```

### Pruning vocabulary on `/tasks/new` and `/tasks/[id]`

The dynamic pruning form on `/(dashboard)/tasks/new` (when `task_type='pruning'` is selected) uses the canonical vocab from [README §Pruning Vocabulary](./README.md#pruning-vocabulary-q1--locked-apr-25-2026):

- **Kasus** (`case_type` radio group, required): GT / PT / PS / PD / PK
- **Aksi pangkas** (`pruning_action` radio group, required): PM / PB / PC
- **Sumber** (`source` select, required): TIW / TS / CC / PW / Wk

Labels rendered from `fe/web/src/lib/pruningVocabulary.ts` (shared with mobile — co-located with the design-token generator output per ADR-036). Form validation uses the same `TaskTypeRegistry` Zod schemas the backend uses (shared via `tsconfig` path alias) so the UI can never submit a value the API will reject.

### Capacity

```
components/capacity/
├── WeekGrid.tsx                     # 7-column grid, editable capacity_units
├── ServiceTypeSelector.tsx          # pruning / watering / planting / ...
└── BookedBar.tsx                    # horizontal bar: booked / capacity
```

---

## React Query Cache Keys

| Key | Shape | Invalidation |
|-----|-------|--------------|
| `['monitoring', 'snapshot', scope, id]` | See `GET /monitoring/snapshot` response | WS patches mutate in place via `queryClient.setQueryData` |
| `['monitoring', 'staffing', rayon_id, day_type]` | Staffing summary | `area:staffing-changed` WS |
| `['plants', 'species']` | Catalog | on CRUD |
| `['plants', 'area', area_id]` | Area plants + notable | `area:plant-status-changed` WS |
| `['pruning-requests', 'queue', { rayon_id, status }]` | Paginated | `request:status-changed` WS |
| `['pruning-requests', id]` | Detail | `request:status-changed` WS |
| `['capacity', rayon_id, year, service_type]` | Week grid | `capacity:updated` (emitted on PUT / book) |
| `['seeds']` | Master | on CRUD |
| `['seeds', id, 'transactions']` | Ledger | on record |

---

## Incremental WebSocket Patches

Replaces today's full-refresh-on-filter (the single biggest production-scale win). Pattern:

```ts
// components/monitoring/PatchApplier.tsx
useEffect(() => {
  const unsub = ws.subscribe('status:v2', patch => {
    queryClient.setQueryData(
      ['monitoring', 'snapshot', scope, scopeId],
      (prev) => applyStatusPatch(prev, patch)
    );
  });
  return unsub;
}, [scope, scopeId]);
```

Patch reducers are pure functions in `lib/monitoring/patch-reducers.ts`:

```ts
export function applyStatusPatch(snap, { user_id, prev, next }) {
  const workers = snap.workers.map(w =>
    w.user_id === user_id ? { ...w, status: next } : w
  );
  return { ...snap, workers };
}
```

Cluster recomputation is debounced (100 ms) because `supercluster` rebuild is O(n log n); single-worker status changes only re-color, not re-cluster.

---

## Sidebar Role Gating (9 roles)

`components/layout/Sidebar.tsx` reads `user.role` and hides nav items:

```ts
const ROUTES_BY_ROLE = {
  satgas:           [/* none — mobile-only */],
  linmas:           [/* none — mobile-only */],
  korlap:           ['/monitoring', '/tasks', '/reports'],
  admin_data:       ['/monitoring', '/tasks', '/reports', '/plants', '/pruning-requests', '/rayons', '/seeds'],
  kepala_rayon:     ['/monitoring', '/tasks', '/reports', '/plants', '/rayons', '/seeds'], // Q2 Apr 25: read-only seeds added
  top_management:   ['/monitoring', '/reports', '/plants', '/pruning-requests', '/rayons', '/seeds'],
  admin_system:     ['*'],
  superadmin:       ['*'],
  staff_kecamatan:  ['/pruning-requests/new', '/pruning-requests/mine'], // dedicated minimal shell
};
```

`staff_kecamatan` gets a **dedicated layout** (`app/(kecamatan)/layout.tsx`) with a minimal top bar — no dashboard sidebar.

---

## Virtualization

`WorkerListVirtual` uses `@tanstack/react-virtual` with a fixed row height (56 px) and overscan of 10. Benchmark goal: render a 500-worker list at 60 fps during WS patch bursts. Patch application is batched per animation frame via `startTransition`.

---

## Testing (3-14)

| Test file | Framework | Scope |
|-----------|-----------|-------|
| `e2e/monitoring-realtime.spec.ts` | Playwright | Virtualized list updates < 200 ms after mocked WS emit; cluster count updates on filter toggle |
| `e2e/monitoring-responsive.spec.ts` | Playwright | Monitoring renders correctly at 375 / 768 / 1280 px widths; bottom sheet opens at mobile width; sidebar collapses to rail at tablet |
| `e2e/pruning-request-flow.spec.ts` | Playwright | staff_kecamatan submit → admin_data review → convert-to-task → task assignment visible |
| `e2e/pruning-task-assignment.spec.ts` | Playwright | Dynamic custom-fields form on `/tasks/new`; species search narrows 131 → N |
| `e2e/pwa-install.spec.ts` | Playwright | Install banner appears, dismiss persists 14 days; offline banner shows when offline; SW registers on production build |
| `e2e/visual-regression.spec.ts` | Playwright | Screenshots of NB primitives + monitoring + pruning-request pages at 3 breakpoints; fails on pixel diff > 0.1 % |
| `e2e/tokens-drift.spec.ts` | Node script | Runs `npm run tokens:verify`; fails build if generator output diverges from committed files |
| `lib/monitoring/patch-reducers.test.ts` | Vitest | Pure reducer correctness |
| `components/capacity/WeekGrid.test.tsx` | Vitest | Edit + save cycle; booked bar overflow |
| `components/pwa/InstallBanner.test.tsx` | Vitest | Captures `beforeinstallprompt`; localStorage suppression |
| `components/pwa/OfflineBanner.test.tsx` | Vitest | Reacts to `online` / `offline` events; SR-announces status change |

---

**Last Updated:** 2026-04-25
