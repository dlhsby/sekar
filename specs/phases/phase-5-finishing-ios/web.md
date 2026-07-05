# Phase 5: Web Specifications

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 4 Web (Complete)
**Related Sub-Phases:** 5-1, 5-2, 5-3, 5-8

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Value |
|------|-------|
| Framework | Next.js 16.x, React 19.x, TailwindCSS 4.x |
| Pages | 24+ (Phase 2E: 21 + Phase 4: import, export, notifications) |
| Design System | Neo Brutalism (NB* components), WCAG 2.1 AA |
| Charts | Recharts (installed in Phase 2D for monitoring) |
| Maps | Google Maps (monitoring dashboard) |
| Testing | Playwright 1.58+, 20+ E2E specs (Phase 4), 505+ unit tests |
| Auth | JWT with refresh token rotation (Phase 4) |
| State | Server Components (default), Client Components for interactivity |

---

## A. Reports Pages (Sub-Phase 5-1)

### A1. Reports Dashboard — `/dashboard/reports`

**Route:** `apps/web/src/app/(dashboard)/reports/page.tsx`
**Type:** Server Component with client islands

```
┌─────────────────────────────────────────────────┐
│  Laporan                              [+ Buat]  │
├─────────────────────────────────────────────────┤
│  [Harian] [Mingguan] [Bulanan] [Semua]          │
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ Laporan Operasional Harian  │ 13/03/2026    ││
│  │ Rayon Utara                 │ PDF  [Unduh]  ││
│  ├─────────────────────────────────────────────┤│
│  │ Laporan Kinerja Mingguan    │ 10/03/2026    ││
│  │ Rayon Utara                 │ PDF  [Unduh]  ││
│  ├─────────────────────────────────────────────┤│
│  │ ...                                         ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  Pagination: < 1 2 3 ... 10 >                   │
└─────────────────────────────────────────────────┘
```

**Features:**
- Filter by report type (daily, weekly, monthly, all)
- Filter by date range
- Download button generates presigned S3 URL
- "Buat Laporan" button opens report builder

### A2. Report Builder — `/dashboard/reports/builder`

**Route:** `apps/web/src/app/(dashboard)/reports/builder/page.tsx`
**Type:** Client Component (interactive form)

```
┌─────────────────────────────────────────────────┐
│  Buat Laporan                                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  Tipe Laporan:  [Pilih tipe laporan     ▼]      │
│                                                  │
│  Format:        ○ PDF  ○ CSV  ○ Excel            │
│                                                  │
│  Periode:       [01/03/2026] — [13/03/2026]     │
│                                                  │
│  Area:          [Semua area             ▼]      │
│  Rayon:         [Semua rayon            ▼]      │
│  Pekerja:       [Semua pekerja          ▼]      │
│                  (only for worker-performance)   │
│                                                  │
│  [Buat Laporan]                                  │
│                                                  │
│  ┌─ Preview ──────────────────────────────────┐ │
│  │  Report sections shown here after generate  │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### A3. Report Schedules — `/dashboard/reports/schedules`

**Route:** `apps/web/src/app/(dashboard)/reports/schedules/page.tsx`
**Roles:** `admin_system`, `superadmin` only

```
┌─────────────────────────────────────────────────┐
│  Jadwal Laporan                      [+ Buat]   │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐│
│  │ Harian - Rayon Utara  │ 06:00 WIB  │ Aktif ││
│  │ Mingguan - Semua       │ Sen 07:00  │ Aktif ││
│  │ Bulanan - Sistem       │ Tgl 1 08:00│ Aktif ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  Each row has: [Edit] [Hapus] [Toggle On/Off]   │
└─────────────────────────────────────────────────┘
```

---

## B. Analytics Pages (Sub-Phase 5-2)

### B1. Analytics Dashboard — `/dashboard/analytics`

**Route:** `apps/web/src/app/(dashboard)/analytics/page.tsx`

```
┌─────────────────────────────────────────────────┐
│  Analitik                    [30 Hari ▼]        │
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Kehadiran│ │ Tugas    │ │ Lembur   │        │
│  │  87.3%   │ │ 142/day  │ │ 156 jam  │        │
│  │  ▲ 2.1%  │ │  ▲ 5%   │ │  ▼ 3%   │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                  │
│  ┌─ Tren Kehadiran (Line Chart) ──────────────┐│
│  │  [chart: 30-day attendance trend]           ││
│  └────────────────────────────────────────────┘│
│                                                  │
│  ┌─ Penyelesaian Tugas ──┐ ┌─ Area Coverage ──┐│
│  │  [bar chart: daily]   │ │  [grouped bars]  ││
│  └───────────────────────┘ └──────────────────┘│
└─────────────────────────────────────────────────┘
```

**Chart components:**
- `<AttendanceTrendChart />` — Recharts LineChart
- `<TaskCompletionChart />` — Recharts BarChart
- `<AreaComparisonChart />` — Recharts GroupedBarChart
- `<KPICard />` — NB-styled metric card with sparkline

### B2. Worker Analytics — `/dashboard/analytics/workers`

**Route:** `apps/web/src/app/(dashboard)/analytics/workers/page.tsx`

```
┌─────────────────────────────────────────────────┐
│  Analitik Pekerja              [Filter ▼]       │
├─────────────────────────────────────────────────┤
│  ┌─ Ranking Kinerja (Horizontal Bar) ─────────┐│
│  │  satgas1  ████████████████████  92.3 (A)    ││
│  │  satgas2  ███████████████████   89.1 (B)    ││
│  │  ...                                        ││
│  └────────────────────────────────────────────┘│
│                                                  │
│  ┌─ Table ────────────────────────────────────┐│
│  │ Nama    │ Area  │ Hadir │ Tugas │ Skor    ││
│  │ Budi    │ T.B   │ 95%   │ 88%   │ 92.3 A ││
│  │ Andi    │ T.K   │ 90%   │ 85%   │ 89.1 B ││
│  └────────────────────────────────────────────┘│
│                                                  │
│  Click row -> detailed worker analytics modal   │
└─────────────────────────────────────────────────┘
```

### B3. Area Analytics — `/dashboard/analytics/areas`

**Route:** `apps/web/src/app/(dashboard)/analytics/areas/page.tsx`

```
┌─────────────────────────────────────────────────┐
│  Analitik Area                 [Rayon ▼]        │
├─────────────────────────────────────────────────┤
│  ┌─ Cards Row ────────────────────────────────┐│
│  │ [Taman Bungkul]  [Taman Apsari]  [...]    ││
│  │  Staff: 8/10     Staff: 5/5      ...       ││
│  │  Tasks: 12       Tasks: 8        ...       ││
│  │  Score: 85 (B)   Score: 91 (A)   ...       ││
│  └────────────────────────────────────────────┘│
│                                                  │
│  ┌─ Area Comparison Chart ────────────────────┐│
│  │  [grouped bar: staffing + tasks per area]  ││
│  └────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## C. Asset Management Pages (Sub-Phase 5-3)

### C1. Assets List — `/dashboard/assets`

**Route:** `apps/web/src/app/(dashboard)/assets/page.tsx`

```
┌─────────────────────────────────────────────────┐
│  Aset                  [+ Tambah] [QR Batch]    │
├─────────────────────────────────────────────────┤
│  [Semua] [Tersedia] [Digunakan] [Perawatan]    │
│  Kategori: [Semua ▼]  Area: [Semua ▼]          │
│                                                  │
│  ┌─ Table ────────────────────────────────────┐│
│  │ Kode    │ Nama    │ Kategori │ Status │ Loc ││
│  │ AK-RU-1 │ Sapu    │ Alat Keb │ ● Avail│ T.B││
│  │ AP-RU-1 │ Mesin   │ Alat Per │ ● InUse│ T.B││
│  │ KO-RU-1 │ Pickup  │ Kendara  │ ● Maint│ R.U││
│  └────────────────────────────────────────────┘│
│                                                  │
│  Pagination: < 1 2 3 >                          │
└─────────────────────────────────────────────────┘
```

### C2. Asset Detail — `/dashboard/assets/[id]`

**Route:** `apps/web/src/app/(dashboard)/assets/[id]/page.tsx`

```
┌─────────────────────────────────────────────────┐
│  ← AK-RU-001 - Sapu Lidi #1    [Edit] [Delete] │
├─────────────────────────────────────────────────┤
│  ┌─ Info ────────┐  ┌─ QR Code ──────────────┐ │
│  │ Kategori: AK  │  │  ┌────────┐            │ │
│  │ Area: T.Bungk │  │  │ QR IMG │  AK-RU-001 │ │
│  │ Status: Avail │  │  └────────┘            │ │
│  │ Kondisi: Baik │  │  [Unduh QR] [Cetak]    │ │
│  └───────────────┘  └───────────────────────-┘ │
│                                                  │
│  ┌─ Riwayat Penggunaan ──────────────────────┐ │
│  │ 12/03 │ Budi (satgas1) │ Checkout │ Baik  │ │
│  │ 10/03 │ Budi (satgas1) │ Return   │ Baik  │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ Riwayat Perawatan ──────────────────────┐  │
│  │ 01/03 │ Routine │ Completed │ Rp 50.000  │  │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### C3. Asset Form — `/dashboard/assets/new`

**Route:** `apps/web/src/app/(dashboard)/assets/new/page.tsx`

Form fields: name, category (dropdown), area (dropdown), rayon (auto-filled from area), description, purchase_date, purchase_price, photo (upload).

### C4. QR Generator — `/dashboard/assets/qr`

**Route:** `apps/web/src/app/(dashboard)/assets/qr/page.tsx`

```
┌─────────────────────────────────────────────────┐
│  Generator QR Code                               │
├─────────────────────────────────────────────────┤
│  Pilih Aset:                                     │
│  ☑ AK-RU-001  Sapu Lidi #1                     │
│  ☑ AP-RU-001  Mesin Potong                      │
│  ☐ KO-RU-001  Pickup                            │
│  [Pilih Semua]  [Hapus Pilihan]                  │
│                                                  │
│  [Generate QR (2 terpilih)]                      │
│                                                  │
│  ┌─ Preview ─────────────────────────────────┐  │
│  │  ┌──┐ AK-RU-001    ┌──┐ AP-RU-001        │  │
│  │  │QR│ Sapu Lidi     │QR│ Mesin Potong     │  │
│  │  └──┘               └──┘                  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  [Cetak Semua]  [Unduh PDF]                      │
└─────────────────────────────────────────────────┘
```

### C5. Maintenance Calendar — `/dashboard/assets/maintenance`

**Route:** `apps/web/src/app/(dashboard)/assets/maintenance/page.tsx`

Uses a calendar component (custom NB-styled, not FullCalendar — to maintain Neo Brutalism consistency):

```
┌─────────────────────────────────────────────────┐
│  Perawatan Aset          [+ Jadwalkan]          │
├─────────────────────────────────────────────────┤
│  < Maret 2026 >                                  │
│  Sen  Sel  Rab  Kam  Jum  Sab  Min              │
│  ┌───┬───┬───┬───┬───┬───┬───┐                 │
│  │   │   │   │   │ 1 │ 2 │ 3 │                 │
│  │   │   │   │   │ ● │   │   │                 │
│  ├───┼───┼───┼───┼───┼───┼───┤                 │
│  │ 4 │ 5 │ 6 │ 7 │...│...│...│                 │
│  │   │ ●●│   │   │   │   │   │                 │
│  └───┴───┴───┴───┴───┴───┴───┘                 │
│  ● = scheduled maintenance                       │
│                                                  │
│  ┌─ Upcoming ────────────────────────────────┐  │
│  │ 15/03 │ AK-RU-001 │ Routine │ Scheduled  │  │
│  │ 18/03 │ KO-RU-001 │ Inspect │ Scheduled  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌─ Overdue (Merah) ────────────────────────┐   │
│  │ 01/03 │ AP-RU-001 │ Routine │ OVERDUE    │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## D. Page Summary

| # | Page | Route | Sub-Phase | Type |
|---|------|-------|-----------|------|
| 1 | Reports Dashboard | `/dashboard/reports` | 5-1 | Server + Client |
| 2 | Report Builder | `/dashboard/reports/builder` | 5-1 | Client |
| 3 | Report Schedules | `/dashboard/reports/schedules` | 5-1 | Server + Client |
| 4 | Analytics Dashboard | `/dashboard/analytics` | 5-2 | Server + Client |
| 5 | Worker Analytics | `/dashboard/analytics/workers` | 5-2 | Server + Client |
| 6 | Area Analytics | `/dashboard/analytics/areas` | 5-2 | Server + Client |
| 7 | Assets List | `/dashboard/assets` | 5-3 | Server + Client |
| 8 | Asset Detail | `/dashboard/assets/[id]` | 5-3 | Server |
| 9 | Asset Form | `/dashboard/assets/new` | 5-3 | Client |
| 10 | QR Generator | `/dashboard/assets/qr` | 5-3 | Client |
| 11 | Maintenance Calendar | `/dashboard/assets/maintenance` | 5-3 | Server + Client |

**Total: 24 existing + 11 new = 35 pages**

---

## E. Navigation Updates

Add to dashboard sidebar:

```typescript
// New navigation items
{ label: 'Laporan', icon: FileText, href: '/dashboard/reports', roles: ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'] },
{ label: 'Analitik', icon: BarChart, href: '/dashboard/analytics', roles: ['all'] },
{ label: 'Aset', icon: Package, href: '/dashboard/assets', roles: ['all'] },
```

Sub-navigation for assets:
```typescript
{ label: 'Daftar Aset', href: '/dashboard/assets' },
{ label: 'Generator QR', href: '/dashboard/assets/qr', roles: ['korlap', 'kepala_rayon', 'admin_system', 'superadmin'] },
{ label: 'Perawatan', href: '/dashboard/assets/maintenance' },
```

---

## F. New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `NBKPICard` | `apps/web/src/components/nb/NBKPICard.tsx` | KPI metric card with sparkline and trend arrow |
| `NBCalendar` | `apps/web/src/components/nb/NBCalendar.tsx` | NB-styled month calendar for maintenance |
| `NBChart` | `apps/web/src/components/nb/NBChart.tsx` | Wrapper for Recharts with NB styling |
| `NBReportCard` | `apps/web/src/components/nb/NBReportCard.tsx` | Report item card with download button |
| `NBAssetCard` | `apps/web/src/components/nb/NBAssetCard.tsx` | Asset summary card with status badge |
| `NBQRPreview` | `apps/web/src/components/nb/NBQRPreview.tsx` | QR code image with label |

---

## G. Data Fetching Pattern

All analytics/reporting pages use Next.js Server Components for initial data:

```typescript
// Server Component pattern
export default async function AnalyticsDashboardPage() {
  const data = await fetchAnalyticsDashboard();
  return <AnalyticsDashboardClient initialData={data} />;
}
```

Client-side updates use SWR or React Query for revalidation:

```typescript
// Client island pattern
'use client';
export function AnalyticsDashboardClient({ initialData }) {
  const { data } = useSWR('/api/analytics/dashboard', fetcher, {
    fallbackData: initialData,
    refreshInterval: 300000, // 5 min
  });
  return <Dashboard data={data} />;
}
```

---

**Last Updated:** 2026-03-13
