# Authentication Testing Guide

## Overview

This guide provides test credentials and instructions for testing the authentication system in the SEKAR web dashboard.

## Test Credentials

The following users are seeded in the database for testing purposes:

### Phase 1 Users (Original)

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| Admin | `admin` | `admin123` | Full system access |
| Supervisor | `supervisor1` | `supervisor123` | Supervisor role |
| Worker | `worker1` | `worker123` | Worker role |
| Worker | `worker2` | `worker123` | Worker role |
| Worker | `worker3` | `worker123` | Worker role |

### Phase 2 Users (Enhanced Roles)

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| Top Management | `top_management1` | `password123` | Kepala Dinas RTH |
| Kepala Rayon | `kepala_rayon_selatan` | `password123` | Kepala Rayon Selatan |
| Kepala Rayon | `kepala_rayon_utara` | `password123` | Kepala Rayon Utara |
| Koordinator Lapangan | `koordinator_bungkul` | `password123` | Koordinator Taman Bungkul |
| Linmas | `linmas1` | `password123` | Linmas security staff |
| Linmas | `linmas2` | `password123` | Linmas security staff |
| Worker | `worker4` | `password123` | Additional worker |

## Testing Role-Based Access

### 1. Admin Role

Login with: `admin` / `admin123`

**Expected Access:**
- Full dashboard access
- User management (CRUD)
- System settings
- All reports and analytics
- Area management
- Worker management

**Sidebar Navigation:**
- Dashboard
- Manajemen Pengguna (User Management)
- Manajemen Area (Area Management)
- Laporan (Reports)
- Pengaturan (Settings)

### 2. Top Management Role

Login with: `top_management1` / `password123`

**Expected Access:**
- Executive dashboard
- Read-only access to all reports
- Analytics and insights
- System-wide statistics

**Sidebar Navigation:**
- Dashboard
- Laporan (Reports)
- Analytics

### 3. Kepala Rayon Role

Login with: `kepala_rayon_selatan` / `password123`

**Expected Access:**
- Rayon-specific dashboard
- Worker management within rayon
- Area management within rayon
- Reports for assigned rayon
- Shift scheduling

**Sidebar Navigation:**
- Dashboard
- Manajemen Pekerja (Worker Management)
- Manajemen Area (Area Management - Rayon only)
- Laporan (Reports - Rayon only)
- Penjadwalan (Scheduling)

### 4. Koordinator Lapangan Role

Login with: `koordinator_bungkul` / `password123`

**Expected Access:**
- Field coordinator dashboard
- Worker monitoring (real-time location)
- Attendance tracking
- Task assignment
- Area-specific reports

**Sidebar Navigation:**
- Dashboard
- Monitoring Pekerja (Worker Monitoring)
- Presensi (Attendance)
- Tugas (Tasks)
- Laporan (Reports - Area only)

### 5. Worker Role

Login with: `worker1` / `worker123`

**Expected Access:**
- Worker dashboard
- Task list
- Attendance history
- Report submission (mobile only)
- Profile

**Note:** Worker role is primarily for mobile app. Web dashboard has limited features.

**Sidebar Navigation:**
- Dashboard
- Tugas Saya (My Tasks)
- Riwayat Presensi (Attendance History)
- Profile

### 6. Linmas Role

Login with: `linmas1` / `password123`

**Expected Access:**
- Security staff dashboard
- Patrol reports
- Incident reports
- Area monitoring

**Sidebar Navigation:**
- Dashboard
- Patroli (Patrol)
- Laporan Insiden (Incident Reports)
- Monitoring Area (Area Monitoring)

## Testing Authentication Flow

### 1. Login Flow

1. Navigate to `/login`
2. Enter valid credentials
3. Click "Masuk" button
4. Should redirect to `/dashboard` on success
5. Check user name in header
6. Verify role-specific sidebar items

### 2. Protected Routes

1. Logout from the system
2. Try to access `/dashboard` directly
3. Should redirect to `/login?redirect=/dashboard`
4. After login, should redirect back to `/dashboard`

### 3. Token Refresh

1. Login to the system
2. Wait 15 minutes (access token expires)
3. Make an API call (e.g., navigate to different page)
4. System should automatically refresh token
5. No logout or error should occur

### 4. Logout Flow

1. Click user menu in header
2. Click "Keluar" (Logout)
3. Confirm in modal dialog
4. Should redirect to `/login`
5. Access token cookie should be cleared
6. Trying to access `/dashboard` should redirect to login

### 5. Concurrent Sessions

1. Login in two different browsers
2. Logout from one browser
3. Other browser should still work (refresh token is different)

## API Endpoints Testing

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt
```

### Get Current User
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -b cookies.txt
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### Logout
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -b cookies.txt
```

## Common Issues and Solutions

### Issue: Login fails with "Invalid credentials"

**Solution:**
- Verify username and password are correct
- Check if backend is running (`cd be && npm run start:dev`)
- Verify database is seeded (`cd be && npm run seed`)

### Issue: Redirect to login after successful login

**Solution:**
- Check browser cookies are enabled
- Verify `withCredentials: true` in API client
- Check backend CORS settings include credentials

### Issue: Token refresh fails

**Solution:**
- Check refresh token cookie exists and is valid
- Verify backend `/auth/refresh` endpoint is working
- Check API client interceptor is configured correctly

### Issue: Can't access protected routes

**Solution:**
- Verify middleware is configured correctly (`middleware.ts`)
- Check access token cookie exists
- Try logging out and logging in again

## Security Checklist

- [ ] Passwords are never logged or exposed
- [ ] Tokens are stored in httpOnly cookies (not localStorage)
- [ ] CSRF protection is enabled
- [ ] Secure cookies are used in production
- [ ] Rate limiting is active (5 login attempts per minute)
- [ ] Token expiration is enforced (15 min access, 7 day refresh)
- [ ] Refresh token rotation is working
- [ ] Logout clears all cookies
- [ ] Protected routes require authentication
- [ ] Role-based access control is enforced

## Next Steps

After Phase 2D-4 completion:
- **Phase 2D-5:** User Management CRUD (admin only)
- **Phase 2E:** Notifications and real-time updates
- **Phase 2F:** Reports and analytics

## Notes

- All test accounts use weak passwords for development only
- Production passwords must be strong (min 8 chars, mixed case, numbers, symbols)
- Backend seed data is in `be/src/database/seeds/`
- Frontend uses httpOnly cookies for security
- Token refresh is automatic (handled by API client interceptor)
