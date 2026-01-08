# API Contracts - Phase 1 MVP

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.sekar.example.com/api
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer {jwt_token}
```

---

## 1. Authentication Endpoints

### POST /auth/login ✅
**Description:** Authenticate user and receive JWT token

**Request:**
```json
{
  "username": "worker1",
  "password": "worker123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "worker1",
    "full_name": "Ahmad Rizki",
    "role": "worker"
  }
}
```

**Errors:**
- `401` - Invalid credentials

---

### GET /auth/me ✅
**Description:** Get current authenticated user

**Headers:** Authorization required

**Response (200):**
```json
{
  "id": 1,
  "username": "worker1",
  "full_name": "Ahmad Rizki",
  "role": "worker",
  "assigned_area": {
    "id": 1,
    "name": "Taman Bungkul",
    "area_type": "park"
  }
}
```

**Errors:**
- `401` - Invalid/expired token

---

## 2. User Management Endpoints ✅

### GET /users
**Description:** List all users  
**Auth:** Admin, Supervisor

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| role | string | Filter by role (optional) |

**Response (200):**
```json
[
  {
    "id": 1,
    "username": "worker1",
    "full_name": "Ahmad Rizki",
    "role": "worker",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00.000Z"
  }
]
```

---

### POST /users
**Description:** Create new user  
**Auth:** Admin only

**Request:**
```json
{
  "username": "worker4",
  "password": "worker123",
  "full_name": "Pekerja Empat",
  "role": "worker"
}
```

**Response (201):**
```json
{
  "id": 4,
  "username": "worker4",
  "full_name": "Pekerja Empat",
  "role": "worker",
  "is_active": true,
  "created_at": "2026-01-08T10:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error (missing fields)
- `409` - Username already exists

---

### GET /users/:id
**Description:** Get user by ID  
**Auth:** Admin, Supervisor

**Response (200):**
```json
{
  "id": 1,
  "username": "worker1",
  "full_name": "Ahmad Rizki",
  "role": "worker",
  "is_active": true,
  "created_at": "2026-01-01T00:00:00.000Z",
  "assigned_area": {
    "id": 1,
    "name": "Taman Bungkul",
    "area_type": "park"
  }
}
```

**Errors:**
- `404` - User not found

---

### PATCH /users/:id
**Description:** Update user  
**Auth:** Admin only

**Request:**
```json
{
  "full_name": "Ahmad Rizki Updated",
  "role": "supervisor"
}
```

**Response (200):**
```json
{
  "id": 1,
  "username": "worker1",
  "full_name": "Ahmad Rizki Updated",
  "role": "supervisor",
  "is_active": true
}
```

---

### DELETE /users/:id
**Description:** Deactivate user (soft delete)  
**Auth:** Admin only

**Response (200):**
```json
{
  "message": "User deactivated successfully"
}
```

---

## 3. Area Type Endpoints

### GET /area-types
**Description:** List all area types  
**Auth:** Required

**Response (200):**
```json
[
  {
    "id": 1,
    "code": "park",
    "name": "Park",
    "description": "Public park or garden"
  },
  {
    "id": 2,
    "code": "pedestrian",
    "name": "Pedestrian Zone",
    "description": "Pedestrian walkway with trees"
  },
  {
    "id": 3,
    "code": "mini_garden",
    "name": "Mini Garden",
    "description": "Small garden or green space"
  },
  {
    "id": 4,
    "code": "street",
    "name": "Street",
    "description": "Street with trees or greenery"
  }
]
```

---

## 4. Area Endpoints

### GET /areas
**Description:** List all areas  
**Auth:** Required

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| area_type | string | Filter by area type code |

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Taman Bungkul",
    "area_type": {
      "id": 1,
      "code": "park",
      "name": "Park"
    },
    "gps_lat": -7.2905,
    "gps_lng": 112.7398,
    "radius_meters": 100,
    "address": "Jl. Taman Bungkul, Darmo, Surabaya"
  }
]
```

---

### POST /areas
**Description:** Create new area  
**Auth:** Admin only

**Request:**
```json
{
  "name": "Taman Harmoni",
  "area_type_id": 1,
  "gps_lat": -7.3037,
  "gps_lng": 112.7375,
  "radius_meters": 100,
  "address": "Jl. Mayjen Sungkono, Surabaya"
}
```

**Response (201):**
```json
{
  "id": 3,
  "name": "Taman Harmoni",
  "area_type": {
    "id": 1,
    "code": "park",
    "name": "Park"
  },
  "gps_lat": -7.3037,
  "gps_lng": 112.7375,
  "radius_meters": 100,
  "address": "Jl. Mayjen Sungkono, Surabaya",
  "created_at": "2026-01-08T10:00:00.000Z"
}
```

---

### GET /areas/:id
**Description:** Get area by ID  
**Auth:** Required

**Response (200):** Same as single item in list

---

### PATCH /areas/:id
**Description:** Update area  
**Auth:** Admin only

**Request:**
```json
{
  "name": "Taman Bungkul Updated",
  "radius_meters": 150
}
```

---

### DELETE /areas/:id
**Description:** Delete area  
**Auth:** Admin only

**Response (200):**
```json
{
  "message": "Area deleted successfully"
}
```

---

## 5. Worker Assignment Endpoints

### POST /workers/:id/assign
**Description:** Assign worker to area  
**Auth:** Admin, Supervisor

**Request:**
```json
{
  "area_id": 1
}
```

**Response (200):**
```json
{
  "worker_id": 2,
  "area_id": 1,
  "assigned_at": "2026-01-08T10:00:00.000Z"
}
```

---

### DELETE /workers/:id/assign
**Description:** Remove worker assignment  
**Auth:** Admin, Supervisor

**Response (200):**
```json
{
  "message": "Assignment removed successfully"
}
```

---

## 6. Shift Endpoints

### POST /shifts/clock-in
**Description:** Clock in to start shift  
**Auth:** Worker only

**Request:**
```json
{
  "area_id": 1,
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "selfie_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response (201):**
```json
{
  "shift_id": 1,
  "clock_in_time": "2026-01-08T08:00:00.000Z",
  "area": {
    "id": 1,
    "name": "Taman Bungkul",
    "area_type": "park"
  }
}
```

**Errors:**
- `400` - Already clocked in
- `400` - GPS outside area boundary
- `400` - Not assigned to this area

---

### POST /shifts/clock-out
**Description:** Clock out to end shift  
**Auth:** Worker only

**Request:**
```json
{
  "shift_id": 1,
  "gps_lat": -7.2905,
  "gps_lng": 112.7398
}
```

**Response (200):**
```json
{
  "shift_id": 1,
  "clock_out_time": "2026-01-08T16:00:00.000Z",
  "total_hours": 8.0
}
```

**Errors:**
- `400` - Not clocked in
- `400` - Shift already ended

---

### GET /shifts/current
**Description:** Get current active shift  
**Auth:** Worker only

**Response (200):**
```json
{
  "shift_id": 1,
  "area_name": "Taman Bungkul",
  "area_type": "park",
  "clock_in_time": "2026-01-08T08:00:00.000Z",
  "hours_worked": 4.5
}
```

**Response (null if not clocked in):**
```json
null
```

---

## 7. Report Endpoints

### POST /reports
**Description:** Create work report  
**Auth:** Worker only

**Request:**
```json
{
  "shift_id": 1,
  "notes": "Membersihkan area sekitar bangku taman",
  "condition": "Baik",
  "gps_lat": -7.2905,
  "gps_lng": 112.7398
}
```

**Response (201):**
```json
{
  "report_id": 1,
  "report_time": "2026-01-08T10:30:00.000Z"
}
```

---

### POST /reports/:id/upload-media
**Description:** Upload photo/video to report  
**Auth:** Worker only  
**Content-Type:** multipart/form-data

**Request:**
```
file: [binary data]
```

**Response (201):**
```json
{
  "media_id": 1,
  "media_type": "photo",
  "media_url": "https://sekar-media.s3.amazonaws.com/2026/01/photos/uuid.jpg",
  "thumbnail_url": "https://sekar-media.s3.amazonaws.com/2026/01/thumbnails/uuid.jpg"
}
```

---

### GET /reports/my-reports
**Description:** Get worker's own reports  
**Auth:** Worker only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| date | string | Date filter (YYYY-MM-DD) |

**Response (200):**
```json
[
  {
    "report_id": 1,
    "report_time": "2026-01-08T10:30:00.000Z",
    "notes": "Membersihkan area sekitar bangku taman",
    "condition": "Baik",
    "gps_lat": -7.2905,
    "gps_lng": 112.7398,
    "media_urls": [
      "https://sekar-media.s3.amazonaws.com/2026/01/photos/uuid.jpg"
    ]
  }
]
```

---

### GET /reports/:id
**Description:** Get report details  
**Auth:** Required

**Response (200):**
```json
{
  "report_id": 1,
  "worker_name": "Ahmad Rizki",
  "area_name": "Taman Bungkul",
  "area_type": "park",
  "report_time": "2026-01-08T10:30:00.000Z",
  "notes": "Membersihkan area sekitar bangku taman",
  "condition": "Baik",
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "reviewed": false,
  "reviewed_by": null,
  "reviewed_at": null,
  "media": [
    {
      "id": 1,
      "type": "photo",
      "url": "https://sekar-media.s3.amazonaws.com/2026/01/photos/uuid.jpg",
      "thumbnail_url": "https://sekar-media.s3.amazonaws.com/2026/01/thumbnails/uuid.jpg"
    }
  ]
}
```

---

### PUT /reports/:id/review
**Description:** Mark report as reviewed  
**Auth:** Supervisor only

**Request:**
```json
{
  "reviewed": true
}
```

**Response (200):**
```json
{
  "success": true,
  "reviewed_at": "2026-01-08T14:00:00.000Z"
}
```

---

## 8. Location Tracking Endpoints

### POST /location/batch
**Description:** Upload batch of GPS pings  
**Auth:** Worker only

**Request:**
```json
{
  "pings": [
    {
      "timestamp": "2026-01-08T08:10:00.000Z",
      "gps_lat": -7.2905,
      "gps_lng": 112.7398,
      "accuracy": 10.5
    },
    {
      "timestamp": "2026-01-08T08:20:00.000Z",
      "gps_lat": -7.2906,
      "gps_lng": 112.7399,
      "accuracy": 8.2
    }
  ]
}
```

**Response (200):**
```json
{
  "inserted_count": 2
}
```

---

## 9. Supervisor Dashboard Endpoints

### GET /supervisor/active-workers
**Description:** Get all currently active workers  
**Auth:** Supervisor only

**Response (200):**
```json
[
  {
    "worker_id": 1,
    "full_name": "Ahmad Rizki",
    "area_name": "Taman Bungkul",
    "area_type": "park",
    "current_gps_lat": -7.2905,
    "current_gps_lng": 112.7398,
    "clock_in_time": "2026-01-08T08:00:00.000Z",
    "last_ping_time": "2026-01-08T10:20:00.000Z"
  }
]
```

---

### GET /supervisor/reports
**Description:** Get reports with filters  
**Auth:** Supervisor only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| date | string | Date filter (YYYY-MM-DD), default today |
| worker_id | number | Filter by worker |
| area_id | number | Filter by area |
| area_type | string | Filter by area type code |

**Response (200):**
```json
[
  {
    "report_id": 1,
    "worker_name": "Ahmad Rizki",
    "area_name": "Taman Bungkul",
    "area_type": "park",
    "report_time": "2026-01-08T10:30:00.000Z",
    "notes": "Membersihkan area...",
    "condition": "Baik",
    "thumbnail_url": "https://...",
    "gps_lat": -7.2905,
    "gps_lng": 112.7398,
    "reviewed": false
  }
]
```

---

### GET /supervisor/attendance
**Description:** Get attendance for a date  
**Auth:** Supervisor only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| date | string | Date filter (YYYY-MM-DD), default today |
| area_id | number | Filter by area |
| area_type | string | Filter by area type code |

**Response (200):**
```json
[
  {
    "worker_id": 1,
    "full_name": "Ahmad Rizki",
    "area_name": "Taman Bungkul",
    "area_type": "park",
    "clock_in_time": "2026-01-08T08:00:00.000Z",
    "clock_out_time": "2026-01-08T16:00:00.000Z",
    "hours_worked": 8.0,
    "reports_count": 5
  }
]
```

---

## Error Response Format

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |

---

*Last Updated: January 2026*

