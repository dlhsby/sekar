# API Contracts - Complete Endpoint Specifications

Comprehensive API endpoint specifications for all 41 endpoints in SEKAR Backend (Phase 1 MVP Complete).

## Overview

- **Base URL:** `http://localhost:3000/api/v1` (dev) | `https://api.sekar.dlhsurabaya.go.id/api/v1` (prod)
- **Swagger Documentation:** `/api/v1/docs`
- **Authentication:** JWT Bearer token (15-min access + 7-day refresh with rotation)
- **Content Type:** `application/json` (except file uploads: `multipart/form-data`)
- **Total Endpoints:** 84 (41 Phase 1 + 43 Phase 2) → **Phase 2C: implemented**
- **Backend:** NestJS 11.x, Node.js >=24.13.0, TypeScript 5.x
- **Database:** PostgreSQL 14+ with TypeORM
- **Testing:** 769 tests passing (50 suites)
- **Error Codes:** 40+ standardized codes (see `error-handling.md`)
- **Rate Limiting:** 100 req/min global, 5 req/min auth endpoints
- **Last Updated:** February 11, 2026
- **Phase 2C Note:** Terminology cleanup (ADR-010) has implemented route renames: `/aktivitas`→`/activities`, `/worker-schedules`→`/schedules`. Dropped `/workers/:id/assign`. Flattened overtime DTO. See Phase 2C specs for full details.

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
16. [Monitoring Module](#monitoring-module) (4 endpoints)
17. [Areas Extensions](#areas-module-extensions-phase-2) (3 endpoints)
18. [Notifications Module](#notifications-module-phase-2) (5 endpoints)
19. [Tasks Module](#tasks-module-phase-2) (10 endpoints)

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
  "password": "worker123"
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
    "role": "worker"
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
    "role": "worker"
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
  "role": "worker",
  "created_at": "2026-01-09T10:00:00.000Z",
  "assigned_area": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "name": "Taman Bungkul",
    "area_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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

**Response (200 OK) - Admin/Supervisor:**
```json
{
  "id": "9237ec92-08df-5d7f-b2c5-c2bdf395fb89",
  "username": "supervisor1",
  "full_name": "Supervisor Satu",
  "role": "supervisor",
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

Create a new user (Admin only).

**Request:**
```http
POST /api/v1/users HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "username": "worker4",
  "password": "securepassword123",
  "full_name": "Pekerja Empat",
  "role": "worker"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `username` | string | Yes | Max 50 chars, alphanumeric with _ and -, unique |
| `password` | string | Yes | Min 6 characters |
| `full_name` | string | Yes | Max 100 characters |
| `role` | enum | No | `satgas`, `linmas`, `korlap`, `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin` (default: `satgas`) |

**Response (201 Created):**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "worker4",
  "full_name": "Pekerja Empat",
  "role": "worker",
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

Get all users (Admin or Supervisor).

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
    "role": "worker",
    "is_active": true,
    "created_at": "2026-01-09T10:00:00.000Z"
  },
  {
    "id": "9237ec92-08df-5d7f-b2c5-c2bdf395fb89",
    "username": "supervisor1",
    "full_name": "Supervisor Satu",
    "role": "supervisor",
    "is_active": true,
    "created_at": "2026-01-09T10:00:00.000Z"
  }
]
```

---

### GET /api/v1/users/:id

Get user by ID (Admin or Supervisor).

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
  "role": "worker",
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

Update user (Admin only).

**Request:**
```http
PATCH /api/v1/users/8127dc81-97cf-4c6e-a1b4-b1ace284ea78 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "full_name": "Pekerja Satu Updated",
  "password": "newsecurepassword123",
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
  "role": "worker",
  "is_active": true,
  "created_at": "2026-01-09T10:00:00.000Z",
  "updated_at": "2026-01-09T11:00:00.000Z"
}
```

---

### DELETE /api/v1/users/:id

Soft delete user (Admin only).

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
  "current_password": "worker123",
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
- All authenticated users (Worker, Supervisor, Admin) can change their own password
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
  "message": "AreaType with ID a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found",
  "error": "Not Found"
}
```

---

### POST /api/v1/area-types

Create a new area type (Admin only).

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

### PATCH /api/v1/area-types/:id

Update an existing area type (Admin only).

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

### DELETE /api/v1/area-types/:id

Soft delete an area type (Admin only). Cannot delete if areas reference this type.

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

## Areas Module

### POST /api/v1/areas

Create a new area (Admin only).

**Request:**
```http
POST /api/v1/areas HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Taman Bungkul",
  "area_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
| `area_type_id` | UUID | Yes | Valid area type UUID |
| `gps_lat` | number | Yes | -90 to 90 |
| `gps_lng` | number | Yes | -180 to 180 |
| `radius_meters` | number | Yes | 1 to 10000 |
| `address` | string | No | Max 500 characters |

**Response (201 Created):**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "name": "Taman Bungkul",
  "area_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "areaType": {
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
- `areaType` relation eager loaded
- `radius_meters` defines clock-in boundary (default ±100m)

---

### GET /api/v1/areas

Get all areas with optional filtering (authenticated users).

**Request:**
```http
GET /api/v1/areas?area_type=park HTTP/1.1
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
    "area_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "areaType": {
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

### GET /api/v1/areas/:id

Get area by ID (authenticated users).

**Request:**
```http
GET /api/v1/areas/c3d4e5f6-a7b8-9012-cdef-123456789012 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "name": "Taman Bungkul",
  "area_type_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "areaType": {
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

### PATCH /api/v1/areas/:id

Update area (Admin only).

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
| `area_type_id` | UUID | Valid area type UUID |
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

### DELETE /api/v1/areas/:id

Soft delete area (Admin only).

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

Assign worker to an area (Admin or Supervisor).

**Request:**
```http
POST /api/v1/workers/8127dc81-97cf-4c6e-a1b4-b1ace284ea78/assign HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "area_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Worker user ID |

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `area_id` | UUID | Yes | Valid area UUID |

**Response (201 Created):**
```json
{
  "id": "d4e5f6a7-b8c9-0123-def4-234567890123",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "area_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
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

Remove worker's area assignment (Admin or Supervisor).

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

Clock in to start a shift (Worker only).

**Request:**
```http
POST /api/v1/shifts/clock-in HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
Content-Type: application/json

{
  "area_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "selfie_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `area_id` | string (UUID) | Yes | Valid UUID of assigned area |
| `gps_lat` | number | Yes | -90 to 90 |
| `gps_lng` | number | Yes | -180 to 180 |
| `selfie_photo` | string | Yes | Base64 data URI (JPEG/PNG), max ~7.5MB decoded |

**Response (201 Created):**
```json
{
  "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "area_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
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

Clock out to end a shift (Worker only).

**Request:**
```http
POST /api/v1/shifts/clock-out HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
Content-Type: application/json

{
  "gps_lat": -7.2906,
  "gps_lng": 112.7399
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `gps_lat` | number | Yes | -90 to 90 |
| `gps_lng` | number | Yes | -180 to 180 |

**Response (200 OK):**
```json
{
  "id": "e5f6a7b8-c9d0-1234-ef56-345678901234",
  "worker_id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "area_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
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

Get current active shift (Worker only).

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
  "area_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
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

---

### GET /api/v1/shifts/my-shifts

Get shift history (Worker only).

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
    "area_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
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

### GET /api/v1/shifts/active

Get all active shifts (Admin or Supervisor).

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
    "area_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
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

Create a work report (Worker only).

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

Get all reports with filters (Admin or Supervisor).

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
    "area_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
      "role": "worker"
    },
    "area": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Taman Bungkul",
      "areaType": {
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
        "areaType": {
          "code": "park",
          "name": "Taman"
        }
      },
      "worker": {
        "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
        "username": "worker1",
        "full_name": "Pekerja Satu",
        "role": "worker"
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
    "area_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
      "role": "worker"
    },
    "area": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Taman Bungkul",
      "areaType": {
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
        "areaType": {
          "code": "park",
          "name": "Taman"
        }
      },
      "worker": {
        "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
        "username": "worker1",
        "full_name": "Pekerja Satu",
        "role": "worker"
      }
    }
  }
]
```

**Notes:**
- Returns only reports belonging to the authenticated worker
- Ordered by creation date (newest first)
- Workers use this endpoint instead of GET /api/v1/reports
- Response includes nested relations: `worker`, `area`, and `shift` (same as GET /api/v1/reports)

---

### GET /api/v1/reports/:id

Get report by ID (Admin, Supervisor, or Owner).

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
  "area_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
    "role": "worker"
  },
  "area": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Taman Bungkul",
    "areaType": {
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
      "areaType": {
        "code": "park",
        "name": "Taman"
      }
    },
    "worker": {
      "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
      "username": "worker1",
      "full_name": "Pekerja Satu",
      "role": "worker"
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
- Workers can only view their own reports
- Admin/Supervisor can view all reports

---

### PATCH /api/v1/reports/:id

Update report (Worker only, own reports, within 1 hour).

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

Delete report (Admin only).

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

Batch upload location logs (Worker only).

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

Get worker location history (Admin or Supervisor).

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

Get latest location for a worker (Admin or Supervisor).

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

Get all active workers with real-time locations (Admin or Supervisor).

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

Get area status overview (Admin or Supervisor).

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

Get daily attendance report (Admin or Supervisor).

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
  -d '{"username":"worker1","password":"worker123"}' \
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
    \"area_id\": \"c3d4e5f6-a7b8-9012-cdef-123456789012\",
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

#### POST /api/v1/rayons

Create a new rayon (Admin only).

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
- All authenticated users can view rayons
- `area_count` shows number of areas assigned to rayon

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

Update rayon (Admin only).

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

Delete rayon (Admin only, must have no areas assigned).

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

Get rayon statistics (TopManagement, KepalaRayon, Admin).

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

Create activity type (Admin only).

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
  "applicable_roles": ["Worker"]
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 100 characters |
| `code` | string | Yes | Max 50 characters, unique, uppercase |
| `description` | string | No | Max 500 characters |
| `applicable_roles` | string[] | Yes | Array of ['Worker', 'Linmas'] |

**Response (201 Created):**
```json
{
  "id": "33333333-3333-3333-3333-333333333301",
  "name": "Penyiraman",
  "code": "WATERING",
  "description": "Penyiraman tanaman dan rumput",
  "applicable_roles": ["Worker"],
  "is_active": true,
  "created_at": "2026-01-24T10:00:00.000Z"
}
```

---

#### GET /api/v1/activity-types

List activity types (filtered by role for Worker/Linmas).

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
      "applicable_roles": ["Worker"],
      "is_active": true
    },
    {
      "id": "33333333-3333-3333-3333-333333333306",
      "name": "Pembersihan",
      "code": "CLEANING",
      "description": "Pembersihan area dari sampah",
      "applicable_roles": ["Worker", "Linmas"],
      "is_active": true
    }
  ]
}
```

**Notes:**
- Workers see only Worker-applicable activity types
- Linmas see only Linmas-applicable activity types
- Admin sees all activity types

---

#### PATCH /api/v1/activity-types/:id

Update activity type (Admin only).

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
  "applicable_roles": ["Worker"],
  "is_active": false,
  "updated_at": "2026-01-24T11:00:00.000Z"
}
```

---

#### DELETE /api/v1/activity-types/:id

Delete activity type (Admin only, soft delete).

**Response (204 No Content)**

---

### Area Staff Requirements Module

#### POST /api/v1/areas/:id/staff-requirements

Set staff requirements for an area (Admin only).

**Request:**
```http
POST /api/v1/areas/area-uuid/staff-requirements HTTP/1.1
Host: localhost:3000
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "shift_definition_id": "22222222-2222-2222-2222-222222222201",
  "role": "Worker",
  "required_count": 6,
  "day_type": "WEEKDAY"
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `shift_definition_id` | UUID | Yes | Valid shift definition ID |
| `role` | string | Yes | 'Worker' or 'Linmas' |
| `required_count` | number | Yes | Min 1 |
| `day_type` | string | No | 'WEEKDAY', 'WEEKEND', 'HOLIDAY' (default: 'WEEKDAY') |

**Response (201 Created):**
```json
{
  "id": "44444444-4444-4444-4444-444444444401",
  "area_id": "area-uuid",
  "shift_definition_id": "22222222-2222-2222-2222-222222222201",
  "role": "Worker",
  "required_count": 6,
  "day_type": "WEEKDAY",
  "created_at": "2026-01-24T10:00:00.000Z"
}
```

---

#### GET /api/v1/areas/:id/staff-requirements

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
      "role": "Worker",
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
      "role": "Linmas",
      "required_count": 2,
      "day_type": "WEEKDAY"
    }
  ]
}
```

---

#### PATCH /api/v1/areas/:areaId/staff-requirements/:id

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

#### DELETE /api/v1/areas/:areaId/staff-requirements/:id

Delete staff requirement (Admin only).

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
  "area_id": "area-uuid",
  "shift_definition_id": "22222222-2222-2222-2222-222222222201",
  "effective_date": "2026-01-25",
  "end_date": null
}
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `user_id` | UUID | Yes | Valid Worker/Linmas user ID |
| `area_id` | UUID | Yes | Valid area ID |
| `shift_definition_id` | UUID | Yes | Valid shift definition ID |
| `effective_date` | date | Yes | YYYY-MM-DD format |
| `end_date` | date | No | YYYY-MM-DD format, null for ongoing |

**Response (201 Created):**
```json
{
  "id": "55555555-5555-5555-5555-555555555501",
  "user_id": "worker-uuid",
  "area_id": "area-uuid",
  "shift_definition_id": "22222222-2222-2222-2222-222222222201",
  "effective_date": "2026-01-25",
  "end_date": null,
  "created_by": "admin-uuid",
  "created_at": "2026-01-24T10:00:00.000Z"
}
```

---

#### GET /api/v1/schedules

List worker schedules.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `area_id` | UUID | - | Filter by area |
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
        "role": "Worker"
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

Delete schedule (Admin only).

**Response (204 No Content)**

---

#### GET /api/v1/schedules/area/:areaId

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
        "role": "Worker"
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
Authorization: Bearer {top_management_token}
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
      "area_id": "area-uuid",
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

#### GET /api/v1/monitoring/area/:id

Get area statistics (Admin, TopManagement, KepalaRayon, KoordinatorLapangan).

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
    "requirements": {
      "workers": 6,
      "linmas": 2
    },
    "actual": {
      "workers": 5,
      "linmas": 2
    },
    "status": "understaffed"
  },
  "active_workers": [
    {
      "user_id": "worker-uuid",
      "full_name": "Pekerja Satu",
      "role": "Worker",
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

#### GET /api/v1/monitoring/live-workers

Get real-time worker positions for map display.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rayon_id` | UUID | - | Filter by rayon |
| `area_id` | UUID | - | Filter by area |

**Response (200 OK):**
```json
{
  "timestamp": "2026-01-24T10:00:00.000Z",
  "workers": [
    {
      "user_id": "worker-uuid",
      "full_name": "Pekerja Satu",
      "role": "Worker",
      "area_id": "area-uuid",
      "area_name": "Taman Bungkul",
      "shift_id": "shift-uuid",
      "gps_lat": -7.2905,
      "gps_lng": 112.7398,
      "location_timestamp": "2026-01-24T09:55:00.000Z",
      "battery_level": 85,
      "status": "online"
    }
  ],
  "total": 120
}
```

---

### Areas Module Extensions (Phase 2)

#### PATCH /api/v1/areas/:id/boundary

Update area boundary polygon (Admin only).

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

#### POST /api/v1/areas/import-kmz

Import areas from KMZ file (Admin only).

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

#### POST /api/v1/areas/import-kmz/confirm

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
  "area_type_id": "area-type-uuid",
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
Admin/Supervisor → POST /notifications/send
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
- **403 Forbidden:** Insufficient permissions (not Admin/Supervisor)
- **404 Not Found:** User not found

---

#### POST /api/v1/notifications/broadcast

Broadcast notification to multiple users by role.

**Roles:** Admin only

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
  "target_roles": ["Worker", "Supervisor"],
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
| **Authorization** | Admin, Supervisor | Admin only |
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
  "target_roles": ["Worker", "Supervisor"],
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
  "area_id": "area-uuid",
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
| `area_id` | UUID | No | Valid area ID |
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
| `area_id` | UUID | - | Filter by area |
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

---

## Document Information

**Document Version:** 2.0.0
**Last Updated:** January 24, 2026
**Phase:** 1 Complete + Phase 2 Planned
**Total Endpoints:** 84 (41 Phase 1 implemented + 43 Phase 2 planned)
**Test Coverage:** 416 tests passing (99.06% statements, 94.27% branches)

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

> **Full specification:** See [`specs/phases/phase-2-c-client-feedback/backend.md`](../phases/phase-2-c-client-feedback/backend.md)

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

### Changelog

**v2.0.0 - February 10, 2026 (Phase 2C Planning)**
- Added 8 new endpoints (overtime module + task tagging)
- Renamed /reports → /aktivitas routes
- Updated role names (7→8 roles)
- Documented hierarchical task assignment
- GPS boundary removal from clock-in
- Full specification: specs/phases/phase-2-c-client-feedback/backend.md

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
