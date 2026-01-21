# Phase 2 - Mobile Implementation Checklist

**Duration:** 5 days
**Prerequisites:** Phase 1 MVP deployed, backend Phase 2 complete

---

## Overview

Add task management screens and push notification support to the mobile app for both workers and supervisors.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | FCM Setup | Push notification integration |
| Day 2-3 | Worker Tasks | Task list, detail, accept/decline |
| Day 4 | Task Completion | Complete with photo, history |
| Day 5 | Supervisor Tasks | Create task, assign, monitor |

---

## Push Notifications (FCM)

### Setup Checklist

#### Firebase Project
- [ ] Firebase project created/configured
- [ ] Android app registered in Firebase
- [ ] iOS app registered in Firebase
- [ ] Download `google-services.json` (Android)
- [ ] Download `GoogleService-Info.plist` (iOS)

#### Package Installation
```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
```

#### Android Configuration
- [ ] Add `google-services.json` to `android/app/`
- [ ] Apply google-services plugin in `build.gradle`
- [ ] Add Firebase dependencies

#### iOS Configuration (if applicable)
- [ ] Add `GoogleService-Info.plist` to iOS project
- [ ] Configure APNs in Apple Developer Portal
- [ ] Enable Push Notifications capability

### Implementation Checklist

- [ ] Request notification permission on app launch
- [ ] Get FCM token on successful permission
- [ ] Register token with backend API
- [ ] Handle foreground notifications (show in-app toast)
- [ ] Handle background notifications
- [ ] Handle notification tap (deep linking)
- [ ] Re-register token on token refresh
- [ ] Unregister token on logout

### FCM Service

```typescript
// src/services/notifications/fcmService.ts
import messaging from '@react-native-firebase/messaging';

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
      // Show in-app notification toast
    });

    // Background/quit -> tap opens app
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
    } else if (data?.type === 'report_reviewed') {
      navigationRef.navigate('ReportDetail', { reportId: data.report_id });
    }
  }
};
```

---

## Worker Task Screens

### My Tasks Screen

**Path:** `src/screens/worker/MyTasksScreen.tsx`

**Features:**
- Tab filter: Pending | Active | Completed
- Task cards with priority badges
- Pull to refresh
- Empty state for each tab
- Navigate to task detail on tap

**Layout:**
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
└─────────────────────────────────┘
```

**Checklist:**
- [ ] Screen component created
- [ ] Tab navigation (Pending/Active/Completed)
- [ ] Task list with FlatList
- [ ] TaskCard component with priority badge
- [ ] Pull to refresh
- [ ] Loading state
- [ ] Empty state per tab
- [ ] Navigate to TaskDetailScreen

### Task Detail Screen

**Path:** `src/screens/worker/TaskDetailScreen.tsx`

**Features:**
- Full task information display
- Location on mini map
- Accept/Decline buttons (for pending)
- Start button (for accepted)
- Complete button (for in_progress)

**Layout:**
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
│ [DECLINE]       [ACCEPT]        │
└─────────────────────────────────┘
```

**Checklist:**
- [ ] Screen component created
- [ ] Task info display
- [ ] Mini map with location pin
- [ ] Priority badge component
- [ ] Accept button (calls API)
- [ ] Decline button with reason dialog
- [ ] Start button (for accepted tasks)
- [ ] Complete button (navigate to complete screen)
- [ ] Status-based button visibility
- [ ] Loading states for actions
- [ ] Error handling

### Task Complete Screen

**Path:** `src/screens/worker/TaskCompleteScreen.tsx`

**Features:**
- Take completion photo (required)
- Add completion notes
- Submit completion
- Offline queue support

**Layout:**
```
┌─────────────────────────────────┐
│ ←  Complete Task                │
├─────────────────────────────────┤
│ Task: Clean fallen tree         │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Photo preview]             │ │
│ │      📷 Take Photo          │ │
│ └─────────────────────────────┘ │
│                                 │
│ Notes:                          │
│ ┌─────────────────────────────┐ │
│ │ Describe what was done...   │ │
│ └─────────────────────────────┘ │
│                                 │
│ [     SUBMIT COMPLETION      ]  │
└─────────────────────────────────┘
```

**Checklist:**
- [ ] Screen component created
- [ ] Photo capture (camera)
- [ ] Photo preview
- [ ] Notes text input
- [ ] Form validation (photo required)
- [ ] Submit API call
- [ ] Loading state during submission
- [ ] Success navigation (back to tasks)
- [ ] Offline queue if no connection

---

## Supervisor Task Screens

### Tasks Dashboard Screen

**Path:** `src/screens/supervisor/TasksDashboardScreen.tsx`

**Features:**
- All tasks overview
- Filter by status/worker/area
- Task cards with assignment info
- Create task FAB button

**Checklist:**
- [ ] Screen component created
- [ ] Task list with filters
- [ ] Filter by status dropdown
- [ ] Filter by worker dropdown
- [ ] Filter by area dropdown
- [ ] Create task FAB
- [ ] Task cards with worker info
- [ ] Navigate to task detail

### Create Task Screen

**Path:** `src/screens/supervisor/CreateTaskScreen.tsx`

**Features:**
- Task creation form
- Priority selector
- Area/location picker
- Optional worker assignment
- Validation

**Layout:**
```
┌─────────────────────────────────┐
│ ←  Create Task                  │
├─────────────────────────────────┤
│ Title: *                        │
│ ┌─────────────────────────────┐ │
│ │ Task title                  │ │
│ └─────────────────────────────┘ │
│                                 │
│ Description:                    │
│ ┌─────────────────────────────┐ │
│ │ Detailed description...     │ │
│ └─────────────────────────────┘ │
│                                 │
│ Priority: *                     │
│ [Low] [Normal] [High] [Urgent]  │
│                                 │
│ Area: *                         │
│ [Select area ▼]                 │
│                                 │
│ Location (optional):            │
│ [📍 Pick on map]                │
│                                 │
│ Assign to (optional):           │
│ [Select worker ▼]               │
│                                 │
│ [      CREATE TASK          ]   │
└─────────────────────────────────┘
```

**Checklist:**
- [ ] Screen component created
- [ ] Title input (required)
- [ ] Description input
- [ ] Priority selector (4 options)
- [ ] Area dropdown (from API)
- [ ] Location picker (map modal)
- [ ] Worker dropdown (optional)
- [ ] Form validation
- [ ] Submit API call
- [ ] Success feedback and navigation

---

## New Components

### TaskCard

```typescript
// src/components/tasks/TaskCard.tsx
interface TaskCardProps {
  task: Task;
  onPress: () => void;
}
```

### PriorityBadge

```typescript
// src/components/tasks/PriorityBadge.tsx
interface PriorityBadgeProps {
  priority: 'urgent' | 'high' | 'normal' | 'low';
}
```

### TaskStatusBadge

```typescript
// src/components/tasks/TaskStatusBadge.tsx
interface TaskStatusBadgeProps {
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined';
}
```

### TaskActionButtons

```typescript
// src/components/tasks/TaskActionButtons.tsx
interface TaskActionButtonsProps {
  task: Task;
  onAccept: () => void;
  onDecline: () => void;
  onStart: () => void;
  onComplete: () => void;
}
```

---

## API Integration

### Tasks API

```typescript
// src/services/api/tasksApi.ts
export const tasksApi = {
  getMyTasks: () => apiClient.get('/tasks/my-tasks'),
  getAllTasks: (filters: TaskFilters) => apiClient.get('/tasks', { params: filters }),
  getTaskDetail: (id: number) => apiClient.get(`/tasks/${id}`),
  createTask: (data: CreateTaskDto) => apiClient.post('/tasks', data),
  acceptTask: (id: number) => apiClient.post(`/tasks/${id}/accept`),
  declineTask: (id: number, reason?: string) =>
    apiClient.post(`/tasks/${id}/decline`, { reason }),
  startTask: (id: number) => apiClient.post(`/tasks/${id}/start`),
  completeTask: (id: number, data: CompleteTaskDto) =>
    apiClient.post(`/tasks/${id}/complete`, data),
  assignTask: (id: number, workerId: number) =>
    apiClient.post(`/tasks/${id}/assign`, { worker_id: workerId }),
};
```

---

## Navigation Updates

### Worker Navigator

Add Tasks tab to worker bottom navigation:
- [ ] Add TasksScreen to WorkerNavigator
- [ ] Add task icon to bottom tab
- [ ] Create task stack navigator

### Supervisor Navigator

Add Tasks tab to supervisor navigation:
- [ ] Add TasksDashboardScreen
- [ ] Add CreateTaskScreen
- [ ] Stack navigation for task flows

---

## State Management

### Tasks Store

```typescript
// src/store/slices/tasksSlice.ts
interface TasksState {
  myTasks: Task[];
  allTasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
}

// Actions
- fetchMyTasks
- fetchAllTasks
- fetchTaskById
- createTask
- acceptTask
- declineTask
- startTask
- completeTask
```

---

## Testing Requirements

| Feature | Tests |
|---------|-------|
| Task list | Load, filter, empty state |
| Task actions | Accept, decline, start, complete |
| FCM | Token registration, notification handling |
| Deep linking | Navigate to correct screen |
| Offline | Task actions queued when offline |

---

## Success Criteria

1. Workers see assigned tasks in list
2. Workers can accept/decline tasks
3. Workers can complete tasks with photo
4. Push notifications received on assignment
5. Deep linking opens correct task
6. Supervisors can create and assign tasks
7. Offline task queue works correctly

---

## Dependencies

```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
```

---

## Sign-Off

**Developer:** _______________ **Date:** _______________

**Reviewer:** _______________ **Date:** _______________
