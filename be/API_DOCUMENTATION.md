# SEKAR API Documentation

## 📚 Overview

**SEKAR** (Sistem Evaluasi Kerja Satgas RTH) is a Worker Tracking and Task Management System developed for DKRTH (Dinas Kebersihan dan Ruang Terbuka Hijau) Surabaya.

This document provides comprehensive documentation for all API endpoints available in Phase 1 MVP.

## 🔗 Base URL

- **Development:** `http://localhost:3000/api`
- **Production:** `https://api.sekar.example.com/api`

## 📖 Interactive Documentation

Swagger/OpenAPI interactive documentation is available at:
- **Development:** `http://localhost:3000/api/docs`
- **Production:** `https://api.sekar.example.com/api/docs`

## 🔐 Authentication

The API uses JWT (JSON Web Token) based authentication.

### Getting a Token

To access protected endpoints, you must first obtain a JWT token by logging in:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "worker1",
  "password": "worker123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "username": "worker1",
    "full_name": "Pekerja Satu",
    "role": "worker"
  }
}
```

### Using the Token

Include the token in the Authorization header for all protected endpoints:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

Tokens expire after 7 days by default. After expiration, you must login again.

## 👥 User Roles

The system supports three user roles with different permissions:

| Role | Description | Access Level |
|------|-------------|--------------|
| **Worker** | Field workers who clock in/out and submit reports | Limited access to own data |
| **Supervisor** | Supervisors who monitor workers and review reports | Read access to all worker data |
| **Admin** | System administrators | Full access to all features and user management |

## 📋 API Endpoints

### 🏠 App Endpoints

#### GET /api
Get basic API information.

**Authentication:** Not required

**Response:**
```json
{
  "message": "SEKAR Backend API",
  "version": "1.0.0",
  "status": "running"
}
```

#### GET /api/health
Health check endpoint.

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "uptime": 12345.67,
  "environment": "development"
}
```

---

### 🔐 Authentication Endpoints

#### POST /api/auth/login
Authenticate user and get JWT token.

**Authentication:** Not required

**Request Body:**
```json
{
  "username": "worker1",
  "password": "worker123"
}
```

**Validation Rules:**
- `username`: Required, max 50 characters
- `password`: Required, min 6 characters

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJ3b3JrZXIxIiwicm9sZSI6IndvcmtlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "user": {
    "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "username": "worker1",
    "full_name": "Pekerja Satu",
    "role": "worker"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Validation failed
```json
{
  "statusCode": 400,
  "message": ["username is required", "password must be at least 6 characters"],
  "error": "Bad Request"
}
```

- **401 Unauthorized:** Invalid credentials or inactive account
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

#### GET /api/auth/me
Get current authenticated user information.

**Authentication:** Required (JWT)

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "worker1",
  "full_name": "Pekerja Satu",
  "role": "worker",
  "created_at": "2026-01-07T10:00:00.000Z"
}
```

**Error Responses:**
- **401 Unauthorized:** Invalid or missing JWT token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### 👤 User Management Endpoints

#### POST /api/users
Create a new user.

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "username": "worker4",
  "password": "securepassword123",
  "full_name": "Pekerja Empat",
  "role": "worker"
}
```

**Validation Rules:**
- `username`: Required, max 50 characters, alphanumeric with _ and - allowed, must be unique
- `password`: Required, min 6 characters
- `full_name`: Required, max 100 characters
- `role`: Optional, one of: worker, supervisor, admin (defaults to worker)

**Success Response (201):**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "worker4",
  "full_name": "Pekerja Empat",
  "role": "worker",
  "is_active": true,
  "created_at": "2026-01-07T10:00:00.000Z"
}
```

**Error Responses:**
- **400 Bad Request:** Validation failed
- **401 Unauthorized:** Not authenticated or not admin
- **409 Conflict:** Username already exists

#### GET /api/users
Get all users.

**Authentication:** Required (Admin or Supervisor)

**Success Response (200):**
```json
[
  {
    "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "username": "worker1",
    "full_name": "Pekerja Satu",
    "role": "worker",
    "is_active": true,
    "created_at": "2026-01-07T10:00:00.000Z"
  },
  {
    "id": "9237ec92-08df-5d7f-b2c5-c2bdf395fb89",
    "username": "supervisor1",
    "full_name": "Supervisor Satu",
    "role": "supervisor",
    "is_active": true,
    "created_at": "2026-01-07T10:00:00.000Z"
  }
]
```

**Error Responses:**
- **401 Unauthorized:** Not authenticated or insufficient permissions

#### GET /api/users/:id
Get user by ID.

**Authentication:** Required (Admin or Supervisor)

**Parameters:**
- `id` (path): User UUID

**Success Response (200):**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "worker1",
  "full_name": "Pekerja Satu",
  "role": "worker",
  "is_active": true,
  "created_at": "2026-01-07T10:00:00.000Z",
  "updated_at": "2026-01-07T10:00:00.000Z"
}
```

**Error Responses:**
- **400 Bad Request:** Invalid UUID format
- **401 Unauthorized:** Not authenticated or insufficient permissions
- **404 Not Found:** User not found

#### PATCH /api/users/:id
Update user information.

**Authentication:** Required (Admin only)

**Parameters:**
- `id` (path): User UUID

**Request Body (all fields optional):**
```json
{
  "full_name": "Pekerja Satu Updated",
  "password": "newsecurepassword123",
  "role": "supervisor",
  "is_active": true
}
```

**Validation Rules:**
- `full_name`: Optional, max 100 characters
- `password`: Optional, min 6 characters (will be hashed)
- `role`: Optional, one of: worker, supervisor, admin
- `is_active`: Optional, boolean

**Success Response (200):**
```json
{
  "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
  "username": "worker1",
  "full_name": "Pekerja Satu Updated",
  "role": "worker",
  "is_active": true,
  "created_at": "2026-01-07T10:00:00.000Z",
  "updated_at": "2026-01-07T11:00:00.000Z"
}
```

**Error Responses:**
- **400 Bad Request:** Validation failed or invalid UUID
- **401 Unauthorized:** Not authenticated or not admin
- **404 Not Found:** User not found

#### DELETE /api/users/:id
Soft delete user (set is_active to false).

**Authentication:** Required (Admin only)

**Parameters:**
- `id` (path): User UUID

**Success Response (200):**
```json
{}
```

**Error Responses:**
- **400 Bad Request:** Invalid UUID format
- **401 Unauthorized:** Not authenticated or not admin
- **404 Not Found:** User not found

---

## 📊 Response Formats

### Success Response
All successful responses include appropriate HTTP status codes and relevant data:
- **200 OK:** Request successful, data returned
- **201 Created:** Resource created successfully
- **204 No Content:** Request successful, no data to return

### Error Response
All error responses follow this format:
```json
{
  "statusCode": 400,
  "message": "Error message or array of validation errors",
  "error": "Bad Request"
}
```

Common error status codes:
- **400 Bad Request:** Invalid request data or validation failed
- **401 Unauthorized:** Authentication failed or missing
- **403 Forbidden:** Authenticated but insufficient permissions
- **404 Not Found:** Resource not found
- **409 Conflict:** Resource conflict (e.g., duplicate username)
- **500 Internal Server Error:** Server error

---

## 🧪 Testing the API

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"worker1","password":"worker123"}'
```

**Get Current User:**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Get All Users:**
```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Create User:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "username": "worker4",
    "password": "worker123",
    "full_name": "Pekerja Empat",
    "role": "worker"
  }'
```

### Using Postman/Insomnia

1. Import the OpenAPI spec from `/api/docs-json`
2. Set base URL to `http://localhost:3000/api`
3. Add environment variable for `token`
4. Set Authorization header: `Bearer {{token}}`

---

## 🔒 Security Best Practices

1. **Always use HTTPS in production**
2. **Never expose JWT secrets**
3. **Rotate tokens regularly**
4. **Validate all inputs**
5. **Use strong passwords (min 6 characters, recommend 12+)**
6. **Implement rate limiting (future phase)**
7. **Monitor for suspicious activity**
8. **Keep dependencies updated**

---

## 📝 Test Users (Development Only)

The following test users are available after running the database seeder:

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| admin | admin123 | Admin | Full system access |
| supervisor1 | supervisor123 | Supervisor | Monitor and review |
| supervisor2 | supervisor123 | Supervisor | Monitor and review |
| worker1 | worker123 | Worker | Field worker |
| worker2 | worker123 | Worker | Field worker |
| worker3 | worker123 | Worker | Field worker |

⚠️ **Warning:** Change these passwords in production!

---

## 🚀 Coming Soon (Future Phases)

The following endpoints will be available in future phases:

### Phase 1 Day 3-4:
- Area management (`/api/areas`)
- Area types (`/api/area-types`)
- Shift tracking (`/api/shifts`)
  - Clock-in with GPS validation
  - Clock-out
  - Get current shift

### Phase 1 Day 5:
- Work reports (`/api/reports`)
  - Create reports with media
  - Upload photos/videos
  - Get my reports
- Location tracking (`/api/location`)
  - Batch location upload
- Supervisor endpoints (`/api/supervisor`)
  - Active workers map
  - Reports with filters
  - Attendance tracking

---

## 📞 Support

For API issues or questions:
- **Email:** support@sekar.example.com
- **GitHub Issues:** (if applicable)
- **Documentation:** This file and `/api/docs`

---

**Last Updated:** January 7, 2026  
**API Version:** 1.0.0  
**Phase:** 1 - MVP (Day 1-2 Complete)


