import {
  HomeIcon,
  MapIcon,
  UsersIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BriefcaseIcon,
  FolderIcon,
  ClockIcon,
  InboxArrowDownIcon,
  ListBulletIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CircleStackIcon,
  SparklesIcon,
  ArchiveBoxIcon,
  Square2StackIcon,
  ChartBarIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { ComponentType } from 'react';
import { ADMIN_ROLES, MONITORING_ROLES, TASK_MANAGER_ROLES } from '@/lib/constants/roles';

/** Roles allowed to export data (kepala_rayon is scoped server-side). */
const EXPORT_NAV_ROLES = [...ADMIN_ROLES, 'kepala_rayon'];

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
    label: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    roles: [...MONITORING_ROLES],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    href: '/monitoring',
    icon: MapIcon,
    roles: [...MONITORING_ROLES],
  },
  // ── Pekerjaan: day-to-day work surfaces (tugas / aktivitas / lembur / jadwal)
  {
    id: 'work',
    label: 'Pekerjaan',
    href: '#',
    icon: BriefcaseIcon,
    roles: [...MONITORING_ROLES],
    children: [
      {
        id: 'tasks',
        label: 'Tugas',
        href: '/tasks',
        icon: ClipboardDocumentListIcon,
        roles: [...TASK_MANAGER_ROLES],
      },
      {
        id: 'activities',
        label: 'Aktivitas',
        href: '/activities',
        icon: DocumentTextIcon,
        roles: [...MONITORING_ROLES],
      },
      {
        id: 'overtime',
        label: 'Lembur',
        href: '/overtime',
        icon: ClockIcon,
        roles: [...MONITORING_ROLES],
      },
      {
        id: 'daily-schedules',
        label: 'Jadwal Harian',
        href: '/daily-schedules',
        icon: CalendarDaysIcon,
        roles: [...ADMIN_ROLES, 'kepala_rayon', 'admin_data'],
      },
      {
        id: 'schedules',
        label: 'Jadwal (Lanjutan)',
        href: '/schedules',
        icon: CalendarIcon,
        roles: [...ADMIN_ROLES, 'korlap', 'admin_data'],
      },
      // Pruning-request disposition is operational work (ADR-038).
      {
        id: 'pruning-requests',
        label: 'Permohonan Pemangkasan',
        href: '/pruning-requests',
        icon: InboxArrowDownIcon,
        roles: ['admin_data', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'],
      },
    ],
  },
  // ── Pengguna & Hak Akses: account management + access control (its own
  // surface, separate from Data Master).
  {
    id: 'access',
    label: 'Pengguna & Hak Akses',
    href: '#',
    icon: UsersIcon,
    roles: [...ADMIN_ROLES, 'admin_data'],
    children: [
      {
        id: 'users',
        label: 'Pengguna',
        href: '/users',
        icon: UsersIcon,
        roles: [...ADMIN_ROLES, 'admin_data'],
      },
    ],
  },
  // ── Data Master: organisation structure, scheduling templates + catalogues.
  {
    id: 'data',
    label: 'Data Master',
    href: '#',
    icon: FolderIcon,
    roles: [...ADMIN_ROLES, 'top_management', 'admin_data'],
    children: [
      {
        id: 'areas',
        label: 'Area',
        href: '/areas',
        icon: MapPinIcon,
        roles: [...ADMIN_ROLES, 'top_management'],
      },
      {
        id: 'rayons',
        label: 'Rayon',
        href: '/rayons',
        icon: BuildingOfficeIcon,
        roles: [...ADMIN_ROLES, 'top_management'],
      },
      {
        id: 'scheduling-templates',
        label: 'Template Penjadwalan',
        href: '/scheduling-templates',
        icon: ClipboardDocumentListIcon,
        roles: [...ADMIN_ROLES, 'admin_data'],
      },
      // Phase 3-8/3-12 web pages (shipped with the phase-3 close-out)
      {
        id: 'plants',
        label: 'Tanaman',
        href: '/plants',
        icon: SparklesIcon,
        roles: [...ADMIN_ROLES, 'top_management', 'admin_data', 'kepala_rayon'],
      },
      {
        id: 'seeds',
        label: 'Bibit',
        href: '/seeds',
        icon: ArchiveBoxIcon,
        roles: [...ADMIN_ROLES, 'top_management', 'admin_data', 'kepala_rayon'],
      },
      {
        id: 'assets',
        label: 'Aset',
        href: '/assets',
        icon: Square2StackIcon,
        roles: [...ADMIN_ROLES, 'top_management', 'admin_data', 'kepala_rayon'],
      },
    ],
  },

  // ── Laporan: reporting (Phase 5-1) ──────────────────────────────────────
  {
    id: 'reports',
    label: 'Laporan',
    href: '/reports',
    icon: Square2StackIcon,
    roles: ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'],
    children: [
      {
        id: 'reports-list',
        label: 'Daftar Laporan',
        href: '/reports',
        icon: Square2StackIcon,
        roles: ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'],
      },
      {
        id: 'reports-builder',
        label: 'Buat Laporan',
        href: '/reports/builder',
        icon: Square2StackIcon,
        roles: ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'],
      },
      {
        id: 'reports-schedules',
        label: 'Jadwal Laporan',
        href: '/reports/schedules',
        icon: CalendarIcon,
        roles: [...ADMIN_ROLES],
      },
    ],
  },
  // ── Analitik: analytics dashboards (Phase 5-2) ─────────────────────────
  {
    id: 'analytics',
    label: 'Analitik',
    href: '/analytics',
    icon: ChartBarIcon,
    roles: ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'],
    children: [
      {
        id: 'analytics-overview',
        label: 'Ringkasan',
        href: '/analytics',
        icon: ChartBarIcon,
        roles: ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'],
      },
      {
        id: 'analytics-workers',
        label: 'Kinerja Pekerja',
        href: '/analytics/workers',
        icon: ChartBarIcon,
        roles: ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'],
      },
      {
        id: 'analytics-areas',
        label: 'Perbandingan Area',
        href: '/analytics/areas',
        icon: ChartBarIcon,
        roles: ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'],
      },
    ],
  },
  // ── Operasional: data export / import (Phase 4-5) ──────────────────────
  {
    id: 'operations',
    label: 'Operasional',
    href: '#',
    icon: CircleStackIcon,
    roles: [...EXPORT_NAV_ROLES],
    children: [
      {
        id: 'export',
        label: 'Ekspor Data',
        href: '/export',
        icon: ArrowDownTrayIcon,
        roles: [...EXPORT_NAV_ROLES],
      },
      {
        id: 'import',
        label: 'Impor Data',
        href: '/import',
        icon: ArrowUpTrayIcon,
        roles: [...ADMIN_ROLES],
      },
    ],
  },

  // ── Pengaturan: app settings (change password, notification prefs, theme).
  // Also reachable from the avatar dropdown; surfaced in the sidebar per the
  // Jun-30 nav reorder.
  {
    id: 'settings',
    label: 'Pengaturan',
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
    label: 'Kirim Permintaan',
    href: '/pruning-submit',
    icon: InboxArrowDownIcon,
    roles: ['staff_kecamatan'],
  },
  {
    id: 'pruning-my',
    label: 'Permintaan Saya',
    href: '/pruning-submit/my',
    icon: ListBulletIcon,
    roles: ['staff_kecamatan'],
  },

  // ── Panduan: public user manual (docs.sekar.wahyutrip.com), opens in a new
  // tab. Visible to every role so anyone can reach the guide in-context.
  {
    id: 'docs',
    label: 'Panduan',
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
  '/schedules': 'Jadwal (Lanjutan)',
  '/schedules/new': 'Jadwal Baru',
  '/daily-schedules': 'Jadwal Harian',
  '/scheduling-templates': 'Template Penjadwalan',
  '/users': 'Pengguna',
  '/users/new': 'Pengguna Baru',
  '/areas': 'Area',
  '/areas/new': 'Area Baru',
  '/rayons': 'Rayon',
  '/assets': 'Aset',
  '/assets/new': 'Aset Baru',
  '/assets/qr': 'Generator QR',
  '/assets/maintenance': 'Perawatan Aset',
  '/reports': 'Laporan',
  '/reports/builder': 'Buat Laporan',
  '/reports/schedules': 'Jadwal Laporan',
  '/pruning-requests': 'Permohonan Pemangkasan',
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
  '/daily-schedules': ['Pekerjaan', 'Jadwal Harian'],
  '/schedules': ['Pekerjaan', 'Jadwal (Lanjutan)'],
  '/pruning-requests': ['Pekerjaan', 'Permohonan Pemangkasan'],
  '/users': ['Pengguna & Hak Akses', 'Pengguna'],
  '/areas': ['Data Master', 'Area'],
  '/rayons': ['Data Master', 'Rayon'],
  '/scheduling-templates': ['Data Master', 'Template Penjadwalan'],
  '/plants': ['Data Master', 'Tanaman'],
  '/seeds': ['Data Master', 'Bibit'],
  '/assets': ['Data Master', 'Aset'],
  '/reports': ['Laporan'],
  '/reports/builder': ['Laporan', 'Buat Laporan'],
  '/reports/schedules': ['Laporan', 'Jadwal Laporan'],
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
