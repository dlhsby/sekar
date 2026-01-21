# API Contracts - Complete Endpoint Specifications

Comprehensive API endpoint specifications for all 37 endpoints in SEKAR Backend (Phase 1 MVP Complete).

## Overview

- **Base URL:** `http://localhost:3000/api` (dev) | `https://api.sekar.example.com/api` (prod)
- **Swagger Documentation:** `/api/docs`
- **Authentication:** JWT Bearer token (except login endpoint)
- **Content Type:** `application/json` (except file uploads: `multipart/form-data`)
- **Total Endpoints:** 37

## Table of Contents

1. [App Endpoints](#app-endpoints) (2 endpoints)
2. [Authentication](#authentication-module) (4 endpoints)
3. [Users Management](#users-module) (5 endpoints)
4. [Area Types](#area-types-module) (2 endpoints)
5. [Areas Management](#areas-module) (5 endpoints)
6. [Worker Assignments](#worker-assignments-module) (2 endpoints)
7. [Shifts Management](#shifts-module) (5 endpoints)
8. [Reports Management](#reports-module) (6 endpoints)
9. [Location Tracking](#location-module) (3 endpoints)
10. [Supervisor Dashboard](#supervisor-module) (3 endpoints)

---

## App Endpoints

### GET /api

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

### GET /api/health

Health check endpoint for monitoring (no authentication required).

**Request:**
```http
GET /api/health HTTP/1.1
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

### POST /api/auth/login

Authenticate user and obtain JWT token.

**Request:**
```http
POST /api/auth/login HTTP/1.1
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

### POST /api/auth/refresh

Refresh access token using a valid refresh token.

**Request:**
```http
POST /api/auth/refresh HTTP/1.1
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

### GET /api/auth/me

Get current authenticated user information.

**Request:**
```http
GET /api/auth/me HTTP/1.1
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

### POST /api/auth/logout

Logout and invalidate current session (requires authentication).

**Request:**
```http
POST /api/auth/logout HTTP/1.1
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

### POST /api/users

Create a new user (Admin only).

**Request:**
```http
POST /api/users HTTP/1.1
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
| `role` | enum | No | `worker`, `supervisor`, `admin` (default: `worker`) |

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

### GET /api/users

Get all users (Admin or Supervisor).

**Request:**
```http
GET /api/users HTTP/1.1
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

### GET /api/users/:id

Get user by ID (Admin or Supervisor).

**Request:**
```http
GET /api/users/8127dc81-97cf-4c6e-a1b4-b1ace284ea78 HTTP/1.1
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

### PATCH /api/users/:id

Update user (Admin only).

**Request:**
```http
PATCH /api/users/8127dc81-97cf-4c6e-a1b4-b1ace284ea78 HTTP/1.1
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

### DELETE /api/users/:id

Soft delete user (Admin only).

**Request:**
```http
DELETE /api/users/8127dc81-97cf-4c6e-a1b4-b1ace284ea78 HTTP/1.1
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

## Area Types Module

### GET /api/area-types

Get all area types (authenticated users).

**Request:**
```http
GET /api/area-types HTTP/1.1
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

### GET /api/area-types/:id

Get area type by ID (authenticated users).

**Request:**
```http
GET /api/area-types/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
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

## Areas Module

### POST /api/areas

Create a new area (Admin only).

**Request:**
```http
POST /api/areas HTTP/1.1
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

### GET /api/areas

Get all areas with optional filtering (authenticated users).

**Request:**
```http
GET /api/areas?area_type=park HTTP/1.1
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

### GET /api/areas/:id

Get area by ID (authenticated users).

**Request:**
```http
GET /api/areas/c3d4e5f6-a7b8-9012-cdef-123456789012 HTTP/1.1
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

### PATCH /api/areas/:id

Update area (Admin only).

**Request:**
```http
PATCH /api/areas/c3d4e5f6-a7b8-9012-cdef-123456789012 HTTP/1.1
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

### DELETE /api/areas/:id

Soft delete area (Admin only).

**Request:**
```http
DELETE /api/areas/c3d4e5f6-a7b8-9012-cdef-123456789012 HTTP/1.1
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

### POST /api/workers/:id/assign

Assign worker to an area (Admin or Supervisor).

**Request:**
```http
POST /api/workers/8127dc81-97cf-4c6e-a1b4-b1ace284ea78/assign HTTP/1.1
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

### DELETE /api/workers/:id/assign

Remove worker's area assignment (Admin or Supervisor).

**Request:**
```http
DELETE /api/workers/8127dc81-97cf-4c6e-a1b4-b1ace284ea78/assign HTTP/1.1
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

### POST /api/shifts/clock-in

Clock in to start a shift (Worker only).

**Request:**
```http
POST /api/shifts/clock-in HTTP/1.1
Host: localhost:3000
Authorization: Bearer {worker_token}
Content-Type: multipart/form-data

------WebKitFormBoundary...
Content-Disposition: form-data; name="gps_lat"

-7.2905
------WebKitFormBoundary...
Content-Disposition: form-data; name="gps_lng"

112.7398
------WebKitFormBoundary...
Content-Disposition: form-data; name="selfie_photo"; filename="selfie.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary...--
```

**Request Body Schema:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `gps_lat` | number | Yes | -90 to 90 |
| `gps_lng` | number | Yes | -180 to 180 |
| `selfie_photo` | file | Yes | Image (JPEG/PNG), max 10MB |

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
- Selfie uploaded to AWS S3 with date-based folder structure
- S3 key format: `shifts/YYYY/MM/DD/{uuid}-selfie.{ext}`
- Prevents double clock-in (one active shift per worker)
- `hours_worked` calculated on clock-out

---

### POST /api/shifts/clock-out

Clock out to end a shift (Worker only).

**Request:**
```http
POST /api/shifts/clock-out HTTP/1.1
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
  "message": "Shift duration too short. Minimum 15 minutes required, but only 5 minutes worked.",
  "error": "Bad Request"
}
```

**Notes:**
- `hours_worked` calculated as decimal (e.g., 9.0 = 9 hours)
- Calculation: `(clock_out_time - clock_in_time) / 3600000` (milliseconds to hours)
- No GPS boundary validation on clock-out (worker may be mobile)
- **Minimum duration:** Worker must work at least 15 minutes before clocking out
- If shift duration is less than 15 minutes, returns `SHIFT_DURATION_TOO_SHORT` error

---

### GET /api/shifts/current

Get current active shift (Worker only).

**Request:**
```http
GET /api/shifts/current HTTP/1.1
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

### GET /api/shifts/my-shifts

Get shift history (Worker only).

**Request:**
```http
GET /api/shifts/my-shifts HTTP/1.1
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

### GET /api/shifts/active

Get all active shifts (Admin or Supervisor).

**Request:**
```http
GET /api/shifts/active HTTP/1.1
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

### POST /api/reports

Create a work report (Worker only).

**Request:**
```http
POST /api/reports HTTP/1.1
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

### GET /api/reports

Get all reports with filters (Admin or Supervisor).

**Request:**
```http
GET /api/reports?worker_id=8127dc81-97cf-4c6e-a1b4-b1ace284ea78&from_date=2026-01-09&report_type=task_completion HTTP/1.1
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
    "report_type": "task_completion",
    "description": "Completed cleaning task in the park",
    "gps_lat": "-7.2905",
    "gps_lng": "112.7398",
    "photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/reports/2026/01/09/f6a7b8c9-photo.jpg",
    "created_at": "2026-01-09T10:00:00.000Z",
    "updated_at": "2026-01-09T10:00:00.000Z"
  }
]
```

---

### GET /api/reports/my-reports

Get current worker's own reports.

**Request:**
```http
GET /api/reports/my-reports HTTP/1.1
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
    "report_type": "task_completion",
    "description": "Completed cleaning task in the park",
    "gps_lat": "-7.2905",
    "gps_lng": "112.7398",
    "photo_url": "https://sekar-media.s3.ap-southeast-1.amazonaws.com/reports/2026/01/09/f6a7b8c9-photo.jpg",
    "created_at": "2026-01-09T10:00:00.000Z",
    "updated_at": "2026-01-09T10:00:00.000Z"
  }
]
```

**Notes:**
- Returns only reports belonging to the authenticated worker
- Ordered by creation date (newest first)
- Workers use this endpoint instead of GET /api/reports

---

### GET /api/reports/:id

Get report by ID (Admin, Supervisor, or Owner).

**Request:**
```http
GET /api/reports/f6a7b8c9-d0e1-2345-f678-456789012345 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

**Response (200 OK):**
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

### PATCH /api/reports/:id

Update report (Worker only, own reports, within 1 hour).

**Request:**
```http
PATCH /api/reports/f6a7b8c9-d0e1-2345-f678-456789012345 HTTP/1.1
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

### DELETE /api/reports/:id

Delete report (Admin only).

**Request:**
```http
DELETE /api/reports/f6a7b8c9-d0e1-2345-f678-456789012345 HTTP/1.1
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

### POST /api/location/batch

Batch upload location logs (Worker only).

**Request:**
```http
POST /api/location/batch HTTP/1.1
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

### GET /api/location/worker/:workerId

Get worker location history (Admin or Supervisor).

**Request:**
```http
GET /api/location/worker/8127dc81-97cf-4c6e-a1b4-b1ace284ea78?from_date=2026-01-09&shift_id=e5f6a7b8-c9d0-1234-ef56-345678901234 HTTP/1.1
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

### GET /api/location/worker/:workerId/latest

Get latest location for a worker (Admin or Supervisor).

**Request:**
```http
GET /api/location/worker/8127dc81-97cf-4c6e-a1b4-b1ace284ea78/latest HTTP/1.1
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

### GET /api/supervisor/active-workers

Get all active workers with real-time locations (Admin or Supervisor).

**Request:**
```http
GET /api/supervisor/active-workers HTTP/1.1
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

### GET /api/supervisor/area-status

Get area status overview (Admin or Supervisor).

**Request:**
```http
GET /api/supervisor/area-status HTTP/1.1
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

### GET /api/supervisor/attendance

Get daily attendance report (Admin or Supervisor).

**Request:**
```http
GET /api/supervisor/attendance?date=2026-01-09 HTTP/1.1
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
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"worker1","password":"worker123"}' \
  | jq -r '.access_token')
```

### Get Current User
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Clock In (with file upload)
```bash
curl -X POST http://localhost:3000/api/shifts/clock-in \
  -H "Authorization: Bearer $TOKEN" \
  -F "gps_lat=-7.2905" \
  -F "gps_lng=112.7398" \
  -F "selfie_photo=@/path/to/photo.jpg"
```

### Create Report (with photo)
```bash
curl -X POST http://localhost:3000/api/reports \
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
curl -X POST http://localhost:3000/api/location/batch \
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

## Pagination & Limits

Current implementation (Phase 1 MVP):
- **Shifts history:** Last 50 records
- **Location history:** Last 1000 records
- **Reports:** No pagination (returns all matching filters)
- **Batch locations:** Max 100 per request

Future enhancement (Phase 2+):
- Implement cursor-based pagination
- Add `limit` and `offset` query parameters
- Add `X-Total-Count` response header

---

## Rate Limiting (Phase 2+)

Planned rate limits:
- **Auth endpoints:** 5 requests/minute per IP
- **Read endpoints:** 100 requests/minute per user
- **Write endpoints:** 30 requests/minute per user
- **File uploads:** 10 requests/minute per user

---

**Document Version:** 1.1.0
**Last Updated:** 2026-01-21
**Phase:** 1 - MVP Complete
**Total Endpoints:** 37 (verified from controllers)
**Test Coverage:** 373 tests passing (84.23% coverage)
