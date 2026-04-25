# Phase 4: Web Specifications

**Date:** March 12, 2026
**Status:** Not Started
**Depends On:** Phase 2E Web (Complete)
**Related Sub-Phases:** 4-5, 4-8, 4-9

---

## Current Codebase Facts (Verified March 12, 2026)

| Fact | Value |
|------|-------|
| Pages | 21 (+1 config) using Next.js 16.1.6 App Router |
| Unit tests | 505+ passing (96%+ stmts) |
| E2E tests | 8 Playwright spec files |
| KMZ import | Backend endpoints exist (POST /import/kmz, /import/confirm), no web UI |
| Export | No functionality exists |
| Notifications | No bell icon, no notifications page |
| PWA | **Configured in Phase 3 M1-R sub-phase 3-R4** — manifest, service worker, install banner, offline shell, push subscription scaffold, mobile-web `ResponsiveShell`. Phase 4 only needs polish: SEO `<head>` tags, OpenGraph, Lighthouse audit at production scale, bundle analysis. |
| Bundle analysis | Not measured |
| SEO | Minimal — no OpenGraph, no structured data |
| Empty states | Inconsistent — some tables show "No data", others show nothing |
| Loading states | Inconsistent — some pages have skeletons, others show spinner |

---

## Component Architecture

### New Components

| Component | File | Description |
|-----------|------|-------------|
| `ExportDialog` | `fe/web/src/components/nb/ExportDialog.tsx` | Modal dialog for configuring and triggering exports (entity type, format, date range, filters) |
| `ImportWizard` | `fe/web/src/components/nb/ImportWizard.tsx` | 3-step wizard: **upload** (drag & drop) → **validate** (preview table with row-level status) → **confirm** (commit import) |
| `NotificationBell` | `fe/web/src/components/nb/NotificationBell.tsx` | Bell icon with unread count badge; click opens `NotificationPanel` popover |
| `NotificationPanel` | `fe/web/src/components/nb/NotificationPanel.tsx` | Popover showing last 5 unread notifications with "Lihat Semua" link to `/dashboard/notifications` |
| `ConnectivityBanner` | `fe/web/src/components/nb/ConnectivityBanner.tsx` | Top-of-page banner shown when API is unreachable; auto-dismisses on recovery |

### Data Fetching Pattern

- **SWR polling:** used for export job status (`GET /export/jobs/:jobId` every 3s) and unread notification count (`GET /notifications/unread-count`)
- **Server components:** used for initial page data (user lists, area lists, audit logs) to reduce client-side waterfall
- Mutation side effects (import, export, mark-read) use `swr/mutation` or direct `fetch` with `mutate()` cache invalidation

### Auth Context Updates

- `AuthContext` gains a `refreshToken()` method: calls `POST /auth/refresh`, stores new access token in memory, updates expiry
- Background refresh timer: on login, schedule a `setTimeout` to call `refreshToken()` 60 seconds before access token expiry
- On tab focus (`visibilitychange` event): check token expiry; if expired, attempt refresh before next API call

---

## Auth Interceptor

- **Next.js middleware** (`fe/web/src/middleware.ts`): checks the access token on every request to protected routes (`/dashboard/*`); redirects to `/login` if the token is absent, expired, AND a refresh attempt with the httpOnly cookie fails
- **Client-side fetch wrapper** (`fe/web/src/lib/api/fetchWithAuth.ts`): on 401 response → calls `POST /auth/refresh` → retries the original request with the new access token
- **Refresh token storage:** stored in an **httpOnly cookie** (set by the backend `Set-Cookie` response header); inaccessible to JavaScript — mitigates XSS token theft
- **Access token storage:** held **in memory only** (React context / module-level variable) — never written to `localStorage` or `sessionStorage`
- **Mutex for concurrent refresh:** a module-level `Promise` reference ensures only one refresh request is in-flight at a time; concurrent failed requests are queued and resolved after the single refresh completes

---

## A. KMZ Import Page (Sub-Phase 4-5)

### A1. Route

**File:** `fe/web/src/app/(dashboard)/import/page.tsx`

### A2. Layout

```
┌─────────────────────────────────────────┐
│ Import Data                             │
├─────────────────────────────────────────┤
│ ┌─────────┐  ┌──────────┐  ┌─────────┐ │
│ │ KMZ     │  │ CSV      │  │ Template│ │
│ │ Import  │  │ Import   │  │ Download│ │
│ └─────────┘  └──────────┘  └─────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │  Drop zone                          │ │
│ │  "Drag & drop KMZ file here"       │ │
│ │  [Browse Files]                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │  Preview Table                      │ │
│ │  Area Name │ Coordinates │ Status   │ │
│ │  ─────────────────────────────────  │ │
│ │  Taman A   │ 12 points  │ ✅ Valid  │ │
│ │  Taman B   │ 8 points   │ ⚠ Exists │ │
│ └─────────────────────────────────────┘ │
│                                         │
│               [Cancel] [Confirm Import] │
└─────────────────────────────────────────┘
```

### A3. Behavior

1. File upload → `POST /import/kmz` → returns parsed areas with validation
2. Preview table shows parsed results with status per area
3. User reviews and clicks "Confirm Import" → `POST /import/confirm`
4. Success → redirect to /dashboard/areas with success toast
5. Error → inline error messages per row

### A4. Auth

- Required roles: `admin_system`, `superadmin`
- Redirect to /dashboard if unauthorized

---

## B. Export Page (Sub-Phase 4-5)

### B1. Route

**File:** `fe/web/src/app/(dashboard)/export/page.tsx`

### B2. Layout

```
┌─────────────────────────────────────────┐
│ Export Data                              │
├─────────────────────────────────────────┤
│ Entity Type:  [▾ Users              ]   │
│ Format:       [▾ CSV                ]   │
│ Date Range:   [From] ─ [To]            │
│ Rayon:        [▾ All Rayons         ]   │
│ Area:         [▾ All Areas          ]   │
│                                         │
│               [Download Export]          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │  Export History                      │ │
│ │  Date    │ Type  │ Format │ Status  │ │
│ │  ──────────────────────────────────  │ │
│ │  12/03   │ Users │ XLSX   │ ✅ Done  │ │
│ │  11/03   │ Tasks │ CSV    │ ✅ Done  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### B3. Entity Types

| Entity | Formats | Role Restriction |
|--------|---------|-----------------|
| Users | CSV, XLSX | admin_system, superadmin |
| Areas | CSV, XLSX, KMZ | admin_system, superadmin |
| Rayons | CSV, XLSX | admin_system, superadmin |
| Tasks | CSV, XLSX | admin_system, superadmin, kepala_rayon (own rayon) |
| Activities | CSV, XLSX | admin_system, superadmin, kepala_rayon (own rayon) |
| Overtime | CSV, XLSX | admin_system, superadmin, kepala_rayon (own rayon) |
| Schedules | CSV, XLSX | admin_system, superadmin |

### B4. Behavior

1. Select entity type + format + optional filters
2. Click "Download Export" → `POST /export` with body `{ entityType, format, filters }`
3. Small dataset (<5000 rows): immediate file download (200 OK with file)
4. Large dataset (>=5000 rows): returns 202 Accepted with `{ jobId }`
   - Poll `GET /export/jobs/:jobId` every **3 seconds**
   - Show progress indicator with status text ("Processing...", "Uploading...", "Completed!")
   - Stop polling after **5 minutes** (show timeout error: "Export terlalu lama, coba lagi nanti")
   - Alternative for future: add WebSocket event `export:completed` for real-time notification
5. Export history shows recent exports (last 30 days)

> **Export history data source:** Export history is sourced from the `export_jobs` table, filtered by the current user's ID, displaying status, format, `created_at`, and download link for completed jobs.

---

## C. CSV Import Page (Sub-Phase 4-5)

### C1. Route

**File:** `fe/web/src/app/(dashboard)/import/csv/page.tsx`

### C2. Flow

1. **Template download** — Button per entity type (users, areas) downloads CSV template
2. **Upload** — Drag & drop or file browser for filled CSV
3. **Validate** — `POST /import/{type}/csv` returns validation preview
4. **Preview** — Table showing valid rows (green), invalid rows (red with error message)
5. **Commit** — `POST /import/{type}/commit` inserts valid rows
6. **Result** — Summary: "Imported 45 users, 3 skipped (duplicate phone)"

---

## D. Notifications (Sub-Phase 4-3)

### D1. Notification Bell

**File:** `fe/web/src/components/nb/NBNotificationBell.tsx`

- Bell icon in dashboard header nav bar
- Unread count badge (red circle with number, max "99+")
- Click → popover with last 5 unread notifications
- "Lihat Semua" link → /dashboard/notifications
- Mark-read on click

### D2. Notifications Page

**File:** `fe/web/src/app/(dashboard)/notifications/page.tsx`

```
┌─────────────────────────────────────────┐
│ Notifikasi                  [Mark All]  │
├─────────────────────────────────────────┤
│ Filter: [Semua] [Tugas] [Aktivitas]     │
│         [Lembur] [Sistem]               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔵 Tugas Baru Ditugaskan           │ │
│ │    Pembersihan Taman Bungkul        │ │
│ │    12/03/2026 14:30 WIB             │ │
│ ├─────────────────────────────────────┤ │
│ │    Aktivitas Disetujui              │ │
│ │    Penyiraman Area Utara            │ │
│ │    12/03/2026 10:15 WIB             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Load More]                             │
└─────────────────────────────────────────┘
```

- Infinite scroll with "Load More" button
- Click notification → navigate to related entity page
- Unread indicator (blue dot) on left side

---

## E. PWA Polish (Sub-Phase 4-8) — superseded scope

> **Note (Apr 25, 2026):** PWA infrastructure (manifest, service worker, install banner, offline shell, push subscription scaffold, `ResponsiveShell`) was **delivered in Phase 3 M1-R sub-phase 3-R4** with canonical brand colors from [tokens.json](../../ui-ux/tokens.json) (`background_color: #F5F0EB`, `theme_color: #1A4D2E`). The block below — which uses outdated colors `#FFFFFF` / `#15803D` — is **historical** and retained only to show the prior plan. **Do not implement** these specs in Phase 4. Instead, Phase 4 sub-phase 4-8 only does:
>
> - Lighthouse audit at production scale (PWA score sustained ≥ 90 under load).
> - Bundle analyzer pass; trim unused dependencies discovered post-Phase-3.
> - SEO additions: full OpenGraph metadata, structured data, sitemap.xml, robots.txt.
> - Polish offline UX based on field feedback from the Phase 3 pilot.

### E1. Web App Manifest (HISTORICAL — see Phase 3 sub-phase 3-R4 for canonical implementation)

**File:** `fe/web/src/app/manifest.ts`

```typescript
export default function manifest() {
  return {
    name: 'SEKAR - Sistem Evaluasi Kerja Satgas RTH',
    short_name: 'SEKAR',
    description: 'Worker tracking and task management for DLH Surabaya',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#15803D',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

### E2. Service Worker (HISTORICAL — see Phase 3 sub-phase 3-R4 for canonical implementation)

**File:** `fe/web/public/sw.js`

> **Implementation note:** Use a hand-written `sw.js` service worker for precise caching control rather than `next-pwa`, which adds unnecessary abstraction. The service worker handles offline page shell caching and API response caching for GET requests only.

- **CacheFirst:** Static assets only (images, fonts, icons) — NOT `_next/static/` (Next.js handles its own caching with content hashes)
- **NetworkFirst:** HTML pages (dashboard routes) — serve cached version with stale data indicator if offline
- **Network-only (excluded from SW cache):**
  - `/api/` routes — always fresh for API calls
  - Auth-related pages (`/login`, `/logout`) — always fresh
  - `_next/static/` — Next.js manages its own cache with content-hashed filenames
- Offline dashboard: serve cached version of /dashboard with stale data indicator
- Cache invalidation: on new deployment (version in sw.js)
- Scope: `/dashboard/*` only (auth pages always require network)

---

## F. SEO & Meta Tags (Sub-Phase 4-8)

### F1. Root Layout

**File:** `fe/web/src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: {
    template: '%s | SEKAR',
    default: 'SEKAR - Sistem Evaluasi Kerja Satgas RTH',
  },
  description: 'Sistem monitoring dan evaluasi kerja satgas RTH DLH Kota Surabaya',
  openGraph: {
    title: 'SEKAR',
    description: 'Worker tracking and task management for DLH Surabaya',
    url: 'https://sekar.wahyutrip.com',
    siteName: 'SEKAR',
    type: 'website',
  },
};
```

### F2. Per-Page Titles

| Route | Title |
|-------|-------|
| `/dashboard` | Dashboard |
| `/dashboard/users` | Manajemen Pengguna |
| `/dashboard/areas` | Manajemen Area |
| `/dashboard/tasks` | Manajemen Tugas |
| `/dashboard/activities` | Aktivitas |
| `/dashboard/overtime` | Lembur |
| `/dashboard/monitoring` | Monitoring Real-Time |
| `/dashboard/import` | Import Data |
| `/dashboard/export` | Export Data |
| `/dashboard/notifications` | Notifikasi |
| `/dashboard/audit-logs` | Audit Log |

---

## G. Bundle Analysis & Optimization (Sub-Phase 4-8)

### G1. Analysis Setup

**File:** `fe/web/next.config.ts`

```typescript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

Run: `ANALYZE=true npm run build`

### G2. Optimization Targets

| Chunk | Current | Target | Strategy |
|-------|---------|--------|----------|
| Mapbox GL | ~500KB | Lazy loaded | `dynamic(() => import('./MonitoringMap'), { ssr: false })` |
| Date picker | ~80KB | Lazy loaded | Dynamic import on focus |
| Chart library | ~100KB | Lazy loaded | Dynamic import on dashboard |
| Total First Load | Unmeasured | <200KB | Code splitting + tree shaking |

### G3. Image Optimization

- Replace all `<img>` with `<Image>` from `next/image`
- Configure S3 as external image domain
- Generate thumbnails for profile pictures (80x80, 160x160)
- WebP format for all uploaded images

### G4. Core Web Vitals Targets

| Metric | Target | How to Measure |
|--------|--------|---------------|
| LCP | <2.5s | Lighthouse in CI |
| CLS | <0.1 | Lighthouse in CI |
| FID | <100ms | Lighthouse in CI |
| TTFB | <200ms | Vercel Analytics |

---

## H. UI/UX Polish (Sub-Phase 4-8)

### H1. Empty States

**File:** `fe/web/src/components/nb/NBEmptyState.tsx`

```typescript
interface NBEmptyStateProps {
  variant: 'users' | 'areas' | 'tasks' | 'activities' | 'overtime' |
           'audit-logs' | 'export-history' | 'notifications' | 'search';
  action?: { label: string; onClick: () => void };
}
```

Each variant has:
- Illustration (simple SVG, NB style with thick borders)
- Title (e.g., "Belum ada tugas")
- Description (e.g., "Buat tugas baru untuk memulai")
- Optional action button

### H2. Loading Skeletons

**File:** `fe/web/src/components/nb/NBSkeleton.tsx`

Skeleton variants:
- `NBTableSkeleton` — 5 rows × N columns with pulsing animation
- `NBCardSkeleton` — Card shape with title + body placeholder
- `NBMapSkeleton` — Map area with loading indicator
- `NBChartSkeleton` — Chart area with bars placeholder

### H3. Error Boundaries

Per route segment `error.tsx`:

```typescript
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="nb-card p-8 text-center">
      <h2 className="text-xl font-bold mb-2">Terjadi Kesalahan</h2>
      <p className="mb-4">{error.message}</p>
      <button onClick={reset} className="nb-button">Coba Lagi</button>
    </div>
  );
}
```

### H4. NB Compliance Audit

All 24+ pages must pass:

| Check | Requirement |
|-------|------------|
| Border | 2px solid black on all cards and inputs |
| Shadow | 4px 4px 0px black on interactive elements |
| Focus ring | 2px solid + offset on keyboard navigation |
| Hover | Shadow shift or background change |
| Responsive | Breakpoints at 768px, 1024px, 1280px |
| Touch targets | ≥44px on mobile viewport |
| Color contrast | WCAG 2.1 AA (4.5:1 text, 3:1 UI) |

### H5. Modal & Toast Animations

```css
/* Modal entrance */
@keyframes nb-modal-enter {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Toast entrance */
@keyframes nb-toast-enter {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

## I. Page Inventory (Phase 4 Target: 24+ Pages)

| # | Route | Page | Changes in Phase 4 |
|---|-------|------|-------------------|
| 1 | `/login` | Login | No change |
| 2 | `/dashboard` | Overview Dashboard | Loading skeleton, Core Web Vitals |
| 3 | `/dashboard/users` | User Management | Empty state, pagination audit |
| 4 | `/dashboard/users/[id]` | User Detail | No change |
| 5 | `/dashboard/areas` | Area Management | Empty state |
| 6 | `/dashboard/areas/[id]` | Area Detail | No change |
| 7 | `/dashboard/rayons` | Rayon Management | SSG optimization |
| 8 | `/dashboard/rayons/[id]` | Rayon Detail | No change |
| 9 | `/dashboard/tasks` | Task Management | Empty state, pagination |
| 10 | `/dashboard/tasks/[id]` | Task Detail | No change |
| 11 | `/dashboard/activities` | Activities | Empty state, pagination |
| 12 | `/dashboard/activities/[id]` | Activity Detail | No change |
| 13 | `/dashboard/overtime` | Overtime Management | Empty state, pagination |
| 14 | `/dashboard/monitoring` | Real-Time Monitoring | Mapbox lazy load, perf |
| 15 | `/dashboard/monitoring/config` | Monitoring Config | No change |
| 16 | `/dashboard/schedules` | Schedules | No change |
| 17 | `/dashboard/shift-definitions` | Shift Definitions | No change |
| 18 | `/dashboard/activity-types` | Activity Types | No change |
| 19 | `/dashboard/special-days` | Special Days | No change |
| 20 | `/dashboard/audit-logs` | Audit Logs | Empty state |
| 21 | `/dashboard/settings` | Settings | No change |
| **22** | **`/dashboard/import`** | **Import (KMZ + CSV)** | **NEW — Sub-Phase 4-5** |
| **23** | **`/dashboard/export`** | **Export Data** | **NEW — Sub-Phase 4-5** |
| **24** | **`/dashboard/notifications`** | **Notifications** | **NEW — Sub-Phase 4-3** |

---

## J. Deep Link Support (Sub-Phase 4-8)

### J1. Android App Links

**File:** `fe/web/public/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.sekar",
    "sha256_cert_fingerprints": ["<SHA-256 fingerprint of signing key>"]
  }
}]
```

- Must be served from web domain (`sekar.wahyutrip.com`) with `Content-Type: application/json`
- Required for Android App Links (`android:autoVerify="true"` in mobile AndroidManifest.xml)

### J2. iOS Universal Links (Phase 5)

**File:** `fe/web/public/.well-known/apple-app-site-association`

- Reserved for Phase 5 iOS support
- Will contain app ID and path patterns for Universal Links

---

**Last Updated:** 2026-03-12
