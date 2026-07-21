# API Contracts - Complete Endpoint Specifications

Endpoint specifications for the SEKAR Backend.

> **Scope note:** the backend now exposes **~218 endpoints across 33 modules**. This document
> fully catalogs **Phase 1–2D** (the request/response contracts below); the later modules — Phase 3
> (plants, pruning-requests, service-capacity, plant-seeds) and Phase 5 (assets, reporting,
> analytics) plus `app-releases` and `health` — follow the same conventions and are authoritatively
> described by the **live Swagger docs at `/api/v1/docs`**, which is the source of truth for the
> complete contract. See `specs/COMPLETION_STATUS.md` for status/metrics.

## Overview

- **Base URL:** `http://localhost:3000/api/v1` (dev) | `https://api.sekar.wahyutrip.com/api/v1` (staging)
- **Swagger Documentation:** `/api/v1/docs` — **live, complete contract (source of truth)**
- **Authentication:** JWT Bearer token (15-min access + 7-day refresh with rotation)
- **Content Type:** `application/json` (except file uploads: `multipart/form-data`)
- **Total Endpoints:** **~218** across 33 modules (Phase 1–2D fully documented here; Phase 3–5 modules — Swagger is source of truth)
- **Backend:** NestJS 11.x, Node.js >=24.13.0, TypeScript 5.x
- **Database:** PostgreSQL 14+ with TypeORM
- **Error Codes:** 53 standardized codes (see `error-handling.md` §Standardized Error Codes)
- **Rate Limiting:** 100 req/min global, 5 req/min auth endpoints
- **Last Updated:** 2026-07-21
- **Phase 2C Note:** Terminology cleanup (ADR-010) has implemented route renames: `/aktivitas`→`/activities`, `/worker-schedules`→`/schedules`. Dropped `/workers/:id/assign`. Flattened overtime DTO. See Phase 2C specs for full details.
- **Phase 2D Note:** Monitoring enhancements — 9 new endpoints (location history, day summary, config CRUD, staffing summary, area boundary GET/PUT, boundaries, reassign), 4 enhanced endpoints (live-users filters + new fields, area/:id per-role counts).

## Table of Contents

### Phase 1 (Implemented)
1. [App Endpoints](#app-endpoints) (2 endpoints)
2. [Authentication](#authentication-module) (4 endpoints)
3. [Users Management](#users-module) (6 endpoints)
4. [Area Types](#area-types-module) (5 endpoints)
5. [Areas Management](#areas-module) (5 endpoints)
6. [Worker Assignments](#worker-assignments-module) (2 endpoints) **→ DROPPED in Phase 2C ✅ Removed**
7. [Shifts Management](#shifts-module) (5 endpoints)
8. [Reports Management](#reports-module) (6 endpoints) **→ Renamed to Activities (`/activities`) ✅ Implemented**
9. [Location Tracking](#location-module) (3 endpoints)
10. [Supervisor Dashboard](#supervisor-module) (3 endpoints)

### Phase 2 (Planned)
11. [Rayons Module](#rayons-module) (6 endpoints)
12. [Shift Definitions Module](#shift-definitions-module) (2 endpoints)
13. [Activity Types Module](#activity-types-module) (4 endpoints)
14. [Area Staff Requirements Module](#area-staff-requirements-module) (4 endpoints)
15. [Worker Schedules Module](#worker-schedules-module) (5 endpoints) **→ Renamed to Schedules (`/schedules`) ✅ Implemented**
16. [Monitoring Module](#monitoring-module) (4 endpoints + 9 Phase 2D)
17. [Areas Extensions](#areas-module-extensions-phase-2) (3 endpoints + 2 Phase 2D)
18. [Notifications Module](#notifications-module-phase-2) (5 endpoints)
19. [Tasks Module](#tasks-module-phase-2) (10 endpoints)

### Phase 2D (Monitoring Enhancements)
20. [Phase 2D Monitoring Enhancements](#phase-2d-monitoring-enhancements) (9 new endpoints)
21. [WebSocket Events (Monitoring)](#websocket-events-monitoring)

---

## App Endpoints

### GET /api/v1

Get basic API information (no authentication required).

**Request:**
```http
GET /api HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**
```json
{
  "message": "SEKAR Backend API",
  "version": "1.0.0",
  "status": "running"
}
```

---

### GET /api/v1/health

Health check endpoint for monitoring (no authentication required).

**Request:**
```http
GET /api/v1/health HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-01-09T10:00:00.000Z",
  "uptime": 12345.67,
  "environment": "development"
}
```

---

## Authentication Module

### POST /api/v1/auth/login

Authenticate user and obtain JWT token.

**Request:**
```http
POST /api/v1/auth/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "username": "worker1",
  "password": "12345678"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `username` | string | Yes | Max 50 characters |
| `password` | string | Yes | Min 6 characters |

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4MTI3ZGM4MS05N2NmLTRjNmUtYTFiNC1iMWFjZTI4NGVhNzgiLCJ1c2VybmFtZSI6IndvcmtlcjEiLCJyb2xlIjoid29ya2VyIiwiaWF0IjoxNzM2NDIwNDAwLCJleHAiOjE3MzcwMjUyMDB9.abc123...",
  "user": {
    "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "username": "worker1",
    "full_name": "Pekerja Satu",
    "role": "satgas"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": [
    "username is required",
    "password must be at least 6 characters"
  ],
  "error": "Bad Request"
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**Notes:**
- Access token expires after 15 minutes
- Refresh token expires after 7 days
- Password is hashed with bcrypt (10 rounds)
- Returns 401 if account is inactive (`is_active = false`)

---

### POST /api/v1/auth/refresh

Refresh access token using a valid refresh token.

**Request:**
```http
POST /api/v1/auth/refresh HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `refresh_token` | string | Yes | Valid JWT refresh token |

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "username": "worker1",
    "full_name": "Pekerja Satu",
    "role": "satgas"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "code": "AUTH_INVALID_TOKEN",
  "message": "Invalid refresh token",
  "timestamp": "2026-01-16T10:30:00.000Z",
  "path": "/api/v1/auth/refresh"
}
```

**Notes:**
- Both access and refresh tokens are rotated for enhanced security
- Access token expires after 15 minutes
- Refresh token expires after 7 days
- Use this endpoint to obtain a new access token without requiring re-login

---

### GET /api/v1/auth/me

Get current authenticated user information.

**Request:**
```http
GET /api/v1/auth/me HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK) - Worker with Assigned Area:**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "worker1",
  "full_name": "Pekerja Satu",
  "role": "satgas",
  "monitoring_scope": "location",
  "region_id": null,
  "assigned_location_ids": [
    "c3d4e5f6-a7b8-9012-cdef-123456789012"
  ],
  "created_at": "2026-01-09T10:00:00.000Z",
  "assigned_area": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "name": "Taman Bungkul",
    "location_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "area_type": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "code": "park",
      "name": "Taman",
      "description": "Park area"
    },
    "gps_lat": -7.2905,
    "gps_lng": 112.7398,
    "radius_meters": 150,
    "address": "Jl. Taman Bungkul, Darmo, Surabaya",
    "created_at": "2026-01-09T10:00:00.000Z",
    "updated_at": "2026-01-09T10:00:00.000Z"
  }
}
```

**Response (200 OK) - admin_system/korlap/kepala_rayon:**
```json
{
  "id": "9237ec92-08df-5d7f-b2c5-c2bdf395fb89",
  "username": "supervisor1",
  "full_name": "Supervisor Satu",
  "role": "korlap",
  "monitoring_scope": "region",
  "region_id": "22222222-2222-2222-2222-222222222202",
  "assigned_location_ids": [
    "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "c3d4e5f6-a7b8-9012-cdef-123456789013"
  ],
  "created_at": "2026-01-09T10:00:00.000Z"
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Notes:**
- `monitoring_scope` is one of `city`, `district`, `region`, `location`, or `none` (per ADR-044); determines dashboard visibility
- `region_id` is the user's assigned region (nullable); korlap/kepala_rayon may have a region scope for drill-down
- `assigned_location_ids` lists the user's directly assigned locations (used by korlap to determine coverage)
- For workers, includes full assigned area details with area type
- GPS coordinates returned as numbers (not strings)
- Password field never included in response
- `assigned_area` is null if worker not assigned

---

### POST /api/v1/auth/logout

Logout and invalidate current session (requires authentication).

**Request:**
```http
POST /api/v1/auth/logout HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Notes:**
- Invalidates the current access token
- Client should clear stored tokens after successful logout
- Returns 401 if no valid token provided

---

## Users Module

### POST /api/v1/users

Create a new user (admin_system/superadmin only).

**Request:**
```http
POST /api/v1/users HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "username": "worker4",
  "password": "12345678",
  "full_name": "Pekerja Empat",
  "role": "satgas"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `username` | string | Yes | Max 50 chars, alphanumeric with _ and -, unique |
| `password` | string | Yes | Min 6 characters |
| `full_name` | string | Yes | Max 100 characters |
| `role` | enum | No | `satgas`, `linmas`, `korlap`, `admin_rayon`, `kepala_rayon`, `management`, `admin_system`, `superadmin` (default: `satgas`) |

**Response (201 Created):**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "worker4",
  "full_name": "Pekerja Empat",
  "role": "satgas",
  "is_active": true,
  "created_at": "2026-01-09T10:00:00.000Z"
}
```

**Response (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Username already exists",
  "error": "Conflict"
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

### GET /api/v1/users

Get all users (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
GET /api/v1/users HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
  {
    "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "username": "worker1",
    "full_name": "Pekerja Satu",
    "role": "satgas",
    "is_active": true,
    "created_at": "2026-01-09T10:00:00.000Z"
  },
  {
    "id": "9237ec92-08df-5d7f-b2c5-c2bdf395fb89",
    "username": "supervisor1",
    "full_name": "Supervisor Satu",
    "role": "korlap",
    "is_active": true,
    "created_at": "2026-01-09T10:00:00.000Z"
  }
]
```

---

### GET /api/v1/users/:id

Get user by ID (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
GET /api/v1/users/8127dc81-97cf-4c6e-a1b4-b1ace284ea78 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | User unique identifier |

**Response (200 OK):**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "worker1",
  "full_name": "Pekerja Satu",
  "role": "satgas",
  "is_active": true,
  "created_at": "2026-01-09T10:00:00.000Z",
  "updated_at": "2026-01-09T10:00:00.000Z"
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "User with ID 8127dc81-97cf-4c6e-a1b4-b1ace284ea78 not found",
  "error": "Not Found"
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Validation failed (uuid is expected)",
  "error": "Bad Request"
}
```

---

### PATCH /api/v1/users/:id

Update user (admin_system/superadmin only).

**Request:**
```http
PATCH /api/v1/users/8127dc81-97cf-4c6e-a1b4-b1ace284ea78 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "full_name": "Pekerja Satu Updated",
  "password": "new12345678",
  "is_active": true
}
```

**Request Body Schema (all optional):**
| Field | Type | Validation |
|-------|------|------------|
| `full_name` | string | Max 100 characters |
| `password` | string | Min 6 characters |
| `role` | enum | `worker`, `supervisor`, `admin` |
| `is_active` | boolean | - |

**Response (200 OK):**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "worker1",
  "full_name": "Pekerja Satu Updated",
  "role": "satgas",
  "is_active": true,
  "created_at": "2026-01-09T10:00:00.000Z",
  "updated_at": "2026-01-09T11:00:00.000Z"
}
```

---

### DELETE /api/v1/users/:id

Soft delete user (admin_system/superadmin only).

**Request:**
```http
DELETE /api/v1/users/8127dc81-97cf-4c6e-a1b4-b1ace284ea78 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
```

**Response (200 OK):**
```json
{}
```

**Notes:**
- Soft delete: sets `is_active = false`
- User cannot login after soft delete
- Data preserved for audit trail

---

### PATCH /api/v1/users/me/change-password

Change current user's password (All authenticated users).

**Request:**
```http
PATCH /api/v1/users/me/change-password HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "current_password": "12345678",
  "new_password": "newsecurepassword456"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `current_password` | string | Yes | Current password for verification |
| `new_password` | string | Yes | Min 6 characters, must be different from current |

**Response (204 No Content):**
```
(Empty response body)
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "New password must be different from current password",
  "error": "Bad Request"
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Current password is incorrect",
  "error": "Unauthorized"
}
```

**Notes:**
- All authenticated users can change their own password
- Current password must be verified before change
- New password must be different from current password
- Password is hashed using bcrypt with 10 salt rounds
- Password change is logged for audit trail
- User remains logged in after password change (token still valid)

---

## Area Types Module

### GET /api/v1/area-types

Get all area types (authenticated users).

**Request:**
```http
GET /api/v1/area-types HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "code": "park",
    "name": "Taman",
    "description": "Park area"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "code": "pedestrian",
    "name": "Trotoar",
    "description": "Pedestrian walkway"
  },
  {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "code": "mini_garden",
    "name": "Taman Mini",
    "description": "Mini garden or green space"
  },
  {
    "id": "d4e5f6a7-b8c9-0123-def4-234567890123",
    "code": "street",
    "name": "Jalanan",
    "description": "Street with trees or greenery"
  }
]
```

**Notes:**
- Read-only lookup table
- Seeded during database initialization
- Used for categorizing work areas

---

### GET /api/v1/area-types/:id

Get area type by ID (authenticated users).

**Request:**
```http
GET /api/v1/area-types/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "code": "park",
  "name": "Taman",
  "description": "Park area"
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "LocationType with ID a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found",
  "error": "Not Found"
}
```

---

### POST /api/v1/area-types

Create a new area type (admin_system/superadmin only).

**Request:**
```http
POST /api/v1/area-types HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "code": "botanical_garden",
  "name": "Kebun Raya",
  "description": "Botanical garden area"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `code` | string | Yes | Lowercase alphanumeric with underscores, max 20 characters, unique |
| `name` | string | Yes | Max 50 characters |
| `description` | string | No | Optional description |

**Response (201 Created):**
```json
{
  "id": "e5f6a7b8-c9d0-1234-ef01-567890123456",
  "code": "botanical_garden",
  "name": "Kebun Raya",
  "description": "Botanical garden area",
  "created_at": "2026-01-23T10:00:00.000Z",
  "updated_at": "2026-01-23T10:00:00.000Z"
}
```

**Response (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Area type with code \"botanical_garden\" already exists",
  "error": "Conflict"
}
```

**Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

### PATCH /api/v1/location-types/:id

Update an existing area type (admin_system/superadmin only).

**Request:**
```http
PATCH /api/v1/area-types/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Taman Kota",
  "description": "City park area"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `code` | string | No | Lowercase alphanumeric with underscores, max 20 characters, unique |
| `name` | string | No | Max 50 characters |
| `description` | string | No | Optional description |

**Response (200 OK):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "code": "park",
  "name": "Taman Kota",
  "description": "City park area",
  "created_at": "2026-01-08T10:00:00.000Z",
  "updated_at": "2026-01-23T10:00:00.000Z"
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Area type with ID a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found",
  "error": "Not Found"
}
```

**Response (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Area type with code \"pedestrian\" already exists",
  "error": "Conflict"
}
```

---

### DELETE /api/v1/location-types/:id

Soft delete an area type (admin_system/superadmin only). Cannot delete if areas reference this type.

**Request:**
```http
DELETE /api/v1/area-types/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
```

**Response (204 No Content):**
*(empty body)*

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Cannot delete area type: 5 area(s) reference this type",
  "error": "Bad Request"
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Area type with ID a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found",
  "error": "Not Found"
}
```

---

## Locations Module

**Route alias:** Backend serves the canonical `/locations` route and the `/areas` legacy alias via `@Controller(['locations','areas'])`. Use `/locations` for new code. The boundary `?level=area` parameter is a deliberate seam (see Rayons Module note).

### POST /api/v1/locations

Create a new location.

**Deprecated:** `/api/v1/areas` — use `/api/v1/locations`

Create a new area (admin_system/superadmin only).

**Request:**
```http
POST /api/v1/areas HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Taman Bungkul",
  "location_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "radius_meters": 150,
  "address": "Jl. Taman Bungkul, Darmo, Surabaya"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 200 characters |
| `location_type_id` | UUID | Yes | Valid area type UUID |
| `gps_lat` | number | Yes | -90 to 90 |
| `gps_lng` | number | Yes | -180 to 180 |
| `radius_meters` | number | Yes | 1 to 10000 |
| `address` | string | No | Max 500 characters |

**Response (201 Created):**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "name": "Taman Bungkul",
  "location_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "locationType": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "code": "park",
    "name": "Taman",
    "description": "Park area"
  },
  "gps_lat": "-7.2905",
  "gps_lng": "112.7398",
  "radius_meters": "150",
  "address": "Jl. Taman Bungkul, Darmo, Surabaya",
  "is_active": true,
  "created_at": "2026-01-09T10:00:00.000Z",
  "updated_at": "2026-01-09T10:00:00.000Z"
}
```

**Notes:**
- GPS coordinates stored as DECIMAL(10,8) and DECIMAL(11,8)
- Returned as strings in JSON (PostgreSQL DECIMAL handling)
- `locationType` relation eager loaded
- `radius_meters` defines clock-in boundary (default ±100m)

---

### GET /api/v1/locations

Get all areas with optional filtering (authenticated users).

> **Pagination (Phase 4-6 C2):** pass `?page=&limit=` (limit max 100) to receive a `PaginatedResponseDto` (`{ data, meta: { total, page, limit, totalPages } }`); without the params the legacy shape below is returned unchanged.

**Request:**
```http
GET /api/v1/locations?location_type=park HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `area_type` | string | Filter by area type code (`park`, `pedestrian`, `mini_garden`, `street`) |

**Response (200 OK):**
```json
[
  {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "name": "Taman Bungkul",
    "location_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "locationType": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "code": "park",
      "name": "Taman",
      "description": "Park area"
    },
    "gps_lat": "-7.2905",
    "gps_lng": "112.7398",
    "radius_meters": "150",
    "address": "Jl. Taman Bungkul, Darmo, Surabaya",
    "is_active": true,
    "created_at": "2026-01-09T10:00:00.000Z",
    "updated_at": "2026-01-09T10:00:00.000Z"
  }
]
```

---

### GET /api/v1/locations/:id

Get area by ID (authenticated users).

**Request:**
```http
GET /api/v1/locations/c3d4e5f6-a7b8-9012-cdef-123456789012 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "name": "Taman Bungkul",
  "location_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "locationType": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "code": "park",
    "name": "Taman",
    "description": "Park area"
  },
  "gps_lat": "-7.2905",
  "gps_lng": "112.7398",
  "radius_meters": "150",
  "address": "Jl. Taman Bungkul, Darmo, Surabaya",
  "is_active": true,
  "created_at": "2026-01-09T10:00:00.000Z",
  "updated_at": "2026-01-09T10:00:00.000Z"
}
```

---

### PATCH /api/v1/locations/:id

Update area (admin_system/superadmin only).

**Request:**
```http
PATCH /api/v1/areas/c3d4e5f6-a7b8-9012-cdef-123456789012 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Taman Bungkul Updated",
  "gps_lat": -7.2906,
  "gps_lng": 112.7399,
  "radius_meters": 200,
  "address": "Updated address"
}
```

**Request Body Schema (all optional):**
| Field | Type | Validation |
|-------|------|------------|
| `name` | string | Max 200 characters |
| `location_type_id` | UUID | Valid area type UUID |
| `gps_lat` | number | -90 to 90 |
| `gps_lng` | number | -180 to 180 |
| `radius_meters` | number | 1 to 10000 |
| `address` | string | Max 500 characters |

**Response (200 OK):**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "name": "Taman Bungkul Updated",
  "gps_lat": "-7.2906",
  "gps_lng": "112.7399",
  "radius_meters": "200",
  "address": "Updated address",
  "updated_at": "2026-01-09T11:00:00.000Z"
}
```

---

### DELETE /api/v1/locations/:id

Soft delete area (admin_system/superadmin only).

**Request:**
```http
DELETE /api/v1/areas/c3d4e5f6-a7b8-9012-cdef-123456789012 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
```

**Response (200 OK):**
```json
{}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Cannot delete area with active worker assignments",
  "error": "Bad Request"
}
```

**Notes:**
- Soft delete: sets `is_active = false`
- Cannot delete area with active worker assignments
- Must remove assignments first

---

## Worker Assignments Module

### POST /api/v1/workers/:id/assign

Assign worker to an area (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
POST /api/v1/workers/8127dc81-97cf-4c6e-a1b4-b1ace284ea78/assign HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "location_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Worker user ID |

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `location_id` | UUID | Yes | Valid area UUID |

**Response (201 Created):**
```json
{
  "id": "d4e5f6a7-b8c9-0123-def4-234567890123",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "location_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "created_at": "2026-01-09T10:00:00.000Z"
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "User is not a worker",
  "error": "Bad Request"
}
```

**Response (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Worker is already assigned to an area",
  "error": "Conflict"
}
```

**Notes:**
- One worker can only be assigned to one area (enforced by unique constraint)
- Must unassign first to reassign to different area
- Only users with `role = 'worker'` can be assigned
- Area must be active (`is_active = true`)

---

### DELETE /api/v1/workers/:id/assign

Remove worker's area assignment (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
DELETE /api/v1/workers/8127dc81-97cf-4c6e-a1b4-b1ace284ea78/assign HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Worker has no area assignment",
  "error": "Not Found"
}
```

---

## Shifts Module

### POST /api/v1/shifts/clock-in

Clock in to start a shift (satgas/linmas/korlap only).

**Request:**
```http
POST /api/v1/shifts/clock-in HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
Content-Type: application/json

{
  "location_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "selfie_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `location_id` | string (UUID) | Yes | Valid UUID of assigned area |
| `gps_lat` | number | Yes | -90 to 90 |
| `gps_lng` | number | Yes | -180 to 180 |
| `selfie_photo` | string | Yes | Base64 data URI (JPEG/PNG), max ~7.5MB decoded |

**Response (201 Created):**
```json
{
  "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "location_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "clock_in_time": "2026-01-09T08:00:00.000Z",
  "clock_in_gps_lat": "-7.2905",
  "clock_in_gps_lng": "112.7398",
  "selfie_photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/shifts/2026/01/09/e5f6a7b8-selfie.jpg",
  "clock_out_time": null,
  "clock_out_gps_lat": null,
  "clock_out_gps_lng": null,
  "hours_worked": null,
  "created_at": "2026-01-09T08:00:00.000Z",
  "updated_at": "2026-01-09T08:00:00.000Z"
}
```

**Response (400 Bad Request - Already Clocked In):**
```json
{
  "statusCode": 400,
  "message": "Worker already has an active shift",
  "error": "Bad Request"
}
```

**Response (400 Bad Request - Not Assigned):**
```json
{
  "statusCode": 400,
  "message": "Worker is not assigned to any area",
  "error": "Bad Request"
}
```

**Response (400 Bad Request - GPS Outside Boundary):**
```json
{
  "statusCode": 400,
  "message": "You are too far from your assigned area (distance: 250m, allowed: 100m)",
  "error": "Bad Request"
}
```

**Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Notes:**
- GPS validation using Haversine formula (±100m from area center)
- Selfie sent as Base64 data URI (format: `data:image/jpeg;base64,...`)
- Backend decodes Base64 and uploads to AWS S3 with date-based folder structure
- S3 key format: `shifts/YYYY/MM/DD/{uuid}-selfie.{ext}`
- Max photo size: ~7.5MB decoded (10MB Base64 encoded)
- Prevents double clock-in (one active shift per worker)
- `hours_worked` calculated on clock-out

---

### POST /api/v1/shifts/clock-out

Clock out to end a shift (satgas/linmas/korlap only).

**Request:**
```http
POST /api/v1/shifts/clock-out HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
Content-Type: application/json

{
  "gps_lat": -7.2906,
  "gps_lng": 112.7399,
  "selfie_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `gps_lat` | number | Yes | -90 to 90 |
| `gps_lng` | number | Yes | -180 to 180 |
| `selfie_photo` | string | No | Optional base64 data URI (JPEG/PNG); stored as `clock_out_photo_url`. The mobile app now offers a selfie on clock-out too. |

**Response (200 OK):**
```json
{
  "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "location_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "clock_in_time": "2026-01-09T08:00:00.000Z",
  "clock_in_gps_lat": "-7.2905",
  "clock_in_gps_lng": "112.7398",
  "selfie_photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/shifts/2026/01/09/e5f6a7b8-selfie.jpg",
  "clock_out_time": "2026-01-09T17:00:00.000Z",
  "clock_out_gps_lat": "-7.2906",
  "clock_out_gps_lng": "112.7399",
  "hours_worked": 9.0,
  "created_at": "2026-01-09T08:00:00.000Z",
  "updated_at": "2026-01-09T17:00:00.000Z"
}
```

**Response (400 Bad Request - No Active Shift):**
```json
{
  "statusCode": 400,
  "message": "No active shift found for this worker",
  "error": "Bad Request"
}
```

**Response (400 Bad Request - Shift Too Short):**
```json
{
  "statusCode": 400,
  "code": "SHIFT_DURATION_TOO_SHORT",
  "message": "Shift duration too short. Minimum 5 minutes required, but only 2 minutes worked.",
  "error": "Bad Request"
}
```

**Notes:**
- `hours_worked` calculated as decimal (e.g., 9.0 = 9 hours)
- Calculation: `(clock_out_time - clock_in_time) / 3600000` (milliseconds to hours)
- No GPS boundary validation on clock-out (worker may be mobile)
- **Minimum duration:** Worker must work at least 5 minutes before clocking out (configurable via `MINIMUM_SHIFT_DURATION_MINUTES` environment variable)
- If shift duration is less than the configured minimum, returns `SHIFT_DURATION_TOO_SHORT` error

---

### GET /api/v1/shifts/current

Get current active shift (satgas/linmas/korlap only).

**Request:**
```http
GET /api/v1/shifts/current HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
```

**Response (200 OK) - Active Shift:**
```json
{
  "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "location_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "clock_in_time": "2026-01-09T08:00:00.000Z",
  "clock_in_gps_lat": "-7.2905",
  "clock_in_gps_lng": "112.7398",
  "selfie_photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/shifts/2026/01/09/e5f6a7b8-selfie.jpg",
  "clock_out_time": null,
  "clock_out_gps_lat": null,
  "clock_out_gps_lng": null,
  "hours_worked": null,
  "created_at": "2026-01-09T08:00:00.000Z",
  "updated_at": "2026-01-09T08:00:00.000Z"
}
```

**Response (200 OK) - No Active Shift:**
```json
null
```

**Notes:**
- Returns null if worker not currently clocked in
- Active shift defined as `clock_out_time IS NULL`
- The response (and `GET /shifts/my-shifts`) now eager-loads the `shift_definition`
  relation (`{ id, name, code, start_time, end_time, crosses_midnight }`) so the
  mobile attendance card can show the scheduled window + a late indicator.

---

### GET /api/v1/shifts/my-shifts

Get shift history (satgas/linmas/korlap only).

> **Pagination (Phase 4-6 C2):** pass `?page=&limit=` (limit max 100) to receive a `PaginatedResponseDto` (`{ data, meta: { total, page, limit, totalPages } }`); without the params the legacy shape below is returned unchanged.

**Request:**
```http
GET /api/v1/shifts/my-shifts HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
```

**Response (200 OK):**
```json
[
  {
    "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
    "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "location_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "clock_in_time": "2026-01-09T08:00:00.000Z",
    "clock_in_gps_lat": "-7.2905",
    "clock_in_gps_lng": "112.7398",
    "selfie_photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/shifts/2026/01/09/e5f6a7b8-selfie.jpg",
    "clock_out_time": "2026-01-09T17:00:00.000Z",
    "clock_out_gps_lat": "-7.2906",
    "clock_out_gps_lng": "112.7399",
    "hours_worked": 9.0,
    "created_at": "2026-01-09T08:00:00.000Z",
    "updated_at": "2026-01-09T17:00:00.000Z"
  }
]
```

**Notes:**
- Returns last 50 shifts (ordered by `created_at DESC`)
- Includes both active and completed shifts

---

### GET /api/v1/shifts/attendance

Get my attendance history grouped by WIB calendar day, paginated **by day** (clockable roles only). Regular shifts only — overtime is excluded (see the Overtime module). Backs the mobile "Kehadiran" list.

**Query params (all optional):** `page`, `limit` (max 100) · `from_date`/`to_date` (`YYYY-MM-DD`, inclusive, filter the WIB day) · `status` (`late` | `on_time` | `active`) · `sort_dir` (`asc` | `desc`, default `desc` by day). `total` reflects the filtered day count.

**Request:**
```http
GET /api/v1/shifts/attendance?page=1&limit=20&status=late&from_date=2026-06-01&sort_dir=desc HTTP/1.1
Authorization: Bearer {worker_token}
```

**Response (200 OK):** `PaginatedResponseDto` where each item is a day summary:
```json
{
  "data": [
    {
      "date": "2026-06-22",
      "first_clock_in": "2026-06-22T01:05:00.000Z",
      "last_clock_out": "2026-06-22T10:02:00.000Z",
      "shift_count": 2,
      "total_worked_minutes": 480,
      "scheduled_start_time": "06:00:00",
      "crosses_midnight": false,
      "is_late": false,
      "has_active": false
    }
  ],
  "meta": { "total": 31, "page": 1, "limit": 20, "totalPages": 2 }
}
```

**Notes:**
- Day buckets use `clock_in_time AT TIME ZONE 'Asia/Jakarta'` (a midnight-crossing shift files under its clock-in day). `total` is the number of distinct days **after filtering**.
- `last_clock_out` is null while a shift is still active; `total_worked_minutes` counts an active shift up to now.
- `is_late` is computed server-side in WIB (first clock-in vs the earliest shift's `scheduled_start_time`, with a crosses-midnight noon heuristic) — mirrors the mobile `isClockInLate` rule. `scheduled_start_time`/`crosses_midnight` are still returned for reference.

---

### GET /api/v1/shifts/attendance/:date

Get my regular shifts on a single WIB calendar day (clockable roles only). `date` = `YYYY-MM-DD`; a malformed date returns `400`.

**Request:**
```http
GET /api/v1/shifts/attendance/2026-06-22 HTTP/1.1
Authorization: Bearer {worker_token}
```

**Response (200 OK):**
```json
{
  "date": "2026-06-22",
  "shifts": [ { "id": "…", "clock_in_time": "…", "clock_out_time": "…", "area": { … }, "shift_definition": { … }, "is_overtime": false } ]
}
```

Shifts are newest-first and eager-load `area`, `area.locationType`, `shift_definition`.

---

### GET /api/v1/shifts/active

Get all active shifts (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
GET /api/v1/shifts/active HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
  {
    "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
    "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "location_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "clock_in_time": "2026-01-09T08:00:00.000Z",
    "clock_in_gps_lat": "-7.2905",
    "clock_in_gps_lng": "112.7398",
    "selfie_photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/shifts/2026/01/09/e5f6a7b8-selfie.jpg",
    "clock_out_time": null,
    "clock_out_gps_lat": null,
    "clock_out_gps_lng": null,
    "hours_worked": null,
    "created_at": "2026-01-09T08:00:00.000Z",
    "updated_at": "2026-01-09T08:00:00.000Z"
  }
]
```

**Notes:**
- Returns all shifts where `clock_out_time IS NULL`
- Used for supervisor dashboard monitoring

---

## Reports Module

### POST /api/v1/reports

Create a work report (satgas/linmas only).

**Request:**
```http
POST /api/v1/reports HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
Content-Type: multipart/form-data

------WebKitFormBoundary...
Content-Disposition: form-data; name="shift_id"

e5f6a7b8-c9d0-1234-ef56-345678901234
------WebKitFormBoundary...
Content-Disposition: form-data; name="report_type"

task_completion
------WebKitFormBoundary...
Content-Disposition: form-data; name="description"

Completed cleaning task in the park
------WebKitFormBoundary...
Content-Disposition: form-data; name="gps_lat"

-7.2905
------WebKitFormBoundary...
Content-Disposition: form-data; name="gps_lng"

112.7398
------WebKitFormBoundary...
Content-Disposition: form-data; name="photo"; filename="work.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary...--
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `shift_id` | UUID | Yes | Active shift owned by worker |
| `report_type` | enum | Yes | `task_completion`, `incident`, `maintenance_request` |
| `description` | string | Yes | Max 1000 characters |
| `gps_lat` | number | Yes | -90 to 90 |
| `gps_lng` | number | Yes | -180 to 180 |
| `photo` | file | No | Image (JPEG/PNG), max 10MB |

**Response (201 Created):**
```json
{
  "id": "f6a7b8c9-d0e1-2345-f678-456789012345",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "shift_id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
  "report_type": "task_completion",
  "description": "Completed cleaning task in the park",
  "gps_lat": "-7.2905",
  "gps_lng": "112.7398",
  "photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/reports/2026/01/09/f6a7b8c9-photo.jpg",
  "created_at": "2026-01-09T10:00:00.000Z",
  "updated_at": "2026-01-09T10:00:00.000Z"
}
```

**Response (400 Bad Request - Inactive Shift):**
```json
{
  "statusCode": 400,
  "message": "Shift is not active",
  "error": "Bad Request"
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Shift with ID e5f6a7b8-c9d0-1234-ef56-345678901234 not found",
  "error": "Not Found"
}
```

**Notes:**
- Photo uploaded to S3: `reports/YYYY/MM/DD/{uuid}-photo.{ext}`
- Can only create reports for own active shifts
- Report types:
  - `task_completion`: Normal work completion
  - `incident`: Incidents/problems (vandalism, damage, etc.)
  - `maintenance_request`: Equipment/infrastructure needing repair

---

### GET /api/v1/reports

Get all reports with filters (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
GET /api/v1/reports?worker_id=8127dc81-97cf-4c6e-a1b4-b1ace284ea78&from_date=2026-01-09&report_type=task_completion HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `worker_id` | UUID | Filter by worker |
| `shift_id` | UUID | Filter by shift |
| `report_type` | enum | Filter by type (`task_completion`, `incident`, `maintenance_request`) |
| `from_date` | date | Start date (ISO 8601: YYYY-MM-DD) |
| `to_date` | date | End date (ISO 8601: YYYY-MM-DD) |

**Response (200 OK):**
```json
[
  {
    "id": "f6a7b8c9-d0e1-2345-f678-456789012345",
    "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "shift_id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
    "location_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "report_type": "task_completion",
    "description": "Completed cleaning task in the park",
    "gps_lat": "-7.2905",
    "gps_lng": "112.7398",
    "photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/reports/2026/01/09/f6a7b8c9-photo.jpg",
    "is_reviewed": false,
    "created_at": "2026-01-09T10:00:00.000Z",
    "updated_at": "2026-01-09T10:00:00.000Z",
    "worker": {
      "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
      "username": "worker1",
      "full_name": "Pekerja Satu",
      "role": "satgas"
    },
    "area": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Taman Bungkul",
      "locationType": {
        "code": "park",
        "name": "Taman"
      }
    },
    "shift": {
      "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
      "clock_in_time": "2026-01-09T08:00:00.000Z",
      "area": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Taman Bungkul",
        "locationType": {
          "code": "park",
          "name": "Taman"
        }
      },
      "worker": {
        "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
        "username": "worker1",
        "full_name": "Pekerja Satu",
        "role": "satgas"
      }
    }
  }
]
```

**Notes:**
- Response includes nested relations: `worker`, `area`, and `shift`
- `worker` and `area` are eager-loaded by default
- `shift` includes nested `area` and `worker` relations
- Use `worker.full_name` for display name and `area.name` for area name

---

### GET /api/v1/reports/my-reports

Get current worker's own reports.

**Request:**
```http
GET /api/v1/reports/my-reports HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
```

**Response (200 OK):**
```json
[
  {
    "id": "f6a7b8c9-d0e1-2345-f678-456789012345",
    "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "shift_id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
    "location_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "report_type": "task_completion",
    "description": "Completed cleaning task in the park",
    "gps_lat": "-7.2905",
    "gps_lng": "112.7398",
    "photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/reports/2026/01/09/f6a7b8c9-photo.jpg",
    "is_reviewed": false,
    "created_at": "2026-01-09T10:00:00.000Z",
    "updated_at": "2026-01-09T10:00:00.000Z",
    "worker": {
      "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
      "username": "worker1",
      "full_name": "Pekerja Satu",
      "role": "satgas"
    },
    "area": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Taman Bungkul",
      "locationType": {
        "code": "park",
        "name": "Taman"
      }
    },
    "shift": {
      "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
      "clock_in_time": "2026-01-09T08:00:00.000Z",
      "area": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Taman Bungkul",
        "locationType": {
          "code": "park",
          "name": "Taman"
        }
      },
      "worker": {
        "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
        "username": "worker1",
        "full_name": "Pekerja Satu",
        "role": "satgas"
      }
    }
  }
]
```

**Notes:**
- Returns only reports belonging to the authenticated worker
- Ordered by creation date (newest first)
- satgas/linmas use this endpoint instead of GET /api/v1/reports
- Response includes nested relations: `worker`, `area`, and `shift` (same as GET /api/v1/reports)

---

### GET /api/v1/reports/:id

Get report by ID (admin_system/superadmin/korlap/kepala_rayon, or owner).

**Request:**
```http
GET /api/v1/reports/f6a7b8c9-d0e1-2345-f678-456789012345 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "f6a7b8c9-d0e1-2345-f678-456789012345",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "shift_id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
  "location_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "report_type": "task_completion",
  "description": "Completed cleaning task in the park",
  "gps_lat": "-7.2905",
  "gps_lng": "112.7398",
  "photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/reports/2026/01/09/f6a7b8c9-photo.jpg",
  "is_reviewed": false,
  "created_at": "2026-01-09T10:00:00.000Z",
  "updated_at": "2026-01-09T10:00:00.000Z",
  "worker": {
    "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "username": "worker1",
    "full_name": "Pekerja Satu",
    "role": "satgas"
  },
  "area": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Taman Bungkul",
    "locationType": {
      "code": "park",
      "name": "Taman"
    }
  },
  "shift": {
    "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
    "clock_in_time": "2026-01-09T08:00:00.000Z",
    "area": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Taman Bungkul",
      "locationType": {
        "code": "park",
        "name": "Taman"
      }
    },
    "worker": {
      "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
      "username": "worker1",
      "full_name": "Pekerja Satu",
      "role": "satgas"
    }
  }
}
```

**Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "You can only access your own reports",
  "error": "Forbidden"
}
```

**Notes:**
- satgas/linmas can only view their own reports
- admin_system/korlap/kepala_rayon can view all reports

---

### PATCH /api/v1/reports/:id

Update report (satgas/linmas only, own reports, within 1 hour).

**Request:**
```http
PATCH /api/v1/reports/f6a7b8c9-d0e1-2345-f678-456789012345 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
Content-Type: multipart/form-data

------WebKitFormBoundary...
Content-Disposition: form-data; name="description"

Updated description text
------WebKitFormBoundary...
Content-Disposition: form-data; name="photo"; filename="updated.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary...--
```

**Request Body Schema (all optional):**
| Field | Type | Validation |
|-------|------|------------|
| `description` | string | Max 1000 characters |
| `photo` | file | Image (JPEG/PNG), max 10MB |

**Response (200 OK):**
```json
{
  "id": "f6a7b8c9-d0e1-2345-f678-456789012345",
  "description": "Updated description text",
  "photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/reports/2026/01/09/f6a7b8c9-photo-updated.jpg",
  "updated_at": "2026-01-09T10:30:00.000Z"
}
```

**Response (403 Forbidden - Time Limit):**
```json
{
  "statusCode": 403,
  "message": "Reports can only be updated within 1 hour of creation",
  "error": "Forbidden"
}
```

**Notes:**
- Can only update own reports
- Must be within 1 hour of `created_at`
- If new photo uploaded, old photo remains in S3 (no deletion)

---

### DELETE /api/v1/reports/:id

Delete report (admin_system/superadmin only).

**Request:**
```http
DELETE /api/v1/reports/f6a7b8c9-d0e1-2345-f678-456789012345 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
```

**Response (200 OK):**
```json
{}
```

**Notes:**
- Hard delete (permanent removal)
- Photo remains in S3 (no cascade deletion)

---

## Location Module

### POST /api/v1/location/batch

Batch upload location logs (satgas/linmas/korlap only).

**Request:**
```http
POST /api/v1/location/batch HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
Content-Type: application/json

{
  "shift_id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
  "locations": [
    {
      "gps_lat": -7.2905,
      "gps_lng": 112.7398,
      "accuracy": 10.5,
      "battery_level": 85,
      "timestamp": "2026-01-09T10:00:00.000Z"
    },
    {
      "gps_lat": -7.2906,
      "gps_lng": 112.7399,
      "accuracy": 12.0,
      "battery_level": 84,
      "timestamp": "2026-01-09T10:05:00.000Z"
    }
  ]
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `shift_id` | UUID | Yes | Active shift owned by worker |
| `locations` | array | Yes | 1-100 location objects |

**Location Object Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `gps_lat` | number | Yes | -90 to 90 |
| `gps_lng` | number | Yes | -180 to 180 |
| `accuracy` | number | No | GPS accuracy in meters |
| `battery_level` | number | No | 0-100 |
| `timestamp` | datetime | No | ISO 8601 (defaults to current time) |

**Response (201 Created):**
```json
{
  "count": 2
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Shift is not active",
  "error": "Bad Request"
}
```

**Notes:**
- Batch insert for efficiency (transaction-based)
- Typical mobile app sends every 10-15 minutes
- Used for worker location tracking during shifts

---

### GET /api/v1/location/worker/:workerId

Get worker location history (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
GET /api/v1/location/worker/8127dc81-97cf-4c6e-a1b4-b1ace284ea78?from_date=2026-01-09&shift_id=e5f6a7b8-c9d0-1234-ef56-345678901234 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `workerId` | UUID | Worker user ID |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `from_date` | date | Start date (ISO 8601) |
| `to_date` | date | End date (ISO 8601) |
| `shift_id` | UUID | Filter by shift |

**Response (200 OK):**
```json
[
  {
    "id": "a7b8c9d0-e1f2-3456-789a-bcdef0123456",
    "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "shift_id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
    "gps_lat": "-7.2905",
    "gps_lng": "112.7398",
    "accuracy": 10.5,
    "battery_level": 85,
    "timestamp": "2026-01-09T10:00:00.000Z",
    "created_at": "2026-01-09T10:00:00.000Z"
  }
]
```

**Notes:**
- Returns maximum 1000 records
- Ordered by `timestamp DESC`

---

### GET /api/v1/location/worker/:workerId/latest

Get latest location for a worker (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
GET /api/v1/location/worker/8127dc81-97cf-4c6e-a1b4-b1ace284ea78/latest HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "a7b8c9d0-e1f2-3456-789a-bcdef0123456",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "shift_id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
  "gps_lat": "-7.2905",
  "gps_lng": "112.7398",
  "accuracy": 10.5,
  "battery_level": 85,
  "timestamp": "2026-01-09T10:00:00.000Z",
  "created_at": "2026-01-09T10:00:00.000Z"
}
```

**Response (200 OK) - No Location:**
```json
null
```

**Notes:**
- Returns most recent location log
- Used for real-time worker tracking on map

---

## Supervisor Module

### GET /api/v1/supervisor/active-workers

Get all active workers with real-time locations (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
GET /api/v1/supervisor/active-workers HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "active_workers": [
    {
      "worker": {
        "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
        "username": "worker1",
        "full_name": "Pekerja Satu"
      },
      "shift": {
        "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
        "clock_in_time": "2026-01-09T08:00:00.000Z",
        "hours_worked": 2.5
      },
      "area": {
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "name": "Taman Bungkul"
      },
      "latest_location": {
        "gps_lat": "-7.2905",
        "gps_lng": "112.7398",
        "timestamp": "2026-01-09T10:00:00.000Z"
      }
    }
  ],
  "total": 1
}
```

**Notes:**
- Complex query joining shifts, users, areas, and location logs
- `hours_worked` calculated from `clock_in_time` to current time
- `latest_location` from most recent location log
- Returns null for `latest_location` if no GPS data

---

### GET /api/v1/supervisor/area-status

Get area status overview (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
GET /api/v1/supervisor/area-status HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "areas": [
    {
      "area": {
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "name": "Taman Bungkul",
        "area_type": {
          "code": "park",
          "name": "Taman"
        }
      },
      "assigned_workers_count": 1,
      "active_workers_count": 1
    }
  ],
  "total_areas": 1,
  "total_assigned_workers": 1,
  "total_active_workers": 1
}
```

**Notes:**
- Shows staffing status per area
- `assigned_workers_count`: Workers assigned to area
- `active_workers_count`: Currently clocked in workers
- Used for dashboard overview

---

### GET /api/v1/supervisor/attendance

Get daily attendance report (admin_system/superadmin/korlap/kepala_rayon).

**Request:**
```http
GET /api/v1/supervisor/attendance?date=2026-01-09 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | date | Date in YYYY-MM-DD format (defaults to today) |

**Response (200 OK):**
```json
{
  "date": "2026-01-09",
  "clocked_in": [
    {
      "worker": {
        "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
        "username": "worker1",
        "full_name": "Pekerja Satu"
      },
      "shift": {
        "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
        "clock_in_time": "2026-01-09T08:00:00.000Z",
        "hours_worked": 2.5
      }
    }
  ],
  "not_clocked_in": [
    {
      "id": "9237ec92-08df-5d7f-b2c5-c2bdf395fb89",
      "username": "worker2",
      "full_name": "Pekerja Dua"
    }
  ],
  "total_workers": 2,
  "clocked_in_count": 1,
  "not_clocked_in_count": 1
}
```

**Notes:**
- Shows attendance for specific date
- `clocked_in`: Workers with shifts on specified date
- `not_clocked_in`: Workers with no shift on date
- `hours_worked` calculated for completed shifts, or hours elapsed for active shifts

---

## Error Response Format

All error responses follow this consistent format:

```json
{
  "statusCode": 400,
  "message": "Error description or array of validation errors",
  "error": "Error Type"
}
```

### Common HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation failed |
| 401 | Unauthorized | Authentication failed or missing |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate username) |
| 422 | Unprocessable Entity | File upload validation failed |
| 500 | Internal Server Error | Server error |

---

## Data Type Conventions

### UUID Format
```
8127dc81-97cf-4c6e-a1b4-b1ace284ea78
```
- All IDs use UUID v4
- Validated with `@IsUUID()` decorator

### Date/Time Format
```
2026-01-09T10:00:00.000Z
```
- ISO 8601 format
- UTC timezone (Z suffix)
- Millisecond precision

### GPS Coordinates
```json
{
  "gps_lat": -7.2905,
  "gps_lng": 112.7398
}
```
- Stored as DECIMAL in database
- Returned as strings in JSON (PostgreSQL behavior)
- Client should parse to number

### File Upload URLs
```
https://sekar-media.s3.ap-southeast-1.amazonaws.com/shifts/2026/01/09/uuid-selfie.jpg
```
- AWS S3 public URLs
- Date-based folder structure: `{type}/YYYY/MM/DD/`
- Filename format: `{uuid}-{type}.{ext}`

---

## Testing with cURL

### Login and Save Token
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"worker1","password":"12345678"}' \
  | jq -r '.access_token')
```

### Get Current User
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Clock In (with Base64 photo)
```bash
# Note: selfie_photo must be Base64 encoded with data URI prefix
# Example uses jq to construct JSON with embedded Base64 photo
PHOTO_BASE64=$(base64 -w0 /path/to/photo.jpg)
curl -X POST http://localhost:3000/api/v1/shifts/clock-in \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"location_id\": \"c3d4e5f6-a7b8-9012-cdef-123456789012\",
    \"gps_lat\": -7.2905,
    \"gps_lng\": 112.7398,
    \"selfie_photo\": \"data:image/jpeg;base64,$PHOTO_BASE64\"
  }"
```

### Create Report (with photo)
```bash
curl -X POST http://localhost:3000/api/v1/reports \
  -H "Authorization: Bearer $TOKEN" \
  -F "shift_id=e5f6a7b8-c9d0-1234-ef56-345678901234" \
  -F "report_type=task_completion" \
  -F "description=Completed cleaning" \
  -F "gps_lat=-7.2905" \
  -F "gps_lng=112.7398" \
  -F "photo=@/path/to/photo.jpg"
```

### Batch Upload Locations
```bash
curl -X POST http://localhost:3000/api/v1/location/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shift_id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
    "locations": [
      {
        "gps_lat": -7.2905,
        "gps_lng": 112.7398,
        "accuracy": 10.5,
        "battery_level": 85,
        "timestamp": "2026-01-09T10:00:00.000Z"
      }
    ]
  }'
```

---

## Phase 2 Endpoints

> **Note:** The following endpoints are part of Phase 2 - Enhanced Features. They are documented here for planning purposes.

### Rayons Module

**Route alias & terminology:** The canonical route is `/districts` (`@Controller(['districts','rayons'])` serves both paths per ADR-052). The code and database use English "district"; Indonesian UI labels keep "Rayon" for user familiarity. Use `/districts` for new code. The boundary `?level=area` parameter stays unchanged as a deliberate seam (English code-side tiers are district/region/location; the `?level` param is an old name kept for backward compatibility).

#### POST /api/v1/rayons

Create a new rayon (admin_system/superadmin only).

**Request:**
```http
POST /api/v1/rayons HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Rayon Selatan",
  "code": "SELATAN",
  "description": "Wilayah Surabaya Selatan"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 100 characters, unique |
| `code` | string | Yes | Max 20 characters, unique, uppercase |
| `description` | string | No | Max 500 characters |

**Response (201 Created):**
```json
{
  "id": "11111111-1111-1111-1111-111111111101",
  "name": "Rayon Selatan",
  "code": "SELATAN",
  "description": "Wilayah Surabaya Selatan",
  "created_at": "2026-01-24T10:00:00.000Z",
  "updated_at": "2026-01-24T10:00:00.000Z"
}
```

---

#### GET /api/v1/rayons

List all rayons.

**Request:**
```http
GET /api/v1/rayons HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111101",
      "name": "Rayon Selatan",
      "code": "SELATAN",
      "description": "Wilayah Surabaya Selatan",
      "area_count": 5
    },
    {
      "id": "11111111-1111-1111-1111-111111111102",
      "name": "Rayon Utara",
      "code": "UTARA",
      "description": "Wilayah Surabaya Utara",
      "area_count": 4
    }
  ],
  "total": 7
}
```

**Notes:**
- All authenticated users can view districts (rayons)
- `area_count` shows number of areas assigned to district

---

#### GET /api/v1/rayons/:id

Get rayon details.

**Response (200 OK):**
```json
{
  "id": "11111111-1111-1111-1111-111111111101",
  "name": "Rayon Selatan",
  "code": "SELATAN",
  "description": "Wilayah Surabaya Selatan",
  "created_at": "2026-01-24T10:00:00.000Z",
  "updated_at": "2026-01-24T10:00:00.000Z",
  "kepala_rayon": {
    "id": "user-uuid",
    "full_name": "Kepala Rayon Selatan"
  },
  "areas": [
    {
      "id": "area-uuid",
      "name": "Taman Bungkul",
      "area_type": "park"
    }
  ]
}
```

---

#### PATCH /api/v1/rayons/:id

Update rayon (admin_system/superadmin only).

**Request:**
```http
PATCH /api/v1/rayons/11111111-1111-1111-1111-111111111101 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "id": "11111111-1111-1111-1111-111111111101",
  "name": "Rayon Selatan",
  "code": "SELATAN",
  "description": "Updated description",
  "updated_at": "2026-01-24T11:00:00.000Z"
}
```

---

#### DELETE /api/v1/rayons/:id

Delete rayon (admin_system/superadmin only, must have no areas assigned).

**Response (204 No Content)**

**Response (409 Conflict):**
```json
{
  "statusCode": 409,
  "code": "RAYON_HAS_AREAS",
  "message": "Cannot delete rayon with assigned areas",
  "timestamp": "2026-01-24T10:00:00.000Z"
}
```

---

#### GET /api/v1/rayons/:id/areas

Get all areas in a rayon.

**Response (200 OK):**
```json
{
  "rayon": {
    "id": "11111111-1111-1111-1111-111111111101",
    "name": "Rayon Selatan"
  },
  "areas": [
    {
      "id": "area-uuid",
      "name": "Taman Bungkul",
      "area_type": {
        "code": "park",
        "name": "Taman"
      },
      "coverage_area": 25000.00,
      "is_active": true
    }
  ],
  "total": 5
}
```

---

#### GET /api/v1/rayons/:id/stats

Get rayon statistics (management, kepala_rayon, admin_system/superadmin).

**Response (200 OK):**
```json
{
  "rayon": {
    "id": "11111111-1111-1111-1111-111111111101",
    "name": "Rayon Selatan"
  },
  "stats": {
    "total_areas": 5,
    "total_workers": 25,
    "total_linmas": 10,
    "workers_online": 18,
    "linmas_online": 7,
    "active_shifts": 20,
    "reports_today": 45,
    "understaffed_areas": 1
  }
}
```

---

### Shift Definitions Module

#### GET /api/v1/shift-definitions

List all shift definitions.

**Request:**
```http
GET /api/v1/shift-definitions HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "22222222-2222-2222-2222-222222222201",
      "name": "Shift 1",
      "code": "SHIFT1",
      "start_time": "06:00:00",
      "end_time": "15:00:00",
      "crosses_midnight": false,
      "is_active": true
    },
    {
      "id": "22222222-2222-2222-2222-222222222202",
      "name": "Shift 2",
      "code": "SHIFT2",
      "start_time": "15:00:00",
      "end_time": "23:00:00",
      "crosses_midnight": false,
      "is_active": true
    },
    {
      "id": "22222222-2222-2222-2222-222222222203",
      "name": "Shift 3",
      "code": "SHIFT3",
      "start_time": "21:00:00",
      "end_time": "05:00:00",
      "crosses_midnight": true,
      "is_active": true
    }
  ]
}
```

**Notes:**
- Shift definitions are fixed and cannot be modified via API
- `crosses_midnight` indicates shift spans two calendar days

---

#### GET /api/v1/shift-definitions/:id

Get shift definition details.

**Response (200 OK):**
```json
{
  "id": "22222222-2222-2222-2222-222222222201",
  "name": "Shift 1",
  "code": "SHIFT1",
  "start_time": "06:00:00",
  "end_time": "15:00:00",
  "duration_hours": 9,
  "crosses_midnight": false,
  "is_active": true,
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

---

### Activity Types Module

#### POST /api/v1/activity-types

Create activity type (admin_system/superadmin only).

**Request:**
```http
POST /api/v1/activity-types HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Penyiraman",
  "code": "WATERING",
  "description": "Penyiraman tanaman dan rumput",
  "applicable_roles": ["satgas"]
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 100 characters |
| `code` | string | Yes | Max 50 characters, unique, uppercase |
| `description` | string | No | Max 500 characters |
| `applicable_roles` | string[] | Yes | Array of ['satgas', 'linmas'] |

**Response (201 Created):**
```json
{
  "id": "33333333-3333-3333-3333-333333333301",
  "name": "Penyiraman",
  "code": "WATERING",
  "description": "Penyiraman tanaman dan rumput",
  "applicable_roles": ["satgas"],
  "is_active": true,
  "created_at": "2026-01-24T10:00:00.000Z"
}
```

---

#### GET /api/v1/activity-types

List activity types (filtered by role for satgas/linmas).

**Request:**
```http
GET /api/v1/activity-types HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `role` | string | (from token) | Filter by applicable role |
| `active_only` | boolean | true | Only show active types |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "33333333-3333-3333-3333-333333333301",
      "name": "Penyiraman",
      "code": "WATERING",
      "description": "Penyiraman tanaman dan rumput",
      "applicable_roles": ["satgas"],
      "is_active": true
    },
    {
      "id": "33333333-3333-3333-3333-333333333306",
      "name": "Pembersihan",
      "code": "CLEANING",
      "description": "Pembersihan area dari sampah",
      "applicable_roles": ["satgas", "linmas"],
      "is_active": true
    }
  ]
}
```

**Notes:**
- satgas see only satgas-applicable activity types
- Linmas see only Linmas-applicable activity types
- admin_system/superadmin sees all activity types

---

#### PATCH /api/v1/activity-types/:id

Update activity type (admin_system/superadmin only).

**Request:**
```http
PATCH /api/v1/activity-types/33333333-3333-3333-3333-333333333301 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "description": "Updated description",
  "is_active": false
}
```

**Response (200 OK):**
```json
{
  "id": "33333333-3333-3333-3333-333333333301",
  "name": "Penyiraman",
  "code": "WATERING",
  "description": "Updated description",
  "applicable_roles": ["satgas"],
  "is_active": false,
  "updated_at": "2026-01-24T11:00:00.000Z"
}
```

---

#### DELETE /api/v1/activity-types/:id

Delete activity type (admin_system/superadmin only, soft delete).

**Response (204 No Content)**

---

### Location Staff Requirements Module

#### POST /api/v1/locations

Create a new location.

**Deprecated:** `/api/v1/areas` — use `/api/v1/locations`/:id/staff-requirements

Set staff requirements for an area (admin_system/superadmin only).

**Request:**
```http
POST /api/v1/areas/:locationId/staff-requirements HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "shift_definition_id": "22222222-2222-2222-2222-222222222201",
  "role": "satgas",
  "required_count": 6,
  "day_type": "WEEKDAY"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `shift_definition_id` | UUID | Yes | Valid shift definition ID |
| `role` | string | Yes | 'satgas' or 'linmas' |
| `required_count` | number | Yes | Min 1 |
| `day_type` | string | No | 'WEEKDAY', 'WEEKEND', 'HOLIDAY' (default: 'WEEKDAY') |

**Response (201 Created):**
```json
{
  "id": "44444444-4444-4444-4444-444444444401",
  "location_id": "area-uuid",
  "shift_definition_id": "22222222-2222-2222-2222-222222222201",
  "role": "satgas",
  "required_count": 6,
  "day_type": "WEEKDAY",
  "created_at": "2026-01-24T10:00:00.000Z"
}
```

---

#### GET /api/v1/areas/:locationId/staff-requirements

Get staff requirements for an area.

**Response (200 OK):**
```json
{
  "area": {
    "id": "area-uuid",
    "name": "Taman Bungkul"
  },
  "requirements": [
    {
      "id": "44444444-4444-4444-4444-444444444401",
      "shift_definition": {
        "id": "22222222-2222-2222-2222-222222222201",
        "name": "Shift 1",
        "code": "SHIFT1"
      },
      "role": "satgas",
      "required_count": 6,
      "day_type": "WEEKDAY"
    },
    {
      "id": "44444444-4444-4444-4444-444444444402",
      "shift_definition": {
        "id": "22222222-2222-2222-2222-222222222201",
        "name": "Shift 1",
        "code": "SHIFT1"
      },
      "role": "linmas",
      "required_count": 2,
      "day_type": "WEEKDAY"
    }
  ]
}
```

---

#### PATCH /api/v1/areas/:locationId/staff-requirements/:id

Update staff requirement.

**Request:**
```http
PATCH /api/v1/areas/area-uuid/staff-requirements/req-uuid HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "required_count": 8
}
```

**Response (200 OK):**
```json
{
  "id": "44444444-4444-4444-4444-444444444401",
  "required_count": 8,
  "updated_at": "2026-01-24T11:00:00.000Z"
}
```

---

#### DELETE /api/v1/areas/:locationId/staff-requirements/:id

Delete staff requirement (admin_system/superadmin only).

**Response (204 No Content)**

---

### Worker Schedules Module

#### POST /api/v1/schedules

Create worker schedule (Admin, KoordinatorLapangan).

**Request:**
```http
POST /api/v1/schedules HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "user_id": "worker-uuid",
  "location_id": "area-uuid",
  "shift_definition_id": "22222222-2222-2222-2222-222222222201",
  "effective_date": "2026-01-25",
  "end_date": null
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `user_id` | UUID | Yes | Valid Worker/Linmas user ID |
| `location_id` | UUID | Yes | Valid area ID |
| `shift_definition_id` | UUID | Yes | Valid shift definition ID |
| `effective_date` | date | Yes | YYYY-MM-DD format |
| `end_date` | date | No | YYYY-MM-DD format, null for ongoing |

**Response (201 Created):**
```json
{
  "id": "55555555-5555-5555-5555-555555555501",
  "user_id": "worker-uuid",
  "location_id": "area-uuid",
  "shift_definition_id": "22222222-2222-2222-2222-222222222201",
  "effective_date": "2026-01-25",
  "end_date": null,
  "created_by": "admin-uuid",
  "created_at": "2026-01-24T10:00:00.000Z"
}
```

---

#### GET /api/v1/schedules

> **Pagination (Phase 4-6 C2):** pass `?page=&limit=` (limit max 100) to receive a `PaginatedResponseDto` (`{ data, meta: { total, page, limit, totalPages } }`); without the params the legacy array shape is returned unchanged.

List worker schedules.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `location_id` | UUID | - | Filter by area |
| `shift_id` | UUID | - | Filter by shift definition |
| `date` | string | today | Filter by date (YYYY-MM-DD) |
| `active_only` | boolean | true | Only show active schedules |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "55555555-5555-5555-5555-555555555501",
      "user": {
        "id": "worker-uuid",
        "full_name": "Pekerja Satu",
        "role": "satgas"
      },
      "area": {
        "id": "area-uuid",
        "name": "Taman Bungkul"
      },
      "shift_definition": {
        "id": "22222222-2222-2222-2222-222222222201",
        "name": "Shift 1",
        "code": "SHIFT1"
      },
      "effective_date": "2026-01-01",
      "end_date": null,
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25
  }
}
```

---

#### GET /api/v1/schedules/my

Get current user's schedule.

**Response (200 OK):**
```json
{
  "schedule": {
    "id": "55555555-5555-5555-5555-555555555501",
    "area": {
      "id": "area-uuid",
      "name": "Taman Bungkul",
      "gps_lat": -7.2905,
      "gps_lng": 112.7398
    },
    "shift_definition": {
      "id": "22222222-2222-2222-2222-222222222201",
      "name": "Shift 1",
      "code": "SHIFT1",
      "start_time": "06:00:00",
      "end_time": "15:00:00"
    },
    "effective_date": "2026-01-01",
    "end_date": null
  },
  "current_shift_status": "not_started" // or "in_progress", "completed"
}
```

---

#### PATCH /api/v1/schedules/:id

Update schedule (Admin, KoordinatorLapangan).

**Request:**
```http
PATCH /api/v1/schedules/55555555-5555-5555-5555-555555555501 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "end_date": "2026-02-28"
}
```

**Response (200 OK):**
```json
{
  "id": "55555555-5555-5555-5555-555555555501",
  "end_date": "2026-02-28",
  "updated_at": "2026-01-24T11:00:00.000Z"
}
```

---

#### DELETE /api/v1/schedules/:id

Delete schedule (admin_system/superadmin only).

**Response (204 No Content)**

---

#### GET /api/v1/schedules/area/:locationId

Get all schedules for an area.

**Response (200 OK):**
```json
{
  "area": {
    "id": "area-uuid",
    "name": "Taman Bungkul"
  },
  "schedules": [
    {
      "id": "55555555-5555-5555-5555-555555555501",
      "user": {
        "id": "worker-uuid",
        "full_name": "Pekerja Satu",
        "role": "satgas"
      },
      "shift_definition": {
        "id": "22222222-2222-2222-2222-222222222201",
        "name": "Shift 1"
      },
      "effective_date": "2026-01-01"
    }
  ],
  "by_shift": {
    "SHIFT1": {
      "workers": 4,
      "linmas": 2,
      "total": 6
    },
    "SHIFT2": {
      "workers": 5,
      "linmas": 2,
      "total": 7
    }
  }
}
```

---

### Monitoring Module

#### GET /api/v1/monitoring/city

Get city-wide statistics (Admin, TopManagement only).

**Request:**
```http
GET /api/v1/monitoring/city HTTP/1.1
Host: localhost:3000
Authorization: Bearer {management_token}
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-01-24T10:00:00.000Z",
  "summary": {
    "total_rayons": 7,
    "total_areas": 45,
    "total_workers": 150,
    "total_linmas": 60,
    "workers_online": 120,
    "linmas_online": 48,
    "active_shifts": 168,
    "reports_today": 234,
    "tasks_pending": 15,
    "tasks_in_progress": 8
  },
  "by_rayon": [
    {
      "rayon_id": "11111111-1111-1111-1111-111111111101",
      "rayon_name": "Rayon Selatan",
      "areas": 8,
      "workers_online": 22,
      "linmas_online": 8,
      "understaffed_areas": 1
    }
  ]
}
```

---

#### GET /api/v1/monitoring/rayon/:id

Get rayon statistics (Admin, TopManagement, KepalaRayon).

**Response (200 OK):**
```json
{
  "timestamp": "2026-01-24T10:00:00.000Z",
  "rayon": {
    "id": "11111111-1111-1111-1111-111111111101",
    "name": "Rayon Selatan"
  },
  "summary": {
    "total_areas": 8,
    "total_workers": 30,
    "total_linmas": 12,
    "workers_online": 22,
    "linmas_online": 8,
    "active_shifts": 30,
    "reports_today": 56,
    "understaffed_areas": 1
  },
  "by_area": [
    {
      "location_id": "area-uuid",
      "area_name": "Taman Bungkul",
      "shift": "SHIFT1",
      "required_workers": 6,
      "actual_workers": 5,
      "required_linmas": 2,
      "actual_linmas": 2,
      "status": "understaffed"
    }
  ]
}
```

---

#### GET /api/v1/monitoring/location/:id

Get location statistics (Admin, TopManagement, KepalaRayon, KoordinatorLapangan).

**Deprecated:** `/api/v1/monitoring/area/:id` — use `/api/v1/monitoring/location/:id`

**⚠️ Breaking Change (Phase 2C - Feb 15, 2026):** Response field names changed:
- `total_workers_assigned` → `total_users_assigned`
- `workers_online` → `users_online`
- `workers_offline` → `users_offline`
- `workers: WorkerStatusDto[]` → `users: UserStatusDto[]`

Mobile and web clients must update type definitions before backend deployment.

**Response (200 OK):**
```json
{
  "timestamp": "2026-01-24T10:00:00.000Z",
  "area": {
    "id": "area-uuid",
    "name": "Taman Bungkul",
    "rayon": "Rayon Selatan",
    "coverage_area": 25000.00
  },
  "current_shift": {
    "definition": {
      "id": "22222222-2222-2222-2222-222222222201",
      "name": "Shift 1",
      "start_time": "06:00:00",
      "end_time": "15:00:00"
    },
    "requirements": [
      {
        "role": "satgas",
        "required_count": 6,
        "active_count": 4
      },
      {
        "role": "linmas",
        "required_count": 2,
        "active_count": 2
      }
    ],
    "status": "understaffed"
  },
  "active_workers": [
    {
      "user_id": "worker-uuid",
      "full_name": "Pekerja Satu",
      "role": "satgas",
      "shift_id": "shift-uuid",
      "clock_in_time": "2026-01-24T06:05:00.000Z",
      "last_location": {
        "gps_lat": -7.2905,
        "gps_lng": 112.7398,
        "timestamp": "2026-01-24T09:55:00.000Z"
      },
      "reports_today": 3
    }
  ],
  "reports_summary": {
    "total_today": 12,
    "by_type": {
      "task_completion": 8,
      "self_initiated": 4
    }
  }
}
```

---

#### GET /api/v1/monitoring/live-users

Get real-time user positions for map display.

> **Phase 2D Enhancement:** Route renamed from `/live-workers` to `/live-users`. New `status` query filter added. Response includes additional fields: `phone`, `status` (TrackingStatus), `is_within_area`, `shift_name`, `shift_definition_id`, `accuracy`, `battery_level`. Totals expanded from single `total` to per-status counts.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `korlap` (own area), `kepala_rayon` (own rayon), `management`, `admin_system`, `superadmin`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rayon_id` | UUID | - | Filter by rayon |
| `location_id` | UUID | - | Filter by area |
| `status` | TrackingStatus | - | Filter by tracking status: `active`, `offline`, `absent`. Inside/outside area is a separate axis (`is_within_area`), not a status (ADR-050). |

**Response (200 OK):**
```json
{
  "timestamp": "2026-01-24T10:00:00.000Z",
  "users": [
    {
      "user_id": "worker-uuid",
      "full_name": "Pekerja Satu",
      "role": "satgas",
      "phone": "08123456789",
      "location_id": "area-uuid",
      "area_name": "Taman Bungkul",
      "shift_id": "shift-uuid",
      "shift_definition_id": "22222222-2222-2222-2222-222222222201",
      "shift_name": "Shift 1",
      "gps_lat": -7.2905,
      "gps_lng": 112.7398,
      "accuracy": 8.5,
      "location_timestamp": "2026-01-24T09:55:00.000Z",
      "battery_level": 85,
      "status": "active",
      "is_within_area": true
    }
  ],
  "total_active": 98,
  "total_offline": 2,
  "total_absent": 15
}
```

> **Naming note:** The response field is `total_inactive` (not `total_idle`) for consistency with the five-status enum values (`active`, `inactive`, `outside_area`, `missing`, `offline`). The UI displays "Idle" as the human-readable label for the `inactive` status, but the API contract and TypeScript enum always use `inactive`.

---

## Phase 2D Monitoring Enhancements

> **Phase 2D** adds 9 new monitoring endpoints and enhances 4 existing ones. New database tables: `monitoring_configs`, `user_tracking_status`. Status model (ADR-050): three derived axes — attendance lifecycle | live presence (`active`/`offline`) | counting (staffing = scheduled satgas+linmas only; ad-hoc clock-ins excluded). Inside/outside area (`is_within_area`) is a separate axis, not a status.

### GET /api/v1/monitoring/users/:userId/location-history

Get GPS location history for a specific user on a specific date.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `korlap` (own area only), `kepala_rayon` (own rayon only), `management`, `admin_system`, `superadmin`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string (YYYY-MM-DD) | Yes | Date to retrieve history for |
| `shift_id` | UUID | No | Filter by specific shift |

**Response (200 OK):**
```json
{
  "user_id": "worker-uuid",
  "user_name": "Pekerja Satu",
  "role": "satgas",
  "date": "2026-03-03",
  "shift_id": "shift-uuid",
  "shift_name": "Shift 1",
  "location_id": "area-uuid",
  "area_name": "Taman Bungkul",
  "clock_in_time": "2026-03-03T06:05:00.000Z",
  "clock_out_time": "2026-03-03T15:02:00.000Z",
  "points": [
    {
      "latitude": -7.2905,
      "longitude": 112.7398,
      "accuracy": 8.5,
      "battery_level": 85,
      "logged_at": "2026-03-03T06:10:00.000Z",
      "is_within_area": true
    }
  ],
  "total_points": 320,
  "total_distance_meters": 4250.5,
  "time_inside_area_minutes": 498,
  "time_outside_area_minutes": 42,
  "generated_at": "2026-03-03T15:30:00.000Z"
}
```

---

### GET /api/v1/monitoring/users/:userId/reassignment-history

Get the reassignment audit history for a worker (Phase 4-4 A4 — backs the
mobile UserDetailSheet "Riwayat Pemindahan" section). Sourced from the audit
trail (`action='reassign'`), most recent first, capped at 20 entries.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `korlap` (own area only), `kepala_rayon` (own rayon only), `management`, `admin_system`, `superadmin`

**Response (200 OK):**
```json
{
  "user_id": "worker-uuid",
  "history": [
    {
      "id": "audit-log-uuid",
      "previous_area_id": "area-uuid",
      "previous_area_name": "Taman Bungkul",
      "new_area_id": "area-uuid-2",
      "new_area_name": "Taman Mundu",
      "reason": "Kekurangan staf",
      "effective_date": "2026-06-11",
      "actor_id": "admin-uuid",
      "actor_name": "Kepala Rayon Satu",
      "created_at": "2026-06-11T08:30:00.000Z"
    }
  ]
}
```

---

### GET /api/v1/monitoring/users/:userId/day-summary

Get a comprehensive day-level summary for a specific user including shift, activities, tasks, and contact links.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `korlap` (own area only), `kepala_rayon` (own rayon only), `management`, `admin_system`, `superadmin`

**Response (200 OK):**
```json
{
  "user_id": "worker-uuid",
  "full_name": "Pekerja Satu",
  "username": "satgas1",
  "role": "satgas",
  "phone": "08123456789",
  "status": "active",
  "location_id": "area-uuid",
  "area_name": "Taman Bungkul",
  "rayon_id": "rayon-uuid",
  "rayon_name": "Rayon Selatan",
  "shift": {
    "id": "shift-uuid",
    "definition_id": "22222222-2222-2222-2222-222222222201",
    "name": "Shift 1",
    "start_time": "06:00:00",
    "end_time": "15:00:00",
    "clock_in_time": "2026-03-03T06:05:00.000Z",
    "clock_out_time": null
  },
  "last_location": {
    "latitude": -7.2905,
    "longitude": 112.7398,
    "accuracy": 8.5,
    "logged_at": "2026-03-03T09:55:00.000Z",
    "is_within_area": true
  },
  "activities_today": [
    {
      "id": "activity-uuid",
      "activity_type": "Pemeliharaan Tanaman",
      "submitted_at": "2026-03-03T08:30:00.000Z",
      "photo_count": 2
    }
  ],
  "tasks_today": [
    {
      "id": "task-uuid",
      "title": "Perbaikan Pagar",
      "status": "in_progress",
      "assigned_at": "2026-03-03T07:00:00.000Z"
    }
  ],
  "whatsapp_links": {
    "chat": "https://wa.me/628123456789",
    "call": "https://wa.me/628123456789?text=Halo%20Pekerja%20Satu"
  }
}
```

---

### GET /api/v1/monitoring/config

Get all monitoring configuration entries.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `admin_system`, `superadmin`

**Response (200 OK):**
```json
{
  "configs": [
    {
      "key": "status_thresholds",
      "value": {
        "active_max_age_seconds": 300,
        "inactive_threshold_seconds": 900,
        "missing_threshold_seconds": 3600,
        "location_ping_interval_seconds": 60
      },
      "description": "User tracking status thresholds. Active: GPS within 5min. Idle: 5-15min. Missing: >1hr or no clock-in.",
      "updated_at": "2026-03-01T10:00:00.000Z"
    },
    {
      "key": "geofencing",
      "value": {
        "tolerance_meters": 50,
        "outside_area_grace_seconds": 120
      },
      "description": "Geofencing tolerance for boundary checking. Grace period before outside_area status triggers.",
      "updated_at": "2026-03-01T10:00:00.000Z"
    },
    {
      "key": "map_defaults",
      "value": {
        "center_lat": -7.2575,
        "center_lng": 112.7521,
        "zoom": 12,
        "cluster_threshold": 30,
        "cluster_zoom_threshold": 14
      },
      "description": "Default map view settings for Surabaya area.",
      "updated_at": "2026-03-01T10:00:00.000Z"
    },
    {
      "key": "alerts",
      "value": {
        "low_battery_threshold": 15,
        "understaffed_notify": true,
        "missing_user_notify": true
      },
      "description": "Alert trigger settings for monitoring dashboard.",
      "updated_at": "2026-03-01T10:00:00.000Z"
    }
  ]
}
```

---

### PATCH /api/v1/monitoring/config/:key

Update a specific monitoring configuration value.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `admin_system`, `superadmin`

**Request Body:**
```json
{
  "value": { "interval": 60 }
}
```

**Request Body Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | `Record<string, any>` | Yes | JSON configuration value |

**Response (200 OK):**
```json
{
  "key": "tracking_interval_seconds",
  "value": { "interval": 60 },
  "description": "GPS tracking upload interval in seconds",
  "updated_at": "2026-03-03T12:00:00.000Z"
}
```

---

### GET /api/v1/monitoring/staffing-summary

Get aggregated staffing status grouped by rayon or area.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `korlap` (own area only), `kepala_rayon` (own rayon only), `management`, `admin_system`, `superadmin`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rayon_id` | UUID | No | Filter summary to a specific rayon |
| `location_id` | UUID | No | Filter summary to a specific area |

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "rayon-uuid",
      "name": "Rayon Selatan",
      "type": "rayon",
      "roles": [
        { "role": "satgas", "active": 15, "idle": 2, "outside_area": 1, "missing": 0, "offline": 0, "total_assigned": 18, "total_required": 20, "requirements_by_day_type": { "weekday": 20, "weekend": 10, "holiday": 5 } },
        { "role": "linmas", "active": 5, "idle": 0, "outside_area": 1, "missing": 0, "offline": 0, "total_assigned": 6, "total_required": 8, "requirements_by_day_type": { "weekday": 8, "weekend": 4, "holiday": 2 } },
        { "role": "korlap", "active": 2, "idle": 0, "outside_area": 0, "missing": 0, "offline": 0, "total_assigned": 2, "total_required": 2, "requirements_by_day_type": { "weekday": 2, "weekend": 1, "holiday": 1 } }
      ],
      "total_active": 22,
      "total_inactive": 4,
      "total_outside_area": 2,
      "total_missing": 1,
      "total_offline": 1,
      "is_fully_staffed": false
    },
    {
      "id": "area-uuid",
      "name": "Taman Bungkul",
      "type": "area",
      "roles": [
        { "role": "satgas", "active": 4, "idle": 0, "outside_area": 0, "missing": 0, "offline": 0, "total_assigned": 4, "total_required": 5, "requirements_by_day_type": { "weekday": 5, "weekend": 3, "holiday": 1 } },
        { "role": "linmas", "active": 1, "idle": 1, "outside_area": 0, "missing": 0, "offline": 0, "total_assigned": 2, "total_required": 3, "requirements_by_day_type": { "weekday": 3, "weekend": 2, "holiday": 1 } }
      ],
      "total_active": 5,
      "total_inactive": 1,
      "total_outside_area": 0,
      "total_missing": 0,
      "total_offline": 0,
      "is_fully_staffed": false
    }
  ],
  "current_day_type": "weekday",
  "current_day_type_label": "Hari Kerja",
  "generated_at": "2026-03-05T10:00:00.000Z"
}
```

---

### GET /api/v1/locations/:id/boundary

Get the boundary polygon and coverage data for a specific area.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `admin_system`, `superadmin`

**Response (200 OK):**
```json
{
  "location_id": "area-uuid",
  "name": "Taman Bungkul",
  "boundary_polygon": {
    "type": "Polygon",
    "coordinates": [
      [
        [112.7395, -7.2900],
        [112.7401, -7.2900],
        [112.7401, -7.2910],
        [112.7395, -7.2910],
        [112.7395, -7.2900]
      ]
    ]
  },
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "radius_meters": 150,
  "coverage_area": 25000.00
}
```

Returns `boundary_polygon: null` if no polygon has been set for the area.

---

### PUT /api/v1/areas/:id/boundary

Create or replace the boundary polygon for a specific area.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `admin_system`, `superadmin`

**Request:**
```http
PUT /api/v1/areas/area-uuid/boundary HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_system_token}
Content-Type: application/json

{
  "boundary_polygon": {
    "type": "Polygon",
    "coordinates": [
      [
        [112.7395, -7.2900],
        [112.7401, -7.2900],
        [112.7401, -7.2910],
        [112.7395, -7.2910],
        [112.7395, -7.2900]
      ]
    ]
  },
  "coverage_area": 26000.00
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `boundary_polygon` | GeoJSON Polygon | Yes | Valid GeoJSON Polygon, must be within Surabaya bounds |
| `coverage_area` | number | No | Auto-computed from polygon if omitted |

**Notes:**
- Validates that all coordinates fall within Surabaya geographic bounds
- If `coverage_area` is omitted, it is automatically computed from the polygon geometry
- Invalidates area boundary cache on success
- Triggers re-evaluation of `is_within_area` status for all users currently in this area

**Response (200 OK):**
```json
{
  "location_id": "area-uuid",
  "name": "Taman Bungkul",
  "boundary_polygon": {
    "type": "Polygon",
    "coordinates": [...]
  },
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "radius_meters": 150,
  "coverage_area": 26000.00
}
```

---

### GET /api/v1/monitoring/boundaries

Get all rayon and area boundaries for map rendering.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `korlap` (own area/rayon only), `kepala_rayon` (own rayon only), `management`, `admin_system`, `superadmin`

**Request:**
```http
GET /api/v1/monitoring/boundaries HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rayon_id` | UUID | No | Filter to specific rayon (auto-applied for kepala_rayon) |
| `level` | `rayon` \| `area` | No | `rayon` → rayon outlines only, `areas: []` (lightest payload for the city view). `area` (default) → full per-area geometry. Polygons are server-simplified (Douglas–Peucker). The web/mobile clients request `rayon` at city scope and `area` (+`rayon_id`) after drilling into a rayon. |

> **Aggregate-first monitoring (revamp):** see `GET /monitoring/aggregate` below. Clients render lightweight rayon/area summary bubbles by default and only fetch worker coordinates for a focused area (or when the user opts into the clustered "Semua Petugas" view).

### GET /api/v1/monitoring/aggregate

Lightweight hierarchical rollup for the monitoring map's "Ringkasan" (summary) mode. Returns one node per child of the requested scope — rayons for `scope=city`, areas for `scope=rayon` — with grouped status/role counts and a center point, but **no individual worker coordinates**. Backed by grouped `COUNT` queries and a short-TTL response cache (concurrent identical reads collapse to one DB hit).

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `scope=city` → `management`, `admin_system`, `superadmin`. `scope=rayon` → also `kepala_rayon`, `admin_rayon` (forced to their own rayon).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | `city` \| `rayon` | No (default `city`) | Aggregation level |
| `id` | UUID | rayon scope | Rayon id (city roles may target any; rayon-scoped roles are forced to their own) |

**Response `200`:**
```jsonc
{
  "scope": "city",
  "scope_id": null,
  "nodes": [
    {
      "id": "rayon-uuid", "name": "Rayon Selatan", "type": "rayon",
      "center_lat": -7.30, "center_lng": 112.72,
      "counts_by_status": { "active": 12, "inactive": 3, "outside_area": 1, "missing": 2, "offline": 4 },
      "counts_by_role": { "satgas": 14, "linmas": 4 },
      "worker_count": 22, "online_count": 16, "required": 18,
      "is_understaffed": true, "area_count": 15
    }
  ],
  "totals": { "active": 42, "inactive": 8, "outside_area": 3, "missing": 5, "offline": 12 },
  "generated_at": "2026-07-05T02:30:00Z"
}
```
| `include_staffing` | boolean | No | Include staffing summary per area (default: true) |

**Response (200 OK):**
```json
{
  "rayons": [
    {
      "id": "rayon-uuid",
      "name": "Rayon Selatan",
      "code": "RS",
      "boundary_polygon": {
        "type": "Polygon",
        "coordinates": [[[112.73, -7.29], [112.74, -7.29], [112.74, -7.30], [112.73, -7.30], [112.73, -7.29]]]
      },
      "center_lat": -7.295,
      "center_lng": 112.735,
      "area_count": 5,
      "is_understaffed": true,
      "understaffed_area_count": 2
    }
  ],
  "areas": [
    {
      "id": "area-uuid",
      "name": "Taman Bungkul",
      "rayon_id": "rayon-uuid",
      "rayon_name": "Rayon Selatan",
      "boundary_polygon": {
        "type": "Polygon",
        "coordinates": [[[112.7395, -7.2900], [112.7401, -7.2900], [112.7401, -7.2910], [112.7395, -7.2910], [112.7395, -7.2900]]]
      },
      "center_lat": -7.2905,
      "center_lng": 112.7398,
      "radius_meters": 150,
      "is_understaffed": true,
      "staffing_summary": {
        "roles": [
          { "role": "satgas", "active": 7, "total_required": 10, "is_met": false },
          { "role": "linmas", "active": 3, "total_required": 5, "is_met": false },
          { "role": "korlap", "active": 1, "total_required": 1, "is_met": true }
        ]
      }
    }
  ],
  "generated_at": "2026-03-05T10:00:00.000Z"
}
```

---

### POST /api/v1/monitoring/reassign

Reassign a worker from one area to another.

**Auth:** JwtAuthGuard + RolesGuard
**Roles:** `superadmin`, `admin_system`, `kepala_rayon` (own rayon only)

**Request:**
```http
POST /api/v1/monitoring/reassign HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "user_id": "worker-uuid",
  "target_area_id": "area-uuid",
  "shift_definition_id": "shift-def-uuid",
  "effective_date": "2026-03-05",
  "end_current_schedule": true,
  "reason": "Area Taman Bungkul kurang staf satgas"
}
```

**Request Body Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | UUID | Yes | Worker to reassign |
| `target_area_id` | UUID | Yes | Target area |
| `shift_definition_id` | UUID | No | Defaults to current shift definition |
| `effective_date` | string (YYYY-MM-DD) | No | Defaults to today |
| `end_current_schedule` | boolean | No | Default true. End current schedule. |
| `reason` | string | No | Audit trail reason |

**Response (200 OK):**
```json
{
  "new_schedule_id": "schedule-uuid",
  "previous_area_id": "old-area-uuid",
  "previous_area_name": "Taman Prestasi",
  "new_area_id": "area-uuid",
  "new_area_name": "Taman Bungkul",
  "effective_date": "2026-03-05",
  "user_name": "Ahmad Satgas"
}
```

**Error Responses:**
- `403 Forbidden` — kepala_rayon trying to reassign outside own rayon
- `404 Not Found` — user_id or target_area_id not found
- `409 Conflict` — worker already assigned to target area
- `422 Unprocessable Entity` — worker role not compatible with area requirements

---

### Locations Module Extensions (Phase 2)

#### PATCH /api/v1/areas/:id/boundary

Update area boundary polygon (admin_system/superadmin only).

**Request:**
```http
PATCH /api/v1/areas/area-uuid/boundary HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "boundary_polygon": {
    "type": "Polygon",
    "coordinates": [
      [
        [112.7395, -7.2900],
        [112.7401, -7.2900],
        [112.7401, -7.2910],
        [112.7395, -7.2910],
        [112.7395, -7.2900]
      ]
    ]
  }
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `boundary_polygon` | GeoJSON | Yes | Valid GeoJSON Polygon |

**Response (200 OK):**
```json
{
  "id": "area-uuid",
  "name": "Taman Bungkul",
  "boundary_polygon": {
    "type": "Polygon",
    "coordinates": [...]
  },
  "coverage_area": 25000.00,
  "updated_at": "2026-01-24T10:00:00.000Z"
}
```

---

#### POST /api/v1/locations

Create a new location.

**Deprecated:** `/api/v1/areas` — use `/api/v1/locations`/import-kmz

Import areas from KMZ file (admin_system/superadmin only).

**Request:**
```http
POST /api/v1/areas/import-kmz HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="areas.kmz"
Content-Type: application/vnd.google-earth.kmz

[binary data]
------WebKitFormBoundary...
Content-Disposition: form-data; name="rayon_id"

11111111-1111-1111-1111-111111111101
------WebKitFormBoundary...--
```

**Response (200 OK):**
```json
{
  "preview_id": "preview-uuid",
  "areas_found": 5,
  "areas": [
    {
      "index": 0,
      "name": "Taman Baru",
      "boundary_type": "polygon",
      "coordinates": [[[-7.29, 112.73], ...]],
      "estimated_coverage": 15000.00,
      "status": "new"
    },
    {
      "index": 1,
      "name": "Taman Bungkul",
      "boundary_type": "polygon",
      "coordinates": [[[-7.29, 112.74], ...]],
      "estimated_coverage": 25000.00,
      "status": "exists",
      "existing_id": "area-uuid"
    }
  ]
}
```

---

#### POST /api/v1/locations

Create a new location.

**Deprecated:** `/api/v1/areas` — use `/api/v1/locations`/import-kmz/confirm

Confirm KMZ import and create/update areas.

**Request:**
```http
POST /api/v1/areas/import-kmz/confirm HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "preview_id": "preview-uuid",
  "selected_indices": [0, 1],
  "rayon_id": "11111111-1111-1111-1111-111111111101",
  "location_type_id": "area-type-uuid",
  "update_existing": true
}
```

**Response (201 Created):**
```json
{
  "created": 1,
  "updated": 1,
  "skipped": 0,
  "areas": [
    {
      "id": "new-area-uuid",
      "name": "Taman Baru",
      "action": "created"
    },
    {
      "id": "area-uuid",
      "name": "Taman Bungkul",
      "action": "updated"
    }
  ]
}
```

---

### Notifications Module (Phase 2)

**Overview:** The SEKAR notification system provides a dual approach for maximum user engagement:

1. **Push Notifications (FCM)** - Immediate alerts via device notification tray when app is backgrounded/closed
2. **In-App Notification Inbox** - Persistent notification history with mark-as-read and filtering capabilities

**Architecture:**

```
Backend Notification Flow:
admin_system/korlap/kepala_rayon → POST /notifications/send
                 ↓
         Create notification in DB
                 ↓
         Send FCM push (async) → Device notification tray
                 ↓
         Notification stored for inbox retrieval
```

**Push vs Inbox:**

| Feature | Push Notification (FCM) | In-App Inbox (API) |
|---------|------------------------|-------------------|
| **Delivery** | Immediate, works when app closed | Requires app open + API call |
| **Persistence** | Clears from tray after tap | Permanent history in database |
| **Management** | No read/unread status | Mark as read, filter, search |
| **Use Case** | Urgent alerts (task assigned, shift reminder) | Historical review, batch actions |

**Valid Notification Types:**
- `system` - General system notifications
- `task_assigned` - New task assigned
- `task_updated` - Task details changed
- `task_completed` - Task marked complete
- `task_declined` - Task declined by worker
- `shift_reminder` - Upcoming shift reminder
- `report_submitted` - New report submitted
- `announcement` - General announcements

**Important Notes:**
- **No pagination** on `GET /notifications` - Returns all user's notifications with optional filters
- FCM push delivery is **asynchronous** - `is_sent` field tracks delivery status
- Unread count updates in real-time as notifications are marked as read
- All endpoints require authentication (JWT token)

---

#### POST /api/v1/notifications/register-token

Register FCM token for push notifications.

**Request:**
```http
POST /api/v1/notifications/register-token HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "fcm_token": "dGhpcyBpcyBhIHRlc3QgdG9rZW4...",
  "platform": "android",
  "device_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "device_name": "Samsung Galaxy S21",
  "device_model": "SM-G991B",
  "app_version": "1.0.0"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `fcm_token` | string | Yes | Max 500 chars | FCM device token |
| `platform` | enum | Yes | 'android', 'ios', 'web' | Device platform |
| `device_id` | string | No | Max 100 chars | Unique device identifier |
| `device_name` | string | No | Max 100 chars | Device name (e.g., "Samsung Galaxy S21") |
| `device_model` | string | No | Max 50 chars | Device model (e.g., "SM-G991B") |
| `app_version` | string | No | Max 50 chars | App version (e.g., "1.0.0") |

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "6d3dd17e-497e-48b7-bc23-9f46be19dfd3",
  "fcm_token": "dGhpcyBpcyBhIHRlc3QgdG9rZW4...",
  "platform": "android",
  "device_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "device_name": "Samsung Galaxy S21",
  "device_model": "SM-G991B",
  "app_version": "1.0.0",
  "is_active": true,
  "last_used_at": "2026-01-31T10:30:00.000Z",
  "created_at": "2026-01-31T10:30:00.000Z",
  "updated_at": "2026-01-31T10:30:00.000Z"
}
```

---

#### DELETE /api/v1/notifications/unregister-token

Unregister FCM token.

**Request:**
```http
DELETE /api/v1/notifications/unregister-token HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "token": "fcm_token_here"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

#### GET /api/v1/notifications

Get user's notifications.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `unread_only` | boolean | false | Only show unread notifications |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "notification-uuid",
      "type": "task_assigned",
      "title": "Tugas Baru",
      "body": "Anda mendapat tugas baru: Penyiraman Area Timur",
      "data": {
        "task_id": "task-uuid"
      },
      "is_read": false,
      "created_at": "2026-01-24T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

---

#### PATCH /api/v1/notifications/:id/read

Mark notification as read.

**Response (200 OK):**
```json
{
  "id": "notification-uuid",
  "is_read": true
}
```

---

#### POST /api/v1/notifications/send

Send notification to a specific user.

**Roles:** Admin, Supervisor

**Request:**
```http
POST /api/v1/notifications/send HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": "user-uuid",
  "title": "Task Assigned",
  "body": "You have been assigned a new task: Clean Taman Bungkul",
  "type": "task_assigned",
  "data": {
    "task_id": "task-uuid",
    "action": "open_task"
  }
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `user_id` | UUID | Yes | Valid user ID |
| `title` | string | Yes | Max 200 characters |
| `body` | string | Yes | Notification message |
| `type` | string | No | NotificationType enum (default: 'system') |
| `data` | object | No | Additional JSON payload |

**Response (201 Created):**
```json
{
  "id": "notification-uuid",
  "user_id": "user-uuid",
  "title": "Task Assigned",
  "body": "You have been assigned a new task: Clean Taman Bungkul",
  "type": "task_assigned",
  "data": {
    "task_id": "task-uuid",
    "action": "open_task"
  },
  "is_read": false,
  "is_sent": false,
  "send_attempts": 0,
  "created_at": "2026-01-31T10:00:00.000Z"
}
```

**Error Responses:**
- **400 Bad Request:** Invalid input data
- **401 Unauthorized:** Missing or invalid token
- **403 Forbidden:** Insufficient permissions (not admin_system/korlap/kepala_rayon)
- **404 Not Found:** User not found

---

#### POST /api/v1/notifications/broadcast

Broadcast notification to multiple users by role.

**Roles:** admin_system/superadmin only

**Request:**
```http
POST /api/v1/notifications/broadcast HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "System Maintenance",
  "body": "The system will be under maintenance on Sunday",
  "type": "announcement",
  "target_roles": ["satgas", "korlap"],
  "data": {
    "priority": "high",
    "maintenance_date": "2026-02-02"
  }
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | Max 200 characters |
| `body` | string | Yes | Notification message |
| `type` | string | No | NotificationType enum (default: 'announcement') |
| `target_roles` | string[] | No | Array of UserRole enum (empty = all users) |
| `data` | object | No | Additional JSON payload |

**Response (201 Created):**
```json
{
  "sent": 45,
  "failed": 2
}
```

**Error Responses:**
- **400 Bad Request:** Invalid input data
- **401 Unauthorized:** Missing or invalid token
- **403 Forbidden:** Insufficient permissions (not Admin)

---

#### GET /api/v1/notifications/unread-count

Get unread notification count.

**Response (200 OK):**
```json
{
  "unread_count": 5
}
```

---

#### Comparison: Send vs Broadcast

| Feature | POST /send | POST /broadcast |
|---------|------------|-----------------|
| **Target** | Single user by ID | Multiple users by role |
| **Authorization** | admin_system, korlap, kepala_rayon | admin_system/superadmin only |
| **Use Case** | Task assignment, personal alerts | Announcements, system messages |
| **Request** | `user_id` (UUID) | `target_roles` (array) |
| **Response** | Notification object | `{sent, failed}` counts |

#### Usage Examples

**Example 1: Task Assignment Notification**
```json
POST /api/v1/notifications/send
{
  "user_id": "worker-uuid",
  "title": "New Task Assigned",
  "body": "You have been assigned: Clean Taman Bungkul",
  "type": "task_assigned",
  "data": {
    "task_id": "task-uuid",
    "action": "open_task",
    "priority": "high"
  }
}
```

**Example 2: Shift Reminder**
```json
POST /api/v1/notifications/send
{
  "user_id": "worker-uuid",
  "title": "Shift Reminder",
  "body": "Your shift starts in 30 minutes",
  "type": "shift_reminder",
  "data": {
    "shift_id": "shift-uuid",
    "start_time": "2026-01-31T13:00:00Z"
  }
}
```

**Example 3: System Announcement (Broadcast)**
```json
POST /api/v1/notifications/broadcast
{
  "title": "System Maintenance",
  "body": "The system will be under maintenance on Sunday 2PM-4PM",
  "type": "announcement",
  "target_roles": ["satgas", "korlap"],
  "data": {
    "priority": "high",
    "maintenance_date": "2026-02-02"
  }
}
```

---

### Tasks Module (Phase 2)

#### POST /api/v1/tasks

Create a new task assignment.

**Roles:** Admin, KepalaRayon, KoordinatorLapangan

**Request:**
```http
POST /api/v1/tasks HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Penyiraman Area Timur",
  "description": "Siram semua tanaman di area timur taman",
  "assigned_to": "worker-uuid",
  "location_id": "area-uuid",
  "activity_type_id": "activity-type-uuid",
  "priority": "high",
  "due_date": "2026-01-24T14:00:00.000Z"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | Max 200 characters |
| `description` | string | No | Max 1000 characters |
| `assigned_to` | UUID | No | Valid user ID (Worker/Linmas) |
| `location_id` | UUID | No | Valid area ID |
| `activity_type_id` | UUID | No | Valid activity type ID |
| `priority` | string | No | 'low', 'normal', 'high', 'urgent' (default: 'normal') |
| `due_date` | ISO 8601 | No | Future datetime |

**Response (201 Created):**
```json
{
  "id": "task-uuid",
  "title": "Penyiraman Area Timur",
  "description": "Siram semua tanaman di area timur taman",
  "assigned_to": {
    "id": "worker-uuid",
    "full_name": "Pekerja Satu"
  },
  "assigned_by": {
    "id": "koordinator-uuid",
    "full_name": "Koordinator Lapangan"
  },
  "area": {
    "id": "area-uuid",
    "name": "Taman Bungkul"
  },
  "activity_type": {
    "id": "activity-type-uuid",
    "name": "Penyiraman",
    "code": "WATERING"
  },
  "priority": "high",
  "status": "assigned",
  "due_date": "2026-01-24T14:00:00.000Z",
  "created_at": "2026-01-24T08:00:00.000Z"
}
```

---

#### GET /api/v1/tasks

Get list of tasks with filtering.

**Roles:** All authenticated users (filtered by role scope)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status (pending, assigned, accepted, in_progress, completed, declined, cancelled) |
| `priority` | string | - | Filter by priority (low, normal, high, urgent) |
| `assigned_to` | UUID | - | Filter by assigned worker |
| `location_id` | UUID | - | Filter by area |
| `due_date_from` | ISO 8601 | - | Filter due date from |
| `due_date_to` | ISO 8601 | - | Filter due date to |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "task-uuid",
      "title": "Penyiraman Area Timur",
      "assigned_to": {
        "id": "worker-uuid",
        "full_name": "Pekerja Satu"
      },
      "area": {
        "id": "area-uuid",
        "name": "Taman Bungkul"
      },
      "priority": "high",
      "status": "assigned",
      "due_date": "2026-01-24T14:00:00.000Z",
      "created_at": "2026-01-24T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

---

#### GET /api/v1/tasks/my

Get current user's assigned tasks (Worker/Linmas only).

**Roles:** Worker, Linmas

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status |
| `date` | ISO 8601 | today | Filter by due date |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "task-uuid",
      "title": "Penyiraman Area Timur",
      "description": "Siram semua tanaman di area timur taman",
      "area": {
        "id": "area-uuid",
        "name": "Taman Bungkul"
      },
      "activity_type": {
        "id": "activity-type-uuid",
        "name": "Penyiraman",
        "code": "WATERING"
      },
      "priority": "high",
      "status": "assigned",
      "due_date": "2026-01-24T14:00:00.000Z"
    }
  ],
  "counts": {
    "pending": 0,
    "assigned": 2,
    "accepted": 1,
    "in_progress": 1,
    "completed_today": 3
  }
}
```

---

#### GET /api/v1/tasks/:id

Get task details.

**Roles:** Task creator, assigned worker, or higher role

**Response (200 OK):**
```json
{
  "id": "task-uuid",
  "title": "Penyiraman Area Timur",
  "description": "Siram semua tanaman di area timur taman",
  "assigned_to": {
    "id": "worker-uuid",
    "full_name": "Pekerja Satu",
    "phone": "081234567890"
  },
  "assigned_by": {
    "id": "koordinator-uuid",
    "full_name": "Koordinator Lapangan"
  },
  "area": {
    "id": "area-uuid",
    "name": "Taman Bungkul",
    "gps_lat": -7.291234,
    "gps_lng": 112.738765
  },
  "activity_type": {
    "id": "activity-type-uuid",
    "name": "Penyiraman",
    "code": "WATERING"
  },
  "priority": "high",
  "status": "in_progress",
  "due_date": "2026-01-24T14:00:00.000Z",
  "started_at": "2026-01-24T09:30:00.000Z",
  "completed_at": null,
  "completion_photo_url": null,
  "completion_notes": null,
  "decline_reason": null,
  "created_at": "2026-01-24T08:00:00.000Z",
  "updated_at": "2026-01-24T09:30:00.000Z"
}
```

---

#### PATCH /api/v1/tasks/:id

Update task details (before accepted).

**Roles:** Admin, Task creator

**Request:**
```http
PATCH /api/v1/tasks/{id} HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Penyiraman Area Timur - Updated",
  "priority": "urgent",
  "due_date": "2026-01-24T12:00:00.000Z"
}
```

**Response (200 OK):**
```json
{
  "id": "task-uuid",
  "title": "Penyiraman Area Timur - Updated",
  "priority": "urgent",
  "due_date": "2026-01-24T12:00:00.000Z",
  "updated_at": "2026-01-24T08:30:00.000Z"
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "code": "TASK_ALREADY_STARTED",
  "message": "Cannot update task that has already been accepted or started"
}
```

---

#### PATCH /api/v1/tasks/:id/accept

Accept assigned task.

**Roles:** Worker, Linmas (assigned user only)

**Response (200 OK):**
```json
{
  "id": "task-uuid",
  "status": "accepted",
  "accepted_at": "2026-01-24T09:00:00.000Z"
}
```

---

#### PATCH /api/v1/tasks/:id/decline

Decline assigned task with reason.

**Roles:** Worker, Linmas (assigned user only)

**Request:**
```http
PATCH /api/v1/tasks/{id}/decline HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Sedang mengerjakan tugas lain yang lebih mendesak"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `reason` | string | Yes | Min 10 characters |

**Response (200 OK):**
```json
{
  "id": "task-uuid",
  "status": "declined",
  "decline_reason": "Sedang mengerjakan tugas lain yang lebih mendesak",
  "declined_at": "2026-01-24T09:00:00.000Z"
}
```

---

#### PATCH /api/v1/tasks/:id/start

Start working on accepted task.

**Roles:** Worker, Linmas (assigned user only)

**Response (200 OK):**
```json
{
  "id": "task-uuid",
  "status": "in_progress",
  "started_at": "2026-01-24T09:30:00.000Z"
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "code": "TASK_NOT_ACCEPTED",
  "message": "Task must be accepted before starting"
}
```

---

#### PATCH /api/v1/tasks/:id/complete

Complete task with photo evidence.

**Roles:** Worker, Linmas (assigned user only)

**Request:**
```http
PATCH /api/v1/tasks/{id}/complete HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="photo"; filename="completion.jpg"
Content-Type: image/jpeg

(binary image data)
------WebKitFormBoundary
Content-Disposition: form-data; name="notes"

Penyiraman selesai, semua tanaman telah disiram dengan baik
------WebKitFormBoundary--
```

**Request Form Data:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `photo` | file | Yes | JPEG/PNG, max 5MB |
| `notes` | string | No | Max 500 characters |

**Response (200 OK):**
```json
{
  "id": "task-uuid",
  "status": "completed",
  "completed_at": "2026-01-24T11:00:00.000Z",
  "completion_photo_url": "https://s3.../tasks/completion-photo.jpg",
  "completion_notes": "Penyiraman selesai, semua tanaman telah disiram dengan baik"
}
```

---

#### PATCH /api/v1/tasks/:id/verify

Verify completed task (supervisor only).

**Roles:** Korlap (for satgas/linmas), Kepala Rayon (for korlap), Top Management (for kepala_rayon)

**Response (200 OK):**
```json
{
  "id": "task-uuid",
  "status": "verified",
  "verified_by": "verifier-uuid",
  "verified_at": "2026-01-24T12:00:00.000Z"
}
```

**Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Anda tidak berwenang memverifikasi tugas ini"
}
```

---

#### PATCH /api/v1/tasks/:id/revision

Request revision on completed task (supervisor only).

**Roles:** Korlap, Kepala Rayon, Top Management (same hierarchy as verify)

**Request:**
```json
{
  "reason": "Foto dokumentasi kurang jelas, mohon ulangi"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `reason` | string | Yes | Non-empty, max 1000 characters |

**Response (200 OK):**
```json
{
  "id": "task-uuid",
  "status": "revision_needed",
  "revision_reason": "Foto dokumentasi kurang jelas, mohon ulangi"
}
```

---

#### PATCH /api/v1/activities/:id/approve

Approve pending activity (supervisor only).

**Roles:** Korlap (for satgas/linmas in same area), Kepala Rayon (for korlap/admin_rayon in same rayon)

**Response (200 OK):**
```json
{
  "id": "activity-uuid",
  "status": "approved",
  "reviewed_by": "reviewer-uuid",
  "reviewed_at": "2026-01-24T12:00:00.000Z"
}
```

---

#### PATCH /api/v1/activities/:id/reject

Reject pending activity with reason (supervisor only).

**Roles:** Korlap, Kepala Rayon (same hierarchy as approve)

**Request:**
```json
{
  "reason": "Deskripsi aktivitas tidak lengkap"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `reason` | string | Yes | Non-empty, max 1000 characters |

**Response (200 OK):**
```json
{
  "id": "activity-uuid",
  "status": "rejected",
  "reviewed_by": "reviewer-uuid",
  "reviewed_at": "2026-01-24T12:00:00.000Z",
  "rejection_reason": "Deskripsi aktivitas tidak lengkap"
}
```

---

#### DELETE /api/v1/tasks/:id

Cancel/delete task (soft delete).

**Roles:** Admin, Task creator

**Response (200 OK):**
```json
{
  "id": "task-uuid",
  "status": "cancelled",
  "deleted_at": "2026-01-24T08:30:00.000Z"
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "code": "TASK_IN_PROGRESS",
  "message": "Cannot cancel task that is already in progress"
}
```

---

## Phase 2 Endpoint Summary

| Module | Endpoints | Methods |
|--------|-----------|---------|
| Rayons | 6 | POST, GET, PATCH, DELETE |
| Shift Definitions | 2 | GET |
| Activity Types | 4 | POST, GET, PATCH, DELETE |
| Area Staff Requirements | 4 | POST, GET, PATCH, DELETE |
| Worker Schedules | 5 | POST, GET, PATCH, DELETE |
| Monitoring | 4 | GET |
| Areas Extensions | 3 | PATCH, POST |
| Notifications | 5 | POST, DELETE, GET, PATCH |
| Tasks | 10 | POST, GET, PATCH, DELETE |

**Total Phase 2 Endpoints:** 43

## Phase 2D Endpoint Summary

| Module | New Endpoints | Enhanced Endpoints | Methods |
|--------|---------------|--------------------|---------|
| Monitoring | 7 | 2 | GET, PATCH, POST |
| Areas (boundary) | 2 | 0 | GET, PUT |

**New Phase 2D Endpoints:** 9
**Enhanced Phase 2D Endpoints:** 4

**Grand Total (all phases):** 122

---

## Pagination & Limits

Current implementation (Phase 1 MVP):
- **Shifts history:** Last 50 records
- **Location history:** Last 1000 records
- **Reports:** No pagination (returns all matching filters)
- **Batch locations:** Max 100 per request

Phase 2 implementation:
- Cursor-based pagination for large lists
- `limit` and `offset` query parameters
- `X-Total-Count` response header
- Default limit: 20, Max limit: 100

---

## Rate Limiting

**Implemented in Phase 1 MVP:**
- **Auth endpoints:** 5 requests/minute per IP (login, refresh)
- **Global limit:** 100 requests/minute per IP
- **Implementation:** @nestjs/throttler package
- **Response:** HTTP 429 Too Many Requests with Retry-After header

**Planned enhancements (Phase 2+):**
- Per-user rate limits (separate from IP-based)
- Dynamic rate limiting based on user role
- Rate limit headers in all responses
- Distributed rate limiting with Redis

---

## Phase 4-5: Export & Import Data (June 2026)

Data export (CSV/XLSX/KMZ) and CSV bulk import. Roles: `admin_system`, `superadmin`
(export also `kepala_rayon`, scoped to their own rayon's tasks/activities/overtime).

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/export` | Export an entity. Body `{ entityType, format?, startDate?, endDate?, locationId?, rayonId? }`. `entityType` ∈ users\|areas\|rayons\|tasks\|activities\|overtime\|schedules; `format` ∈ csv(default)\|xlsx\|kmz(areas only). **≤5000 rows → 200** file stream (`Content-Disposition: attachment`); **>5000 rows → 202** `{ jobId, status:'processing' }`. Date range capped at 366 days. Rate limit **5/min per user**. |
| GET | `/api/v1/export/jobs` | List the caller's export jobs from the last 30 days. |
| GET | `/api/v1/export/jobs/:jobId` | Get one job (owner only). Completed jobs include a fresh **15-min presigned `downloadUrl`**. |

Async jobs are processed by a `setImmediate` worker (upload to S3); a 5-minute cron
re-fires jobs stuck in `processing` >10 min, failing them after 3 retries.

### Import (CSV)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/import/template/:entity` | Download an empty CSV template (header row only). `entity` ∈ users\|areas. |
| POST | `/api/v1/import/users/csv` | Validate a users CSV (multipart `file`). Returns `{ validCount, errors:[{row,column,value,message}], sessionId? }` — `sessionId` present only when ≥1 row is valid. No rows inserted yet. |
| POST | `/api/v1/import/areas/csv` | Validate an areas CSV (template adds required `location_type_id` + lat/lng). Same response shape. |
| POST | `/api/v1/import/confirm/:sessionId` | Commit a validated session (Redis-backed, 1h TTL, owner only). Inserts valid rows → `{ imported, skipped, skippedReasons[] }`. Rate limit **3/min per user**. |

KMZ area import remains at `/api/v1/import/kmz/{upload,preview/:id,confirm}` (see Phase 2/3 above).

---

---

## Document Information

**Document Version:** 2.1.0
**Last Updated:** March 3, 2026
**Phase:** Phase 2C Complete + Phase 2D Code-Complete
**Total Endpoints:** 122 (41 Phase 1 + 43 Phase 2 + 29 Phase 2C + 9 Phase 2D)
**Test Coverage:** 888 tests passing (89.57% statements, 81.64% branches)

### Technology Stack

- **Runtime:** Node.js >=24.13.0, npm >=10.0.0
- **Framework:** NestJS 11.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 14+ with TypeORM
- **Authentication:** JWT with Passport.js, bcrypt password hashing
- **Validation:** class-validator, class-transformer
- **API Docs:** Swagger/OpenAPI (@nestjs/swagger 11.x)
- **Testing:** Jest (416 tests, 99.06% coverage)
- **Rate Limiting:** @nestjs/throttler

---

## Phase 2C: Planned Endpoint Changes (February 2026)

> **Full specification:** See [build history](../history/CHANGELOG.md)

### New Endpoints (+8)

| # | Method | Path | Description | Roles |
|---|--------|------|-------------|-------|
| 1 | `POST` | `/overtime` | Submit overtime request | satgas, linmas |
| 2 | `GET` | `/overtime/my` | My overtime requests | satgas, linmas |
| 3 | `GET` | `/overtime` | Pending overtime approvals | korlap |
| 4 | `GET` | `/overtime/:id` | Overtime detail | Owner + managers |
| 5 | `PATCH` | `/overtime/:id/approve` | Approve overtime | korlap |
| 6 | `PATCH` | `/overtime/:id/reject` | Reject overtime | korlap |
| 7 | `GET` | `/tasks/tagged` | Tasks where user is tagged | All authenticated |
| 8 | `POST` | `/tasks/:id/tag` | Add tags to task | Task creator |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/aktivitas` | Renamed from `/reports`, mandatory activity_type_id, multi-photo (max 3), shift validation |
| `GET` | `/aktivitas` | Renamed from `/reports`, scoped access by role |
| `GET` | `/aktivitas/:id` | Renamed from `/reports/:id` |
| `GET` | `/aktivitas/my` | Renamed from `/reports/my` |
| `POST` | `/shifts/clock-in` | GPS boundary removed, 5 clockable roles |
| `POST` | `/tasks` | Hierarchical assignment validation, rayon_id field |
| `PATCH` | `/tasks/:id/complete` | Simplified: description + photo only (no GPS) |
| `GET` | `/monitoring/*` | Updated role access (8 roles) |

### Role Changes

All endpoints using old role names must update:
- `worker` → `satgas`
- `koordinator_lapangan` → `korlap`
- `supervisor` → `korlap`
- `admin` → `admin_system` or `superadmin` (context-dependent)

---

## Phase 2D: Monitoring Enhancements

> **Status:** Planned | **Target:** March 2026

### New Endpoints (+9)

| # | Method | Path | Description | Roles |
|---|--------|------|-------------|-------|
| 1 | `GET` | `/monitoring/users/:userId/location-history` | GPS track history for a user on a date | korlap, kepala_rayon, management, admin_system, superadmin |
| 1b | `GET` | `/monitoring/users/:userId/reassignment-history` | Reassignment audit history (last 20) — Phase 4-4 A4 | korlap, kepala_rayon, management, admin_system, superadmin |
| 2 | `GET` | `/monitoring/users/:userId/day-summary` | Full day summary: shift, activities, tasks, WhatsApp links | korlap, kepala_rayon, management, admin_system, superadmin |
| 3 | `GET` | `/monitoring/config` | List all monitoring configuration entries | admin_system, superadmin |
| 4 | `PATCH` | `/monitoring/config/:key` | Update a monitoring configuration value | admin_system, superadmin |
| 5 | `GET` | `/monitoring/staffing-summary` | Aggregated staffing status by rayon/area | korlap, kepala_rayon, management, admin_system, superadmin |
| 6 | `GET` | `/areas/:id/boundary` | Get area boundary polygon and coverage | admin_system, superadmin |
| 7 | `PUT` | `/areas/:id/boundary` | Create or replace area boundary polygon | admin_system, superadmin |
| 8 | `GET` | `/monitoring/boundaries` | Get area/rayon boundary polygons | korlap, kepala_rayon, management, admin_system, superadmin |
| 9 | `POST` | `/monitoring/reassign` | Reassign worker to different area | kepala_rayon, admin_system, superadmin |

### Enhanced Endpoints (4)

| Method | Path | Changes |
|--------|------|---------|
| `GET` | `/monitoring/live-users` | Renamed from `/live-workers`; new `status` query filter; response adds `phone`, `status` (TrackingStatus), `is_within_area`, `shift_name`, `shift_definition_id`, `accuracy`; totals split into per-status counts |
| `GET` | `/monitoring/area/:id` | `requirements` now returns `StaffRequirementStatusDto[]` with per-role `active_count`, `inactive_count`, `outside_area_count`, `missing_count` instead of a simple two-field summary |
| `GET` | `/monitoring/city` | (minor) `workers_online` / `linmas_online` now reflect TrackingStatus-based active count |
| `GET` | `/monitoring/rayon/:id` | (minor) Per-area row now includes TrackingStatus breakdown |

### New DTOs

| DTO | Fields |
|-----|--------|
| `TrackingStatus` (enum) | `active`, `inactive`, `outside_area`, `missing`, `offline` |
| `LiveUserDto` (enhanced) | All previous fields + `phone`, `status`, `is_within_area`, `shift_name`, `shift_definition_id`, `accuracy` |
| `LocationHistoryPointDto` | `latitude`, `longitude`, `accuracy`, `battery_level`, `logged_at`, `is_within_area` |
| `LocationHistoryResponseDto` | `user_id`, `user_name`, `role`, `date`, `shift_id`, `shift_name`, `location_id`, `area_name`, `clock_in_time`, `clock_out_time`, `points[]`, `total_points`, `total_distance_meters`, `time_inside_area_minutes`, `time_outside_area_minutes`, `generated_at` |
| `UserDaySummaryDto` | `user_id`, `full_name`, `username`, `role`, `phone`, `status`, `location_id`, `area_name`, `rayon_id`, `rayon_name`, `shift`, `last_location`, `activities_today[]`, `tasks_today[]`, `whatsapp_links` |
| `MonitoringConfigDto` | `key`, `value` (JSON), `description`, `updated_at` |
| `MonitoringConfigResponseDto` | `configs: MonitoringConfigDto[]` |
| `UpdateMonitoringConfigDto` | `value: Record<string, any>` |
| `RoleStaffingDto` | `role`, `count`, `online_count` |
| `StaffingSummaryItemDto` | `id`, `name`, `type` (`rayon`\|`area`), `roles: RoleStaffingDto[]`, `total_active`, `total_inactive`, `total_outside_area`, `total_missing`, `total_offline`, `is_fully_staffed` |
| `StaffingSummaryResponseDto` | `items: StaffingSummaryItemDto[]`, `generated_at` |
| `AreaBoundaryResponseDto` | `location_id`, `name`, `boundary_polygon` (GeoJSON\|null), `gps_lat`, `gps_lng`, `radius_meters`, `coverage_area` |
| `UpdateAreaBoundaryDto` | `boundary_polygon: GeoJsonPolygon`, `coverage_area?: number` |
| `StaffRequirementStatusDto` | `role`, `required_count`, `active_count`, `inactive_count`, `outside_area_count`, `missing_count` |

### New Database Tables

| Table | Purpose |
|-------|---------|
| `monitoring_configs` | Key-value store for monitoring system settings (JSON values) |
| `user_tracking_status` | Materialised per-user tracking status cache (refreshed on each GPS upload) |

### WebSocket Events (Monitoring)

**Connection:** `ws://api.host/monitoring`

**Authentication:** JWT token passed as `Authorization` header or `token` query parameter on connection.

**Rooms:**

| Room | Pattern | Access |
|------|---------|--------|
| City-wide | `monitoring:city` | management, admin_system, superadmin |
| District | `monitoring:rayon:{rayonId}` | kepala_rayon (own rayon), management, admin_system, superadmin |
| Region | `monitoring:region:{regionId}` | korlap (own region), kepala_rayon (own rayon), management, admin_system, superadmin |
| Location | `monitoring:area:{locationId}` | korlap (own location), kepala_rayon (own rayon), management, admin_system, superadmin |

**Events (Server to Client):**

| Event | Payload | Rooms | Description |
|-------|---------|-------|-------------|
| `USER_STATUS_CHANGED` | `{ userId, previousStatus, newStatus, timestamp }` | city, rayon, region, area | User tracking status changed (active/offline/absent; see ADR-050 for the 3-axis model) |
| `USER_LEFT_AREA` | `{ userId, locationId, timestamp, lastLocation: { lat, lng } }` | city, rayon, region, area | User exited location boundary polygon (is_within_area changed) |
| `USER_ENTERED_AREA` | `{ userId, locationId, timestamp }` | city, rayon, region, area | User entered location boundary polygon (is_within_area changed) |
| `AREA_STAFFING_CHANGED` | `{ locationId, activeCount, requiredCount }` | city, rayon, region | Location staffing level changed (understaffed/fully staffed; counts scheduled satgas+linmas only) |
| `USER_REASSIGNED` | `{ userId, fromAreaId, toAreaId, reason }` | city, rayon (both), region (both), area (both) | Worker reassigned to a different location |

**Events (Client to Server):**

| Event | Payload | Description |
|-------|---------|-------------|
| `JOIN_ROOM` | `{ room: string }` | Join a monitoring room (e.g., `monitoring:city`) |
| `LEAVE_ROOM` | `{ room: string }` | Leave a monitoring room |

**Example: Subscribing to city-wide events**
```javascript
// Connect
const socket = io('ws://api.host/monitoring', {
  auth: { token: 'Bearer <jwt>' }
});

// Join city room
socket.emit('JOIN_ROOM', { room: 'monitoring:city' });

// Listen for status changes
socket.on('USER_STATUS_CHANGED', (payload) => {
  console.log(`User ${payload.userId}: ${payload.previousStatus} → ${payload.newStatus}`);
});

// Listen for boundary events
socket.on('USER_LEFT_AREA', (payload) => {
  console.log(`User ${payload.userId} left area ${payload.locationId}`);
});
```

**Example: Subscribing to rayon-level events**
```javascript
socket.emit('JOIN_ROOM', { room: 'monitoring:rayon:rayon-uuid' });

socket.on('AREA_STAFFING_CHANGED', (payload) => {
  console.log(`Location ${payload.locationId}: ${payload.activeCount}/${payload.requiredCount} staff`);
});
```

**Example: Subscribing to region-level events**
```javascript
socket.emit('JOIN_ROOM', { room: 'monitoring:region:region-uuid' });

socket.on('USER_STATUS_CHANGED', (payload) => {
  console.log(`User ${payload.userId}: ${payload.previousStatus} → ${payload.newStatus}`);
});
```

---

### Phase 2E: Planned Endpoint Changes (Client Feedback II)

> **Full specification:** See [build history](../history/CHANGELOG.md)

**New Endpoints (8):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/:id/profile-picture` | Upload profile picture (base64 to S3) |
| GET | `/users/:id/areas` | Get user area assignments |
| POST | `/users/:id/areas` | Assign areas to user |
| DELETE | `/users/:userId/areas/:locationId` | Remove area assignment |
| POST | `/overtime/start` | Start overtime clock-in |
| POST | `/overtime/:id/end` | End overtime clock-out + activity |
| GET | `/overtime/active` | Get active overtime for current user |
| GET | `/audit/:entityType/:entityId` | Get entity audit trail |

**Modified Endpoints (5):**

| Endpoint | Change |
|----------|--------|
| `POST /auth/login` | **BREAKING:** `username` → `identifier` (accepts phone or username) |
| `POST /shifts/clock-in` | `selfie_photo` now optional; expanded to admin_rayon, kepala_rayon |
| `POST /shifts/clock-out` | `selfie_photo` now optional; expanded to admin_rayon, kepala_rayon |
| `GET /auth/me` | Response adds `phone_number`, `profile_picture_url`, `user_locations[]` |
| `GET /monitoring/live-users` | Response adds `profile_picture_url` per user |

**Planned Total:** 122 → 130 endpoints

---

### Phase 3: Planned Endpoints (Plants Management + Monitoring Rebuild + Public Intake)

> **Full specification:** See [build history](../history/CHANGELOG.md)
> **Authored:** 2026-04-24
> **Status:** Not started — specs complete. ~35 new endpoints plus extensions to existing `activities` and `tasks` endpoints.

#### Plants Catalog & Inventory (ADR-030)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/plant-species` | All authenticated | List plant species (131 seeded from CSV). Query: `?q=` (name search), `?category=`. |
| POST | `/plant-species` | admin_system, superadmin | Create species (`name_id`, `name_latin?`, `category`, `default_pruning_cycle_days?`, `notes?`). |
| PATCH | `/plant-species/:id` | admin_system, superadmin | Update species attributes (rename, cycle-days override). |
| GET | `/areas/:id/plants` | Rayon/area scope | Return `location_plants` aggregate rows (species × count × last_pruned_at × next_due_at × status). |
| PUT | `/areas/:id/plants` | admin_rayon (rayon), admin_system | Bulk upsert of species × count inventory for area (replace semantics per species). |
| GET | `/notable-plants?location_id=` | Rayon/area scope | List heritage / flagged individual plants in area. |
| POST | `/notable-plants` | admin_rayon (rayon), admin_system | Create notable plant record (species, GPS lat/lng, label, heritage flag, photos). |
| PATCH | `/notable-plants/:id` | admin_rayon (rayon), admin_system | Update notable plant. |
| DELETE | `/notable-plants/:id` | admin_rayon (rayon), admin_system | Soft delete notable plant. |

#### Activities (Extended — ADR-031)

| Method | Endpoint | Change |
|--------|----------|--------|
| POST | `/activities` | Body now accepts `custom_fields` (JSONB, validated per `task_type`), `plant_items[]` (species × count line items → `activity_plant_items`), `photo_before_url`, `photo_after_url`, optional `pruning_request_id` linking the activity to a public-intake request. |
| GET | `/activities` | New filters: `?task_type=pruning`, `?rayon_id=`, `?location_id=`, `?from=&to=`, `?custom_fields.maintenance_type=` (JSONB path). |

#### Typed Tasks (ADR-031)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/tasks` | korlap, admin_rayon, kepala_rayon | Extends body with `task_type` (`generic`\|`pruning`\|`watering`\|`planting`\|`removal`\|`inspection`), `custom_fields` (validated against registry), `target_plant_count?`. |
| POST | `/tasks/:id/partial-complete` | Assignee | Body: `{ progress_plant_count, plant_items[] }`. Server decides whether to spawn child task via `parent_task_id`. |
| POST | `/tasks/:id/resume` | Assignee | Creates child task linked via `parent_task_id` (resume-tomorrow flow). Returns new task. |
| GET | `/tasks/:id/lineage` | Task scope | Returns parent + children tree of the task for reporting. |

#### Pruning Requests — Public Intake (ADR-032, ADR-033)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/pruning-requests` | staff_kecamatan | Submit new request (`kecamatan_name`, `address`, `gps_lat?`, `gps_lng?`, `expected_date?`, `estimated_plant_count?`, `photo_urls[]`, `notes?`). Returns `{ id, reference_code }`. |
| GET | `/pruning-requests` | staff_kecamatan (mine), admin_rayon (rayon), management | Scope inferred. Query: `?mine=true`, `?rayon_id=`, `?status=`. |
| GET | `/pruning-requests/:id` | Owner / rayon disposition / management | Full detail incl. review history. |
| POST | `/pruning-requests/:id/review` | admin_rayon (rayon-scoped via `users.rayon_id`) | Body: `{ decision: 'approved'\|'rejected', rayon_id?, review_notes? }`. Approving resolves `rayon_id`. |
| POST | `/pruning-requests/:id/convert-to-task` | admin_rayon (rayon-scoped) | Body: `{ task_type: 'pruning', custom_fields, target_plant_count, assignee_id, service_week? }`. Creates task, books `service_capacity`, links back via `pruning_request_id`. Returns created task. |
| GET | `/pruning-requests/:id/result` | Owner kecamatan / rayon admin_rayon / management | Returns resulting task + activities + photos for outcome visibility. |

#### Monitoring v2 (ADR-029)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/monitoring/snapshot` | Role-scoped (city/rayon/area) | Single aggregated payload replacing today's multiple round-trips. Query: `?scope=city\|rayon\|area`, `?id=`, `?includes=workers,plants,overdue,rayons,areas`. |
| GET | `/monitoring/area/:id/plant-status` | Area scope | Green / yellow / red breakdown + due-date distribution of `location_plants`. |
| GET | `/monitoring/plant-status/summary` | City roles (all rayons, `?rayonId=` optional); kepala_rayon/korlap/admin_rayon forced to own rayon | Per-rayon `ok / due_soon / overdue / unknown` rollup of `location_plants` with `overdue_areas[{ location_id, area_name, overdue }]` per rayon, sorted by overdue desc. Returns `{ generated_at, rayons[] }`. Feeds the web dashboard "Tanaman Terlambat Dipangkas" widget, the monitoring map "Tanaman" overlay toggle, and the 08:00 WIB `area_plant_overdue` digest cron (Phase 3-8 close-out, Jun 2026). |

**WebSocket events (Redis-backed via Socket.IO Redis adapter; room prefix `monitoring:`):**

| Event | Payload | Description |
|-------|---------|-------------|
| `status:v2` | `{ user_id, status, location_id, prev_status, at }` | Incremental user status patch from StatusProjector. |
| `cluster:update` | `{ scope, cluster_id, count, bbox }` | Supercluster tile refresh for current viewport zoom. |
| `inventory:updated` | `{ location_id, species_id, count, status }` | Fired when `location_plants` aggregate mutates. |
| `request:status-changed` | `{ request_id, status, reviewed_by? }` | Fired on pruning-request lifecycle transitions. |
| `area:plant-status-changed` | `{ location_id, prev_status, status, overdue_count }` | Fired when area color flips ok/due/overdue. |

#### Service Capacity (ADR-035)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/rayons/:id/capacity` | Rayon scope | Weekly capacity grid. Query: `?service_type=pruning`, `?year=`, `?from_week=&to_week=`. Returns `[{ iso_week, capacity_units, booked_units }]`. |
| PUT | `/rayons/:id/capacity` | admin_rayon (rayon), management | Bulk upsert `capacity_units` per ISO week × service_type. |
| POST | `/rayons/:id/capacity/book` | admin_rayon, management | Manual booking adjustment (override for non-task bookings). Body: `{ year, iso_week, service_type, delta }`. |

> Booking is implicit on `/pruning-requests/:id/convert-to-task`; this endpoint exists for manual rebalancing.

#### Plant Seeds (Inventory Ledger)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/plant-seeds` | admin_rayon @ Taman Aktif, management | List seed master records (stock balances, units). |
| POST | `/plant-seeds` | admin_rayon @ Taman Aktif | Create seed master (`name_id`, `species_id?`, `unit`). |
| PATCH | `/plant-seeds/:id` | admin_rayon @ Taman Aktif | Update master (unit, name). |
| GET | `/seed-transactions` | admin_rayon @ Taman Aktif, management | Query ledger. Filters: `?seed_id=`, `?type=purchase\|distribution\|adjustment`, `?from=&to=`. |
| POST | `/seed-transactions` | admin_rayon @ Taman Aktif | Record transaction. Purchase: `{ seed_id, type:'purchase', qty, unit_price, supplier, receipt_url, occurred_at }`. Distribution: `{ seed_id, type:'distribution', qty (negative), to_rayon_id?, to_area_id?, recipient_name, occurred_at }`. |

#### Guards & Role Extensions

- New permission constant `PRUNING_REQUEST_REVIEWERS` adds `admin_rayon` (rayon-scoped) alongside management roles; amends ADR-009's approval boundaries (ADR-032).
- `staff_kecamatan` role added (ADR-033): non-clockable, scoped to own `pruning_requests.submitted_by` and their `result`. Swept across every existing `@Roles(...)` decorator for compatibility.

#### Web Push Subscription (Phase 3 M1-R sub-phase 3-R4 / completed in 3-9)

Web PWA admin roles subscribe to FCM web push on login via these endpoints. Native mobile FCM token registration uses the existing `/notifications/devices/*` endpoints (Phase 2B) — these are **web-specific**.

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/push/register` | admin_rayon, kepala_rayon, management, admin_system, superadmin | Register a web push subscription. Body: `{ endpoint: string, keys: { p256dh: string, auth: string }, user_agent?: string }`. Returns `{ subscription_id: uuid }`. Idempotent on `(user_id, endpoint)`. |
| DELETE | `/api/push/register/:subscription_id` | (same; or self-managed via the subscriber's session) | Unsubscribe a specific web push subscription (e.g., on logout or when the user disables notifications). Returns 204. |
| GET | `/api/push/subscriptions` | admin_system, superadmin | (admin diagnostic) List active subscriptions for the authenticated user. |

**Notification types delivered via web push** (mirror mobile FCM):
- `pruning_request_submitted` → click deep-link `/pruning-requests/[id]`
- `task_assigned` / `task_overdue` → click deep-link `/tasks/[id]`
- `area_plant_overdue` → click deep-link `/monitoring?focus_area=[id]&overlay=plants`
- `overtime_pending_review` → click deep-link `/overtime/[id]`

**Implementation:** scaffold during 3-R4 (web-side `usePushSubscription` hook + endpoint stubs); backend production implementation lands in 3-9 alongside the pruning-requests notification path.

**Planned Total:** 130 → ~165 endpoints (+~35 Phase 3 + 3 push subscription).

---

### Changelog

**v2.3.0 - April 24, 2026 (Phase 3 Planned — Plants Management + Monitoring Rebuild + Public Intake)**
- Planned ~35 new endpoints across 7 new or extended domains (plants, activities, typed tasks, pruning requests, monitoring v2, service capacity, plant seeds)
- 5 new WebSocket events (Redis-backed via Socket.IO Redis adapter)
- New role `staff_kecamatan` (ADR-033) and extended `admin_rayon` disposition authority (ADR-032)
- 7 new ADRs referenced: 029 (monitoring v2 event sourcing), 030 (area-aggregate inventory), 031 (task typing + custom fields), 032 (admin_rayon extension), 033 (staff_kecamatan), 034 (pruning cycle prediction), 035 (service capacity)
- See: history/CHANGELOG.md

**v2.2.0 - March 10, 2026 (Phase 2E Planned — Client Feedback II)**
- Planned 8 new endpoints (profile picture, user areas, overtime clock-in/out, audit trail)
- Planned 5 modified endpoints (login identifier, optional selfie, expanded roles)
- Breaking change: POST /auth/login request body changes from { username, password } to { identifier, password }
- New tables documented: user_locations, audit_logs
- Expanded CLOCKABLE_ROLES: +admin_rayon, +kepala_rayon
- See: history/CHANGELOG.md

**v2.1.0 - March 3, 2026 (Phase 2D Monitoring Enhancements)**
- Added 9 new monitoring/boundary endpoints
- Enhanced 4 existing monitoring endpoints (live-users, area/:id, city, rayon/:id)
- Introduced `TrackingStatus` enum and per-status totals on live-users
- Added per-role `StaffRequirementStatusDto` to area/:id requirements
- Renamed `/live-workers` → `/live-users`
- Added PUT `/areas/:id/boundary` (full replace) alongside existing PATCH
- Added GET `/areas/:id/boundary` for boundary retrieval
- Documented new DB tables: `monitoring_configs`, `user_tracking_status`
- Updated total endpoint count: 113 → 122
- Updated document version: 2.0.0 → 2.1.0

**v2.0.0 - February 10, 2026 (Phase 2C Planning)**
- Added 8 new endpoints (overtime module + task tagging)
- Renamed /reports → /aktivitas routes
- Updated role names (7→8 roles)
- Documented hierarchical task assignment
- GPS boundary removal from clock-in
- Full specification: history/CHANGELOG.md

**v1.3.0 - January 24, 2026**
- Updated to Node.js v24.13.0 and NestJS 11.x
- Updated @nestjs/swagger to 11.2.5
- Updated test metrics (416 tests, 99.06% coverage)
- Added rate limiting implementation details
- Corrected endpoint count to 41

**v1.2.0 - January 22, 2026**
- Added missing endpoints from verification
- Updated test coverage metrics

**v1.1.0 - January 16, 2026**
- Added change password endpoint
- Enhanced error code documentation

**v1.0.0 - January 11, 2026**
- Initial API contracts documentation
- 40 endpoints across 10 modules
