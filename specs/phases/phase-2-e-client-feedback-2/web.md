# Phase 2E: Web Requirements

**Last Updated:** 2026-03-10
**Status:** Not Started
**Platform:** Next.js 16.x, React 19, TailwindCSS 4.x, Google Maps
**Related ADRs:** [ADR-012](../../architecture/decisions/ADR-012-phone-number-login.md), [ADR-013](../../architecture/decisions/ADR-013-multi-area-assignment.md), [ADR-014](../../architecture/decisions/ADR-014-overtime-clock-in-flow.md), [ADR-015](../../architecture/decisions/ADR-015-audit-trail.md)
**See also:** [Backend Requirements](./backend.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| File/Component | Key Facts |
|----------------|-----------|
| `login/page.tsx` | Username + password form; calls `/auth/login` with `{ username, password }` |
| `monitoring/page.tsx` | Split layout with Google Maps map + side panel; role-scoped filters |
| `users/` pages | User management CRUD; no profile picture support |
| `overtime/` pages | List/detail views for overtime records; no clock-in/out flow |
| `lib/api/auth.ts` | Login function with username/password |
| `lib/types.ts` | `LoginRequest`, `User`, `Overtime` interfaces |

---

## Overview of Changes

| Component | Change Type | Description |
|-----------|-------------|-------------|
| Login page | Enhancement | Accept identifier (phone/username) |
| User management | Enhancement | Profile picture upload, phone number field |
| Monitoring page | Enhancement | Multi-area korlap filters, admin_data access, profile pics in markers |
| Overtime pages | Enhancement | View overtime shifts (clock-in/out records) |
| Task detail | Enhancement | Audit trail / revision history section |
| Activity detail | Enhancement | Audit trail section |
| **New: User areas management** | New page/component | Assign areas to users (korlap multi-area) |

---

## A. Login Page Update

**File:** `fe/web/src/app/(auth)/login/page.tsx`

### Changes

1. Change label from "Username" to "Username atau Nomor HP"
2. Update form field name from `username` to `identifier`
3. Update API call: `{ identifier, password }`

```tsx
<Input
  label="Username atau Nomor HP"
  name="identifier"
  placeholder="Masukkan username atau nomor HP"
  value={identifier}
  onChange={(e) => setIdentifier(e.target.value)}
/>
```

### Type Updates

```typescript
// lib/types.ts
export interface LoginRequest {
  identifier: string; // was: username
  password: string;
}
```

---

## B. User Management Updates

### B1. Profile Picture in User Form

**Files:**
- `fe/web/src/app/(dashboard)/users/[id]/page.tsx`
- `fe/web/src/app/(dashboard)/users/new/page.tsx`

Add profile picture upload field:

```
┌────────────────────────────────────────────────────┐
│  Edit User                                         │
├────────────────────────────────────────────────────┤
│  ┌──────┐                                          │
│  │[pic] │  Drag & drop or click to upload          │
│  │      │  JPEG, PNG, WebP (max 5MB)               │
│  └──────┘                                          │
│                                                    │
│  Username:    [___________________]                │
│  Phone:       [___________________]    ← NEW       │
│  Role:        [dropdown]                           │
│  Rayon:       [dropdown]                           │
│  Area:        [multi-select]           ← NEW       │
│  ...                                               │
└────────────────────────────────────────────────────┘
```

### B2. Phone Number Field

Add phone number input with Indonesian format validation:

```tsx
<Input
  label="Nomor HP"
  name="phone_number"
  placeholder="081234567890"
  pattern="^(\+62|0)[0-9]{8,13}$"
/>
```

### B3. Multi-Area Assignment (Korlap)

When editing a korlap user, show multi-select for areas within their rayon:

```tsx
{user.role === 'korlap' && (
  <MultiSelect
    label="Area yang Ditangani"
    options={areasInRayon}
    value={selectedAreas}
    onChange={handleAreaChange}
  />
)}
```

This calls `POST /users/:userId/areas` to persist assignments.

---

## C. Monitoring Page Updates

### C1. Profile Pictures in Map Markers

**File:** `fe/web/src/components/maps/MonitoringMap.tsx`

Show user profile picture in Google Maps markers:

```typescript
// Create marker element with profile picture
const el = document.createElement('div');
el.className = 'marker';
if (user.profile_picture_url) {
  el.style.backgroundImage = `url(${user.profile_picture_url})`;
  el.style.backgroundSize = 'cover';
  el.style.borderRadius = '50%';
} else {
  // Fallback: default role icon
}
```

### C2. Multi-Area Filter for Korlap

**File:** `fe/web/src/components/monitoring/MonitoringSidePanel.tsx`

For korlap with multiple areas, show multi-select area filter:

```tsx
{currentUser.role === 'korlap' && (
  <div>
    <label>Area (assigned)</label>
    {assignedAreas.map(area => (
      <Checkbox
        key={area.id}
        label={area.name}
        checked={selectedAreaIds.includes(area.id)}
        onChange={() => toggleArea(area.id)}
      />
    ))}
  </div>
)}
```

### C3. Admin Data Monitoring Access

Grant admin_data users access to the monitoring page with rayon-level scope (same as kepala_rayon):

- Add `admin_data` to allowed roles for monitoring route
- Pre-set rayon filter to user's rayon
- Show all areas within rayon as filter options

### C4. Profile Picture in User Detail Panel

**File:** `fe/web/src/components/monitoring/UserDetailPanel.tsx`

Show user's profile picture in the detail panel header:

```
┌───────────────────────┐
│  ┌────┐               │
│  │[pic]│ Satgas 1      │
│  │    │ 081234567011  │
│  └────┘               │
│  Status: Active       │
│  Area: Taman Bungkul  │
│  ...                  │
└───────────────────────┘
```

---

## D. Overtime Page Updates

### D1. Overtime List Enhancement

**File:** `fe/web/src/app/(dashboard)/overtime/page.tsx`

Show overtime records with linked shift data (clock-in/out times):

```
┌──────────────────────────────────────────────────────────────────┐
│  Lembur                                        [+ Filter]       │
├──────┬──────────┬───────────┬───────────┬──────────┬────────────┤
│ User │ Tanggal  │ Clock In  │ Clock Out │ Durasi   │ Status     │
├──────┼──────────┼───────────┼───────────┼──────────┼────────────┤
│ S1   │ 10 Mar   │ 17:30     │ 20:00     │ 2.5 jam  │ Pending    │
│ S2   │ 10 Mar   │ 17:45     │ -         │ Ongoing  │ In Progress│
└──────┴──────────┴───────────┴───────────┴──────────┴────────────┘
```

### D2. Overtime Detail Enhancement

Show linked shift info and mandatory activity in overtime detail:

- Shift clock-in/out times and GPS
- Selfie photos (if provided)
- Linked activity submission
- Approval actions

---

## E. Audit Trail / Revision History

### E1. Task Detail Page

**File:** `fe/web/src/app/(dashboard)/tasks/[id]/page.tsx`

Add "Riwayat Perubahan" section with vertical timeline:

```
┌─────────────────────────────────────────────────────────────┐
│  Task Detail: Pembersihan Taman Bungkul                     │
├─────────────────────────────────────────────────────────────┤
│  Status: Selesai                                            │
│  Assigned to: Satgas 1                                      │
│  ...                                                        │
├─────────────────────────────────────────────────────────────┤
│  Riwayat Perubahan                                          │
│  ───────────────────                                        │
│  ● Dibuat oleh Korlap1            10 Mar 2026, 08:00       │
│  ● Diterima oleh Satgas1          10 Mar 2026, 09:30       │
│  ● Revisi diminta oleh Korlap1    10 Mar 2026, 14:00       │
│    "Foto bukti kurang jelas"                                │
│  ● Dikerjakan ulang oleh Satgas1  10 Mar 2026, 15:00       │
│  ● Diverifikasi oleh Korlap1     10 Mar 2026, 16:00       │
└─────────────────────────────────────────────────────────────┘
```

### E2. Activity Detail Page

**File:** `fe/web/src/app/(dashboard)/activities/[id]/page.tsx`

Same pattern — show approval/rejection history timeline.

---

## F. New Pages/Components Summary

| Type | Path/Name | Description |
|------|-----------|-------------|
| Component | `components/users/ProfilePictureUpload.tsx` | Drag-and-drop image upload |
| Component | `components/users/MultiAreaSelect.tsx` | Multi-select for area assignment |
| Component | `components/common/AuditTimeline.tsx` | Vertical timeline for audit logs |
| Enhancement | `components/monitoring/MonitoringMap.tsx` | Profile pic markers |
| Enhancement | `components/monitoring/MonitoringSidePanel.tsx` | Multi-area filter |

---

## G. Route Access Updates

| Route | Current Roles | New Roles (2E) |
|-------|--------------|-----------------|
| `/monitoring` | korlap, kepala_rayon, top_management, admin_system, superadmin | **+admin_data** |
| `/overtime` | korlap, kepala_rayon, admin_system, superadmin | **+admin_data** (view), all clockable (list own) |

---

## H. API Client Updates

**File:** `fe/web/src/lib/api/`

### New API Functions

```typescript
// auth.ts
export async function login(identifier: string, password: string): Promise<LoginResponse>;

// users.ts
export async function uploadProfilePicture(userId: string, file: File): Promise<{ profile_picture_url: string }>;
export async function getUserAreas(userId: string): Promise<UserArea[]>;
export async function assignUserAreas(userId: string, areaIds: string[]): Promise<UserArea[]>;
export async function removeUserArea(userId: string, areaId: string): Promise<void>;

// audit.ts (new)
export async function getAuditTrail(entityType: string, entityId: string): Promise<AuditLog[]>;

// overtime.ts (updated)
export async function getActiveOvertime(): Promise<Overtime | null>;
```
