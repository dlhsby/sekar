/**
 * Role-aware Menu launcher contents.
 * The bottom bar is uniform (Home · Menu · Profile) for every role; this registry
 * decides which feature tiles each role sees on the Menu page, grouped into sections.
 * Derived from the previous per-role tab sets (visible + parked), remapped to the new
 * consolidated routes (Absensi merges clock-in/out + overtime; Tasks/Activities split).
 */
import type { UserRole } from '../types/user.types';
import type { MenuSection } from '../types/menu.types';

// Reusable tiles (icons match the names previously used in TAB_CONFIGS).
// Distinct icons (no shared illustration): attendance = clock-check, overtime = clock-plus.
const ABSENSI = { route: 'Absensi', label: 'Kehadiran', icon: 'clock-check-outline' } as const;
const LEMBUR = { route: 'Lembur', label: 'Lembur', icon: 'clock-plus-outline' } as const;
const TUGAS = { route: 'Tasks', label: 'Tugas', icon: 'clipboard-list-outline' } as const;
const AKTIVITAS = { route: 'Activities', label: 'Aktivitas', icon: 'notebook-outline' } as const;
const ASET = { route: 'Assets', label: 'Aset', icon: 'toolbox-outline' } as const;
const KINERJA = { route: 'WorkerAnalytics', label: 'Kinerja', icon: 'chart-line' } as const;
const TIM = { route: 'TeamAnalytics', label: 'Tim', icon: 'chart-bar' } as const;
const ANALITIK = { route: 'TeamAnalytics', label: 'Analitik', icon: 'chart-bar' } as const;
const MONITORING = { route: 'Monitoring', label: 'Monitoring', icon: 'map', illustration: 'illo-location' } as const;
const LAPORAN = { route: 'Reports', label: 'Laporan', icon: 'file-chart-outline', illustration: 'illo-reports' } as const;
const BIBIT = { route: 'PlantSeeds', label: 'Bibit', icon: 'leaf-outline' } as const;
const PERANTINGAN_REVIEW = { route: 'PruningReviewQueue', label: 'Perantingan', icon: 'tree-outline' } as const;
const PERANTINGAN_SUBMIT = { route: 'Perantingan', label: 'Perantingan', icon: 'tree-outline' } as const;

const FIELD_OPS: MenuSection = {
  title: 'Operasional',
  items: [ABSENSI, LEMBUR, TUGAS, AKTIVITAS, ASET, KINERJA],
};

export const MENU_CONFIGS: Record<UserRole, MenuSection[]> = {
  // satgas has no Aset / Kinerja access.
  satgas: [{ title: 'Operasional', items: [ABSENSI, LEMBUR, TUGAS, AKTIVITAS] }],
  linmas: [FIELD_OPS],
  korlap: [
    { title: 'Operasional', items: [ABSENSI, LEMBUR, TUGAS, AKTIVITAS, ASET, KINERJA] },
    { title: 'Pengawasan', items: [MONITORING, TIM] },
  ],
  admin_data: [
    { title: 'Operasional', items: [ABSENSI, TUGAS, AKTIVITAS, ASET] },
    { title: 'Perawatan Pohon', items: [PERANTINGAN_REVIEW, BIBIT] },
    { title: 'Laporan & Monitoring', items: [LAPORAN, MONITORING] },
  ],
  kepala_rayon: [
    { title: 'Pengawasan', items: [MONITORING, TIM, LAPORAN] },
    { title: 'Operasional', items: [LEMBUR, ASET] },
  ],
  top_management: [
    { title: 'Pengawasan', items: [MONITORING, LAPORAN, ANALITIK] },
    { title: 'Lainnya', items: [BIBIT] },
  ],
  admin_system: [
    { title: 'Pengawasan', items: [MONITORING, LAPORAN, ANALITIK] },
    { title: 'Lainnya', items: [ASET] },
  ],
  superadmin: [
    { title: 'Pengawasan', items: [MONITORING, LAPORAN, ANALITIK] },
    { title: 'Operasional', items: [LEMBUR, ASET] },
  ],
  staff_kecamatan: [
    { title: 'Perawatan Pohon', items: [PERANTINGAN_SUBMIT] },
  ],
};
