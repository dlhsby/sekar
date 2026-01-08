# Phase 4 - Asset Management (Backend)

## 🎯 Objectives

Implement comprehensive asset tracking, QR codes, and maintenance scheduling.

**Duration:** 8 days  
**Prerequisites:** Phase 3 deployed

---

## 📅 Timeline

| Day | Focus | Features |
|-----|-------|----------|
| Day 1-2 | Assets Module | Asset CRUD, types, inventory |
| Day 3 | QR Codes | Generation, validation |
| Day 4-5 | Maintenance | Tasks, schedules, workflows |
| Day 6 | Inspections | Inspection records, triggers |
| Day 7-8 | Testing & Integration | Tests, mobile integration |

---

## 🎨 Features

### 1. Asset Inventory

**Asset Types:**
- Benches
- Fountains
- Playground equipment
- Trees (individual/groups)
- Flower beds / Gardens
- Trash bins
- Lighting fixtures
- Signage
- Pathways
- Irrigation systems

**Asset Attributes:**
- Unique code (e.g., TBK-BENCH-001)
- Name, type, location (GPS)
- Installation date, expected lifespan
- Current condition
- QR code
- Photos
- Maintenance history

### 2. QR Code System

**Features:**
- Generate unique QR for each asset
- QR contains asset ID + validation hash
- Scan to view asset
- Scan to report issue
- Scan to perform inspection

### 3. Maintenance Scheduling

**Features:**
- Preventive maintenance schedules
- Recurring tasks (daily/weekly/monthly)
- Automated task generation
- Maintenance history
- Cost tracking

### 4. Asset Inspections

**Features:**
- Regular inspection records
- Condition rating
- Photo documentation
- Issue identification
- Trigger maintenance tasks

---

## 🗄️ Database Schema

```sql
-- Asset types lookup
CREATE TABLE asset_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50), -- furniture, infrastructure, landscaping
  default_lifespan_years INT,
  inspection_frequency_days INT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  asset_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  asset_type_id INT REFERENCES asset_types(id),
  area_id INT REFERENCES areas(id),
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  installation_date DATE,
  expected_lifespan_years INT,
  purchase_cost DECIMAL(12, 2),
  current_condition VARCHAR(20), -- excellent, good, fair, poor, critical
  last_inspection_date DATE,
  next_inspection_date DATE,
  qr_code_url TEXT,
  photo_url TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active', -- active, maintenance, retired, removed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset inspections
CREATE TABLE asset_inspections (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id),
  inspector_id INT REFERENCES users(id),
  inspection_date TIMESTAMP WITH TIME ZONE NOT NULL,
  condition_rating VARCHAR(20),
  notes TEXT,
  issues_found TEXT,
  photos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance tasks
CREATE TABLE maintenance_tasks (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  task_type VARCHAR(20), -- preventive, corrective, emergency
  priority VARCHAR(20) DEFAULT 'normal',
  assigned_to INT REFERENCES users(id),
  created_by INT REFERENCES users(id),
  scheduled_date DATE,
  completed_date DATE,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  completion_notes TEXT,
  completion_photos JSONB,
  cost DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance schedules (recurring)
CREATE TABLE maintenance_schedules (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  frequency VARCHAR(20), -- daily, weekly, monthly, quarterly, yearly
  frequency_value INT DEFAULT 1,
  last_performed_date DATE,
  next_due_date DATE,
  assigned_to INT REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /assets | List assets (filtered) |
| POST | /assets | Create asset |
| GET | /assets/:id | Get asset detail |
| PATCH | /assets/:id | Update asset |
| DELETE | /assets/:id | Delete asset |
| POST | /assets/import | Bulk import (CSV) |
| GET | /assets/by-qr/:code | Get by QR code |

### Asset Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /asset-types | List asset types |
| POST | /asset-types | Create type |

### QR Codes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /qr-codes/generate/:assetId | Generate QR |
| GET | /qr-codes/validate/:code | Validate QR |
| GET | /qr-codes/batch-print | Print multiple QRs |

### Inspections

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /inspections | Create inspection |
| GET | /inspections | List inspections |
| GET | /assets/:id/inspections | Asset inspection history |

### Maintenance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /maintenance | List maintenance tasks |
| POST | /maintenance | Create task |
| PATCH | /maintenance/:id | Update task |
| POST | /maintenance/:id/complete | Complete task |
| GET | /maintenance/schedules | List schedules |
| POST | /maintenance/schedules | Create schedule |
| POST | /maintenance/generate | Generate scheduled tasks |

---

## 🏗️ Module Structure

```
src/modules/
├── assets/
│   ├── assets.module.ts
│   ├── assets.controller.ts
│   ├── assets.service.ts
│   ├── assets.service.spec.ts
│   ├── dto/
│   └── entities/
│       ├── asset.entity.ts
│       └── asset-type.entity.ts
├── qr-codes/
│   ├── qr-codes.module.ts
│   ├── qr-codes.controller.ts
│   ├── qr-codes.service.ts
│   └── qr-codes.service.spec.ts
├── inspections/
│   ├── inspections.module.ts
│   ├── inspections.controller.ts
│   ├── inspections.service.ts
│   └── entities/
│       └── asset-inspection.entity.ts
└── maintenance/
    ├── maintenance.module.ts
    ├── maintenance.controller.ts
    ├── maintenance.service.ts
    ├── maintenance.service.spec.ts
    └── entities/
        ├── maintenance-task.entity.ts
        └── maintenance-schedule.entity.ts
```

---

## 🧪 Testing Requirements

| Module | Target | Key Tests |
|--------|--------|-----------|
| Assets | >80% | CRUD, inventory, import |
| QR Codes | >80% | Generate, validate |
| Inspections | >80% | Create, history |
| Maintenance | >80% | Tasks, schedules, generation |

---

## ✅ Success Criteria

1. ✅ Asset inventory complete
2. ✅ QR codes generate and validate
3. ✅ Inspections recorded
4. ✅ Maintenance tasks scheduled
5. ✅ Recurring schedules work
6. ✅ Link work reports to assets
7. ✅ All modules >80% coverage

---

## 📝 Dependencies

```bash
npm install qrcode          # QR code generation
npm install csv-parser      # CSV import
```

---

*Last Updated: January 2026*

