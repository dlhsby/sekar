# Phase 2 - Enhanced Features (Mobile)

## 🎯 Objectives

Add task management screens and push notification support to the mobile app.

**Duration:** 5 days  
**Prerequisites:** Phase 1 MVP deployed, backend Phase 2 complete

---

## 📅 Timeline

| Day | Focus | Screens/Features |
|-----|-------|------------------|
| Day 1 | FCM Setup | Push notification integration |
| Day 2-3 | Worker Tasks | Task list, detail, accept/decline |
| Day 4 | Task Completion | Complete with photo, history |
| Day 5 | Supervisor Tasks | Create task, assign, monitor |

---

## 📱 New Screens

### Worker Screens

1. **My Tasks Screen**
   - List of assigned tasks
   - Filter by status
   - Priority badges
   - Task cards with info

2. **Task Detail Screen**
   - Full task info
   - Location on map
   - Accept/Decline buttons
   - Start/Complete actions

3. **Task Complete Screen**
   - Take completion photo
   - Add notes
   - Submit completion

### Supervisor Screens

4. **Tasks Dashboard Screen**
   - All tasks overview
   - Filter by status/worker/area
   - Create task button

5. **Create Task Screen**
   - Task form
   - Priority selection
   - Area/location picker
   - Worker assignment

---

## 🎨 Screen Specifications

### My Tasks Screen (Worker)

```
┌─────────────────────────────────┐
│ ←  My Tasks           ⚙ Filter │
├─────────────────────────────────┤
│ [Pending] [Active] [Completed] │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🔴 URGENT                   │ │
│ │ Clean fallen tree           │ │
│ │ Taman Bungkul               │ │
│ │ Assigned: 10:30             │ │
│ │               [View Detail] │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🟡 HIGH                     │ │
│ │ Fix broken bench            │ │
│ │ Jl. Darmo                   │ │
│ │ Assigned: 11:00             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Task Detail Screen

```
┌─────────────────────────────────┐
│ ←  Task Detail                  │
├─────────────────────────────────┤
│ 🔴 URGENT                       │
│ Clean fallen tree               │
│                                 │
│ Taman Bungkul                   │
│ 📍 -7.2905, 112.7398           │
│ ┌─────────────────────────────┐ │
│ │ [Map with location pin]     │ │
│ └─────────────────────────────┘ │
│                                 │
│ Description:                    │
│ Tree fell near main entrance.   │
│ Blocking pedestrian path.       │
│                                 │
│ Assigned by: Supervisor Budi    │
│ Assigned at: 10:30              │
├─────────────────────────────────┤
│ Status: PENDING                 │
│                                 │
│ ┌──────────┐  ┌──────────────┐  │
│ │ DECLINE  │  │   ACCEPT     │  │
│ └──────────┘  └──────────────┘  │
└─────────────────────────────────┘
```

---

## 🔔 Push Notifications

### Setup
- Firebase Cloud Messaging (FCM)
- Background notification handling
- Deep linking to relevant screens

### Notification Types

| Type | Title | Action |
|------|-------|--------|
| task_assigned | "New Task Assigned" | Open task detail |
| task_reminder | "Task Reminder" | Open task detail |
| report_reviewed | "Report Reviewed" | Open report |
| shift_reminder | "Clock Out Reminder" | Open clock out |

### Implementation

```typescript
// src/services/notifications/fcmService.ts
import messaging from '@react-native-firebase/messaging';
import { navigationRef } from '../navigation';

export const fcmService = {
  async requestPermission() {
    const status = await messaging().requestPermission();
    return status === messaging.AuthorizationStatus.AUTHORIZED;
  },

  async getToken() {
    return await messaging().getToken();
  },

  setupListeners() {
    // Foreground messages
    messaging().onMessage(async (message) => {
      // Show in-app notification
    });

    // Background/quit → tap opens app
    messaging().onNotificationOpenedApp((message) => {
      this.handleDeepLink(message.data);
    });

    // App opened from quit state
    messaging().getInitialNotification().then((message) => {
      if (message) {
        this.handleDeepLink(message.data);
      }
    });
  },

  handleDeepLink(data: any) {
    if (data?.type === 'task_assigned') {
      navigationRef.navigate('TaskDetail', { taskId: data.task_id });
    }
  }
};
```

---

## 🏗️ New Components

```
src/
├── screens/
│   ├── worker/
│   │   ├── MyTasksScreen.tsx
│   │   ├── TaskDetailScreen.tsx
│   │   └── TaskCompleteScreen.tsx
│   └── supervisor/
│       ├── TasksDashboardScreen.tsx
│       └── CreateTaskScreen.tsx
├── components/
│   └── tasks/
│       ├── TaskCard.tsx
│       ├── TaskStatusBadge.tsx
│       ├── PriorityBadge.tsx
│       └── TaskActionButtons.tsx
├── services/
│   ├── api/
│   │   └── tasksApi.ts
│   └── notifications/
│       └── fcmService.ts
└── store/
    └── tasksStore.ts
```

---

## 🔌 API Integration

### Tasks API

```typescript
// src/services/api/tasksApi.ts
export const tasksApi = {
  getMyTasks: () => apiClient.get('/tasks/my-tasks'),
  getTaskDetail: (id: number) => apiClient.get(`/tasks/${id}`),
  acceptTask: (id: number) => apiClient.post(`/tasks/${id}/accept`),
  declineTask: (id: number, reason?: string) => 
    apiClient.post(`/tasks/${id}/decline`, { reason }),
  startTask: (id: number) => apiClient.post(`/tasks/${id}/start`),
  completeTask: (id: number, data: CompleteTaskDto) => 
    apiClient.post(`/tasks/${id}/complete`, data),
  
  // Supervisor
  createTask: (data: CreateTaskDto) => apiClient.post('/tasks', data),
  assignTask: (id: number, workerId: number) => 
    apiClient.post(`/tasks/${id}/assign`, { worker_id: workerId }),
  getAllTasks: (filters: TaskFilters) => apiClient.get('/tasks', { params: filters }),
};
```

---

## 🧪 Testing

| Feature | Tests |
|---------|-------|
| Task list | Load, filter, empty state |
| Task actions | Accept, decline, start, complete |
| FCM | Token registration, notification handling |
| Deep linking | Navigate to correct screen |

---

## ✅ Success Criteria

1. ✅ Workers see assigned tasks
2. ✅ Workers can accept/decline tasks
3. ✅ Workers can complete tasks with photo
4. ✅ Push notifications received
5. ✅ Deep linking works
6. ✅ Supervisors can create tasks
7. ✅ Offline task queue works

---

## 📝 Dependencies

```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
```

---

*Last Updated: January 2026*

