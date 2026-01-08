# API Contracts - Phase 2 Enhanced Features

## Tasks Endpoints

### POST /tasks
**Description:** Create new task  
**Auth:** Supervisor only

```typescript
// Request
{
  "title": "Clean fallen tree",
  "description": "Tree fell near main entrance, needs cleanup",
  "priority": "urgent", // urgent, high, normal, low
  "area_id": 1,
  "gps_lat": -7.2905,
  "gps_lng": 112.7398,
  "assigned_to": 2 // optional, assign later
}

// Response (201)
{
  "id": 1,
  "title": "Clean fallen tree",
  "description": "Tree fell near main entrance, needs cleanup",
  "priority": "urgent",
  "status": "pending",
  "area": {
    "id": 1,
    "name": "Taman Bungkul"
  },
  "assigned_to": null,
  "created_at": "2026-01-10T08:00:00.000Z"
}
```

### GET /tasks
**Description:** List tasks with filters  
**Auth:** All (filtered by role)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| priority | string | Filter by priority |
| area_id | number | Filter by area |
| assigned_to | number | Filter by assignee |
| date | string | Filter by date |

```typescript
// Response (200)
[
  {
    "id": 1,
    "title": "Clean fallen tree",
    "priority": "urgent",
    "status": "in_progress",
    "area_name": "Taman Bungkul",
    "assigned_to": {
      "id": 2,
      "full_name": "Ahmad Rizki"
    },
    "created_at": "2026-01-10T08:00:00.000Z"
  }
]
```

### POST /tasks/:id/assign
**Description:** Assign task to worker  
**Auth:** Supervisor only

```typescript
// Request
{
  "worker_id": 2
}

// Response (200)
{
  "id": 1,
  "status": "pending",
  "assigned_to": {
    "id": 2,
    "full_name": "Ahmad Rizki"
  },
  "assigned_at": "2026-01-10T08:30:00.000Z"
}
```

### POST /tasks/:id/accept
**Description:** Accept assigned task  
**Auth:** Worker (assigned only)

```typescript
// Response (200)
{
  "id": 1,
  "status": "accepted",
  "accepted_at": "2026-01-10T08:35:00.000Z"
}
```

### POST /tasks/:id/decline
**Description:** Decline assigned task  
**Auth:** Worker (assigned only)

```typescript
// Request
{
  "reason": "Currently handling another emergency" // optional
}

// Response (200)
{
  "id": 1,
  "status": "declined"
}
```

### POST /tasks/:id/start
**Description:** Start working on task  
**Auth:** Worker (assigned only)

```typescript
// Response (200)
{
  "id": 1,
  "status": "in_progress",
  "started_at": "2026-01-10T09:00:00.000Z"
}
```

### POST /tasks/:id/complete
**Description:** Complete task with evidence  
**Auth:** Worker (assigned only)

```typescript
// Request
{
  "completion_notes": "Tree removed and area cleaned",
  "completion_photo": "data:image/jpeg;base64,..."
}

// Response (200)
{
  "id": 1,
  "status": "completed",
  "completed_at": "2026-01-10T10:30:00.000Z",
  "completion_photo_url": "https://s3.../tasks/1/completion.jpg"
}
```

### GET /tasks/my-tasks
**Description:** Get worker's assigned tasks  
**Auth:** Worker only

```typescript
// Response (200)
[
  {
    "id": 1,
    "title": "Clean fallen tree",
    "priority": "urgent",
    "status": "in_progress",
    "area_name": "Taman Bungkul",
    "assigned_at": "2026-01-10T08:30:00.000Z"
  }
]
```

---

## Notifications Endpoints

### POST /notifications/register-token
**Description:** Register FCM token for push notifications  
**Auth:** Required

```typescript
// Request
{
  "token": "fcm_token_here",
  "device_type": "android" // android, ios, web
}

// Response (200)
{
  "success": true
}
```

### GET /notifications
**Description:** Get user's notifications  
**Auth:** Required

```typescript
// Response (200)
[
  {
    "id": 1,
    "type": "task_assigned",
    "title": "New Task Assigned",
    "body": "You have been assigned: Clean fallen tree",
    "read": false,
    "sent_at": "2026-01-10T08:30:00.000Z"
  }
]
```

### PATCH /notifications/:id/read
**Description:** Mark notification as read  
**Auth:** Required

```typescript
// Response (200)
{
  "id": 1,
  "read": true,
  "read_at": "2026-01-10T08:35:00.000Z"
}
```

---

## Import Endpoints

### POST /import/kmz
**Description:** Upload KMZ file for preview  
**Auth:** Admin only  
**Content-Type:** multipart/form-data

```typescript
// Request
// Form data with 'file' field

// Response (200)
{
  "preview_id": "abc123",
  "areas_found": 5,
  "areas": [
    {
      "name": "Taman Baru",
      "coordinates": [...],
      "boundary_type": "polygon"
    }
  ]
}
```

### POST /import/confirm
**Description:** Confirm and execute import  
**Auth:** Admin only

```typescript
// Request
{
  "preview_id": "abc123",
  "selected_areas": [0, 1, 2] // indices of areas to import
}

// Response (200)
{
  "imported_count": 3,
  "areas": [
    { "id": 4, "name": "Taman Baru" }
  ]
}
```

---

*Last Updated: January 2026*

