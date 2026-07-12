# Test Data & Fixtures - SEKAR

## Overview

This document provides comprehensive test data, fixtures, and sample datasets for testing the SEKAR system. Use these standardized test data across unit tests, integration tests, and E2E tests to ensure consistency and repeatability.

---

## Table of Contents

1. [Test Users](#test-users)
2. [Location Types](#location-types)
3. [Sample Locations](#sample-locations)
4. [GPS Coordinates](#gps-coordinates)
5. [Worker Assignments](#worker-assignments)
6. [Shifts](#shifts)
7. [Reports](#reports)
8. [Location Logs](#location-logs)
9. [Media Files](#media-files)
10. [Factory Functions](#factory-functions)
11. [Mock API Responses](#mock-api-responses)

---

## Test Users

### User Accounts

```typescript
export const TEST_USERS = {
  admin: {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'admin',
    password: 'Password123!', // Plain text for testing
    password_hash: '$2b$10$YourHashedPasswordHere', // bcrypt hash
    full_name: 'System Administrator',
    role: 'Admin',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  supervisor1: {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'supervisor1',
    password: 'Password123!',
    password_hash: '$2b$10$YourHashedPasswordHere',
    full_name: 'Supervisor Satu',
    role: 'Supervisor',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  supervisor2: {
    id: '22222222-2222-2222-2222-222222222223',
    username: 'supervisor2',
    password: 'Password123!',
    password_hash: '$2b$10$YourHashedPasswordHere',
    full_name: 'Supervisor Dua',
    role: 'Supervisor',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  worker1: {
    id: '33333333-3333-3333-3333-333333333331',
    username: 'worker1',
    password: 'Password123!',
    password_hash: '$2b$10$YourHashedPasswordHere',
    full_name: 'Pekerja Satu',
    role: 'Worker',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  worker2: {
    id: '33333333-3333-3333-3333-333333333332',
    username: 'worker2',
    password: 'Password123!',
    password_hash: '$2b$10$YourHashedPasswordHere',
    full_name: 'Pekerja Dua',
    role: 'Worker',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  worker3: {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'worker3',
    password: 'Password123!',
    password_hash: '$2b$10$YourHashedPasswordHere',
    full_name: 'Pekerja Tiga',
    role: 'Worker',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  inactiveWorker: {
    id: '33333333-3333-3333-3333-333333333334',
    username: 'worker_inactive',
    password: 'Password123!',
    password_hash: '$2b$10$YourHashedPasswordHere',
    full_name: 'Pekerja Nonaktif',
    role: 'Worker',
    is_active: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    deleted_at: new Date('2026-01-10T00:00:00Z'),
  },
};
```

### JWT Tokens (for testing)

```typescript
export const TEST_TOKENS = {
  admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIn0.test',
  supervisor1: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMjIyMjIyMi0yMjIyLTIyMjItMjIyMi0yMjIyMjIyMjIyMjIiLCJ1c2VybmFtZSI6InN1cGVydmlzb3IxIiwicm9sZSI6IlN1cGVydmlzb3IifQ.test',
  worker1: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMzMzMzMzMy0zMzMzLTMzMzMtMzMzMy0zMzMzMzMzMzMzMzEiLCJ1c2VybmFtZSI6IndvcmtlcjEiLCJyb2xlIjoiV29ya2VyIn0.test',
  expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.test',
  invalid: 'invalid.jwt.token',
};
```

---

## Location Types

```typescript
export const TEST_LOCATION_TYPES = {
  park: {
    id: '1',
    code: 'park',
    name: 'Taman',
    description: 'Taman kota dan ruang terbuka hijau publik',
    created_at: new Date('2026-01-01T00:00:00Z'),
  },

  pedestrian: {
    id: '2',
    code: 'pedestrian',
    name: 'Trotoar',
    description: 'Jalur pejalan kaki di sepanjang jalan raya',
    created_at: new Date('2026-01-01T00:00:00Z'),
  },

  miniGarden: {
    id: '3',
    code: 'mini_garden',
    name: 'Taman Mini',
    description: 'Taman kecil di area pemukiman atau perumahan',
    created_at: new Date('2026-01-01T00:00:00Z'),
  },

  street: {
    id: '4',
    code: 'street',
    name: 'Jalanan',
    description: 'Jalanan umum yang memerlukan pemeliharaan kebersihan',
    created_at: new Date('2026-01-01T00:00:00Z'),
  },
};
```

---

## Sample Locations

### Surabaya Landmarks

```typescript
export const TEST_LOCATIONS = {
  tamanBungkul: {
    id: 'aaaa1111-1111-1111-1111-111111111111',
    name: 'Taman Bungkul',
    location_type_id: '1',
    location_type_code: 'park',
    location_type_name: 'Taman',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 150,
    address: 'Jl. Taman Bungkul, Darmo, Surabaya',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  jalanRayaDarmo: {
    id: 'aaaa2222-2222-2222-2222-222222222222',
    name: 'Jalan Raya Darmo',
    location_type_id: '2',
    location_type_code: 'pedestrian',
    location_type_name: 'Trotoar',
    gps_lat: -7.2844,
    gps_lng: 112.7915,
    radius_meters: 200,
    address: 'Jl. Raya Darmo, Surabaya',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  tamanHarmoni: {
    id: 'aaaa3333-3333-3333-3333-333333333333',
    name: 'Taman Harmoni',
    location_type_id: '1',
    location_type_code: 'park',
    location_type_name: 'Taman',
    gps_lat: -7.3037,
    gps_lng: 112.7375,
    radius_meters: 100,
    address: 'Jl. Ketintang, Surabaya',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  tamanSurya: {
    id: 'aaaa4444-4444-4444-4444-444444444444',
    name: 'Taman Surya',
    location_type_id: '1',
    location_type_code: 'park',
    location_type_name: 'Taman',
    gps_lat: -7.2571,
    gps_lng: 112.7512,
    radius_meters: 120,
    address: 'Jl. Pemuda, Surabaya',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },

  inactiveLocation: {
    id: 'aaaa5555-5555-5555-5555-555555555555',
    name: 'Lokasi Nonaktif',
    location_type_id: '1',
    location_type_code: 'park',
    location_type_name: 'Taman',
    gps_lat: -7.2500,
    gps_lng: 112.7500,
    radius_meters: 100,
    address: 'Surabaya',
    is_active: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },
};
```

---

## GPS Coordinates

### Test Coordinates (Surabaya)

```typescript
export const TEST_GPS_COORDS = {
  // Exact center of Taman Bungkul
  tamanBungkulCenter: {
    latitude: -7.2905,
    longitude: 112.7398,
    accuracy: 5,
  },

  // Within Taman Bungkul boundary (50m from center)
  tamanBungkulInside: {
    latitude: -7.29095, // ~50m south
    longitude: 112.7398,
    accuracy: 10,
  },

  // Just outside Taman Bungkul boundary (200m from center)
  tamanBungkulOutside: {
    latitude: -7.2923, // ~200m south
    longitude: 112.7398,
    accuracy: 15,
  },

  // Far from any area
  farAway: {
    latitude: -7.5000,
    longitude: 113.0000,
    accuracy: 10,
  },

  // Surabaya city landmarks (for reference)
  landmarks: {
    tuguPahlawan: { latitude: -7.2458, longitude: 112.7378 },
    balaiKota: { latitude: -7.2575, longitude: 112.7521 },
    monumenKapalSelam: { latitude: -7.2654, longitude: 112.7344 },
    pakuwon: { latitude: -7.2879, longitude: 112.6725 },
  },

  // Low accuracy GPS (simulating poor signal)
  lowAccuracy: {
    latitude: -7.2905,
    longitude: 112.7398,
    accuracy: 50, // 50m accuracy
  },

  // Invalid coordinates
  invalid: {
    latitude: 999,
    longitude: 999,
    accuracy: 0,
  },
};

// Calculate distance between two test coordinates
export function getTestDistance(coord1: string, coord2: string): number {
  // Implementation would use Haversine formula
  // Predefined distances for common test pairs:
  const distances = {
    'tamanBungkulCenter-tamanBungkulInside': 50,
    'tamanBungkulCenter-tamanBungkulOutside': 200,
    'tuguPahlawan-balaiKota': 2050,
  };

  const key = `${coord1}-${coord2}`;
  return distances[key] || 0;
}
```

---

## Worker Assignments

```typescript
export const TEST_WORKER_ASSIGNMENTS = {
  worker1ToBungkul: {
    id: 'bbbb1111-1111-1111-1111-111111111111',
    worker_id: TEST_USERS.worker1.id,
    location_id: TEST_LOCATIONS.tamanBungkul.id,
    assigned_at: new Date('2026-01-01T00:00:00Z'),
  },

  worker2ToDarmo: {
    id: 'bbbb2222-2222-2222-2222-222222222222',
    worker_id: TEST_USERS.worker2.id,
    location_id: TEST_LOCATIONS.jalanRayaDarmo.id,
    assigned_at: new Date('2026-01-01T00:00:00Z'),
  },

  worker3ToHarmoni: {
    id: 'bbbb3333-3333-3333-3333-333333333333',
    worker_id: TEST_USERS.worker3.id,
    location_id: TEST_LOCATIONS.tamanHarmoni.id,
    assigned_at: new Date('2026-01-01T00:00:00Z'),
  },
};
```

---

## Shifts

```typescript
export const TEST_SHIFTS = {
  // Active shift (today, not clocked out)
  activeShift: {
    id: 'cccc1111-1111-1111-1111-111111111111',
    worker_id: TEST_USERS.worker1.id,
    location_id: TEST_LOCATIONS.tamanBungkul.id,
    clock_in_time: new Date('2026-01-15T08:05:00Z'),
    clock_in_gps_lat: -7.2905,
    clock_in_gps_lng: 112.7398,
    clock_in_photo_url: 'https://sekar-media.s3.amazonaws.com/clock-in/worker1-20260115.jpg',
    clock_out_time: null,
    clock_out_gps_lat: null,
    clock_out_gps_lng: null,
    created_at: new Date('2026-01-15T08:05:00Z'),
    updated_at: new Date('2026-01-15T08:05:00Z'),
  },

  // Completed shift (yesterday)
  completedShift: {
    id: 'cccc2222-2222-2222-2222-222222222222',
    worker_id: TEST_USERS.worker1.id,
    location_id: TEST_LOCATIONS.tamanBungkul.id,
    clock_in_time: new Date('2026-01-14T08:00:00Z'),
    clock_in_gps_lat: -7.2905,
    clock_in_gps_lng: 112.7398,
    clock_in_photo_url: 'https://sekar-media.s3.amazonaws.com/clock-in/worker1-20260114.jpg',
    clock_out_time: new Date('2026-01-14T16:00:00Z'),
    clock_out_gps_lat: -7.2906,
    clock_out_gps_lng: 112.7399,
    created_at: new Date('2026-01-14T08:00:00Z'),
    updated_at: new Date('2026-01-14T16:00:00Z'),
  },

  // Short shift (2 hours)
  shortShift: {
    id: 'cccc3333-3333-3333-3333-333333333333',
    worker_id: TEST_USERS.worker2.id,
    location_id: TEST_LOCATIONS.jalanRayaDarmo.id,
    clock_in_time: new Date('2026-01-15T10:00:00Z'),
    clock_in_gps_lat: -7.2844,
    clock_in_gps_lng: 112.7915,
    clock_in_photo_url: 'https://sekar-media.s3.amazonaws.com/clock-in/worker2-20260115.jpg',
    clock_out_time: new Date('2026-01-15T12:00:00Z'),
    clock_out_gps_lat: -7.2845,
    clock_out_gps_lng: 112.7916,
    created_at: new Date('2026-01-15T10:00:00Z'),
    updated_at: new Date('2026-01-15T12:00:00Z'),
  },

  // Long shift (10 hours)
  longShift: {
    id: 'cccc4444-4444-4444-4444-444444444444',
    worker_id: TEST_USERS.worker3.id,
    location_id: TEST_LOCATIONS.tamanHarmoni.id,
    clock_in_time: new Date('2026-01-14T07:00:00Z'),
    clock_in_gps_lat: -7.3037,
    clock_in_gps_lng: 112.7375,
    clock_in_photo_url: 'https://sekar-media.s3.amazonaws.com/clock-in/worker3-20260114.jpg',
    clock_out_time: new Date('2026-01-14T17:00:00Z'),
    clock_out_gps_lat: -7.3038,
    clock_out_gps_lng: 112.7376,
    created_at: new Date('2026-01-14T07:00:00Z'),
    updated_at: new Date('2026-01-14T17:00:00Z'),
  },
};
```

---

## Reports

```typescript
export const TEST_REPORTS = {
  taskCompletion: {
    id: 'dddd1111-1111-1111-1111-111111111111',
    worker_id: TEST_USERS.worker1.id,
    shift_id: TEST_SHIFTS.activeShift.id,
    report_type: 'TASK_COMPLETION',
    description: 'Completed cleaning main area of Taman Bungkul. All trash collected.',
    photo_url: 'https://sekar-media.s3.amazonaws.com/reports/report1-abc123.jpg',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    created_at: new Date('2026-01-15T10:00:00Z'),
    updated_at: new Date('2026-01-15T10:00:00Z'),
  },

  maintenanceRequest: {
    id: 'dddd2222-2222-2222-2222-222222222222',
    worker_id: TEST_USERS.worker1.id,
    shift_id: TEST_SHIFTS.activeShift.id,
    report_type: 'MAINTENANCE_REQUEST',
    description: 'Bench near playground needs repair. One leg is loose.',
    photo_url: 'https://sekar-media.s3.amazonaws.com/reports/report2-def456.jpg',
    gps_lat: -7.2906,
    gps_lng: 112.7399,
    created_at: new Date('2026-01-15T11:00:00Z'),
    updated_at: new Date('2026-01-15T11:00:00Z'),
  },

  incident: {
    id: 'dddd3333-3333-3333-3333-333333333333',
    worker_id: TEST_USERS.worker2.id,
    shift_id: TEST_SHIFTS.shortShift.id,
    report_type: 'INCIDENT',
    description: 'Vandalism found on park bench. Graffiti removed.',
    photo_url: 'https://sekar-media.s3.amazonaws.com/reports/report3-ghi789.jpg',
    gps_lat: -7.2844,
    gps_lng: 112.7915,
    created_at: new Date('2026-01-15T11:30:00Z'),
    updated_at: new Date('2026-01-15T11:30:00Z'),
  },
};
```

---

## Location Logs

```typescript
export const TEST_LOCATION_LOGS = {
  // Generate array of location logs for active shift
  activeShiftLogs: Array.from({ length: 10 }, (_, i) => ({
    id: `eeee${String(i).padStart(4, '0')}-0000-0000-0000-000000000000`,
    worker_id: TEST_USERS.worker1.id,
    shift_id: TEST_SHIFTS.activeShift.id,
    gps_lat: -7.2905 + (Math.random() - 0.5) * 0.001, // Within ~100m
    gps_lng: 112.7398 + (Math.random() - 0.5) * 0.001,
    accuracy_meters: 10 + Math.random() * 5,
    battery_level: 95 - i * 2,
    logged_at: new Date(
      new Date('2026-01-15T08:05:00Z').getTime() + i * 10 * 60 * 1000
    ), // Every 10 minutes
  })),

  // Single location log
  singleLog: {
    id: 'eeee9999-9999-9999-9999-999999999999',
    worker_id: TEST_USERS.worker1.id,
    shift_id: TEST_SHIFTS.activeShift.id,
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    accuracy_meters: 10,
    battery_level: 85,
    logged_at: new Date('2026-01-15T10:00:00Z'),
  },
};
```

---

## Media Files

### Test Photos

```typescript
export const TEST_PHOTOS = {
  clockInSelfie: {
    uri: 'file:///storage/emulated/0/DCIM/Camera/selfie_20260115.jpg',
    url: 'https://sekar-media.s3.amazonaws.com/clock-in/worker1-20260115.jpg',
    type: 'image/jpeg',
    fileName: 'selfie_20260115.jpg',
    fileSize: 1024000, // 1MB
    width: 800,
    height: 600,
    base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  },

  reportPhoto: {
    uri: 'file:///storage/emulated/0/DCIM/Camera/report_20260115.jpg',
    url: 'https://sekar-media.s3.amazonaws.com/reports/report-abc123.jpg',
    type: 'image/jpeg',
    fileName: 'report_20260115.jpg',
    fileSize: 2048000, // 2MB
    width: 1920,
    height: 1080,
    base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  },

  largePhoto: {
    uri: 'file:///storage/emulated/0/DCIM/Camera/large_photo.jpg',
    type: 'image/jpeg',
    fileName: 'large_photo.jpg',
    fileSize: 8000000, // 8MB (over limit)
    width: 4000,
    height: 3000,
  },
};

### Test Videos

```typescript
export const TEST_VIDEOS = {
  shortClip: {
    uri: 'file:///storage/emulated/0/DCIM/Camera/video_20260115.mp4',
    url: 'https://sekar-media.s3.amazonaws.com/reports/video-def456.mp4',
    type: 'video/mp4',
    fileName: 'video_20260115.mp4',
    fileSize: 5000000, // 5MB
    duration: 15, // 15 seconds
  },

  longVideo: {
    uri: 'file:///storage/emulated/0/DCIM/Camera/long_video.mp4',
    type: 'video/mp4',
    fileName: 'long_video.mp4',
    fileSize: 50000000, // 50MB (at limit)
    duration: 60, // 60 seconds
  },
};
```

---

## Factory Functions

### User Factory

```typescript
import { v4 as uuidv4 } from 'uuid';

export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: uuidv4(),
    username: `test_${Date.now()}`,
    password_hash: '$2b$10$hashedpassword',
    full_name: 'Test User',
    role: 'Worker',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// Usage
const adminUser = createTestUser({ role: 'Admin', full_name: 'Admin User' });
const workerUser = createTestUser({ role: 'Worker' });
```

### Location Factory

```typescript
export function createTestLocation(overrides?: Partial<Location>): Location {
  return {
    id: uuidv4(),
    name: `Test Location ${Date.now()}`,
    location_type_id: '1',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 100,
    address: 'Test Address, Surabaya',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}
```

### Shift Factory

```typescript
export function createTestShift(overrides?: Partial<Shift>): Shift {
  const clockInTime = new Date();

  return {
    id: uuidv4(),
    worker_id: TEST_USERS.worker1.id,
    location_id: TEST_LOCATIONS.tamanBungkul.id,
    clock_in_time: clockInTime,
    clock_in_gps_lat: -7.2905,
    clock_in_gps_lng: 112.7398,
    clock_in_photo_url: 'https://sekar-media.s3.amazonaws.com/test.jpg',
    clock_out_time: null,
    clock_out_gps_lat: null,
    clock_out_gps_lng: null,
    created_at: clockInTime,
    updated_at: clockInTime,
    ...overrides,
  };
}

// Create completed shift
const completedShift = createTestShift({
  clock_out_time: new Date(),
  clock_out_gps_lat: -7.2906,
  clock_out_gps_lng: 112.7399,
});
```

---

## Mock API Responses

### Login Response

```typescript
export const MOCK_LOGIN_SUCCESS = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  user: {
    id: TEST_USERS.worker1.id,
    username: 'worker1',
    full_name: 'Pekerja Satu',
    role: 'Worker',
  },
};

export const MOCK_LOGIN_ERROR = {
  statusCode: 401,
  message: 'Invalid credentials',
  error: 'Unauthorized',
};
```

### Clock-In Response

```typescript
export const MOCK_CLOCK_IN_SUCCESS = {
  shift_id: TEST_SHIFTS.activeShift.id,
  clock_in_time: '2026-01-15T08:05:00Z',
  area_name: 'Taman Bungkul',
  message: 'Successfully clocked in',
};

export const MOCK_CLOCK_IN_ERROR_OUTSIDE_BOUNDARY = {
  statusCode: 400,
  message: 'GPS location is outside area boundary',
  error: 'Bad Request',
};

export const MOCK_CLOCK_IN_ERROR_ALREADY_CLOCKED_IN = {
  statusCode: 400,
  message: 'You are already clocked in',
  error: 'Bad Request',
};
```

### Reports Response

```typescript
export const MOCK_REPORTS_LIST = {
  data: [TEST_REPORTS.taskCompletion, TEST_REPORTS.maintenanceRequest],
  meta: {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

export const MOCK_REPORT_CREATE_SUCCESS = {
  report_id: TEST_REPORTS.taskCompletion.id,
  report_time: '2026-01-15T10:00:00Z',
  message: 'Report created successfully',
};
```

### Supervisor Dashboard Response

```typescript
export const MOCK_ACTIVE_WORKERS = [
  {
    worker_id: TEST_USERS.worker1.id,
    full_name: 'Pekerja Satu',
    area_name: 'Taman Bungkul',
    location_type: 'Taman',
    current_gps_lat: -7.2905,
    current_gps_lng: 112.7398,
    clock_in_time: '2026-01-15T08:05:00Z',
    last_ping_time: '2026-01-15T10:00:00Z',
  },
  {
    worker_id: TEST_USERS.worker2.id,
    full_name: 'Pekerja Dua',
    area_name: 'Jalan Raya Darmo',
    area_type: 'Trotoar',
    current_gps_lat: -7.2844,
    current_gps_lng: 112.7915,
    clock_in_time: '2026-01-15T08:10:00Z',
    last_ping_time: '2026-01-15T10:05:00Z',
  },
];
```

---

## Environment-Specific Data

### Development Environment

```typescript
export const DEV_CONFIG = {
  apiBaseUrl: 'http://10.0.2.2:3000/api', // Android emulator
  s3Bucket: 'sekar-media-dev',
  googleMapsApiKey: 'AIzaSyDEV_KEY_HERE',
};
```

### Test Environment

```typescript
export const TEST_CONFIG = {
  apiBaseUrl: 'http://localhost:3000/api',
  s3Bucket: 'sekar-media-test',
  googleMapsApiKey: 'AIzaSyTEST_KEY_HERE',
};
```

---

## Usage Examples

### Backend Unit Test

```typescript
import { TEST_USERS, TEST_LOCATIONS, createTestShift } from '../../test/fixtures';

describe('ShiftsService', () => {
  it('should create shift successfully', async () => {
    const worker = TEST_USERS.worker1;
    const area = TEST_LOCATIONS.tamanBungkul;

    mockUserRepository.findOne.mockResolvedValue(worker);
    mockLocationRepository.findOne.mockResolvedValue(area);

    const result = await service.clockIn(worker.id, {
      location_id: area.id,
      gps_lat: area.gps_lat,
      gps_lng: area.gps_lng,
    });

    expect(result).toHaveProperty('shift_id');
  });
});
```

### Mobile Component Test

```typescript
import { TEST_USERS, TEST_LOCATIONS } from '../../test/fixtures';

describe('HomeScreen', () => {
  it('should display user info and assigned location', () => {
    const props = {
      user: TEST_USERS.worker1,
      assignedLocation: TEST_LOCATIONS.tamanBungkul,
    };

    const { getByText } = render(<HomeScreen {...props} />);

    expect(getByText('Pekerja Satu')).toBeTruthy();
    expect(getByText('Taman Bungkul')).toBeTruthy();
  });
});
```

---

## Phase 2D Monitoring Test Fixtures

### Status Fixtures (5 statuses x 3 roles = 15 combinations)

| User | Role | Status | Last Location | Shift | Area |
|------|------|--------|--------------|-------|------|
| satgas_active | satgas | ACTIVE | 2min ago | Active | Taman Bungkul |
| satgas_inactive | satgas | INACTIVE | 20min ago | Active | Taman Bungkul |
| satgas_outside | satgas | OUTSIDE_AREA | 1min ago | Active | Outside boundary |
| satgas_missing | satgas | MISSING | 2hr ago | Active | Unknown |
| satgas_offline | satgas | OFFLINE | N/A | None | N/A |
| linmas_active | linmas | ACTIVE | 1min ago | Active | Taman Flora |
| linmas_inactive | linmas | INACTIVE | 15min ago | Active | Taman Flora |
| linmas_outside | linmas | OUTSIDE_AREA | 3min ago | Active | Outside boundary |
| linmas_missing | linmas | MISSING | 1.5hr ago | Active | Unknown |
| linmas_offline | linmas | OFFLINE | N/A | None | N/A |
| korlap_active | korlap | ACTIVE | 30s ago | Active | Taman Bungkul |
| korlap_inactive | korlap | INACTIVE | 10min ago | Active | Taman Bungkul |
| korlap_outside | korlap | OUTSIDE_AREA | 2min ago | Active | Outside boundary |
| korlap_missing | korlap | MISSING | 3hr ago | Active | Unknown |
| korlap_offline | korlap | OFFLINE | N/A | None | N/A |

### Config Fixtures

| Key | Test Value | Description |
|-----|-----------|-------------|
| active_max_age | 300 | 5 minutes |
| inactive_threshold | 900 | 15 minutes |
| missing_threshold | 3600 | 1 hour |
| min_gps_accuracy | 50 | 50 meters |
| boundary_tolerance | 100 | 100 meters |

### GPS Trail Fixture (10 points for location history testing)

- Points along Taman Bungkul perimeter, 5-minute intervals
- Mix of inside/outside boundary points
- Varying accuracy values (5m to 150m)

```typescript
export const TEST_GPS_TRAIL = [
  { lat: -7.2903, lng: 112.7396, accuracy: 5,   timestamp: '2026-01-15T08:00:00Z', inside: true },
  { lat: -7.2905, lng: 112.7398, accuracy: 8,   timestamp: '2026-01-15T08:05:00Z', inside: true },
  { lat: -7.2907, lng: 112.7400, accuracy: 12,  timestamp: '2026-01-15T08:10:00Z', inside: true },
  { lat: -7.2910, lng: 112.7402, accuracy: 10,  timestamp: '2026-01-15T08:15:00Z', inside: true },
  { lat: -7.2915, lng: 112.7405, accuracy: 25,  timestamp: '2026-01-15T08:20:00Z', inside: false },
  { lat: -7.2920, lng: 112.7410, accuracy: 30,  timestamp: '2026-01-15T08:25:00Z', inside: false },
  { lat: -7.2912, lng: 112.7403, accuracy: 15,  timestamp: '2026-01-15T08:30:00Z', inside: true },
  { lat: -7.2906, lng: 112.7399, accuracy: 7,   timestamp: '2026-01-15T08:35:00Z', inside: true },
  { lat: -7.2904, lng: 112.7397, accuracy: 150, timestamp: '2026-01-15T08:40:00Z', inside: true },
  { lat: -7.2905, lng: 112.7398, accuracy: 10,  timestamp: '2026-01-15T08:45:00Z', inside: true },
];
```

### Tracking Status Factory

```typescript
export function createTestTrackingStatus(overrides?: Partial<UserTrackingStatus>): UserTrackingStatus {
  return {
    id: uuidv4(),
    user_id: TEST_USERS.worker1.id,
    status: 'ACTIVE',
    last_latitude: -7.2905,
    last_longitude: 112.7398,
    last_accuracy: 10,
    last_location_at: new Date(),
    shift_id: TEST_SHIFTS.activeShift.id,
    location_id: TEST_LOCATIONS.tamanBungkul.id,
    is_inside_boundary: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// Usage
const outsideStatus = createTestTrackingStatus({
  status: 'OUTSIDE_AREA',
  is_inside_boundary: false,
  last_latitude: -7.2923,
  last_longitude: 112.7398,
});

const missingStatus = createTestTrackingStatus({
  status: 'MISSING',
  last_location_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
});
```

### Monitoring Config Factory

```typescript
export function createTestMonitoringConfig(overrides?: Partial<MonitoringConfig>): MonitoringConfig {
  return {
    id: uuidv4(),
    key: 'active_max_age',
    value: 300,
    description: 'Maximum age in seconds for ACTIVE status',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}
```

---

## Maintenance

### Updating Test Data

When updating test data:
1. Update this document first
2. Update factory functions
3. Update seed scripts (if applicable)
4. Run all tests to verify compatibility
5. Update any affected test cases

### Best Practices

1. **Use Factories**: Prefer factory functions over hardcoded objects
2. **Realistic Data**: Use production-like data for better testing
3. **Consistent IDs**: Use predictable UUIDs for debugging
4. **Document Changes**: Update this file when adding new test data
5. **Isolate Tests**: Each test should be independent

---

---

## Phase 2E: Planned Test Data (Client Feedback II)

> **Full specification:** See [build history](../history/CHANGELOG.md)

### New Test Fixtures

| Fixture | Purpose |
|---------|---------|
| Users with `phone_number` | Phone login testing (all clockable roles) |
| Users with `profile_picture_url` | Profile picture display testing |
| `user_areas` entries | Multi-area korlap + task-based satgas/linmas |
| Shifts with `is_overtime: true` | Overtime shift testing |
| Overtimes with `shift_id` | Overtime-shift linkage |
| `audit_logs` entries | Audit trail display testing |
| Rayon with null `boundary_polygon` | Edge case for rayon-level boundary checking |

---

*Last Updated: March 2026*
*Use these fixtures for consistent, repeatable testing*
