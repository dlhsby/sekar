/**
 * Permission catalog — the single source of truth for the flat `resource:action`
 * permission keys (ADR-044). The DB `permissions` table stores only key +
 * description; the Category → Resource → action grouping and the Indonesian
 * labels live here and drive both the seeder and the role-management UI
 * (exposed via `GET /permissions`).
 */

export interface CatalogAction {
  /** action segment, e.g. 'read' */
  action: string;
  /** Indonesian UI label for the action */
  label: string;
}

export interface CatalogResource {
  /** resource segment, e.g. 'user' */
  resource: string;
  /** Indonesian UI label for the resource */
  label: string;
  actions: CatalogAction[];
}

export interface CatalogCategory {
  /** stable category key */
  category: string;
  /** Indonesian UI label for the category */
  label: string;
  resources: CatalogResource[];
}

const READ: CatalogAction = { action: 'read', label: 'Lihat' };
const CREATE: CatalogAction = { action: 'create', label: 'Tambah' };
const UPDATE: CatalogAction = { action: 'update', label: 'Ubah' };
const DELETE: CatalogAction = { action: 'delete', label: 'Hapus' };
const MANAGE: CatalogAction = { action: 'manage', label: 'Kelola' };

export const PERMISSION_CATALOG: CatalogCategory[] = [
  {
    category: 'access',
    label: 'Pengguna & Akses',
    resources: [
      { resource: 'user', label: 'Pengguna', actions: [READ, CREATE, UPDATE, DELETE] },
      { resource: 'role', label: 'Peran', actions: [READ, CREATE, UPDATE, DELETE] },
      { resource: 'permission', label: 'Izin', actions: [READ] },
    ],
  },
  {
    category: 'geography',
    label: 'Wilayah',
    resources: [
      { resource: 'city', label: 'Kota', actions: [READ, UPDATE] },
      { resource: 'district', label: 'District', actions: [READ, CREATE, UPDATE, DELETE] },
      { resource: 'region', label: 'Kawasan', actions: [READ, CREATE, UPDATE, DELETE] },
      { resource: 'area', label: 'Lokasi', actions: [READ, CREATE, UPDATE, DELETE] },
    ],
  },
  {
    category: 'scheduling',
    label: 'Penjadwalan & Tim',
    resources: [
      { resource: 'schedule', label: 'Jadwal', actions: [READ, CREATE, UPDATE, DELETE] },
      { resource: 'team', label: 'Tim', actions: [READ, CREATE, UPDATE, DELETE, MANAGE] },
    ],
  },
  {
    category: 'monitoring',
    label: 'Monitoring',
    resources: [
      {
        resource: 'monitoring',
        label: 'Monitoring',
        actions: [
          READ,
          { action: 'reassign', label: 'Pindah Tugas' },
          { action: 'config', label: 'Konfigurasi' },
        ],
      },
    ],
  },
  {
    category: 'operations',
    label: 'Operasional',
    resources: [
      {
        resource: 'task',
        label: 'Tugas',
        actions: [
          READ,
          CREATE,
          UPDATE,
          { action: 'assign', label: 'Tugaskan' },
          { action: 'verify', label: 'Verifikasi' },
        ],
      },
      {
        resource: 'activity',
        label: 'Aktivitas',
        actions: [
          READ,
          CREATE,
          { action: 'approve', label: 'Setujui' },
          { action: 'export', label: 'Ekspor' },
        ],
      },
      {
        resource: 'overtime',
        label: 'Lembur',
        actions: [
          READ,
          { action: 'submit', label: 'Ajukan' },
          { action: 'approve', label: 'Setujui' },
        ],
      },
    ],
  },
  {
    category: 'pruning',
    label: 'Pemangkasan',
    resources: [
      {
        resource: 'pruning-request',
        label: 'Permohonan Pemangkasan',
        actions: [
          READ,
          { action: 'submit', label: 'Ajukan' },
          { action: 'review', label: 'Tinjau' },
          { action: 'convert', label: 'Konversi' },
          { action: 'export', label: 'Ekspor' },
        ],
      },
    ],
  },
  {
    category: 'system',
    label: 'Sistem',
    resources: [
      {
        resource: 'settings',
        label: 'Pengaturan',
        actions: [READ, MANAGE],
      },
      { resource: 'audit', label: 'Log Audit', actions: [READ] },
    ],
  },
];

export interface CatalogPermission {
  key: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}

/** Flatten the catalog into concrete `resource:action` permission rows. */
export function flattenCatalog(): CatalogPermission[] {
  const out: CatalogPermission[] = [];
  for (const cat of PERMISSION_CATALOG) {
    for (const res of cat.resources) {
      for (const act of res.actions) {
        out.push({
          key: `${res.resource}:${act.action}`,
          description: `${act.label} ${res.label}`,
          category: cat.category,
          resource: res.resource,
          action: act.action,
        });
      }
    }
  }
  return out;
}

/** All concrete permission keys defined by the catalog. */
export const ALL_PERMISSION_KEYS: string[] = flattenCatalog().map((p) => p.key);
