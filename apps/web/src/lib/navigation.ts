import {
  HomeIcon,
  MapIcon,
  UsersIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BriefcaseIcon,
  FolderIcon,
  ClockIcon,
  InboxArrowDownIcon,
  ListBulletIcon,
  SparklesIcon,
  Square2StackIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { ComponentType } from 'react';
import { ADMIN_ROLES, MONITORING_ROLES, TASK_MANAGER_ROLES } from '@/lib/constants/roles';

/**
 * Navigation Item Interface
 */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles: string[];
  children?: NavItem[];
  /** Opens in a new tab (e.g. the external docs site) instead of client routing. */
  external?: boolean;
}

/**
 * Public user-manual site. Overridable per environment via NEXT_PUBLIC_DOCS_URL
 * (inlined at build time); falls back to the production docs subdomain.
 */
const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || 'https://docs.sekar.wahyutrip.com';

/**
 * Navigation Items Configuration (Phase 2C)
 */
export const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'common:nav.dashboard',
    href: '/',
    icon: HomeIcon,
    roles: [...MONITORING_ROLES],
  },
  {
    id: 'monitoring',
    label: 'common:nav.monitoring',
    href: '/monitoring',
    icon: MapIcon,
    roles: [...MONITORING_ROLES],
  },
  // ── Pekerjaan: day-to-day work surfaces (tugas / aktivitas / lembur / jadwal)
  {
    id: 'work',
    label: 'common:nav.work',
    href: '#',
    icon: BriefcaseIcon,
    roles: [...MONITORING_ROLES],
    children: [
      {
        id: 'tasks',
        label: 'common:nav.tasks',
        href: '/tasks',
        icon: ClipboardDocumentListIcon,
        roles: [...TASK_MANAGER_ROLES],
      },
      {
        id: 'activities',
        label: 'common:nav.activities',
        href: '/activities',
        icon: DocumentTextIcon,
        roles: [...MONITORING_ROLES],
      },
      {
        id: 'overtime',
        label: 'common:nav.overtime',
        href: '/overtime',
        icon: ClockIcon,
        roles: [...MONITORING_ROLES],
      },
      {
        id: 'schedules',
        label: 'common:nav.schedules',
        href: '/schedules',
        icon: CalendarDaysIcon,
        // Managers (admin/kepala_rayon/admin_rayon) edit; korlap + management view.
        roles: [...ADMIN_ROLES, 'kepala_rayon', 'admin_rayon', 'korlap', 'management'],
      },
      // Pruning-request disposition is operational work (ADR-038).
      {
        id: 'pruning-requests',
        label: 'common:nav.pruningRequests',
        href: '/pruning-requests',
        icon: InboxArrowDownIcon,
        roles: ['admin_rayon', 'kepala_rayon', 'management', 'admin_system', 'superadmin'],
      },
    ],
  },
  // ── Pengguna & Hak Akses: account management + access control (its own
  // surface, separate from Data Master).
  {
    id: 'access',
    label: 'common:nav.usersAccess',
    href: '#',
    icon: UsersIcon,
    roles: [...ADMIN_ROLES, 'admin_rayon'],
    children: [
      {
        id: 'users',
        label: 'common:nav.users',
        href: '/users',
        icon: UsersIcon,
        roles: [...ADMIN_ROLES, 'admin_rayon'],
      },
      {
        id: 'roles',
        label: 'common:nav.roles',
        href: '/roles',
        icon: ShieldCheckIcon,
        roles: [...ADMIN_ROLES],
      },
    ],
  },
  // ── Data Master: organisation structure, scheduling templates + catalogues.
  {
    id: 'data',
    label: 'common:nav.masterData',
    href: '#',
    icon: FolderIcon,
    roles: [...ADMIN_ROLES, 'management', 'admin_rayon'],
    children: [
      // Location hierarchy, top → bottom: Rayon → Kawasan → Lokasi → Tim.
      {
        id: 'rayons',
        label: 'common:nav.rayons',
        href: '/rayons',
        icon: BuildingOfficeIcon,
        roles: [...ADMIN_ROLES, 'management'],
      },
      {
        id: 'regions',
        label: 'common:nav.regions',
        href: '/regions',
        icon: MapPinIcon,
        roles: [...ADMIN_ROLES, 'management'],
      },
      {
        id: 'locations',
        label: 'common:nav.locations',
        href: '/locations',
        icon: MapPinIcon,
        roles: [...ADMIN_ROLES, 'management'],
      },
      {
        id: 'team-categories',
        label: 'common:nav.teams',
        href: '/team-categories',
        icon: UsersIcon,
        roles: [...ADMIN_ROLES, 'management'],
      },
      // Phase 3-8/3-12 web pages (shipped with the phase-3 close-out)
      {
        id: 'plants',
        label: 'common:nav.plants',
        href: '/plants',
        icon: SparklesIcon,
        roles: [...ADMIN_ROLES, 'management', 'admin_rayon', 'kepala_rayon'],
      },
      // ARCHIVED 2026-07-07 — hidden from the sidebar per request, page still
      // lives at /seeds. Uncomment to restore.
      // {
      //   id: 'seeds',
      //   label: 'common:nav.seeds',
      //   href: '/seeds',
      //   icon: ArchiveBoxIcon,
      //   roles: [...ADMIN_ROLES, 'management', 'admin_rayon', 'kepala_rayon'],
      // },
      // ARCHIVED 2026-07-07 — hidden from the sidebar per request, page still
      // lives at /assets. Uncomment to restore.
      // {
      //   id: 'assets',
      //   label: 'common:nav.assets',
      //   href: '/assets',
      //   icon: Square2StackIcon,
      //   roles: [...ADMIN_ROLES, 'management', 'admin_rayon', 'kepala_rayon'],
      // },
      {
        id: 'database',
        label: 'common:nav.database',
        href: '/database',
        icon: TableCellsIcon,
        roles: [...ADMIN_ROLES, 'management', 'admin_rayon'],
      },
    ],
  },

  // ── Laporan: reporting (Phase 5-1). Old Daftar/Buat/Jadwal Laporan children
  // ARCHIVED 2026-07-07 — hidden from the sidebar per request, pages still
  // live at /reports, /reports/builder, /reports/schedules. Uncomment to
  // restore. The group now only surfaces the general "Reporting" embed page.
  {
    id: 'reports',
    label: 'common:nav.reports',
    href: '#',
    icon: Square2StackIcon,
    roles: ['korlap', 'kepala_rayon', 'admin_rayon', 'management', 'admin_system', 'superadmin'],
    children: [
      // {
      //   id: 'reports-list',
      //   label: 'common:nav.reportsList',
      //   href: '/reports',
      //   icon: Square2StackIcon,
      //   roles: ['korlap', 'kepala_rayon', 'admin_rayon', 'management', 'admin_system', 'superadmin'],
      // },
      // {
      //   id: 'reports-builder',
      //   label: 'common:nav.reportsBuilder',
      //   href: '/reports/builder',
      //   icon: Square2StackIcon,
      //   roles: ['korlap', 'kepala_rayon', 'admin_rayon', 'management', 'admin_system', 'superadmin'],
      // },
      // {
      //   id: 'reports-schedules',
      //   label: 'common:nav.reportsSchedules',
      //   href: '/reports/schedules',
      //   icon: CalendarIcon,
      //   roles: [...ADMIN_ROLES],
      // },
      {
        id: 'reports-reporting',
        label: 'common:nav.reportsReporting',
        href: '/reports/reporting',
        icon: DocumentTextIcon,
        roles: ['korlap', 'kepala_rayon', 'admin_rayon', 'management', 'admin_system', 'superadmin'],
      },
    ],
  },
  // ── Analitik: analytics dashboards (Phase 5-2)
  // ARCHIVED 2026-07-07 — hidden from the sidebar per request, pages still
  // live at /analytics, /analytics/workers, /analytics/locations. Uncomment to
  // restore.
  // {
  //   id: 'analytics',
  //   label: 'common:nav.analytics',
  //   href: '/analytics',
  //   icon: ChartBarIcon,
  //   roles: ['korlap', 'kepala_rayon', 'admin_rayon', 'management', 'admin_system', 'superadmin'],
  //   children: [
  //     {
  //       id: 'analytics-overview',
  //       label: 'common:nav.analyticsSummary',
  //       href: '/analytics',
  //       icon: ChartBarIcon,
  //       roles: ['korlap', 'kepala_rayon', 'admin_rayon', 'management', 'admin_system', 'superadmin'],
  //     },
  //     {
  //       id: 'analytics-workers',
  //       label: 'common:nav.workerPerformance',
  //       href: '/analytics/workers',
  //       icon: ChartBarIcon,
  //       roles: ['korlap', 'kepala_rayon', 'admin_rayon', 'management', 'admin_system', 'superadmin'],
  //     },
  //     {
  //       id: 'analytics-areas',
  //       label: 'common:nav.areaComparison',
  //       href: '/analytics/locations',
  //       icon: ChartBarIcon,
  //       roles: ['korlap', 'kepala_rayon', 'admin_rayon', 'management', 'admin_system', 'superadmin'],
  //     },
  //   ],
  // },
  // ── Operasional: data export / import (Phase 4-5)
  // ARCHIVED 2026-07-07 — hidden from the sidebar per request, pages still
  // live at /export, /import. Uncomment to restore.
  // {
  //   id: 'operations',
  //   label: 'common:nav.operations',
  //   href: '#',
  //   icon: CircleStackIcon,
  //   roles: [...EXPORT_NAV_ROLES],
  //   children: [
  //     {
  //       id: 'export',
  //       label: 'common:nav.exportData',
  //       href: '/export',
  //       icon: ArrowDownTrayIcon,
  //       roles: [...EXPORT_NAV_ROLES],
  //     },
  //     {
  //       id: 'import',
  //       label: 'common:nav.importData',
  //       href: '/import',
  //       icon: ArrowUpTrayIcon,
  //       roles: [...ADMIN_ROLES],
  //     },
  //   ],
  // },

  // ── Pengaturan: app settings (change password, notification prefs, theme).
  // Also reachable from the avatar dropdown; surfaced in the sidebar per the
  // Jun-30 nav reorder.
  {
    id: 'settings',
    label: 'common:nav.settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    roles: [...MONITORING_ROLES],
  },

  // ── Phase 3: staff_kecamatan minimal navigation (ADR-033) ──────────────
  // Monitoring is intentionally ABSENT for this role. Submit pages live at
  // /pruning-submit so they don't collide with the admin /pruning-requests
  // dashboard (Next.js refuses parallel routes resolving to the same path).
  {
    id: 'pruning-submit',
    label: 'common:nav.submitRequest',
    href: '/pruning-submit',
    icon: InboxArrowDownIcon,
    roles: ['staff_kecamatan'],
  },
  {
    id: 'pruning-my',
    label: 'common:nav.myRequests',
    href: '/pruning-submit/my',
    icon: ListBulletIcon,
    roles: ['staff_kecamatan'],
  },

  // ── Panduan: public user manual (docs.sekar.wahyutrip.com), opens in a new
  // tab. Visible to every role so anyone can reach the guide in-context.
  {
    id: 'docs',
    label: 'common:nav.guide',
    href: DOCS_URL,
    icon: BookOpenIcon,
    roles: ['*'],
    external: true,
  },
];

/**
 * Filter Navigation Items by Role
 */
export const filterNavigationByRole = (items: NavItem[], userRole: string): NavItem[] => {
  return items
    .filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      if (item.roles.includes('*')) return true;
      return item.roles.includes(userRole);
    })
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: filterNavigationByRole(item.children, userRole),
        };
      }
      return item;
    })
    .filter((item) => {
      if (item.children) {
        return item.children.length > 0;
      }
      return true;
    });
};

/**
 * Page titles by route — rendered in the top header so pages don't need to
 * repeat a large in-body title. Dynamic detail/edit routes fall back to their
 * section title (longest known prefix).
 */
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/monitoring': 'Monitoring',
  '/tasks': 'Tugas',
  '/tasks/new': 'Tugas Baru',
  '/activities': 'Aktivitas',
  '/overtime': 'Lembur',
  '/schedules': 'Jadwal',
  '/users': 'Pengguna',
  '/roles': 'Peran',
  '/locations': 'Lokasi',
  '/rayons': 'Rayon',
  '/regions': 'Kawasan',
  '/team-categories': 'Kategori Tim',
  '/assets': 'Aset',
  '/assets/new': 'Aset Baru',
  '/assets/qr': 'Generator QR',
  '/assets/maintenance': 'Perawatan Aset',
  '/reports': 'Laporan',
  '/reports/builder': 'Buat Laporan',
  '/reports/schedules': 'Jadwal Laporan',
  '/reports/reporting': 'Laporan',
  '/database': 'Data Base',
  '/pruning-requests': 'Permohonan Perantingan',
  '/pruning-submit': 'Kirim Permintaan',
  '/pruning-submit/my': 'Permintaan Saya',
  '/settings': 'Pengaturan',
  '/profile': 'Profil Saya',
  '/notifications': 'Notifikasi',
  '/export': 'Ekspor Data',
  '/import': 'Impor Data',
  '/import/csv': 'Impor CSV',
};

/**
 * Resolve the page title for a pathname. Exact match first, then the longest
 * known prefix (so `/tasks/123` → "Tugas", `/users/abc` → "Pengguna").
 */
export const getPageTitle = (pathname: string): string => {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length; i > 0; i--) {
    const prefix = '/' + segments.slice(0, i).join('/');
    if (ROUTE_TITLES[prefix]) return ROUTE_TITLES[prefix];
  }
  return 'SEKAR';
};

/**
 * Breadcrumb trail per route (group → page), mirroring the sidebar grouping.
 * Rendered uniformly in the top header so every page gets the SAME breadcrumb
 * styling (no per-page hand-rolled strings).
 */
const ROUTE_BREADCRUMB: Record<string, string[]> = {
  '/': ['Dashboard'],
  '/monitoring': ['Monitoring'],
  '/tasks': ['Pekerjaan', 'Tugas'],
  '/activities': ['Pekerjaan', 'Aktivitas'],
  '/overtime': ['Pekerjaan', 'Lembur'],
  '/schedules': ['Pekerjaan', 'Jadwal'],
  '/pruning-requests': ['Pekerjaan', 'Permohonan Perantingan'],
  '/users': ['Pengguna & Hak Akses', 'Pengguna'],
  '/roles': ['Pengguna & Hak Akses', 'Peran'],
  '/locations': ['Data Master', 'Lokasi'],
  '/rayons': ['Data Master', 'Rayon'],
  '/regions': ['Data Master', 'Kawasan'],
  '/team-categories': ['Data Master', 'Kategori Tim'],
  '/plants': ['Data Master', 'Tanaman'],
  '/seeds': ['Data Master', 'Bibit'],
  '/assets': ['Data Master', 'Aset'],
  '/database': ['Data Master', 'Data Base'],
  '/reports': ['Laporan'],
  '/reports/builder': ['Laporan', 'Buat Laporan'],
  '/reports/schedules': ['Laporan', 'Jadwal Laporan'],
  '/reports/reporting': ['Laporan', 'Laporan'],
  '/pruning-submit': ['Kecamatan', 'Kirim Permintaan'],
  '/pruning-submit/my': ['Kecamatan', 'Permintaan Saya'],
  '/settings': ['Akun', 'Pengaturan'],
  '/profile': ['Akun', 'Profil'],
  '/notifications': ['Akun', 'Notifikasi'],
  '/export': ['Operasional', 'Ekspor Data'],
  '/import': ['Operasional', 'Impor Data'],
  '/import/csv': ['Operasional', 'Impor CSV'],
};

const DYNAMIC_CRUMB: Record<string, string> = { new: 'Baru', edit: 'Ubah' };

/**
 * Resolve the breadcrumb trail for a pathname. Exact match first; otherwise the
 * longest known prefix plus a dynamic leaf (`new` → "Baru", `edit` → "Ubah",
 * any other trailing segment → "Detail"). Falls back to the page title.
 */
export const getBreadcrumbTrail = (pathname: string): string[] => {
  if (ROUTE_BREADCRUMB[pathname]) return ROUTE_BREADCRUMB[pathname];
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length; i > 0; i--) {
    const base = ROUTE_BREADCRUMB['/' + segments.slice(0, i).join('/')];
    if (base) {
      const rest = segments.slice(i);
      if (rest.length === 0) return base;
      const last = rest[rest.length - 1];
      return [...base, DYNAMIC_CRUMB[last] ?? 'Detail'];
    }
  }
  return [getPageTitle(pathname)];
};

/**
 * Get Breadcrumb Path
 */
export const getBreadcrumbPath = (pathname: string): { label: string; href: string }[] => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  segments.forEach((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const navItem = navigationItems.find((item) => item.href === href);
    const label = navItem?.label || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, href });
  });

  return breadcrumbs;
};
