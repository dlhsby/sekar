# Phase 2 - Backend Implementation Checklist

**Duration:** 7 days
**Prerequisites:** Phase 1 MVP deployed and validated

---

## Overview

Extend the backend with task assignment, push notifications (FCM), and KMZ import capabilities.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1-2 | Tasks Module | Task CRUD, assignment, status workflow |
| Day 3 | Notifications | FCM integration, notification service |
| Day 4-5 | KMZ Import | File parsing, polygon boundaries |
| Day 6-7 | Testing & Deploy | Integration tests, deployment |

---

## Tasks Module

### Module Structure

```
src/modules/tasks/
├── tasks.module.ts
├── tasks.controller.ts
├── tasks.service.ts
├── tasks.service.spec.ts
├── dto/
│   ├── create-task.dto.ts
│   ├── update-task.dto.ts
│   ├── assign-task.dto.ts
│   └── complete-task.dto.ts
└── entities/
    └── task.entity.ts
```

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /tasks | Create task | Supervisor |
| GET | /tasks | List tasks (filtered) | All |
| GET | /tasks/:id | Get task detail | All |
| PATCH | /tasks/:id | Update task | Supervisor |
| DELETE | /tasks/:id | Delete task | Supervisor |
| POST | /tasks/:id/assign | Assign task to worker | Supervisor |
| POST | /tasks/:id/accept | Accept task | Worker (assigned) |
| POST | /tasks/:id/decline | Decline task | Worker (assigned) |
| POST | /tasks/:id/start | Start working on task | Worker (assigned) |
| POST | /tasks/:id/complete | Complete task with photo | Worker (assigned) |
| GET | /tasks/my-tasks | Get worker's assigned tasks | Worker |

### Implementation Checklist

#### Entity & DTOs
- [ ] Task entity with all fields
- [ ] CreateTaskDto with validation
- [ ] UpdateTaskDto (partial)
- [ ] AssignTaskDto (worker_id)
- [ ] CompleteTaskDto (notes, photo)

#### Service Methods
- [ ] `create(dto, userId)` - Create new task
- [ ] `findAll(filters)` - List with filters (status, priority, area, assignee)
- [ ] `findOne(id)` - Get task by ID with relations
- [ ] `update(id, dto)` - Update task details
- [ ] `remove(id)` - Soft delete task
- [ ] `assign(id, workerId, supervisorId)` - Assign to worker
- [ ] `accept(id, workerId)` - Accept assigned task
- [ ] `decline(id, workerId, reason?)` - Decline with optional reason
- [ ] `start(id, workerId)` - Mark as in_progress
- [ ] `complete(id, workerId, dto)` - Complete with photo/notes
- [ ] `getMyTasks(workerId)` - Get worker's tasks

#### Business Logic
- [ ] Status transition validation (can't complete without accepting)
- [ ] Only assigned worker can accept/decline/complete
- [ ] Auto-update timestamps on status change
- [ ] Trigger notification on assignment
- [ ] Upload completion photo to S3

#### Controller
- [ ] All endpoints with proper guards
- [ ] Swagger documentation
- [ ] @GetUser() decorator usage
- [ ] Input validation

---

## Notifications Module

### Module Structure

```
src/modules/notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
├── notifications.service.spec.ts
├── dto/
│   ├── register-token.dto.ts
│   └── send-notification.dto.ts
└── entities/
    ├── notification-token.entity.ts
    └── notification.entity.ts
```

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /notifications/register-token | Register FCM token | All |
| DELETE | /notifications/unregister-token | Unregister token | All |
| GET | /notifications | Get user's notifications | All |
| PATCH | /notifications/:id/read | Mark as read | All |
| GET | /notifications/unread-count | Get unread count | All |

### Implementation Checklist

#### Firebase Setup
- [ ] Firebase Admin SDK initialized
- [ ] Service account credentials in environment
- [ ] FirebaseAdmin module created

#### Token Management
- [ ] NotificationToken entity
- [ ] Register token (upsert)
- [ ] Unregister token
- [ ] Clean expired tokens (cron job optional)

#### Notification Service
- [ ] `sendToUser(userId, payload)` - Send to single user
- [ ] `sendToUsers(userIds, payload)` - Send to multiple users
- [ ] `sendToTopic(topic, payload)` - Broadcast
- [ ] Log sent notifications
- [ ] Handle FCM errors gracefully

#### Notification History
- [ ] Notification entity
- [ ] List user notifications
- [ ] Mark as read
- [ ] Unread count

---

## Import Module

### Module Structure

```
src/modules/import/
├── import.module.ts
├── import.controller.ts
├── import.service.ts
├── import.service.spec.ts
├── parsers/
│   └── kmz-parser.ts
└── dto/
    ├── upload-kmz.dto.ts
    └── confirm-import.dto.ts
```

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /import/kmz | Upload KMZ file for preview | Admin |
| POST | /import/preview | Preview parsed areas | Admin |
| POST | /import/confirm | Confirm and create areas | Admin |

### Implementation Checklist

#### KMZ Parser
- [ ] Extract KML from KMZ (using jszip)
- [ ] Parse KML XML (using xml2js)
- [ ] Extract Placemark coordinates
- [ ] Extract metadata (name, description)
- [ ] Handle multiple coordinate formats
- [ ] Validate coordinate ranges

#### Import Service
- [ ] Upload KMZ file
- [ ] Parse and cache preview (Redis or memory)
- [ ] Return parsed areas for confirmation
- [ ] Create areas on confirmation
- [ ] Store polygon as GeoJSON in boundary_polygon

#### Polygon Support
- [ ] Update Area entity with boundary_polygon field
- [ ] GPS validation using polygon containment
- [ ] Fallback to radius if no polygon

---

## API Contracts

### POST /tasks - Create Task

**Request:**
```json
{
  "title": "Clean fallen tree",
  "description": "Tree fell near main entrance, needs cleanup",
  "priority": "urgent",
  "area_id": 1,
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "assigned_to": 2
}
```

**Response (201):**
```json
{
  "id": 1,
  "title": "Clean fallen tree",
  "description": "Tree fell near main entrance, needs cleanup",
  "priority": "urgent",
  "status": "pending",
  "area": { "id": 1, "name": "Taman Bungkul" },
  "assigned_to": null,
  "created_at": "2026-01-10T08:00:00.000Z"
}
```

### POST /tasks/:id/complete - Complete Task

**Request:**
```json
{
  "completion_notes": "Tree removed and area cleaned",
  "completion_photo": "data:image/jpeg;base64,..."
}
```

**Response (200):**
```json
{
  "id": 1,
  "status": "completed",
  "completed_at": "2026-01-10T10:30:00.000Z",
  "completion_photo_url": "https://s3.../tasks/1/completion.jpg"
}
```

### POST /notifications/register-token

**Request:**
```json
{
  "token": "fcm_token_here",
  "device_type": "android"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### POST /import/kmz

**Request:** multipart/form-data with 'file' field

**Response (200):**
```json
{
  "preview_id": "abc123",
  "areas_found": 5,
  "areas": [
    {
      "name": "Taman Baru",
      "coordinates": [[lat, lng], ...],
      "boundary_type": "polygon"
    }
  ]
}
```

---

## Testing Requirements

| Module | Target Coverage | Key Tests |
|--------|-----------------|-----------|
| Tasks | >80% | Create, assign, status transitions, completion |
| Notifications | >80% | Token management, send notification (mock FCM) |
| Import | >80% | KMZ parsing, area creation |

### Test Scenarios

#### Tasks
- Create task with valid data
- Create task without required fields (validation)
- Assign task to worker
- Worker accepts assigned task
- Worker declines task with reason
- Worker starts accepted task
- Worker completes task with photo
- Cannot complete task not assigned to you
- Cannot complete task without accepting first
- Status transition validation

#### Notifications
- Register new token
- Update existing token
- Unregister token
- Send notification (mock FCM)
- List user notifications
- Mark notification as read

#### Import
- Parse valid KMZ file
- Handle invalid file type
- Handle corrupt KMZ
- Create areas from import

---

## Dependencies

```bash
npm install firebase-admin  # FCM
npm install jszip           # KMZ extraction
npm install xml2js          # KML parsing
```

---

## Success Criteria

1. Tasks can be created and assigned
2. Workers receive push notifications
3. Task workflow (accept/decline/complete) works correctly
4. KMZ files can be imported successfully
5. Polygon boundaries supported in GPS validation
6. All modules have >80% test coverage

---

## Sign-Off

**Developer:** _______________ **Date:** _______________

**Reviewer:** _______________ **Date:** _______________
