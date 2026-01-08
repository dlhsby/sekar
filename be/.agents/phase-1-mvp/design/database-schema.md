# Database Schema - Phase 1 MVP

## Overview

PostgreSQL database schema for SEKAR MVP. All tables use `created_at` and `updated_at` timestamps.

---

## Entity Relationship Diagram

```
┌─────────────────┐
│   area_types    │
├─────────────────┤
│ id (PK)         │
│ code            │
│ name            │
│ description     │
│ created_at      │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────┴────────┐     ┌─────────────────────┐
│     areas       │     │       users         │
├─────────────────┤     ├─────────────────────┤
│ id (PK)         │     │ id (PK)             │
│ name            │     │ username            │
│ area_type_id(FK)│     │ password_hash       │
│ gps_lat         │     │ full_name           │
│ gps_lng         │     │ role                │
│ radius_meters   │     │ is_active           │
│ address         │     │ created_at          │
│ created_at      │     │ updated_at          │
│ updated_at      │     └─────────┬───────────┘
└────────┬────────┘               │
         │                        │
         │ N                      │ 1
         │                        │
┌────────┴────────────────────────┴─────────┐
│           worker_assignments               │
├───────────────────────────────────────────┤
│ id (PK)                                   │
│ worker_id (FK -> users.id)                │
│ area_id (FK -> areas.id)                  │
│ assigned_at                               │
└─────────────────────────────────────────────┘
                    │
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│     shifts      │   │  work_reports   │
├─────────────────┤   ├─────────────────┤
│ id (PK)         │   │ id (PK)         │
│ worker_id (FK)  │   │ shift_id (FK)   │
│ area_id (FK)    │   │ worker_id (FK)  │
│ clock_in_time   │   │ area_id (FK)    │
│ clock_in_gps_*  │   │ report_time     │
│ clock_in_photo  │   │ gps_lat/lng     │
│ clock_out_time  │   │ notes           │
│ clock_out_gps_* │   │ condition       │
│ created_at      │   │ reviewed        │
│ updated_at      │   │ reviewed_by     │
└────────┬────────┘   │ reviewed_at     │
         │            │ created_at      │
         │            │ updated_at      │
         │            └────────┬────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ location_pings  │   │  report_media   │
├─────────────────┤   ├─────────────────┤
│ id (PK)         │   │ id (PK)         │
│ worker_id (FK)  │   │ report_id (FK)  │
│ shift_id (FK)   │   │ media_type      │
│ timestamp       │   │ media_url       │
│ gps_lat         │   │ thumbnail_url   │
│ gps_lng         │   │ file_size_kb    │
│ accuracy_meters │   │ created_at      │
│ created_at      │   └─────────────────┘
└─────────────────┘
```

---

## Table Definitions

### 1. users

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'worker', -- 'worker', 'supervisor', 'admin'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Constraints
ALTER TABLE users ADD CONSTRAINT chk_role 
  CHECK (role IN ('worker', 'supervisor', 'admin'));
```

---

### 2. area_types

```sql
CREATE TABLE area_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL, -- 'park', 'pedestrian', 'mini_garden', 'street'
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Data
INSERT INTO area_types (code, name, description) VALUES
  ('park', 'Park', 'Public park or garden'),
  ('pedestrian', 'Pedestrian Zone', 'Pedestrian walkway with trees'),
  ('mini_garden', 'Mini Garden', 'Small garden or green space'),
  ('street', 'Street', 'Street with trees or greenery');
```

---

### 3. areas

```sql
CREATE TABLE areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  area_type_id INT NOT NULL REFERENCES area_types(id),
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  radius_meters INT DEFAULT 100,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_areas_type ON areas(area_type_id);
CREATE INDEX idx_areas_active ON areas(is_active) WHERE is_active = TRUE;

-- Constraints
ALTER TABLE areas ADD CONSTRAINT chk_gps_lat 
  CHECK (gps_lat BETWEEN -90 AND 90);
ALTER TABLE areas ADD CONSTRAINT chk_gps_lng 
  CHECK (gps_lng BETWEEN -180 AND 180);
ALTER TABLE areas ADD CONSTRAINT chk_radius 
  CHECK (radius_meters > 0 AND radius_meters <= 10000);
```

---

### 4. worker_assignments

```sql
CREATE TABLE worker_assignments (
  id SERIAL PRIMARY KEY,
  worker_id INT NOT NULL REFERENCES users(id),
  area_id INT NOT NULL REFERENCES areas(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(worker_id) -- One area per worker for MVP
);

-- Indexes
CREATE INDEX idx_assignments_worker ON worker_assignments(worker_id);
CREATE INDEX idx_assignments_area ON worker_assignments(area_id);
```

---

### 5. shifts

```sql
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  worker_id INT NOT NULL REFERENCES users(id),
  area_id INT NOT NULL REFERENCES areas(id),
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_in_gps_lat DECIMAL(10, 8),
  clock_in_gps_lng DECIMAL(11, 8),
  clock_in_photo_url TEXT,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  clock_out_gps_lat DECIMAL(10, 8),
  clock_out_gps_lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shifts_worker ON shifts(worker_id);
CREATE INDEX idx_shifts_area ON shifts(area_id);
CREATE INDEX idx_shifts_date ON shifts(clock_in_time);
CREATE INDEX idx_shifts_active ON shifts(worker_id) 
  WHERE clock_out_time IS NULL;

-- Constraint: Prevent overlapping shifts
-- (Handled in application logic for MVP)
```

---

### 6. work_reports

```sql
CREATE TABLE work_reports (
  id SERIAL PRIMARY KEY,
  shift_id INT NOT NULL REFERENCES shifts(id),
  worker_id INT NOT NULL REFERENCES users(id),
  area_id INT NOT NULL REFERENCES areas(id),
  report_time TIMESTAMP WITH TIME ZONE NOT NULL,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  notes TEXT,
  condition VARCHAR(20), -- 'Baik', 'Cukup', 'Buruk'
  asset_id INT, -- Reserved for Phase 4
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reports_shift ON work_reports(shift_id);
CREATE INDEX idx_reports_worker ON work_reports(worker_id);
CREATE INDEX idx_reports_area ON work_reports(area_id);
CREATE INDEX idx_reports_date ON work_reports(report_time);
CREATE INDEX idx_reports_reviewed ON work_reports(reviewed);

-- Constraints
ALTER TABLE work_reports ADD CONSTRAINT chk_condition 
  CHECK (condition IS NULL OR condition IN ('Baik', 'Cukup', 'Buruk'));
```

---

### 7. report_media

```sql
CREATE TABLE report_media (
  id SERIAL PRIMARY KEY,
  report_id INT NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,
  media_type VARCHAR(10) NOT NULL, -- 'photo', 'video'
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size_kb INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_media_report ON report_media(report_id);

-- Constraints
ALTER TABLE report_media ADD CONSTRAINT chk_media_type 
  CHECK (media_type IN ('photo', 'video'));
```

---

### 8. location_pings

```sql
CREATE TABLE location_pings (
  id SERIAL PRIMARY KEY,
  worker_id INT NOT NULL REFERENCES users(id),
  shift_id INT NOT NULL REFERENCES shifts(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  accuracy_meters DECIMAL(6, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes (optimized for time-series queries)
CREATE INDEX idx_pings_worker_time ON location_pings(worker_id, timestamp);
CREATE INDEX idx_pings_shift ON location_pings(shift_id);
CREATE INDEX idx_pings_timestamp ON location_pings(timestamp);

-- Note: Consider table partitioning by month for Phase 3+ when data grows
```

---

## TypeORM Entity Examples

### User Entity

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ length: 20, default: 'worker' })
  role: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => WorkerAssignment, (assignment) => assignment.worker)
  assignment: WorkerAssignment;

  @OneToMany(() => Shift, (shift) => shift.worker)
  shifts: Shift[];
}
```

### Shift Entity

```typescript
@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'worker_id' })
  workerId: number;

  @Column({ name: 'area_id' })
  areaId: number;

  @Column({ name: 'clock_in_time', type: 'timestamptz' })
  clockInTime: Date;

  @Column({ name: 'clock_in_gps_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
  clockInGpsLat: number;

  @Column({ name: 'clock_in_gps_lng', type: 'decimal', precision: 11, scale: 8, nullable: true })
  clockInGpsLng: number;

  @Column({ name: 'clock_in_photo_url', nullable: true })
  clockInPhotoUrl: string;

  @Column({ name: 'clock_out_time', type: 'timestamptz', nullable: true })
  clockOutTime: Date;

  @Column({ name: 'clock_out_gps_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
  clockOutGpsLat: number;

  @Column({ name: 'clock_out_gps_lng', type: 'decimal', precision: 11, scale: 8, nullable: true })
  clockOutGpsLng: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.shifts)
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @ManyToOne(() => Area)
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @OneToMany(() => WorkReport, (report) => report.shift)
  reports: WorkReport[];

  @OneToMany(() => LocationPing, (ping) => ping.shift)
  locationPings: LocationPing[];
}
```

---

## Seed Data

```sql
-- Test Supervisor (password: supervisor123)
INSERT INTO users (username, password_hash, full_name, role) VALUES
  ('supervisor1', '$2b$10$...', 'Budi Santoso', 'supervisor');

-- Test Workers (password: worker123)
INSERT INTO users (username, password_hash, full_name, role) VALUES
  ('worker1', '$2b$10$...', 'Ahmad Rizki', 'worker'),
  ('worker2', '$2b$10$...', 'Siti Nurhaliza', 'worker'),
  ('worker3', '$2b$10$...', 'Dimas Pratama', 'worker');

-- Test Admin (password: admin123)
INSERT INTO users (username, password_hash, full_name, role) VALUES
  ('admin', '$2b$10$...', 'Administrator', 'admin');

-- Pilot Areas (Surabaya)
INSERT INTO areas (name, area_type_id, gps_lat, gps_lng, radius_meters, address) VALUES
  ('Taman Bungkul', 1, -7.2905, 112.7398, 100, 'Jl. Taman Bungkul, Darmo, Surabaya'),
  ('Jalan Raya Darmo (Pedestrian)', 2, -7.2844, 112.7915, 100, 'Jl. Raya Darmo, Surabaya'),
  ('Taman Harmoni', 1, -7.3037, 112.7375, 100, 'Jl. Mayjen Sungkono, Surabaya');

-- Assign Workers to Areas
INSERT INTO worker_assignments (worker_id, area_id) VALUES
  (2, 1), -- Ahmad -> Taman Bungkul
  (3, 2), -- Siti -> Jalan Raya Darmo
  (4, 3); -- Dimas -> Taman Harmoni
```

---

## Migration Strategy

### Initial Migration (Phase 1)

```bash
# Generate migration
npm run migration:generate -- -n InitialSchema

# Run migration
npm run migration:run

# Seed data
npm run seed
```

### Future Migrations (Phase 2+)

```sql
-- Phase 2: Tasks table
CREATE TABLE tasks (...);

-- Phase 4: Assets tables
CREATE TABLE asset_types (...);
CREATE TABLE assets (...);
```

---

*Last Updated: January 2026*

