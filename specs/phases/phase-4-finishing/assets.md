# Phase 4: Asset Management Deep Dive

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 3 Infrastructure (Complete)
**Related Sub-Phase:** 4-3
**Related ADRs:** [ADR-026](../../architecture/decisions/ADR-026-asset-qr-code-strategy.md)

---

## Overview

The Asset Management module tracks physical equipment used in RTH (Ruang Terbuka Hijau) maintenance. Assets are scoped to rayons and areas, assignable to workers via QR code scanning, with scheduled maintenance tracking. The module supports offline QR scanning (asset_code in QR content) and integrates with the audit trail for full accountability.

---

## A. Asset Categories (6 Park-Specific)

| # | Category | Indonesian | Examples | Icon |
|---|----------|------------|----------|------|
| 1 | Cleaning Equipment | Alat Kebersihan | Sapu lidi, cangkul, sekop, gerobak sampah | broom |
| 2 | Garden Tools | Alat Pertamanan | Gunting rumput, mesin potong, gergaji, cangkul taman | scissors |
| 3 | Operational Vehicles | Kendaraan Operasional | Pickup truck, motor trail, sepeda | truck |
| 4 | Security Equipment | Peralatan Keamanan | HT radio, senter, rompi keamanan, CCTV | shield |
| 5 | Irrigation Equipment | Peralatan Irigasi | Selang, sprinkler, pompa air, pipa | droplet |
| 6 | General Supplies | Perlengkapan Umum | Tenda, meja lipat, kursi plastik, terpal | box |

---

## B. Asset Lifecycle

### B1. State Machine

```
                  ┌──────────────┐
                  │   available  │ <── Initial state
                  └──────┬───────┘
                         │ checkout
                         v
                  ┌──────────────┐
                  │    in_use    │
                  └──────┬───────┘
                    return│    │ report damage
                         │    v
                         │  ┌──────────────┐
                         │  │  maintenance  │
                         │  └──────┬───────┘
                         │    complete│
                         v         v
                  ┌──────────────┐
                  │   available  │
                  └──────┬───────┘
                         │ retire/loss
                         v
              ┌─────────────────────┐
              │  retired  |  lost   │  <- Terminal states
              └─────────────────────┘
```

### B2. Status Transitions

| Current Status | Action | New Status | Triggered By |
|---------------|--------|------------|--------------|
| available | POST /assets/:id/checkout | in_use | `satgas`, `linmas`, `korlap` |
| in_use | POST /assets/:id/return | available | `satgas`, `linmas`, `korlap` |
| in_use | POST /assets/:id/return (damaged) | maintenance | `satgas`, `linmas`, `korlap` |
| available/in_use | POST /assets/:id/maintenance | maintenance | `korlap`, `kepala_rayon`, admin |
| maintenance | PATCH /assets/maintenance/:id (complete) | available | `korlap`, `kepala_rayon`, admin |
| any | PATCH /assets/:id (retire) | retired | `admin_system`, `superadmin` |
| any | PATCH /assets/:id (lost) | lost | `korlap`, `kepala_rayon`, admin |

---

## C. QR Code System (ADR-026)

### C1. QR Code Content Format

```json
{
  "code": "AK-RU-001",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "app": "sekar"
}
```

- **code:** Human-readable asset code (printed below QR)
- **id:** UUID for API lookup
- **app:** Identifier to distinguish SEKAR QR codes from others

### C2. Asset Code Format

`{CATEGORY_PREFIX}-{RAYON_CODE}-{SEQUENCE}`

| Category | Prefix |
|----------|--------|
| Alat Kebersihan | AK |
| Alat Pertamanan | AP |
| Kendaraan Operasional | KO |
| Peralatan Keamanan | PK |
| Peralatan Irigasi | PI |
| Perlengkapan Umum | PU |

| Rayon | Code |
|-------|------|
| Rayon Utara | RU |
| Rayon Selatan | RS |
| Rayon Timur | RT |
| Rayon Barat | RB |
| Rayon Tengah | RTE |
| Rayon Tenggara | RTG |
| Rayon Barat Daya | RBD |

**Example:** `AK-RU-001` = First cleaning equipment item in Rayon Utara

### C3. QR Code Generation Specifications

- **Size:** 300x300 pixels
- **Error correction:** Level M (15% recovery)
- **Format:** PNG with white background
- **Storage:** S3 bucket under `qr-codes/` prefix
- **Printable version:** QR code + asset code text + asset name below

### C4. Offline Scanning Flow

1. Worker opens QR Scanner screen
2. Camera scans QR code
3. Parse JSON — extract `code` and `id`
4. Display asset_code immediately (no network needed)
5. If online: `GET /assets/scan/:code` for full details
6. If offline: show cached asset info (if previously viewed) or display code only

### C5. Bulk QR Generation

`POST /assets/qr/bulk` — generates QR codes for multiple assets:

```typescript
interface BulkQrRequest {
  assetIds: string[];  // Max 50 per request
}

interface BulkQrResponse {
  results: {
    assetId: string;
    assetCode: string;
    qrCodeUrl: string;
  }[];
}
```

Web interface provides "Print All" button that generates a printable HTML page with QR codes arranged in a grid (4x5 per A4 page).

---

## D. Assignment/Return Workflow

### D1. Checkout Flow

1. Worker scans QR code or searches asset
2. System verifies asset status = `available`
3. System verifies worker is in same area as asset (or korlap for multi-area)
4. Worker selects condition at checkout (good/fair/poor/damaged)
5. System creates `asset_assignments` record
6. System updates `assets.status` to `in_use`
7. Audit log entry created

### D2. Return Flow

1. Worker navigates to "My Assets" or scans QR code
2. System finds active assignment (`returned_at IS NULL`)
3. Worker selects condition at return
4. If condition degraded (e.g., was `good`, now `damaged`):
   - System prompts for notes (required when condition worsens)
   - If condition = `unusable`, asset moves to `maintenance` status
5. System updates `asset_assignments.returned_at` and `condition_at_return`
6. System updates `assets.status` back to `available` (or `maintenance`)
7. Audit log entry created

### D3. Overdue Return Alert

Assets with `expected_return_at` past due and `returned_at IS NULL`:
- Cron job checks daily at 08:00 WIB
- Sends notification to asset assignee and area korlap
- Shows in web dashboard "Overdue Assets" section

---

## E. Maintenance Management

### E1. Maintenance Types

| Type | Description | Typical Frequency |
|------|-------------|-------------------|
| Routine | Scheduled preventive maintenance | Monthly for heavy equipment, quarterly for tools |
| Repair | Fix broken/damaged items | As needed |
| Inspection | Safety/quality check | Monthly for vehicles, quarterly for others |
| Replacement | Replace worn parts or entire asset | As needed |

### E2. Maintenance Workflow

1. Korlap/admin creates maintenance record (`POST /assets/:id/maintenance`)
2. Asset status changes to `maintenance`
3. If asset was `in_use`, active assignment is auto-returned
4. Maintenance appears on calendar for assigned personnel
5. When completed: `PATCH /assets/maintenance/:id` with `status=completed`
6. Asset condition updated, status returns to `available`
7. `assets.last_maintenance_at` updated, `next_maintenance_at` calculated

### E3. Overdue Maintenance Cron

```typescript
@Cron('0 8 * * *', { timeZone: 'Asia/Jakarta' })  // Daily at 08:00 WIB
async checkOverdueMaintenance() {
  await this.maintenanceRepo.update(
    {
      status: 'scheduled',
      scheduled_at: LessThan(new Date()),
    },
    { status: 'overdue' },
  );
  // Log count of newly overdue maintenances
}
```

---

## F. Scope Enforcement (Rayon/Area)

### F1. Asset Visibility Rules

| Role | Can See | Can Manage |
|------|---------|------------|
| `satgas`, `linmas` | Own area assets | Checkout/return own area |
| `korlap` | Assigned area(s) assets | Checkout/return, create maintenance |
| `admin_data` | Own area assets | View only |
| `kepala_rayon` | All rayon assets | Full CRUD within rayon |
| `top_management` | All assets (read-only) | View only |
| `admin_system`, `superadmin` | All assets | Full CRUD system-wide |

### F2. Rayon-Level vs Area-Level Assets

Some assets belong to a rayon (not specific area):
- Vehicles are typically rayon-level (`area_id = NULL`, `rayon_id` set)
- Tools and equipment are area-level (`area_id` and `rayon_id` both set)
- Admin creates asset with either area_id, rayon_id, or both

---

## G. Audit Trail Integration

All asset operations are logged to `audit_logs`:

| Action | Entity Type | Logged Fields |
|--------|------------|---------------|
| Asset created | `asset` | Full asset data |
| Asset updated | `asset` | Changed fields (old/new) |
| Asset deleted | `asset` | Deletion reason |
| Asset checked out | `asset_assignment` | Assignee, condition |
| Asset returned | `asset_assignment` | Return condition, notes |
| Maintenance created | `asset_maintenance` | Schedule, type |
| Maintenance completed | `asset_maintenance` | Completion details |

---

**Last Updated:** 2026-03-13
