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
// `label` and section `title` hold i18n KEYS (menu namespace), resolved with
// `t()` at render time in MenuScreen — never render them raw.
// Distinct icons (no shared illustration): attendance = clock-check, overtime = clock-plus.
// "Kehadiran" opens the attendance history list; clock-in/out is reached from there.
const ABSENSI = { route: 'Attendance', label: 'menu:tiles.attendance', icon: 'clock-check-outline' } as const;
// "Jadwal Saya" was only reachable from Profil → menu, where nobody looked for it.
// Every schedulable (clockable) role gets it on the Menu grid too.
const JADWAL = { route: 'MySchedule', label: 'menu:tiles.mySchedule', icon: 'calendar-month-outline' } as const;
const LEMBUR = { route: 'Lembur', label: 'menu:tiles.overtime', icon: 'clock-plus-outline' } as const;
const TUGAS = { route: 'Tasks', label: 'menu:tiles.tasks', icon: 'clipboard-list-outline' } as const;
const AKTIVITAS = { route: 'Activities', label: 'menu:tiles.activities', icon: 'notebook-outline' } as const;
const ASET = { route: 'Assets', label: 'menu:tiles.assets', icon: 'toolbox-outline' } as const;
const KINERJA = { route: 'WorkerAnalytics', label: 'menu:tiles.performance', icon: 'chart-line' } as const;
const TIM = { route: 'TeamAnalytics', label: 'menu:tiles.team', icon: 'chart-bar' } as const;
const ANALITIK = { route: 'TeamAnalytics', label: 'menu:tiles.analytics', icon: 'chart-bar' } as const;
const MONITORING = { route: 'Monitoring', label: 'menu:tiles.monitoring', icon: 'map', illustration: 'illo-location' } as const;
const LAPORAN = { route: 'Reports', label: 'menu:tiles.reports', icon: 'file-chart-outline', illustration: 'illo-reports' } as const;
const BIBIT = { route: 'PlantSeeds', label: 'menu:tiles.seeds', icon: 'leaf-outline' } as const;
const PERANTINGAN_REVIEW = { route: 'PruningReviewQueue', label: 'menu:tiles.pruning', icon: 'tree-outline' } as const;
const PERANTINGAN_SUBMIT = { route: 'Perantingan', label: 'menu:tiles.pruning', icon: 'tree-outline' } as const;

const FIELD_OPS: MenuSection = {
  title: 'menu:sections.operations',
  items: [ABSENSI, JADWAL, LEMBUR, TUGAS, AKTIVITAS, ASET, KINERJA],
};

export const MENU_CONFIGS: Record<UserRole, MenuSection[]> = {
  // satgas has no Aset / Kinerja access.
  satgas: [{ title: 'menu:sections.operations', items: [ABSENSI, JADWAL, LEMBUR, TUGAS, AKTIVITAS] }],
  linmas: [FIELD_OPS],
  korlap: [
    { title: 'menu:sections.operations', items: [ABSENSI, JADWAL, LEMBUR, TUGAS, AKTIVITAS, ASET, KINERJA] },
    { title: 'menu:sections.supervision', items: [MONITORING, TIM] },
  ],
  admin_rayon: [
    { title: 'menu:sections.operations', items: [ABSENSI, JADWAL, LEMBUR, TUGAS, AKTIVITAS, ASET] },
    { title: 'menu:sections.treeCare', items: [PERANTINGAN_REVIEW, BIBIT] },
    { title: 'menu:sections.reportsMonitoring', items: [LAPORAN, MONITORING] },
  ],
  kepala_rayon: [
    { title: 'menu:sections.supervision', items: [MONITORING, TIM, LAPORAN] },
    { title: 'menu:sections.operations', items: [TUGAS, AKTIVITAS, LEMBUR, ASET] },
  ],
  management: [
    { title: 'menu:sections.supervision', items: [MONITORING, LAPORAN, ANALITIK] },
    { title: 'menu:sections.other', items: [BIBIT] },
  ],
  admin_system: [
    { title: 'menu:sections.supervision', items: [MONITORING, LAPORAN, ANALITIK] },
    { title: 'menu:sections.other', items: [ASET] },
  ],
  superadmin: [
    { title: 'menu:sections.supervision', items: [MONITORING, LAPORAN, ANALITIK] },
    { title: 'menu:sections.operations', items: [LEMBUR, ASET] },
  ],
  staff_kecamatan: [
    { title: 'menu:sections.treeCare', items: [PERANTINGAN_SUBMIT] },
  ],
};
