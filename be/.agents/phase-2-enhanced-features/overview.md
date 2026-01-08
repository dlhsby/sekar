# Phase 2 - Enhanced Features (Backend)

## 🎯 Objectives

Extend the backend with task assignment, push notifications, and KMZ import capabilities.

**Duration:** 7 days (1 week)  
**Prerequisites:** Phase 1 MVP deployed and validated

---

## 📅 Timeline

| Day | Focus | Modules |
|-----|-------|---------|
| Day 1-2 | Tasks Module | Task CRUD, assignment, status workflow |
| Day 3 | Notifications | FCM integration, notification service |
| Day 4-5 | KMZ Import | File parsing, polygon boundaries |
| Day 6-7 | Testing & Deploy | Integration tests, deployment |

---

## 🎨 Features

### 1. Task Assignment System

**Task Workflow:**
```
Created → Assigned → Accepted → In Progress → Completed
                 ↓
              Declined
```

**Features:**
- Create task with title, description, priority
- Assign to specific worker or nearest available
- Task status tracking
- Completion with photo evidence
- Task history and metrics

### 2. Push Notifications (FCM)

**Notification Types:**
- Task assigned
- Task reminder
- Shift reminder (clock-out)
- Report reviewed
- System announcements

**Features:**
- FCM token management
- Send notifications on events
- Notification preferences

### 3. KMZ/KML Import

**Features:**
- Upload KMZ file
- Parse coordinates and metadata
- Create/update areas from file
- Support polygon boundaries
- Preview before import

---

## 🗄️ Database Changes

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

-- FCM tokens
CREATE TABLE notification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  token TEXT NOT NULL,
  device_type VARCHAR(20), -- android, ios, web
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Notification log
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

### Schema Changes

```sql
-- Add polygon support to areas
ALTER TABLE areas ADD COLUMN boundary_polygon JSONB;
-- Store as GeoJSON: { "type": "Polygon", "coordinates": [...] }
```

---

## 🔌 New API Endpoints

### Tasks Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /tasks | Create task | Supervisor |
| GET | /tasks | List tasks (filtered) | All |
| GET | /tasks/:id | Get task detail | All |
| PATCH | /tasks/:id | Update task | Supervisor |
| DELETE | /tasks/:id | Delete task | Supervisor |
| POST | /tasks/:id/assign | Assign task | Supervisor |
| POST | /tasks/:id/accept | Accept task | Worker |
| POST | /tasks/:id/decline | Decline task | Worker |
| POST | /tasks/:id/start | Start task | Worker |
| POST | /tasks/:id/complete | Complete task | Worker |
| GET | /tasks/my-tasks | Worker's tasks | Worker |

### Notifications Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /notifications/register-token | Register FCM token | All |
| DELETE | /notifications/unregister-token | Unregister token | All |
| GET | /notifications | Get notifications | All |
| PATCH | /notifications/:id/read | Mark as read | All |

### Import Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /import/kmz | Upload KMZ file | Admin |
| POST | /import/preview | Preview import | Admin |
| POST | /import/confirm | Confirm import | Admin |

---

## 🏗️ Module Structure

```
src/modules/
├── tasks/
│   ├── tasks.module.ts
│   ├── tasks.controller.ts
│   ├── tasks.service.ts
│   ├── tasks.service.spec.ts
│   ├── dto/
│   │   ├── create-task.dto.ts
│   │   ├── update-task.dto.ts
│   │   ├── assign-task.dto.ts
│   │   └── complete-task.dto.ts
│   └── entities/
│       └── task.entity.ts
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   ├── notifications.service.spec.ts
│   ├── dto/
│   └── entities/
│       ├── notification-token.entity.ts
│       └── notification.entity.ts
└── import/
    ├── import.module.ts
    ├── import.controller.ts
    ├── import.service.ts
    ├── import.service.spec.ts
    ├── parsers/
    │   └── kmz-parser.ts
    └── dto/
```

---

## 🧪 Testing Requirements

| Module | Target Coverage | Key Tests |
|--------|-----------------|-----------|
| Tasks | >80% | Create, assign, status transitions, completion |
| Notifications | >80% | Token management, send notification |
| Import | >80% | KMZ parsing, area creation |

---

## ✅ Success Criteria

1. ✅ Tasks can be created and assigned
2. ✅ Workers receive push notifications
3. ✅ Task workflow (accept/decline/complete) works
4. ✅ KMZ files can be imported
5. ✅ Polygon boundaries supported
6. ✅ All modules >80% test coverage

---

## 📝 Dependencies

### New Packages
```bash
npm install firebase-admin  # FCM
npm install jszip           # KMZ extraction
npm install xml2js          # KML parsing
```

---

*Last Updated: January 2026*

