# Overtime Module

## Overview

The Overtime module manages overtime submission and approval workflow for SEKAR clockable roles (Phase 2E). It supports two flows: (1) **Start/End Overtime** — clock-in based overtime with in_progress status linked to a shift via shift_id, and (2) **Submit Overtime** — legacy form-based submission. Approval follows a 3-level hierarchy: Korlap approves satgas/linmas, Kepala Rayon approves korlap/admin_data, Top Management approves kepala_rayon.

## Module Structure

```
overtime/
├── entities/
│   └── overtime.entity.ts           # Overtime record with flat structure
├── dto/
│   ├── create-overtime.dto.ts       # Overtime submission DTO
│   └── reject-overtime.dto.ts       # Rejection reason DTO
├── overtime.service.ts              # Business logic
├── overtime.controller.ts           # API endpoints (6 routes)
├── overtime.module.ts               # Module configuration
├── overtime.service.spec.ts         # Service tests (13 tests)
└── overtime.controller.spec.ts      # Controller tests (6 tests)
```

## Database Schema

### overtimes table (FLAT structure)
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `area_id` (uuid, FK → areas, nullable)
- **`start_datetime`** (timestamptz) - Start datetime (ISO 8601, supports overnight)
- **`end_datetime`** (timestamptz) - End datetime (ISO 8601, supports overnight)
- `status` (enum: pending, approved, rejected)
- `approved_by` (uuid, FK → users, nullable)
- `approved_at` (timestamptz, nullable)
- `rejection_reason` (text, nullable)
- **`activity_type_id`** (uuid, FK → activity_types) - Single activity per overtime
- **`description`** (text) - Activity description
- **`photo_urls`** (text[]) - Array of photo URLs (1-3)
- **`gps_lat`** (decimal, nullable) - GPS latitude
- **`gps_lng`** (decimal, nullable) - GPS longitude
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Removed columns (Phase 2C update):** `date` (date), `start_time` (time), `end_time` (time), `notes` (text)

**Note:** Phase 2C simplified the overtime structure. Each overtime record now contains one activity directly (flat structure), rather than having a separate `overtime_aktivitas` table with nested activities.

## API Endpoints

All endpoints require authentication (`@UseGuards(JwtAuthGuard, RolesGuard)`).

### 1. Submit Overtime
**POST** `/overtime`
- **Roles:** Satgas, Linmas
- **Body:** `CreateOvertimeDto`
- **Response:** Created overtime record
- **Validations:**
  - Role must be in OVERTIME_SUBMITTERS
  - activity_type must be available for user's role
  - `start_datetime`: ISO 8601 datetime string (e.g. "2026-02-14T17:00:00+07:00")
  - `end_datetime`: ISO 8601 datetime string — must be after `start_datetime`
  - 1-3 photo URLs required
  - description required

### 2. Get My Overtime
**GET** `/overtime/my`
- **Roles:** Satgas, Linmas
- **Response:** Array of user's overtime submissions
- **Includes:** activity_type, area

### 3. Get Pending Overtime (for approval)
**GET** `/overtime`
- **Roles:** Korlap, Admin System, Superadmin
- **Response:** Array of pending overtime
- **Scope:** Korlap sees only their area
- **Includes:** activity_type, user, area

### 4. Get Overtime by ID
**GET** `/overtime/:id`
- **Roles:** Any authenticated user
- **Response:** Overtime details with all relations

### 5. Approve Overtime
**PATCH** `/overtime/:id/approve`
- **Roles:** Korlap
- **Response:** Updated overtime with approved status
- **Validations:**
  - Only Korlap can approve
  - Only pending overtime can be approved
  - Korlap can only approve for their area

### 6. Reject Overtime
**PATCH** `/overtime/:id/reject`
- **Roles:** Korlap
- **Body:** `RejectOvertimeDto` (reason required)
- **Response:** Updated overtime with rejected status
- **Validations:**
  - Only Korlap can reject
  - Only pending overtime can be rejected
  - Rejection reason is mandatory

## Business Rules

### Submission Rules
1. All clockable roles (satgas, linmas, korlap, admin_data, kepala_rayon) can submit overtime
2. Overtime is automatically associated with user's area_id
3. Each overtime submission must:
   - Reference a valid, active activity_type
   - Match user's role (activity_type.applicable_roles includes user.role)
   - Include 1-3 photos
   - Have a description
4. Overtime starts with status = 'pending'

### Approval Rules (3-level hierarchy)
1. **Korlap** approves satgas/linmas overtime (area-scoped)
2. **Kepala Rayon** approves korlap/admin_data overtime (rayon-scoped)
3. **Top Management** approves kepala_rayon overtime (city-wide, no scope check)
4. Only pending overtime can be approved/rejected
5. Self-approval is not allowed
6. Approval/rejection records:
   - approved_by (approver's user_id)
   - approved_at (timestamp)
   - rejection_reason (for rejections only)

### Activity Type Validation
The module validates that the activity_type is available for the user's role by checking:
```typescript
if (!actType.applicable_roles.includes(userRole))
```

This prevents workers from claiming overtime for activities they're not authorized to perform.

## Test Coverage

### Service Tests (overtime.service.spec.ts) - 13 tests
- ✅ Submit overtime by satgas
- ✅ Reject submission for non-OVERTIME_SUBMITTERS role
- ✅ Validate activity_type against user role
- ✅ Approve pending overtime by korlap
- ✅ Reject approval by non-korlap role
- ✅ Reject approval if already approved
- ✅ Reject approval if area mismatch
- ✅ Reject pending overtime by korlap
- ✅ Reject rejection by non-korlap role
- ✅ Return user overtime list
- ✅ Return pending overtime scoped to korlap area
- ✅ Return overtime details
- ✅ Throw NotFoundException if not found

### Controller Tests (overtime.controller.spec.ts) - 6 tests
- ✅ POST /overtime calls service.submit
- ✅ GET /overtime/my calls service.findMy
- ✅ GET /overtime calls service.findPending
- ✅ GET /overtime/:id calls service.findOne
- ✅ PATCH /overtime/:id/approve calls service.approve
- ✅ PATCH /overtime/:id/reject calls service.reject

**Total:** 19 tests, all passing ✅

## Dependencies

### External Modules
- `TypeOrmModule.forFeature([Overtime, ActivityType, User])`

### Role Groups (from `users/constants/role-groups.ts`)
- `OVERTIME_SUBMITTERS` = [SATGAS, LINMAS, KORLAP, ADMIN_DATA, KEPALA_RAYON]
- `OVERTIME_APPROVERS` = [KORLAP, KEPALA_RAYON, TOP_MANAGEMENT]
- `USER_MANAGERS` = [ADMIN_SYSTEM, SUPERADMIN]

### Entities
- `User` - For user lookup and role validation
- `Area` - For area association (nullable)
- `ActivityType` - For activity validation

## Example Usage

### Submit Overtime
```typescript
POST /overtime
Authorization: Bearer <jwt_token>

{
  "start_datetime": "2026-02-14T17:00:00+07:00",
  "end_datetime": "2026-02-14T20:00:00+07:00",
  "activity_type_id": "uuid-of-cleaning-activity",
  "description": "Cleaned main park area and pathways",
  "photo_urls": [
    "https://s3.amazonaws.com/before.jpg",
    "https://s3.amazonaws.com/after.jpg"
  ],
  "gps_lat": -7.250445,
  "gps_lng": 112.768845
}

// Overnight example:
{
  "start_datetime": "2026-02-14T22:00:00+07:00",
  "end_datetime": "2026-02-15T02:00:00+07:00",
  ...
}
```

### Approve Overtime
```typescript
PATCH /overtime/:id/approve
Authorization: Bearer <korlap_jwt_token>

// No body required
// Response: overtime with status = 'approved'
```

### Reject Overtime
```typescript
PATCH /overtime/:id/reject
Authorization: Bearer <korlap_jwt_token>

{
  "reason": "Overtime was not pre-approved by supervisor"
}
```

## Error Handling

### Common Errors
- `403 Forbidden` - Wrong role or area mismatch
- `404 Not Found` - Overtime or activity_type not found
- `400 Bad Request` - Invalid status transition or validation error

### Error Messages
- "Only satgas and linmas can submit overtime"
- "Activity type {name} is not available for your role"
- "Only korlap can approve overtime"
- "Only pending overtime can be approved"
- "You can only approve overtime for your area"
- "Rejection reason is required"

## Integration Points

### Phase 2C Integration
This module integrates with:
1. **Activity Types** - Validates overtime against activity_types.applicable_roles
2. **Users** - Gets user.area_id for scoping
3. **Areas** - Associates overtime with area (nullable for flexibility)

### Future Enhancements
- Analytics: Overtime hours by worker/area/date
- Notifications: Push notification on approval/rejection
- Reporting: Monthly overtime summary reports
- Payroll: Integration with payroll calculation system

## Notes

- Photo URLs are stored as an array (text[]) to support 1-3 photos per overtime
- GPS coordinates are optional (nullable) in case worker doesn't have GPS enabled
- Area association is nullable to handle edge cases (workers without assigned areas)
- **Simplified Structure:** Phase 2C flattened the overtime schema. Each overtime record now contains one activity directly, rather than supporting multiple activities per overtime.

## Created
- **Date:** February 10, 2026
- **Phase:** Phase 2C - Client Feedback
- **Author:** Backend Developer Agent
- **Test Coverage:** 100% (19/19 tests passing)
- **Last Updated:** February 12, 2026 (Updated to reflect flat schema)
