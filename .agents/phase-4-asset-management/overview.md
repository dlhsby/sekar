# Phase 4 - Asset Management System

## 🎯 Objectives
Implement comprehensive asset tracking and maintenance management for park assets.

**Timeline:** 2-3 weeks
**Prerequisites:** Phase 3 deployed with analytics foundation

## 🏛️ Asset Management Features

### 1. Asset Inventory
**Asset Types:**
- Benches
- Fountains
- Playground equipment
- Trees (individual or groups)
- Flower beds / Gardens
- Trash bins
- Lighting fixtures
- Signage
- Pathways
- Irrigation systems

**Asset Attributes:**
- Name / Identifier
- Asset type
- Location (GPS coordinates)
- Installation date
- Expected lifespan
- Current condition
- Last inspection date
- Photos
- QR code
- Maintenance history
- Cost / Value

### 2. Asset Condition Tracking
**Features:**
- Regular inspections by workers
- Condition rating (1-5 or Good/Fair/Poor/Critical)
- Photo documentation
- Issue reporting linked to assets
- Condition history timeline
- Automated alerts for deteriorating assets

### 3. Maintenance Scheduling
**Features:**
- Preventive maintenance schedules
- Reactive maintenance (based on condition)
- Maintenance task assignment
- Completion tracking
- Recurring maintenance tasks
- Maintenance history log

### 4. QR Code System
**Features:**
- Generate QR codes for each asset
- Print QR code labels
- Scan QR to view asset details
- Scan QR to report issue
- Scan QR to perform maintenance
- Update asset info via QR scan

### 5. Asset Analytics
**Metrics:**
- Asset condition distribution
- Maintenance frequency by asset type
- Cost per asset type
- Lifespan analysis
- High-maintenance areas
- Asset replacement forecasting

---

## 🗄️ Database Schema

```sql
-- Assets table
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  asset_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "TBK-BENCH-001"
  name VARCHAR(200) NOT NULL,
  asset_type_id INT REFERENCES asset_types(id),
  area_id INT REFERENCES areas(id),
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  installation_date DATE,
  expected_lifespan_years INT,
  purchase_cost DECIMAL(12, 2),
  current_condition VARCHAR(20), -- 'excellent', 'good', 'fair', 'poor', 'critical'
  last_inspection_date DATE,
  qr_code_url TEXT,
  notes TEXT,
  status VARCHAR(20), -- 'active', 'maintenance', 'retired', 'removed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Asset types lookup
CREATE TABLE asset_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50), -- 'furniture', 'infrastructure', 'landscaping', etc.
  default_lifespan_years INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Asset inspections
CREATE TABLE asset_inspections (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id),
  inspector_id INT REFERENCES users(id),
  inspection_date TIMESTAMP NOT NULL,
  condition_rating VARCHAR(20),
  notes TEXT,
  issues_found TEXT,
  photos JSONB, -- Array of photo URLs
  next_inspection_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance tasks
CREATE TABLE maintenance_tasks (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  task_type VARCHAR(20), -- 'preventive', 'corrective', 'emergency'
  priority VARCHAR(20), -- 'low', 'normal', 'high', 'urgent'
  assigned_to INT REFERENCES users(id),
  created_by INT REFERENCES users(id),
  scheduled_date DATE,
  completed_date DATE,
  status VARCHAR(20), -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  completion_notes TEXT,
  completion_photos JSONB,
  cost DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance schedules (recurring)
CREATE TABLE maintenance_schedules (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  frequency VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  frequency_value INT, -- e.g., every 3 months
  last_performed_date DATE,
  next_due_date DATE,
  assigned_to INT REFERENCES users(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Link work reports to assets
ALTER TABLE work_reports 
  DROP COLUMN asset_id,
  ADD COLUMN asset_id INT REFERENCES assets(id);
```

---

## 🏗️ Architecture

### Backend (NestJS)

**New Modules:**
```
src/modules/
├── assets/
│   ├── assets.controller.ts
│   ├── assets.service.ts
│   ├── assets.module.ts
│   ├── entities/
│   │   ├── asset.entity.ts
│   │   ├── asset-type.entity.ts
│   │   └── asset-inspection.entity.ts
│   ├── dto/
│   └── assets.service.spec.ts
├── maintenance/
│   ├── maintenance.controller.ts
│   ├── maintenance.service.ts
│   ├── maintenance.module.ts
│   ├── entities/
│   │   ├── maintenance-task.entity.ts
│   │   └── maintenance-schedule.entity.ts
│   └── maintenance.service.spec.ts
└── qr-codes/
    ├── qr-codes.controller.ts
    ├── qr-codes.service.ts
    ├── qr-codes.module.ts
    └── qr-codes.service.spec.ts
```

### Web Dashboard

**New Pages:**
- `/assets` - Asset inventory list
- `/assets/:id` - Asset detail page
- `/assets/new` - Create new asset
- `/assets/import` - Bulk import assets
- `/assets/map` - Map view of all assets
- `/maintenance` - Maintenance tasks dashboard
- `/maintenance/schedule` - Maintenance schedules
- `/maintenance/history` - Maintenance history
- `/inspections` - Inspection records

### Mobile App

**New Screens:**
- Asset list screen (browse assets in area)
- Asset detail screen (view asset info)
- QR scanner screen
- Asset inspection form
- Maintenance task screen
- Asset search screen

---

## 📅 Development Timeline (3 weeks)

### Week 1: Asset Foundation

**Day 1-2:**
- [ ] Assets module (backend)
- [ ] Database schema and migrations
- [ ] Asset CRUD API endpoints
- [ ] Asset types seeding
- [ ] Unit tests (>80% coverage)

**Day 3-4:**
- [ ] QR code generation service
- [ ] QR code API endpoints
- [ ] Asset import functionality (CSV/Excel)
- [ ] Photo upload for assets

**Day 5:**
- [ ] Asset list page (web dashboard)
- [ ] Asset detail page (web dashboard)
- [ ] Asset creation form (web dashboard)
- [ ] Asset import UI

### Week 2: Maintenance & Inspections

**Day 6-7:**
- [ ] Maintenance module (backend)
- [ ] Maintenance task API endpoints
- [ ] Maintenance schedule logic
- [ ] Automated task generation from schedules
- [ ] Unit tests (>80% coverage)

**Day 8-9:**
- [ ] Asset inspections API
- [ ] Inspection history tracking
- [ ] Maintenance dashboard (web)
- [ ] Maintenance task management (web)
- [ ] Schedule configuration (web)

**Day 10:**
- [ ] Asset map view (web)
- [ ] Filter and search functionality
- [ ] Maintenance analytics
- [ ] Integration testing

### Week 3: Mobile Integration & QR

**Day 11-12:**
- [ ] QR scanner (mobile)
- [ ] Asset list screen (mobile)
- [ ] Asset detail screen (mobile)
- [ ] Link reports to assets (mobile)

**Day 13-14:**
- [ ] Asset inspection form (mobile)
- [ ] Maintenance task completion (mobile)
- [ ] QR code scanning workflow
- [ ] Offline support for asset data

**Day 15:**
- [ ] QR code label generator
- [ ] Print-ready QR labels (PDF)
- [ ] End-to-end testing
- [ ] Documentation

---

## 📱 Mobile Features Detail

### QR Scanner Workflow
1. Worker opens QR scanner
2. Scans asset QR code
3. App shows asset details
4. Options:
   - Report issue
   - Perform inspection
   - Complete maintenance task
   - View history

### Asset Inspection
1. Select asset (browse or scan QR)
2. Fill inspection form:
   - Condition rating
   - Notes
   - Take photos
   - Identify issues
3. Submit inspection
4. System updates asset condition
5. Generates maintenance task if needed

### Maintenance Task Completion
1. View assigned maintenance tasks
2. Select task
3. Complete task form:
   - Completion notes
   - Photos
   - Actual cost
   - Mark as completed
4. Submit completion
5. Update maintenance schedule

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Asset CRUD operations
- [ ] QR code generation
- [ ] Maintenance task creation
- [ ] Schedule-based task generation
- [ ] Asset import from CSV
- [ ] All modules: >80% coverage

### Web Dashboard Tests
- [ ] Asset list and filters
- [ ] Asset creation and editing
- [ ] Maintenance dashboard
- [ ] Schedule configuration
- [ ] Map view with assets

### Mobile App Tests
- [ ] QR scanner functionality
- [ ] Asset inspection submission
- [ ] Maintenance task completion
- [ ] Offline asset data access
- [ ] Link reports to assets

### Integration Tests
- [ ] Full asset lifecycle (create → inspect → maintain → retire)
- [ ] QR scan → inspection workflow
- [ ] Scheduled maintenance generation
- [ ] Asset condition triggers maintenance

---

## 📦 Deliverables

### Code
- [ ] Assets module (backend)
- [ ] Maintenance module (backend)
- [ ] QR codes module (backend)
- [ ] Asset management pages (web)
- [ ] QR scanner and asset screens (mobile)

### Documentation
- [ ] Asset management user guide
- [ ] QR code setup guide
- [ ] Maintenance scheduling guide
- [ ] API documentation updates

### Deployment
- [ ] Backend updated with new modules
- [ ] Web dashboard updated
- [ ] Mobile app updated (new APK)
- [ ] QR code labels generated for pilot assets

---

## ✅ Success Criteria

1. ✅ Asset inventory is complete and accurate
2. ✅ QR codes work for asset identification
3. ✅ Workers can perform inspections via mobile
4. ✅ Maintenance tasks are generated and tracked
5. ✅ Supervisors can schedule preventive maintenance
6. ✅ Asset analytics provide useful insights
7. ✅ All new code has >80% test coverage

---

## 💡 Advanced Features (Optional)

### Asset Lifecycle Management
- Depreciation tracking
- Replacement planning
- Budget forecasting
- Vendor management

### IoT Integration
- Smart sensors for asset monitoring
- Automated condition alerts
- Real-time environmental data

### GIS Integration
- Advanced mapping features
- Spatial analysis
- Route optimization for maintenance

---

## 🔄 Next Steps
After Phase 4:
- Evaluate asset tracking adoption
- Analyze maintenance cost savings
- Plan Phase 5 (iOS app & advanced features)

