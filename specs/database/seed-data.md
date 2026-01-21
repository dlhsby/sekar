# Database Seed Data Specification

## Overview

This document specifies the seed data for SEKAR database. Seed data is used for development, testing, and demo environments to populate the database with realistic test data.

**Purpose:**
- Development testing and debugging
- Demo environment for stakeholders
- Integration testing with known data
- Training environment for users

**Seeding Strategy:**
- Automated via NestJS seed service
- Idempotent (can run multiple times safely)
- Uses realistic Surabaya locations
- Covers all user roles and scenarios

---

## Seed Data Structure

### Data Categories

1. **Master Data** (Reference Tables)
   - Area Types (4 types)

2. **User Data** (Authentication & Authorization)
   - Admin (1)
   - Supervisors (2)
   - Workers (3)

3. **Work Location Data**
   - Areas (3 locations in Surabaya)
   - Worker Assignments (3 assignments)

4. **Activity Data**
   - Shifts (4 shifts: 3 completed, 1 active)
   - Reports (2 work reports)
   - Location Logs (10 GPS tracking records)

---

## 1. Area Types (Master Data)

Reference table with predefined area type categories.

### SQL Insert

```sql
INSERT INTO area_types (id, code, name, description, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'park', 'Taman', 'Taman kota dan ruang terbuka hijau publik', NOW()),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'pedestrian', 'Trotoar', 'Jalur pejalan kaki di sepanjang jalan raya', NOW()),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'mini_garden', 'Taman Mini', 'Taman kecil di area pemukiman atau perumahan', NOW()),
  ('d4e5f6a7-b8c9-0123-def0-123456789012', 'street', 'Jalanan', 'Jalanan umum yang memerlukan pemeliharaan kebersihan', NOW())
ON CONFLICT (code) DO NOTHING;
```

### Seed Data Details

| Code | Name | Description | Use Case |
|------|------|-------------|----------|
| park | Taman | Taman kota dan ruang terbuka hijau publik | Large public parks like Taman Bungkul |
| pedestrian | Trotoar | Jalur pejalan kaki di sepanjang jalan raya | Sidewalks with trees along roads |
| mini_garden | Taman Mini | Taman kecil di area pemukiman | Small neighborhood gardens |
| street | Jalanan | Jalanan umum yang memerlukan pemeliharaan | Streets requiring maintenance |

**Business Rules:**
- These are read-only in production (no CRUD operations)
- Used for filtering and categorization
- Cannot be deleted if referenced by areas

---

## 2. Users

Six test users covering all roles: 1 admin, 2 supervisors, 3 workers.

### SQL Insert

```sql
-- Passwords are all bcrypt hashed with 10 rounds
-- admin: admin123
-- supervisor1/2: supervisor123
-- worker1/2/3: worker123

INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at, updated_at) VALUES
  -- Admin
  ('e5f6a7b8-c9d0-1234-ef01-23456789abcd', 'admin', '$2b$10$ZQfzJQQ0J0YQX0JXQj0QXuJ0YQj0QXuJ0QX0JXQj0QXuJ0QX0JXQ', 'System Administrator', 'admin', true, NOW(), NOW()),

  -- Supervisors
  ('f634880a-7498-449a-a293-9c5204176301', 'supervisor1', '$2b$10$ZQfzJQQ0J0YQX0JXQj0QXuJ0YQj0QXuJ0QX0JXQj0QXuJ0QX0JXQ', 'Supervisor Satu', 'supervisor', true, NOW(), NOW()),
  ('f634880a-7498-449a-a293-9c5204176302', 'supervisor2', '$2b$10$ZQfzJQQ0J0YQX0JXQj0QXuJ0YQj0QXuJ0QX0JXQj0QXuJ0QX0JXQ', 'Supervisor Dua', 'supervisor', true, NOW(), NOW()),

  -- Workers
  ('f634880a-7498-449a-a293-9c5204176300', 'worker1', '$2b$10$ZQfzJQQ0J0YQX0JXQj0QXuJ0YQj0QXuJ0QX0JXQj0QXuJ0QX0JXQ', 'Pekerja Satu', 'worker', true, NOW(), NOW()),
  ('f634880a-7498-449a-a293-9c5204176304', 'worker2', '$2b$10$ZQfzJQQ0J0YQX0JXQj0QXuJ0YQj0QXuJ0QX0JXQj0QXuJ0QX0JXQ', 'Pekerja Dua', 'worker', true, NOW(), NOW()),
  ('f634880a-7498-449a-a293-9c5204176305', 'worker3', '$2b$10$ZQfzJQQ0J0YQX0JXQj0QXuJ0QX0JXQj0QXuJ0QX0JXQj0QXuJ0QX0JXQ', 'Pekerja Tiga', 'worker', true, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;
```

### User Details

#### Admin User
| Field | Value |
|-------|-------|
| Username | admin |
| Password | admin123 |
| Full Name | System Administrator |
| Role | admin |
| Permissions | Full system access, user management, all endpoints |

#### Supervisor 1
| Field | Value |
|-------|-------|
| Username | supervisor1 |
| Password | supervisor123 |
| Full Name | Supervisor Satu |
| Role | supervisor |
| Permissions | View all workers, review reports, view dashboards |

#### Supervisor 2
| Field | Value |
|-------|-------|
| Username | supervisor2 |
| Password | supervisor123 |
| Full Name | Supervisor Dua |
| Role | supervisor |
| Permissions | View all workers, review reports, view dashboards |

#### Worker 1
| Field | Value |
|-------|-------|
| Username | worker1 |
| Password | worker123 |
| Full Name | Pekerja Satu |
| Role | worker |
| Assignment | Taman Bungkul (Park) |
| Status | Active shift (clocked in today) |

#### Worker 2
| Field | Value |
|-------|-------|
| Username | worker2 |
| Password | worker123 |
| Full Name | Pekerja Dua |
| Role | worker |
| Assignment | Jalan Raya Darmo (Pedestrian) |
| Status | Completed shift yesterday |

#### Worker 3
| Field | Value |
|-------|-------|
| Username | worker3 |
| Password | worker123 |
| Full Name | Pekerja Tiga |
| Role | worker |
| Assignment | Taman Harmoni (Park) |
| Status | Completed shift 2 days ago |

**Password Hashing:**
```typescript
// All passwords hashed with bcrypt (10 rounds)
import * as bcrypt from 'bcrypt';

const hash = await bcrypt.hash('admin123', 10);
// $2b$10$ZQfzJQQ0J0YQX0JXQj0QXuJ0YQj0QXuJ0QX0JXQj0QXuJ0QX0JXQ
```

---

## 3. Areas

Three real locations in Surabaya representing different area types.

### SQL Insert

```sql
INSERT INTO areas (id, name, area_type_id, gps_lat, gps_lng, radius_meters, address, is_active, created_at, updated_at) VALUES
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Taman Bungkul',
    (SELECT id FROM area_types WHERE code = 'park'),
    -7.29050000,
    112.73980000,
    150,
    'Jl. Taman Bungkul, Darmo, Surabaya',
    true,
    NOW(),
    NOW()
  ),
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Jalan Raya Darmo',
    (SELECT id FROM area_types WHERE code = 'pedestrian'),
    -7.28440000,
    112.79150000,
    200,
    'Jl. Raya Darmo, Surabaya',
    true,
    NOW(),
    NOW()
  ),
  (
    'd4e5f6a7-b8c9-0123-def0-123456789012',
    'Taman Harmoni',
    (SELECT id FROM area_types WHERE code = 'park'),
    -7.30370000,
    112.73750000,
    100,
    'Jl. Ketintang, Surabaya',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
```

### Area Details

#### Area 1: Taman Bungkul
| Field | Value | Notes |
|-------|-------|-------|
| Name | Taman Bungkul | Famous public park in Surabaya |
| Type | Park (Taman) | Large city park |
| GPS | -7.2905, 112.7398 | Center of park |
| Radius | 150 meters | Allows movement within park |
| Address | Jl. Taman Bungkul, Darmo, Surabaya | |
| Status | Active | Can receive worker assignments |
| Assigned Worker | worker1 (Pekerja Satu) | |

**Real Location:** Taman Bungkul is an actual famous park in Surabaya's Darmo area, popular for recreation.

#### Area 2: Jalan Raya Darmo (Pedestrian)
| Field | Value | Notes |
|-------|-------|-------|
| Name | Jalan Raya Darmo | Main street with pedestrian zone |
| Type | Pedestrian (Trotoar) | Sidewalk maintenance |
| GPS | -7.2844, 112.7915 | Along Darmo main road |
| Radius | 200 meters | Longer stretch for street work |
| Address | Jl. Raya Darmo, Surabaya | |
| Status | Active | Can receive worker assignments |
| Assigned Worker | worker2 (Pekerja Dua) | |

**Real Location:** Darmo is a major road in Surabaya with commercial and residential areas.

#### Area 3: Taman Harmoni
| Field | Value | Notes |
|-------|-------|-------|
| Name | Taman Harmoni | Neighborhood park |
| Type | Park (Taman) | Smaller community park |
| GPS | -7.3037, 112.7375 | Ketintang area |
| Radius | 100 meters | Standard park radius |
| Address | Jl. Ketintang, Surabaya | |
| Status | Active | Can receive worker assignments |
| Assigned Worker | worker3 (Pekerja Tiga) | |

**Real Location:** Ketintang is a residential area in Surabaya with smaller parks.

**GPS Coordinates Validation:**
- All coordinates are within Surabaya city limits
- Latitude: -7.2 to -7.4 (Southern hemisphere)
- Longitude: 112.6 to 112.8 (East of Greenwich)
- Radius chosen based on typical work area size

---

## 4. Worker Assignments

Three workers assigned to three different areas (1:1 relationship).

### SQL Insert

```sql
INSERT INTO worker_assignments (id, worker_id, area_id, assigned_at) VALUES
  (
    'e5f6a7b8-c9d0-1234-ef01-23456789abcd',
    (SELECT id FROM users WHERE username = 'worker1'),
    (SELECT id FROM areas WHERE name = 'Taman Bungkul'),
    NOW()
  ),
  (
    'f634880a-7498-449a-a293-9c5204176400',
    (SELECT id FROM users WHERE username = 'worker2'),
    (SELECT id FROM areas WHERE name = 'Jalan Raya Darmo'),
    NOW()
  ),
  (
    'f634880a-7498-449a-a293-9c5204176401',
    (SELECT id FROM users WHERE username = 'worker3'),
    (SELECT id FROM areas WHERE name = 'Taman Harmoni'),
    NOW()
  )
ON CONFLICT ON CONSTRAINT uq_worker_assignments_worker DO NOTHING;
```

### Assignment Details

| Worker | Assigned Area | Area Type | Assignment Date |
|--------|---------------|-----------|-----------------|
| worker1 (Pekerja Satu) | Taman Bungkul | Park | Current |
| worker2 (Pekerja Dua) | Jalan Raya Darmo | Pedestrian | Current |
| worker3 (Pekerja Tiga) | Taman Harmoni | Park | Current |

**Business Rules:**
- Each worker has exactly ONE assignment
- Areas can have multiple workers (but seed data has 1:1)
- Assignments persist across shifts

---

## 5. Shifts

Four shift records demonstrating different scenarios.

### SQL Insert

```sql
INSERT INTO shifts (
  id, worker_id, area_id,
  clock_in_time, clock_in_gps_lat, clock_in_gps_lng, clock_in_photo_url,
  clock_out_time, clock_out_gps_lat, clock_out_gps_lng,
  created_at, updated_at
) VALUES
  -- Completed shift: worker1 yesterday
  (
    'd3e4f5a6-b7c8-9012-def0-123456789012',
    (SELECT id FROM users WHERE username = 'worker1'),
    (SELECT id FROM areas WHERE name = 'Taman Bungkul'),
    NOW() - INTERVAL '1 day 16 hours',  -- Yesterday 8:00 AM
    -7.29050000,
    112.73980000,
    'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/08/clock-in/worker1-abc123.jpg',
    NOW() - INTERVAL '1 day 8 hours',   -- Yesterday 4:00 PM
    -7.29060000,
    112.73990000,
    NOW() - INTERVAL '1 day 16 hours',
    NOW() - INTERVAL '1 day 8 hours'
  ),

  -- Completed shift: worker2 yesterday
  (
    'd3e4f5a6-b7c8-9012-def0-123456789013',
    (SELECT id FROM users WHERE username = 'worker2'),
    (SELECT id FROM areas WHERE name = 'Jalan Raya Darmo'),
    NOW() - INTERVAL '1 day 16.5 hours', -- Yesterday 7:30 AM
    -7.28440000,
    112.79150000,
    'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/08/clock-in/worker2-def456.jpg',
    NOW() - INTERVAL '1 day 8.5 hours',  -- Yesterday 3:30 PM
    -7.28450000,
    112.79160000,
    NOW() - INTERVAL '1 day 16.5 hours',
    NOW() - INTERVAL '1 day 8.5 hours'
  ),

  -- Completed shift: worker3 two days ago
  (
    'd3e4f5a6-b7c8-9012-def0-123456789014',
    (SELECT id FROM users WHERE username = 'worker3'),
    (SELECT id FROM areas WHERE name = 'Taman Harmoni'),
    NOW() - INTERVAL '2 days 15.75 hours', -- 2 days ago 8:15 AM
    -7.30370000,
    112.73750000,
    'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/07/clock-in/worker3-ghi789.jpg',
    NOW() - INTERVAL '2 days 7.5 hours',   -- 2 days ago 4:30 PM
    -7.30380000,
    112.73760000,
    NOW() - INTERVAL '2 days 15.75 hours',
    NOW() - INTERVAL '2 days 7.5 hours'
  ),

  -- Active shift: worker1 today (NOT clocked out yet)
  (
    'd3e4f5a6-b7c8-9012-def0-123456789015',
    (SELECT id FROM users WHERE username = 'worker1'),
    (SELECT id FROM areas WHERE name = 'Taman Bungkul'),
    NOW() - INTERVAL '55 minutes',  -- Clocked in ~1 hour ago
    -7.29050000,
    112.73980000,
    'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/clock-in/worker1-jkl012.jpg',
    NULL,  -- Still active (not clocked out)
    NULL,
    NULL,
    NOW() - INTERVAL '55 minutes',
    NOW() - INTERVAL '55 minutes'
  )
ON CONFLICT (id) DO NOTHING;
```

### Shift Details

#### Shift 1: Worker1 Yesterday (Completed)
| Field | Value |
|-------|-------|
| Worker | worker1 (Pekerja Satu) |
| Area | Taman Bungkul |
| Clock In | Yesterday 8:00 AM |
| Clock Out | Yesterday 4:00 PM |
| Hours Worked | 8 hours |
| Clock In GPS | -7.2905, 112.7398 (inside area boundary) |
| Clock Out GPS | -7.2906, 112.7399 (slight movement) |
| Selfie Photo | S3 URL (mocked) |

#### Shift 2: Worker2 Yesterday (Completed)
| Field | Value |
|-------|-------|
| Worker | worker2 (Pekerja Dua) |
| Area | Jalan Raya Darmo |
| Clock In | Yesterday 7:30 AM |
| Clock Out | Yesterday 3:30 PM |
| Hours Worked | 8 hours |
| Clock In GPS | -7.2844, 112.7915 |
| Clock Out GPS | -7.2845, 112.7916 |
| Selfie Photo | S3 URL (mocked) |

#### Shift 3: Worker3 Two Days Ago (Completed)
| Field | Value |
|-------|-------|
| Worker | worker3 (Pekerja Tiga) |
| Area | Taman Harmoni |
| Clock In | 2 days ago 8:15 AM |
| Clock Out | 2 days ago 4:30 PM |
| Hours Worked | 8.25 hours |
| Clock In GPS | -7.3037, 112.7375 |
| Clock Out GPS | -7.3038, 112.7376 |
| Selfie Photo | S3 URL (mocked) |

#### Shift 4: Worker1 Today (Active)
| Field | Value |
|-------|-------|
| Worker | worker1 (Pekerja Satu) |
| Area | Taman Bungkul |
| Clock In | ~1 hour ago |
| Clock Out | NULL (still active) |
| Hours Worked | In progress |
| Clock In GPS | -7.2905, 112.7398 |
| Clock Out GPS | NULL |
| Selfie Photo | S3 URL (mocked) |

**Testing Scenarios:**
- Query active shifts: Should return only Shift 4
- Query completed shifts: Should return Shifts 1-3
- Calculate hours worked: Test time difference calculation
- Supervisor dashboard: Show worker1 as currently working

---

## 6. Reports

Two work reports submitted by worker1 during active shift.

### SQL Insert

```sql
INSERT INTO reports (
  id, worker_id, shift_id, report_type, description, photo_url, gps_lat, gps_lng, created_at, updated_at
) VALUES
  -- Task completion report
  (
    'e1f2a3b4-c5d6-7890-ef01-234567890abc',
    (SELECT id FROM users WHERE username = 'worker1'),
    (SELECT id FROM shifts WHERE clock_out_time IS NULL AND worker_id = (SELECT id FROM users WHERE username = 'worker1') LIMIT 1),
    'task_completion',
    'Completed cleaning main area of Taman Bungkul. All trash collected and disposed properly.',
    'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/reports/report1-abc123.jpg',
    -7.29050000,
    112.73980000,
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes'
  ),

  -- Maintenance request report
  (
    'e1f2a3b4-c5d6-7890-ef01-234567890abd',
    (SELECT id FROM users WHERE username = 'worker1'),
    (SELECT id FROM shifts WHERE clock_out_time IS NULL AND worker_id = (SELECT id FROM users WHERE username = 'worker1') LIMIT 1),
    'maintenance_request',
    'Bench near playground needs repair. One leg is loose and unstable.',
    'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/reports/report2-def456.jpg',
    -7.29060000,
    112.73990000,
    NOW() - INTERVAL '15 minutes',
    NOW() - INTERVAL '15 minutes'
  )
ON CONFLICT (id) DO NOTHING;
```

### Report Details

#### Report 1: Task Completion
| Field | Value |
|-------|-------|
| Worker | worker1 (Pekerja Satu) |
| Shift | Today's active shift |
| Type | task_completion |
| Description | "Completed cleaning main area of Taman Bungkul. All trash collected and disposed properly." |
| Photo | S3 URL showing cleaned area |
| GPS | -7.2905, 112.7398 (center of Taman Bungkul) |
| Time | 30 minutes ago |

#### Report 2: Maintenance Request
| Field | Value |
|-------|-------|
| Worker | worker1 (Pekerja Satu) |
| Shift | Today's active shift |
| Type | maintenance_request |
| Description | "Bench near playground needs repair. One leg is loose and unstable." |
| Photo | S3 URL showing damaged bench |
| GPS | -7.2906, 112.7399 (slightly north in park) |
| Time | 15 minutes ago |

**Report Types Demonstrated:**
- ✅ task_completion - Work completed successfully
- ✅ maintenance_request - Issue found requiring attention
- ⏳ incident - Not in seed data (can add if needed)

---

## 7. Location Logs

Ten GPS tracking records for worker1's active shift.

### SQL Insert

```sql
-- Generate 10 location logs at 5-minute intervals
INSERT INTO location_logs (
  id, worker_id, shift_id, gps_lat, gps_lng, accuracy_meters, battery_level, logged_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'worker1'),
  (SELECT id FROM shifts WHERE clock_out_time IS NULL AND worker_id = (SELECT id FROM users WHERE username = 'worker1') LIMIT 1),
  -7.2905 + (random() - 0.5) * 0.001,  -- Random within ~100m of center
  112.7398 + (random() - 0.5) * 0.001,
  10 + random() * 5,                   -- Accuracy: 10-15 meters
  95 - (series * 2),                   -- Battery: 95%, 93%, 91%, ...
  NOW() - INTERVAL '55 minutes' + (series * INTERVAL '5 minutes')  -- Every 5 minutes
FROM generate_series(0, 9) AS series;
```

### Location Log Pattern

| Log # | Time Offset | GPS Lat | GPS Lng | Accuracy | Battery | Notes |
|-------|-------------|---------|---------|----------|---------|-------|
| 1 | 55 min ago (clock-in) | -7.29048 | 112.73978 | 12.3m | 95% | Initial location |
| 2 | 50 min ago | -7.29051 | 112.73982 | 10.8m | 93% | Moved north |
| 3 | 45 min ago | -7.29053 | 112.73975 | 11.5m | 91% | Moved south |
| 4 | 40 min ago | -7.29049 | 112.73981 | 13.2m | 89% | Central area |
| 5 | 35 min ago | -7.29052 | 112.73979 | 10.1m | 87% | Moving around |
| 6 | 30 min ago | -7.29050 | 112.73983 | 14.7m | 85% | East side |
| 7 | 25 min ago | -7.29047 | 112.73977 | 11.9m | 83% | West side |
| 8 | 20 min ago | -7.29054 | 112.73980 | 12.6m | 81% | North area |
| 9 | 15 min ago | -7.29051 | 112.73978 | 10.4m | 79% | Back to center |
| 10 | 10 min ago | -7.29049 | 112.73982 | 13.1m | 77% | Latest location |

**GPS Movement Pattern:**
- All locations within 100m radius of area center (valid boundary)
- Random but realistic movement (not teleporting)
- Accuracy varies 10-15 meters (typical GPS)
- Battery decreases ~2% every 5 minutes

**Testing Scenarios:**
- Latest location query: Should return log #10
- Location history: Should show path over last hour
- Supervisor map: Display worker1's current position
- Battery monitoring: Alert if battery drops below threshold

---

## Seed Service Implementation

### TypeScript Seed Service

```typescript
// be/src/database/seeds/seed.service.ts

@Injectable()
export class SeedService {
  async seedDatabase() {
    console.log('🌱 Seeding database...');

    // Clear in FK dependency order
    await this.clearDatabase();

    // Seed in dependency order
    await this.seedUsers();
    await this.seedAreaTypes();
    await this.seedAreas();
    await this.seedWorkerAssignments();
    await this.seedShifts();
    await this.seedReports();
    await this.seedLocationLogs();

    console.log('✅ Database seeded successfully!');
  }

  private async clearDatabase() {
    // Delete in reverse FK order
    await this.locationLogRepository.createQueryBuilder().delete().execute();
    await this.reportRepository.createQueryBuilder().delete().execute();
    await this.shiftRepository.createQueryBuilder().delete().execute();
    await this.workerAssignmentRepository.createQueryBuilder().delete().execute();
    await this.areaRepository.createQueryBuilder().delete().execute();
    await this.areaTypeRepository.createQueryBuilder().delete().execute();
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

### Running Seed Script

```bash
# Development
cd be
npm run seed

# Output:
# 🌱 Seeding database...
# 🗑️  Clearing existing data...
# 👥 Seeding users...
#   ✓ Created admin: admin
#   ✓ Created supervisor: supervisor1
#   ✓ Created supervisor: supervisor2
#   ✓ Created worker: worker1
#   ✓ Created worker: worker2
#   ✓ Created worker: worker3
# 🏷️  Seeding area types...
#   ✓ Created area type: Taman
#   ✓ Created area type: Trotoar
#   ✓ Created area type: Taman Mini
#   ✓ Created area type: Jalanan
# 📍 Seeding areas...
#   ✓ Created area: Taman Bungkul
#   ✓ Created area: Jalan Raya Darmo
#   ✓ Created area: Taman Harmoni
# 👷 Seeding worker assignments...
#   ✓ Assigned worker1 to Taman Bungkul
#   ✓ Assigned worker2 to Jalan Raya Darmo
#   ✓ Assigned worker3 to Taman Harmoni
# ⏰ Seeding shifts...
#   ✓ Created completed shift for worker1 at Taman Bungkul
#   ✓ Created completed shift for worker2 at Jalan Raya Darmo
#   ✓ Created completed shift for worker3 at Taman Harmoni
#   ✓ Created active shift for worker1 at Taman Bungkul
# 📝 Seeding reports...
#   ✓ Created task_completion report
#   ✓ Created maintenance_request report
# 📍 Seeding location logs...
#   ✓ Created 10 location logs for worker1 active shift
# ✅ Database seeded successfully!
```

---

## Testing with Seed Data

### Test Scenarios

#### 1. Login Test
```bash
# Test all user roles
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "supervisor1", "password": "supervisor123"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "worker1", "password": "worker123"}'
```

#### 2. Active Shifts Query
```bash
# Get current active shift for worker1
curl -X GET http://localhost:3000/api/shifts/current \
  -H "Authorization: Bearer {worker1_token}"

# Should return the active shift (not clocked out yet)
```

#### 3. Supervisor Dashboard
```bash
# Get all active workers
curl -X GET http://localhost:3000/api/supervisor/active-workers \
  -H "Authorization: Bearer {supervisor_token}"

# Should return worker1 with latest location
```

#### 4. Worker Reports
```bash
# Get reports for today
curl -X GET "http://localhost:3000/api/reports?date=2026-01-09" \
  -H "Authorization: Bearer {worker1_token}"

# Should return 2 reports (task completion + maintenance request)
```

#### 5. Location Tracking
```bash
# Get location history for worker1
curl -X GET http://localhost:3000/api/location/worker/{worker1_id} \
  -H "Authorization: Bearer {supervisor_token}"

# Should return 10 location logs
```

---

## Seed Data for Different Environments

### Development Environment
- Full seed data as specified above
- All test users with known passwords
- Realistic but mocked S3 URLs
- Active shift for immediate testing

### Staging Environment
- Same as development
- Can use real S3 URLs if AWS configured
- Useful for demo and stakeholder review

### Production Environment
- **DO NOT** run seed script in production
- Create only admin user manually
- Supervisors and workers added via admin UI
- Real data entered by actual users

### Test Environment (CI/CD)
- Minimal seed data for integration tests
- 1 admin, 1 supervisor, 1 worker
- 1 area, 1 assignment, 1 active shift
- Fast seeding for automated tests

---

## Seed Data Maintenance

### When to Re-seed

1. **Schema Changes** - After database migrations
2. **Development Reset** - When local data becomes messy
3. **Testing** - Before running integration tests
4. **Demo Prep** - Before stakeholder demonstrations

### How to Update Seed Data

1. **Modify seed.service.ts**
2. **Test changes locally**
   ```bash
   npm run seed
   npm run start:dev
   # Test all endpoints
   ```
3. **Commit changes to Git**
4. **Update this documentation** if data structure changes

### Seed Data Versioning

Track seed data versions alongside schema versions:

| Schema Version | Seed Version | Changes |
|----------------|--------------|---------|
| 1.0 | 1.0 | Initial seed data (Phase 1 MVP) |
| 1.1 | 1.1 | Add incident report example |
| 2.0 | 2.0 | Add tasks and assets (Phase 2) |

---

## Troubleshooting

### Seed Script Fails

**Problem:** Foreign key violation during seeding

**Solution:**
```bash
# Check seed order (must respect FK dependencies)
# Users → Areas → Assignments → Shifts → Reports → Logs

# Verify tables are cleared before seeding
psql -U postgres -d sekar_db
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM areas;
```

### Duplicate Key Error

**Problem:** UUID collision or username conflict

**Solution:**
```sql
-- Check for existing data
SELECT * FROM users WHERE username = 'admin';

-- Clear and re-seed
TRUNCATE TABLE users CASCADE;
npm run seed
```

### Wrong Timestamps

**Problem:** Seed data timestamps don't make sense (future dates, etc.)

**Solution:**
```typescript
// Use relative timestamps
NOW() - INTERVAL '1 day'      // Yesterday
NOW() - INTERVAL '55 minutes'  // Recent
NOW()                          // Current

// Never hardcode absolute dates
```

### S3 URLs Not Working

**Problem:** Mocked S3 URLs return 404

**Solution:**
- Seed data uses placeholder URLs
- For real testing, upload dummy images to S3
- Update seed data with actual S3 URLs
- Or mock S3 service in tests

---

## Advanced Seeding

### Seeding with Real Photos

```typescript
// Upload seed photos to S3 first
const seedPhotos = [
  's3://sekar-media/seed/clock-in-1.jpg',
  's3://sekar-media/seed/report-1.jpg',
];

// Then use real URLs in seed data
clock_in_photo_url: await this.uploadSeedPhoto('clock-in-1.jpg');
```

### Seeding Multiple Workers Per Area

```typescript
// Modify seed to assign multiple workers to Taman Bungkul
const assignments = [
  { worker: 'worker1', area: 'Taman Bungkul' },
  { worker: 'worker2', area: 'Taman Bungkul' },
  { worker: 'worker3', area: 'Jalan Raya Darmo' },
];
```

### Seeding Historical Data

```typescript
// Generate shifts for last 30 days
for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  // Create shift for each worker each day
  await this.createShift(worker1, area1, date);
}
```

---

## Seed Data Checklist

Before committing seed data changes:

- [ ] All UUIDs are valid and unique
- [ ] Passwords are properly hashed (bcrypt, 10 rounds)
- [ ] GPS coordinates are within valid ranges
- [ ] Foreign key references are correct
- [ ] Timestamps use relative dates (NOW() - INTERVAL)
- [ ] Clear database runs without errors
- [ ] Seed completes successfully
- [ ] All test scenarios pass with seed data
- [ ] Documentation updated
- [ ] Commit to Git with clear message

---

**Last Updated:** 2026-01-16
**Seed Data Version:** 1.0 (Phase 1 MVP)
**Total Records:** 28 (6 users, 4 area types, 3 areas, 3 assignments, 4 shifts, 2 reports, 10 location logs)
