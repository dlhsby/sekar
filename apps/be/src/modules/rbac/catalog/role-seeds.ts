import { MonitoringScope } from '../enums/monitoring-scope.enum';

/**
 * System-role seed definitions (ADR-044). Codes are immutable and match the
 * legacy `UserRole` enum so `users.role` keeps referencing them; labels and
 * permission sets are the editable, data-driven part. `permissions` may include
 * wildcards (expanded at check time by the permission matcher). These are the
 * DEFAULTS — operators refine them at runtime via the role-management page.
 */
export interface RoleSeed {
  code: string;
  name: string;
  description: string;
  monitoring_scope: MonitoringScope;
  marker_icon: string;
  /** Role accent colour (hex #RRGGBB) — the default pill/avatar tint. Mirrors the
   *  `--color-role-*` design tokens so seeded roles match the existing UI exactly. */
  marker_color: string;
  /** Granted permission keys (may be wildcards). */
  permissions: string[];
}

// Rayon-scoped base set shared by kepala_rayon and admin_rayon (equalized per UAT).
const DISTRICT_ADMIN_PERMISSIONS: string[] = [
  'monitoring:read',
  'user:read',
  'user:create',
  'user:update',
  'area:read',
  'area:create',
  'area:update',
  'area:delete',
  'region:read',
  'district:read',
  'schedule:read',
  'schedule:create',
  'schedule:update',
  'schedule:delete',
  'team:read',
  'team:create',
  'team:update',
  'team:delete',
  'task:read',
  'task:verify',
  'task:assign',
  'activity:read',
  'activity:approve',
  'activity:export',
  'overtime:read',
  'overtime:approve',
  'pruning-request:read',
  'pruning-request:review',
  'pruning-request:convert',
];

// Management: broad cross-district visibility + data management, but NOT the
// system-administration surfaces — role/permission editing and system settings
// belong to admin_system only (UAT). Roles/permissions are read-only here so the
// management page renders; settings are read-only too.
const MANAGEMENT_PERMISSIONS: string[] = [
  'user:*',
  'role:read',
  'permission:read',
  'city:*',
  'district:*',
  'region:*',
  'area:*',
  'schedule:*',
  'team:*',
  'monitoring:*',
  'task:*',
  'activity:*',
  'overtime:*',
  'pruning-request:*',
  'audit:read',
  'settings:read',
];

export const ROLE_SEEDS: RoleSeed[] = [
  {
    code: 'superadmin',
    name: 'Superadmin',
    description: 'Akses penuh ke seluruh sistem',
    monitoring_scope: MonitoringScope.CITY,
    marker_icon: 'star',
    marker_color: '#1C1917',
    permissions: ['*:*'],
  },
  {
    code: 'admin_system',
    name: 'Admin Sistem',
    description: 'Administrasi sistem, master data, peran, dan pengaturan',
    monitoring_scope: MonitoringScope.CITY,
    marker_icon: 'key',
    marker_color: '#57534E',
    permissions: ['*:*'],
  },
  {
    code: 'management',
    name: 'Management',
    description: 'Melihat seluruh data lintas rayon; tidak mengubah pengaturan sistem',
    monitoring_scope: MonitoringScope.CITY,
    marker_icon: 'crown',
    marker_color: '#1A4D2E',
    permissions: MANAGEMENT_PERMISSIONS,
  },
  {
    code: 'kepala_rayon',
    name: 'Kepala Rayon',
    description: 'Kelola pengguna & wilayah serta monitoring dalam rayonnya',
    monitoring_scope: MonitoringScope.DISTRICT,
    marker_icon: 'building',
    marker_color: '#F48572',
    permissions: DISTRICT_ADMIN_PERMISSIONS,
  },
  {
    code: 'admin_rayon',
    name: 'Admin Rayon',
    description: 'Akses setara Kepala Rayon dalam rayonnya',
    monitoring_scope: MonitoringScope.DISTRICT,
    marker_icon: 'clipboard',
    marker_color: '#9333EA',
    permissions: DISTRICT_ADMIN_PERMISSIONS,
  },
  {
    code: 'korlap',
    name: 'Korlap',
    description: 'Koordinator lapangan; monitoring kawasannya, tanpa kelola data',
    monitoring_scope: MonitoringScope.REGION,
    marker_icon: 'briefcase',
    marker_color: '#E3A018',
    permissions: [
      'monitoring:read',
      'schedule:read',
      'schedule:create',
      'schedule:update',
      'team:read',
      'task:read',
      'task:assign',
      'activity:read',
      'activity:approve',
      'overtime:submit',
    ],
  },
  {
    code: 'satgas',
    name: 'Satgas',
    description: 'Petugas lapangan; clock-in, aktivitas, tugas, lembur',
    monitoring_scope: MonitoringScope.NONE,
    // Field worker → hard-hat, distinct from linmas' shield (both were 'shield').
    marker_icon: 'hard-hat',
    marker_color: '#7FBC8C',
    permissions: ['activity:create', 'task:read', 'overtime:submit', 'schedule:read'],
  },
  {
    code: 'linmas',
    name: 'Linmas',
    description: 'Petugas keamanan; clock-in, aktivitas, tugas, lembur',
    monitoring_scope: MonitoringScope.NONE,
    marker_icon: 'shield',
    marker_color: '#2563EB',
    permissions: ['activity:create', 'task:read', 'overtime:submit', 'schedule:read'],
  },
  {
    code: 'staff_kecamatan',
    name: 'Staff Kecamatan',
    description: 'Eksternal; mengajukan permohonan pemangkasan',
    monitoring_scope: MonitoringScope.NONE,
    marker_icon: 'user',
    marker_color: '#FDFD96',
    permissions: ['pruning-request:submit', 'pruning-request:read'],
  },
];
