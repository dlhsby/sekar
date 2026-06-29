# Phase 2 - Enhanced Features: Testing Plan

---

## Overview

This document outlines the testing requirements for Phase 2 features including task management, push notifications, KMZ import, and web dashboard.

---

## Test Coverage Requirements

| Module | Target Coverage | Priority |
|--------|-----------------|----------|
| Tasks | >80% | High |
| Notifications | >80% | High |
| Import | >80% | Medium |
| Web Dashboard | >70% | Medium |

---

## Backend Unit Tests

### Tasks Module

#### Task Service Tests

```typescript
describe('TasksService', () => {
  // Creation
  it('should create a task with valid data');
  it('should throw BadRequestException for missing required fields');
  it('should set default status to pending');
  it('should set default priority to normal');

  // Retrieval
  it('should return task by ID');
  it('should return 404 for non-existent task');
  it('should list tasks with filters');
  it('should return my-tasks for worker');

  // Assignment
  it('should assign task to worker');
  it('should set assigned_at timestamp');
  it('should throw if worker not found');
  it('should trigger notification on assignment');

  // Workflow - Accept
  it('should accept pending task');
  it('should throw if task not assigned to worker');
  it('should throw if task already accepted');
  it('should set accepted_at timestamp');

  // Workflow - Decline
  it('should decline pending task');
  it('should store decline reason');
  it('should reset assigned_to on decline');

  // Workflow - Start
  it('should start accepted task');
  it('should throw if task not accepted');
  it('should set started_at timestamp');
  it('should change status to in_progress');

  // Workflow - Complete
  it('should complete in_progress task');
  it('should upload completion photo to S3');
  it('should store completion notes');
  it('should set completed_at timestamp');
  it('should throw if task not in_progress');
  it('should throw if no photo provided');
});
```

#### Task Controller Tests

```typescript
describe('TasksController', () => {
  it('POST /tasks - creates task (Supervisor)');
  it('POST /tasks - rejects Worker role');
  it('GET /tasks - lists tasks with filters');
  it('GET /tasks/:id - returns task detail');
  it('POST /tasks/:id/assign - assigns to worker');
  it('POST /tasks/:id/accept - accepts task (Worker)');
  it('POST /tasks/:id/decline - declines task');
  it('POST /tasks/:id/start - starts task');
  it('POST /tasks/:id/complete - completes with photo');
  it('GET /tasks/my-tasks - returns worker tasks');
});
```

### Notifications Module

#### Notification Service Tests

```typescript
describe('NotificationsService', () => {
  // Token Management
  it('should register new FCM token');
  it('should update existing token for device');
  it('should unregister token');
  it('should handle duplicate token gracefully');

  // Send Notifications
  it('should send notification to single user');
  it('should send notification to multiple users');
  it('should handle FCM errors gracefully');
  it('should log sent notification');

  // History
  it('should list user notifications');
  it('should mark notification as read');
  it('should return unread count');
});
```

#### FCM Mock

```typescript
// Mock Firebase Admin for testing
jest.mock('firebase-admin', () => ({
  messaging: () => ({
    send: jest.fn().mockResolvedValue('message-id'),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 2 }),
  }),
}));
```

### Import Module

#### Import Service Tests

```typescript
describe('ImportService', () => {
  // KMZ Parsing
  it('should extract KML from valid KMZ file');
  it('should parse Placemarks from KML');
  it('should extract polygon coordinates');
  it('should handle single point coordinates');
  it('should throw for invalid KMZ file');
  it('should throw for corrupt KMZ');
  it('should validate coordinate ranges');

  // Preview
  it('should return preview of parsed areas');
  it('should cache preview for confirmation');

  // Import
  it('should create areas from confirmed import');
  it('should store polygon as GeoJSON');
  it('should handle partial import selection');
});
```

---

## Mobile Tests

### FCM Service Tests

```typescript
describe('fcmService', () => {
  it('should request permission and return status');
  it('should get FCM token');
  it('should handle foreground messages');
  it('should handle background notification tap');
  it('should deep link to task detail');
  it('should register token with backend');
});
```

### Task Screens Tests

```typescript
describe('MyTasksScreen', () => {
  it('should render task list');
  it('should filter by pending status');
  it('should filter by active status');
  it('should filter by completed status');
  it('should show empty state when no tasks');
  it('should navigate to task detail on press');
  it('should refresh on pull');
});

describe('TaskDetailScreen', () => {
  it('should display task information');
  it('should show map with location');
  it('should show Accept/Decline for pending task');
  it('should show Start for accepted task');
  it('should show Complete for in_progress task');
  it('should call accept API on accept press');
  it('should show decline reason dialog');
});

describe('TaskCompleteScreen', () => {
  it('should require photo');
  it('should show photo preview');
  it('should allow notes input');
  it('should submit completion');
  it('should navigate back on success');
  it('should queue offline if no connection');
});
```

---

## Web Dashboard Tests

### Component Tests

```typescript
describe('StatsCard', () => {
  it('should render title and value');
  it('should show trend indicator');
  it('should handle loading state');
});

describe('WorkerMap', () => {
  it('should render Google Map');
  it('should display worker markers');
  it('should show info popup on marker click');
  it('should update markers on data change');
  it('should filter by area');
});

describe('ReportTable', () => {
  it('should render table with data');
  it('should sort by columns');
  it('should paginate results');
  it('should filter by date range');
  it('should filter by area');
  it('should export to CSV');
});
```

### Page Tests

```typescript
describe('Login Page', () => {
  it('should render login form');
  it('should validate required fields');
  it('should call login API on submit');
  it('should redirect to dashboard on success');
  it('should show error on invalid credentials');
  it('should reject worker role');
});

describe('Dashboard Page', () => {
  it('should render stats cards');
  it('should fetch dashboard data');
  it('should show loading state');
  it('should handle API errors');
});
```

---

## Integration Tests

### Backend-Mobile Integration

```typescript
describe('Task Workflow Integration', () => {
  it('should complete full task lifecycle');
  // 1. Supervisor creates task
  // 2. Supervisor assigns to worker
  // 3. Worker receives notification
  // 4. Worker accepts task
  // 5. Worker starts task
  // 6. Worker completes with photo
  // 7. Task marked as completed
});

describe('Push Notification Integration', () => {
  it('should deliver notification on task assignment');
  // 1. Worker registers FCM token
  // 2. Supervisor assigns task
  // 3. Worker receives push notification
  // 4. Worker taps notification
  // 5. App opens to task detail
});
```

### Backend-Web Integration

```typescript
describe('Web Dashboard Integration', () => {
  it('should login and access dashboard');
  it('should display live worker locations');
  it('should list and filter reports');
  it('should show attendance data');
});
```

---

## E2E Tests

### Mobile E2E (Detox)

```typescript
describe('Task E2E', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsWorker();
  });

  it('should complete task workflow', async () => {
    // Navigate to tasks
    await element(by.id('tasks-tab')).tap();

    // View pending task
    await element(by.id('task-card-1')).tap();

    // Accept task
    await element(by.id('accept-button')).tap();
    await expect(element(by.text('Task accepted'))).toBeVisible();

    // Start task
    await element(by.id('start-button')).tap();

    // Complete task
    await element(by.id('complete-button')).tap();
    await element(by.id('take-photo-button')).tap();
    await element(by.id('submit-completion')).tap();

    // Verify completion
    await expect(element(by.text('Task completed'))).toBeVisible();
  });
});
```

### Web E2E (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E', () => {
  test('should login and view dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'supervisor1');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should view worker map', async ({ page }) => {
    await loginAsSupervisor(page);
    await page.click('a[href="/map"]');

    await expect(page.locator('.google-map')).toBeVisible();
    await expect(page.locator('.worker-marker')).toHaveCount(greaterThan(0));
  });
});
```

---

## Performance Tests

### API Performance

| Endpoint | Target Response Time | Load |
|----------|---------------------|------|
| GET /tasks | <200ms | 100 concurrent |
| POST /tasks | <300ms | 50 concurrent |
| POST /tasks/:id/complete | <500ms | 50 concurrent |
| GET /notifications | <200ms | 100 concurrent |

### Load Testing Script

```bash
# Using k6 or similar
k6 run --vus 100 --duration 60s load-test.js
```

---

## Test Data

### Seed Data for Testing

```typescript
// test/fixtures/tasks.fixture.ts
export const testTasks = [
  {
    id: 1,
    title: 'Test Task - Pending',
    priority: 'normal',
    status: 'pending',
    area_id: 1,
  },
  {
    id: 2,
    title: 'Test Task - Accepted',
    priority: 'high',
    status: 'accepted',
    assigned_to: 2,
    area_id: 1,
  },
  // ... more test tasks
];
```

### Mock KMZ File

```
tests/fixtures/test-area.kmz
- Contains 3 Placemarks with polygon coordinates
- Used for import module testing
```

---

## Acceptance Criteria

### Tasks Feature
- [ ] Supervisor can create task via API
- [ ] Supervisor can assign task to worker
- [ ] Worker sees task in my-tasks list
- [ ] Worker can accept/decline task
- [ ] Worker can complete task with photo
- [ ] Status transitions are validated
- [ ] All tests pass with >80% coverage

### Notifications Feature
- [ ] Worker can register FCM token
- [ ] Worker receives push notification on assignment
- [ ] Notification appears in notification list
- [ ] Deep linking opens correct screen
- [ ] Tests pass with >80% coverage

### Import Feature
- [ ] Admin can upload KMZ file
- [ ] Preview shows parsed areas
- [ ] Areas created on confirmation
- [ ] Polygon boundaries stored correctly
- [ ] Tests pass with >80% coverage

### Web Dashboard
- [ ] Supervisor can login
- [ ] Dashboard shows accurate stats
- [ ] Map displays live worker locations
- [ ] Reports can be filtered and viewed
- [ ] Tests pass with >70% coverage

---

## Sign-Off

| Test Type | Tester | Date | Status |
|-----------|--------|------|--------|
| Unit Tests (Backend) | | | |
| Unit Tests (Mobile) | | | |
| Unit Tests (Web) | | | |
| Integration Tests | | | |
| E2E Tests | | | |
| Performance Tests | | | |
| UAT | | | |

---

**Last Updated:** 2026-01-16
