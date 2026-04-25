# Phase 5: Mobile Specifications

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 4 Mobile (Complete)
**Related Sub-Phases:** 5-1, 5-2, 5-3, 5-4, 5-8

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Value |
|------|-------|
| Framework | React Native 0.83.x, React 19.x, Redux Toolkit |
| Screens | 22 (Phase 2E: 21 + Phase 4: NotificationsScreen) |
| Tests | >4,000 tests (>80% coverage) |
| Navigation | React Navigation 7.x, 8-role unified navigation |
| Design System | Neo Brutalism (NB* components), WCAG 2.1 AA |
| Offline | SyncManager with 7+ queue types, ConnectivityBanner |
| FCM | Active (8 trigger points, foreground handling) |
| Location | GPS tracking, boundary checking via BoundaryCheckService |
| Auth | JWT with refresh token rotation, Axios interceptor |

---

## A. Report Screens (Sub-Phase 5-1)

### A1. ReportsScreen

**File:** `fe/mobile/src/screens/reports/ReportsScreen.tsx`
**Navigation:** Bottom tab → "Laporan" (for korlap+)

```
┌─────────────────────────────┐
│ Laporan                     │
├─────────────────────────────┤
│ [Harian] [Mingguan] [Bulanan]
│                              │
│ ┌──────────────────────────┐│
│ │ 📄 Laporan Harian        ││
│ │    Rayon Utara            ││
│ │    13/03/2026  PDF        ││
│ │    [Unduh]                ││
│ ├──────────────────────────┤│
│ │ 📄 Laporan Mingguan      ││
│ │    Minggu 11              ││
│ │    10/03/2026  PDF        ││
│ │    [Unduh]                ││
│ └──────────────────────────┘│
│                              │
│ [+ Buat Laporan]             │
└─────────────────────────────┘
```

**Features:**
- FlatList with pull-to-refresh
- Filter tabs: daily/weekly/monthly
- Download triggers file viewer or share sheet
- "Buat Laporan" navigates to report builder

### A2. ReportDetailScreen

**File:** `fe/mobile/src/screens/reports/ReportDetailScreen.tsx`

Shows report metadata + embedded PDF viewer (react-native-pdf) or chart summary for quick view.

---

## B. Analytics Screens (Sub-Phase 5-2)

### B1. WorkerAnalyticsScreen

**File:** `fe/mobile/src/screens/analytics/WorkerAnalyticsScreen.tsx`
**Audience:** All workers (own data), korlap (team data)

```
┌─────────────────────────────┐
│ Kinerja Saya          [30h] │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │     Skor Kinerja        │ │
│ │        87.3              │ │
│ │       Grade B            │ │
│ └─────────────────────────┘ │
│                              │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │
│ │95%│ │90%│ │88%│ │97%│   │
│ │Had│ │Tpw│ │Tgs│ │Lok│   │
│ └───┘ └───┘ └───┘ └───┘   │
│                              │
│ ┌─ Tren Kehadiran ─────────┐│
│ │ [7-day bar chart]        ││
│ └──────────────────────────┘│
│                              │
│ ┌─ Tugas Bulan Ini ────────┐│
│ │ Selesai: 23 / 28 (82%)   ││
│ │ [progress bar]            ││
│ └──────────────────────────┘│
└─────────────────────────────┘
```

### B2. TeamAnalyticsScreen

**File:** `fe/mobile/src/screens/analytics/TeamAnalyticsScreen.tsx`
**Audience:** `korlap`, `kepala_rayon`, admin roles

```
┌─────────────────────────────┐
│ Analitik Tim        [Area ▼]│
├─────────────────────────────┤
│ ┌─ Summary Cards ──────────┐│
│ │ Hadir: 8/10  Tasks: 12   ││
│ │ Skor Rata: 85.2 (B)      ││
│ └──────────────────────────┘│
│                              │
│ ┌─ Top Performers ─────────┐│
│ │ 1. Budi    92.3 (A)      ││
│ │ 2. Andi    89.1 (B)      ││
│ │ 3. Siti    87.5 (B)      ││
│ └──────────────────────────┘│
│                              │
│ ┌─ Needs Attention ────────┐│
│ │ 1. Joko    52.1 (D)      ││
│ │ 2. Rini    58.3 (D)      ││
│ └──────────────────────────┘│
└─────────────────────────────┘
```

---

## C. Asset Management Screens (Sub-Phase 5-3)

### C1. AssetListScreen

**File:** `fe/mobile/src/screens/assets/AssetListScreen.tsx`

```
┌─────────────────────────────┐
│ Aset               [🔍] [📷]│
├─────────────────────────────┤
│ [Semua] [Tersedia] [Saya]   │
│                              │
│ ┌──────────────────────────┐│
│ │ 🧹 Sapu Lidi #1          ││
│ │ AK-RU-001 │ ● Tersedia   ││
│ │ Taman Bungkul             ││
│ ├──────────────────────────┤│
│ │ ✂️ Mesin Potong           ││
│ │ AP-RU-001 │ ● Digunakan  ││
│ │ Taman Bungkul             ││
│ └──────────────────────────┘│
└─────────────────────────────┘
```

**Features:**
- Camera icon opens QR scanner
- Search by name or code
- Filter: status, category
- "Saya" tab shows checked-out assets

### C2. AssetDetailScreen

**File:** `fe/mobile/src/screens/assets/AssetDetailScreen.tsx`

Shows asset info, QR code, assignment history, maintenance history.
Buttons: [Pinjam] (if available), [Kembalikan] (if assigned to user).

### C3. QRScannerScreen

**File:** `fe/mobile/src/screens/assets/QRScannerScreen.tsx`

```
┌─────────────────────────────┐
│ Scan QR Code        [Torch] │
├─────────────────────────────┤
│                              │
│     ┌─────────────────┐     │
│     │                 │     │
│     │   [Camera View] │     │
│     │                 │     │
│     │    ┌───────┐    │     │
│     │    │Scanner│    │     │
│     │    │ Frame │    │     │
│     │    └───────┘    │     │
│     │                 │     │
│     └─────────────────┘     │
│                              │
│  [Ketik Kode Manual]         │
│                              │
│  Arahkan kamera ke QR code   │
│  aset untuk memindai          │
└─────────────────────────────┘
```

**Implementation:** `react-native-vision-camera` with QR code detection.
**Fallback:** Manual code entry field for damaged/unreadable QR codes.

### C4. AssetCheckoutScreen

**File:** `fe/mobile/src/screens/assets/AssetCheckoutScreen.tsx`

Confirmation screen after QR scan:
- Asset details displayed
- Condition selector (good/fair/poor/damaged)
- Optional notes
- Expected return date (optional)
- [Konfirmasi Pinjam] button

---

## D. Redux Store Updates

### D1. New Slices

```typescript
// fe/mobile/src/store/slices/reportsSlice.ts
interface ReportsState {
  reports: GeneratedReport[];
  templates: ReportTemplate[];
  loading: boolean;
  error: string | null;
}

// fe/mobile/src/store/slices/analyticsSlice.ts
interface AnalyticsState {
  workerAnalytics: WorkerAnalyticsDto | null;
  teamAnalytics: WorkerAnalyticsDto[];
  dashboardSummary: DashboardSummaryDto | null;
  loading: boolean;
  error: string | null;
}

// fe/mobile/src/store/slices/assetsSlice.ts
interface AssetsState {
  assets: Asset[];
  myAssets: Asset[];
  categories: AssetCategory[];
  selectedAsset: Asset | null;
  loading: boolean;
  error: string | null;
}
```

---

## E. Navigation Updates

### E1. New Screen Routes

Add to navigation config:

```typescript
// Reports stack
'ReportsScreen': undefined;
'ReportDetailScreen': { reportId: string };

// Analytics stack
'WorkerAnalyticsScreen': { workerId?: string };
'TeamAnalyticsScreen': { areaId?: string };

// Assets stack
'AssetListScreen': undefined;
'AssetDetailScreen': { assetId: string };
'QRScannerScreen': undefined;
'AssetCheckoutScreen': { assetId: string };
```

### E2. Tab Bar Updates

| Role | New Tabs |
|------|----------|
| `satgas`, `linmas` | +Aset (bottom tab) |
| `korlap` | +Laporan, +Analitik, +Aset (bottom tab overflow → "Lainnya") |
| `kepala_rayon` | +Laporan, +Analitik, +Aset |
| `admin_system`, `superadmin` | +Laporan, +Analitik, +Aset |

> **Tab limit:** React Navigation bottom tabs support 5 visible tabs. Roles with >5 tabs use "Lainnya" (More) tab with list navigation.

---

## F. Screen Summary

| # | Screen | Route | Sub-Phase | Audience |
|---|--------|-------|-----------|----------|
| 1 | ReportsScreen | reports/ReportsScreen | 5-1 | korlap+ |
| 2 | ReportDetailScreen | reports/ReportDetailScreen | 5-1 | korlap+ |
| 3 | WorkerAnalyticsScreen | analytics/WorkerAnalyticsScreen | 5-2 | All workers |
| 4 | TeamAnalyticsScreen | analytics/TeamAnalyticsScreen | 5-2 | korlap+ |
| 5 | AssetListScreen | assets/AssetListScreen | 5-3 | All |
| 6 | AssetDetailScreen | assets/AssetDetailScreen | 5-3 | All |
| 7 | QRScannerScreen | assets/QRScannerScreen | 5-3 | satgas, linmas, korlap |
| 8 | AssetCheckoutScreen | assets/AssetCheckoutScreen | 5-3 | satgas, linmas, korlap |

**Total: 22 existing + 8 new = 30 screens**

---

## G. iOS-Specific Features (Sub-Phase 5-4)

See [ios.md](./ios.md) for detailed iOS specifications. Key mobile code changes:

| Feature | Files |
|---------|-------|
| Apple Sign-In button | `fe/mobile/src/screens/auth/LoginScreen.tsx` (conditional render on iOS) |
| Biometric auth service | `fe/mobile/src/services/auth/biometricAuth.ts` |
| APNs token registration | `fe/mobile/src/services/fcm/fcmService.ts` (platform-specific) |

---

**Last Updated:** 2026-03-13
