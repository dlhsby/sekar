# Phase 2: Enhanced Features

**Timeline:** Weeks 3-5 (after Phase 1 MVP completion)
**Duration:** 2-3 weeks
**Status:** Planned

---

## Overview

Phase 2 expands the SEKAR MVP with task assignment, push notifications, KMZ file import for area boundaries, and initial web dashboard capabilities for supervisors.

---

## Goals

1. **Task Management** - Supervisors can create and assign tasks to workers
2. **Push Notifications** - Real-time alerts for task assignments and updates via FCM
3. **KMZ/KML Import** - Import area boundaries from GIS files
4. **Enhanced Reports** - Support multiple photos (up to 5) per report
5. **Basic Web Dashboard** - View-only supervisor dashboard

---

## Key Features

### 1. Task Assignment System

**Workflow:**
```
Created -> Assigned -> Accepted -> In Progress -> Completed
                  |
                  v
               Declined
```

**Capabilities:**
- Create task with title, description, priority, location
- Assign to specific worker or find nearest available
- Worker accepts/declines via mobile app
- Task completion with photo evidence
- Track task status and completion time

### 2. Push Notifications (FCM)

**Notification Types:**
- Task assigned - Notify worker of new task
- Task reminder - Remind about pending tasks
- Shift reminder - Clock-out reminders
- Report reviewed - Feedback on submitted reports
- System announcements - Broadcast messages

**Features:**
- Firebase Cloud Messaging integration
- FCM token management per device
- Background and foreground notification handling
- Deep linking to relevant screens

### 3. KMZ/KML Import

**Features:**
- Upload KMZ file with area boundaries
- Parse KML coordinates and metadata
- Preview parsed areas on map before import
- Create/update areas from imported data
- Support polygon boundaries (not just radius)

### 4. Basic Web Dashboard

**Pages:**
- `/login` - Supervisor/Admin authentication
- `/dashboard` - Overview with key metrics
- `/map` - Live worker locations
- `/reports` - Reports list with filters
- `/attendance` - Daily attendance view

---

## Database Changes

### New Tables

```sql
-- Tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'normal', -- urgent, high, normal, low
  area_id INT REFERENCES areas(id),
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  assigned_to INT REFERENCES users(id),
  assigned_by INT REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, in_progress, completed, declined
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_photo_url TEXT,
  completion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FCM tokens for push notifications
CREATE TABLE notification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  token TEXT NOT NULL,
  device_type VARCHAR(20), -- android, ios, web
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Notification history
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);
```

### Schema Updates

```sql
-- Add polygon support to areas (for KMZ import)
ALTER TABLE areas ADD COLUMN boundary_polygon JSONB;
-- Stores GeoJSON: { "type": "Polygon", "coordinates": [...] }

-- Support multiple photos per report
ALTER TABLE work_reports ADD COLUMN photo_urls TEXT[];
```

---

## Dependencies

### Backend
```bash
npm install firebase-admin  # FCM push notifications
npm install jszip           # KMZ extraction
npm install xml2js          # KML parsing
```

### Mobile
```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
```

### Web
```bash
npx create-next-app@latest sekar-web --typescript --tailwind --app
npm install @tanstack/react-query axios recharts
```

---

## Success Criteria

1. Supervisors can create and assign tasks from mobile/web
2. Workers receive push notifications on task assignment
3. Workers can accept/decline/complete tasks with photo evidence
4. KMZ files can be imported to create area boundaries
5. Web dashboard shows live worker locations and reports
6. All new backend modules have >80% test coverage
7. System handles 500 workers across 50 areas

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FCM configuration complexity | High | Use react-native-firebase guide, test early on real devices |
| KMZ parsing edge cases | Medium | Test with multiple KMZ files from actual DKRTH data |
| Web dashboard scope creep | Medium | Strict scope: view-only for Phase 2, CRUD in Phase 6 |
| Background notification issues | Medium | Follow platform-specific guidelines for iOS/Android |

---

## Related Documentation

- **Backend Checklist:** [`backend.md`](./backend.md)
- **Mobile Checklist:** [`mobile.md`](./mobile.md)
- **Web Checklist:** [`web.md`](./web.md)
- **Timeline:** [`timeline.md`](./timeline.md)
- **Testing:** [`testing.md`](./testing.md)
- **Progress:** [`STATUS.md`](./STATUS.md)

---

**Phase Owner:** Project Manager
**Last Updated:** 2026-01-16
**Prerequisites:** Phase 1 MVP must be 100% complete and deployed
