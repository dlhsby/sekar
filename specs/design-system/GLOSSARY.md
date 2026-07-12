# SEKAR Terminology Glossary

**Single source of truth for canonical terms across code, Indonesian UI, and English UI.**

Sourced from ADR-009 (roles) and ADR-010 (terminology cleanup). Rule (ADR-010): **code is
English; user-facing copy is localized**. Every term below has exactly one translation key so it
can never drift — the i18n resource files are the enforcement mechanism.

- Web resources: `apps/web/src/lib/i18n/locales/<lng>/*.json`
- Mobile resources: `apps/mobile/src/i18n/locales/<lng>/*.json`
- Backend error `code`s (the shared contract): `apps/be/src/common/enums/api-error-codes.enum.ts`

Default UI language is **Indonesian (`id`)**; English (`en`) is the alternate.

## Domain nouns (`common:entities.*`)

| Code term (English) | Key | Indonesian (id) | English (en) | Notes |
|---|---|---|---|---|
| User | `common:entities.user` | Pengguna | User | |
| Location | `common:entities.location` | Lokasi | Location | Geofenced work location (formerly Area); 4-level hierarchy: City → Rayon → Kawasan → Location |
| Rayon | `common:entities.rayon` | Rayon | Rayon | 7-rayon admin structure; kept untranslated |
| Task | `common:entities.task` | Tugas | Task | |
| Activity | `common:entities.activity` | Aktivitas | Activity | Renamed from `Report`/`work_reports` (ADR-010) |
| Schedule | `common:entities.schedule` | Jadwal | Schedule | Renamed from `worker_schedules` (ADR-010) |
| Shift | `common:entities.shift` | Shift | Shift | Not renamed |
| Overtime | `common:entities.overtime` | Lembur | Overtime | Flattened: 1 overtime = 1 activity (ADR-010) |
| Attendance | `common:entities.attendance` | Kehadiran | Attendance | Clock-in/out |
| Monitoring | `common:entities.monitoring` | Pemantauan | Monitoring | |
| Pruning Request | `common:entities.pruningRequest` | Permohonan Pangkas | Pruning Request | Phase 3 public intake |
| Plant | `common:entities.plant` | Tanaman | Plant | |
| Seed | `common:entities.seed` | Bibit | Seed | Plant-seed ledger |

**Dropped terms — never reintroduce in UI copy:** `WorkerAssignment`, `OvertimeAktivitas`,
`Report` (entity), `/aktivitas` route, `/worker-schedules` route.

## Roles (`roles:*`) — ADR-009, lowercase enum values

| Enum value | Indonesian (id) | English (en) |
|---|---|---|
| `satgas` | Satgas | Field Worker |
| `linmas` | Linmas | Security |
| `korlap` | Koordinator Lapangan | Field Coordinator |
| `admin_rayon` | Admin Data | Data Admin |
| `kepala_rayon` | Kepala Rayon | Rayon Head |
| `management` | Manajemen | Management |
| `admin_system` | Admin Sistem | System Admin |
| `superadmin` | Super Admin | Super Admin |
| `staff_kecamatan` | Staf Kecamatan | District Staff |

**Removed roles — never reintroduce:** `worker`, `supervisor`, `admin`, `koordinator_lapangan`,
`admin_rayon`. Role values are **always lowercase**, never PascalCase.

## Status & priority (`status:*`)

| Value | Key | Indonesian (id) | English (en) |
|---|---|---|---|
| pending | `status:pending` | Menunggu | Pending |
| approved | `status:approved` | Disetujui | Approved |
| rejected | `status:rejected` | Ditolak | Rejected |
| in_progress | `status:in_progress` | Sedang Berjalan | In Progress |
| completed | `status:completed` | Selesai | Completed |
| cancelled | `status:cancelled` | Dibatalkan | Cancelled |
| active | `status:active` | Aktif | Active |
| overdue | `status:overdue` | Terlambat | Overdue |
| priority.low | `status:priority.low` | Rendah | Low |
| priority.medium | `status:priority.medium` | Biasa | Medium |
| priority.high | `status:priority.high` | Tinggi | High |
| priority.urgent | `status:priority.urgent` | Mendesak | Urgent |

## Adding or changing a term

1. Edit the term in **both** `id` and `en` for **both** platforms (web + mobile locale files).
2. If it's an API error, ensure the `code` exists in `api-error-codes.enum.ts` and both
   `errors.json` files (parity test enforces this).
3. Never hardcode a domain noun, role, or status string in a component — always resolve via `t(...)`.
