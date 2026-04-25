# Phase 4: UI/UX Polish Specifications

**Date:** March 12, 2026
**Status:** Not Started
**Depends On:** Phase 2E UI (Complete)
**Related Sub-Phase:** 4-8

---

## A. Neo Brutalism Compliance Audit

**Current Baseline (Phase 2E):** Known gaps from Phase 2 include: missing keyboard focus traps on modal dialogs, absent sort indicators on data tables, touch targets below 48×48dp on filter chips and tag elements, inconsistent border-width between 2px and 3px across card components, and missing `aria-live` regions for dynamic status updates. These gaps inform the audit priorities below.

### A1. Mobile Screens (22 Total)

| # | Screen | Border | Shadow | Touch ≥48px | Safe Area | Keyboard | Status |
|---|--------|--------|--------|------------|-----------|----------|--------|
| 1 | LoginScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 2 | HomeScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 3 | ClockInOutScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 4 | ActivitiesScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 5 | ActivityDetailScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 6 | TasksScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 7 | TaskDetailScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 8 | OvertimeScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 9 | ProfileScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 10 | MapDashboardScreen | ⏳ | ⏳ | ⏳ | ⏳ | N/A | ⏳ |
| 11 | MonitoringFilterScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 12 | UserDetailScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 13 | UsersListScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 14 | SettingsScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 15 | SchedulesScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 16 | ReportsScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 17 | AreaDetailScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 18 | RayonDetailScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 19 | AuditLogScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 20 | ImportScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 21 | OvertimeApprovalScreen | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 22 | NotificationsScreen (NEW) | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

### A2. Web Pages (24+ Total)

| # | Page | Border | Shadow | Focus Ring | Hover | 768px | 1024px | 1280px | Status |
|---|------|--------|--------|-----------|-------|-------|--------|--------|--------|
| 1 | Login | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 2 | Dashboard | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 3 | Users | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 4 | User Detail | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 5 | Areas | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 6 | Area Detail | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 7 | Rayons | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 8 | Rayon Detail | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 9 | Tasks | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 10 | Task Detail | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 11 | Activities | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 12 | Activity Detail | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 13 | Overtime | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 14 | Monitoring | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 15 | Monitoring Config | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 16 | Schedules | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 17 | Shift Definitions | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 18 | Activity Types | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 19 | Special Days | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 20 | Audit Logs | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 21 | Settings | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 22 | Import (NEW) | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 23 | Export (NEW) | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 24 | Notifications (NEW) | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

### A3. NB Design Token Reference

| Token | Value | Usage |
|-------|-------|-------|
| Border width | 2px | All cards, inputs, buttons |
| Border color | `#000000` | Default border |
| Shadow (sm) | 2px 2px 0px #000 | Small interactive elements |
| Shadow (md) | 4px 4px 0px #000 | Cards, buttons |
| Shadow (lg) | 6px 6px 0px #000 | Modals, elevated cards |
| Border radius | 2px | Minimal rounding |
| Touch target | ≥48px | All interactive elements (mobile) |
| Focus ring | 2px solid + 2px offset | All focusable elements (web) |

---

## B. Empty States

### B1. Web NBEmptyState Component

9 variants with consistent structure:

| Variant | Title | Description | Action |
|---------|-------|-------------|--------|
| `users` | Belum ada pengguna | Tambahkan pengguna baru untuk memulai | Tambah Pengguna |
| `areas` | Belum ada area | Buat area baru atau import dari KMZ | Tambah Area |
| `tasks` | Belum ada tugas | Buat tugas baru untuk ditugaskan | Buat Tugas |
| `activities` | Belum ada aktivitas | Aktivitas akan muncul setelah disubmit pekerja | - |
| `overtime` | Belum ada lembur | Data lembur akan muncul di sini | - |
| `audit-logs` | Belum ada log audit | Log akan tercatat saat ada perubahan data | - |
| `export-history` | Belum ada riwayat ekspor | Mulai ekspor data dari menu di atas | Ekspor Data |
| `notifications` | Belum ada notifikasi | Notifikasi akan muncul di sini | - |
| `search` | Tidak ditemukan | Coba ubah kata kunci pencarian | Reset Filter |

---

## C. Loading Skeletons

### C1. Web NBSkeleton Variants

| Variant | Structure | Usage |
|---------|-----------|-------|
| `NBTableSkeleton` | 5 rows × N columns, pulsing rectangles | Users, Tasks, Activities, Overtime tables |
| `NBCardSkeleton` | Card with title bar + 3 lines body | Dashboard overview cards |
| `NBMapSkeleton` | Full-width gray area + centered spinner | Monitoring page map |
| `NBChartSkeleton` | Card with 5 bar shapes | Dashboard charts |
| `NBDetailSkeleton` | Header + 6 key-value pairs | Detail pages |

### C2. Mobile Loading States

| Screen | Current | Target |
|--------|---------|--------|
| HomeScreen | Basic spinner | Skeleton cards matching layout |
| MapDashboard | Blank | Map placeholder with spinner overlay |
| TasksScreen | Spinner | NBSkeleton rows |
| ActivitiesScreen | Spinner | NBSkeleton rows |
| NotificationsScreen (NEW) | N/A | NBSkeleton rows |

---

## D. Animations

### D1. Mobile Animations

| Animation | Config | Target |
|-----------|--------|--------|
| Screen transitions | `animation: 'slide_from_right'` in Stack.Navigator | All stack screens |
| Button press | `scale(0.97)` with `withSpring` | All NB buttons |
| List item fade-in | `FadeInDown.delay(index * 50).duration(300)` | Tasks, Activities, Notifications lists |
| Pull-to-refresh | Custom indicator matching NB style | All refreshable screens |
| Bottom tab switch | `tabBarAnimation: 'shift'` | Bottom tab navigator |
| Toast enter | `SlideInUp.duration(200)` | Success/error toasts |

### D2. Web Animations

| Animation | CSS | Target |
|-----------|-----|--------|
| Modal entrance | `scale(0.95) → scale(1)`, `opacity(0) → opacity(1)`, `200ms ease-out` | All modals |
| Modal exit | `scale(1) → scale(0.95)`, `opacity(1) → opacity(0)`, `150ms ease-in` | All modals |
| Toast entrance | `translateY(-100%) → translateY(0)`, `200ms ease-out` | NBToast |
| Toast exit | `translateY(0) → translateY(-100%)`, `150ms ease-in` | NBToast |
| Table row hover | `background-color transition 150ms` | All data tables |
| Button press | `transform: translate(2px, 2px); box-shadow: 2px 2px 0px` | NB buttons |
| Skeleton pulse | `opacity: 0.4 → 1.0`, `1.5s ease-in-out infinite` | All skeletons |

---

## E. Error Boundaries

### E1. Mobile

Wrap each screen root component:

```typescript
<ErrorBoundary fallback={<NBErrorFallback onRetry={refetch} screenName="Tasks" />}>
  <TasksScreen />
</ErrorBoundary>
```

`NBErrorFallback` shows:
- NB-styled card with error icon
- "Terjadi Kesalahan" heading
- Error message (sanitized, no stack traces in production)
- "Coba Lagi" button that triggers retry callback

### E2. Web

Per route segment `error.tsx`:

```
fe/web/src/app/
├── (auth)/
│   └── error.tsx        → Login error (redirect to login)
├── (dashboard)/
│   ├── error.tsx        → Dashboard root error
│   ├── users/error.tsx  → Users section error
│   ├── tasks/error.tsx  → Tasks section error
│   └── monitoring/error.tsx → Monitoring error (map fallback)
```

---

## F. Accessibility Gaps

### F1. Map Accessibility

| Element | Current | Fix |
|---------|---------|-----|
| User markers (mobile) | No accessibility label | Add `accessibilityLabel="Satgas Ahmad Wijaya, Aktif"` |
| User markers (web) | No ARIA | Add `aria-label` with role + name + status |
| Area polygons (web) | No ARIA | Add `aria-label="Area Taman Bungkul, 5 dari 8 pekerja aktif"` |
| Map controls | No labels | Add `aria-label` to zoom, filter buttons |

### F2. Filter Sidebar

| Element | Current | Fix |
|---------|---------|-----|
| Collapsible sections | No ARIA | Add `aria-expanded`, `aria-controls` |
| Filter chips | No role | Add `role="checkbox"`, `aria-checked` |
| Clear all button | No announcement | Add `aria-live="polite"` on filter count |

### F3. Data Tables

| Element | Current | Fix |
|---------|---------|-----|
| Sortable columns | No indication | Add `aria-sort="ascending"` / `"descending"` / `"none"` |
| Pagination | No context | Add `aria-label="Page 2 of 5"` on page buttons |
| Row actions | Icon-only | Add `aria-label="Edit user Ahmad Wijaya"` |

### F4. Modals

| Element | Current | Fix |
|---------|---------|-----|
| Focus trap | Inconsistent | Ensure Tab cycles within modal |
| Close on Escape | Some modals | Apply to all modals and sheets |
| Return focus | Not implemented | Return focus to trigger element on close |
| Title announcement | Missing | Add `aria-labelledby` pointing to modal title |

### F5. Focus Ring Specification

Focus indicators use `2px solid #1D4ED8` (blue-700, 5.1:1 contrast ratio against white background). On dark backgrounds, use `2px solid #93C5FD` (blue-300, 4.8:1 contrast ratio). Focus rings must be visible on all interactive elements including buttons, links, inputs, and custom controls.

---

## G. Timezone Display Standardization

### G1. Date Format

All dates displayed in Indonesian UI:

| Context | Format | Example |
|---------|--------|---------|
| Date only | DD/MM/YYYY | 12/03/2026 |
| Date + time | DD/MM/YYYY HH:mm WIB | 12/03/2026 14:30 WIB |
| Relative (today) | HH:mm WIB | 14:30 WIB |
| Relative (recent) | "X jam lalu" / "X menit lalu" | 2 jam lalu |

### G2. Implementation

```typescript
// Shared date formatter
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    hour12: false,
  }).format(new Date(date));
  return `${formatted} WIB`;
}
```

---

## H. Monitoring Status Display Notes

### H1. Stale Status Cleanup Conditions

When the stale status cleanup cron runs (Sub-Phase 4-3, task B2), status transitions must follow these rules:

| Condition | New Status | Rationale |
|-----------|-----------|-----------|
| User has `status != 'offline'` AND no active shift | Set to `'offline'` | User is not working, clean up stale tracking |
| User has `status != 'offline'` AND has an active shift | Set to `'missing'` | User should be reporting location during shift; absence = missing, not offline |

Do NOT blindly set all stale users to `'offline'` — users with active shifts who go stale should be flagged as `'missing'` to trigger supervisor alerts.

---

**Last Updated:** 2026-03-12
