# Overtime Module

## Overview

The Overtime module manages overtime submission and approval workflow for SEKAR field workers (Satgas and Linmas). Workers submit overtime requests with associated activities and photos, which are then approved or rejected by their area coordinator (Korlap).

## Module Structure

```
overtime/
├── entities/
│   ├── overtime.entity.ts           # Main overtime record
│   └── overtime-aktivitas.entity.ts # Activities performed during overtime
├── dto/
│   ├── create-overtime.dto.ts       # Overtime submission DTOs
│   └── reject-overtime.dto.ts       # Rejection reason DTO
├── overtime.service.ts              # Business logic
├── overtime.controller.ts           # API endpoints (6 routes)
├── overtime.module.ts               # Module configuration
├── overtime.service.spec.ts         # Service tests (13 tests)
└── overtime.controller.spec.ts      # Controller tests (6 tests)
```

## Database Schema

### overtimes table
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `area_id` (uuid, FK → areas, nullable)
- `date` (date) - Overtime date
- `start_time` (time) - Start time (HH:MM)
- `end_time` (time) - End time (HH:MM)
- `status` (enum: pending, approved, rejected)
- `approved_by` (uuid, FK → users, nullable)
- `approved_at` (timestamptz, nullable)
- `rejection_reason` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### overtime_aktivitas table
- `id` (uuid, PK)
- `overtime_id` (uuid, FK → overtimes)
- `activity_type_id` (uuid, FK → activity_types)
- `description` (text)
- `photo_urls` (text[]) - Array of photo URLs (1-3)
- `gps_lat` (decimal, nullable)
- `gps_lng` (decimal, nullable)
- `created_at` (timestamptz)

## API Endpoints

All endpoints require authentication (`@UseGuards(JwtAuthGuard, RolesGuard)`).

### 1. Submit Overtime
**POST** `/overtime`
- **Roles:** Satgas, Linmas
- **Body:** `CreateOvertimeDto`
- **Response:** Created overtime with nested aktivitas
- **Validations:**
  - Role must be in OVERTIME_SUBMITTERS
  - Each activity_type must be available for user's role
  - At least 1 aktivitas required
  - Date format: YYYY-MM-DD
  - Time format: HH:MM

### 2. Get My Overtime
**GET** `/overtime/my`
- **Roles:** Satgas, Linmas
- **Response:** Array of user's overtime submissions
- **Includes:** aktivitas, activity_type, area

### 3. Get Pending Overtime (for approval)
**GET** `/overtime`
- **Roles:** Korlap, Admin System, Superadmin
- **Response:** Array of pending overtime
- **Scope:** Korlap sees only their area
- **Includes:** aktivitas, activity_type, user, area

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
1. Only Satgas and Linmas can submit overtime
2. Overtime is automatically associated with user's area_id
3. Each aktivitas must:
   - Reference a valid, active activity_type
   - Match user's role (activity_type.applicable_roles includes user.role)
   - Include 1-3 photos
   - Have a description
4. Overtime starts with status = 'pending'

### Approval Rules
1. Only Korlap can approve/reject overtime
2. Only pending overtime can be approved/rejected
3. Korlap can only approve overtime for their assigned area
4. Approval/rejection records:
   - approved_by (approver's user_id)
   - approved_at (timestamp)
   - rejection_reason (for rejections only)

### Activity Type Validation
The module validates that each activity_type is available for the user's role by checking:
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
- `TypeOrmModule.forFeature([Overtime, OvertimeAktivitas, ActivityType, User])`

### Role Groups (from `users/constants/role-groups.ts`)
- `OVERTIME_SUBMITTERS` = [SATGAS, LINMAS]
- `OVERTIME_APPROVERS` = [KORLAP]
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
  "date": "2026-02-10",
  "start_time": "17:00",
  "end_time": "20:00",
  "notes": "Extra cleaning work after regular shift",
  "aktivitas": [
    {
      "activity_type_id": "uuid-of-cleaning-activity",
      "description": "Cleaned main park area and pathways",
      "photo_urls": [
        "https://s3.amazonaws.com/before.jpg",
        "https://s3.amazonaws.com/after.jpg"
      ],
      "gps_lat": -7.250445,
      "gps_lng": 112.768845
    }
  ]
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
1. **Activity Types** - Validates aktivitas against activity_types.applicable_roles
2. **Users** - Gets user.area_id for scoping
3. **Areas** - Associates overtime with area (nullable for flexibility)

### Future Enhancements
- Analytics: Overtime hours by worker/area/date
- Notifications: Push notification on approval/rejection
- Reporting: Monthly overtime summary reports
- Payroll: Integration with payroll calculation system

## Notes

- Overtime is created with `cascade: true` on aktivitas, so nested aktivitas are saved atomically
- The module uses `eager: true` on overtime.aktivitas relation for automatic loading
- Photo URLs are stored as an array (text[]) to support 1-3 photos per aktivitas
- GPS coordinates are optional (nullable) in case worker doesn't have GPS enabled
- Area association is nullable to handle edge cases (workers without assigned areas)

## Created
- **Date:** February 10, 2026
- **Phase:** Phase 2C - Client Feedback
- **Author:** Backend Developer Agent
- **Test Coverage:** 100% (19/19 tests passing)


<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

*No recent activity*
</claude-mem-context>