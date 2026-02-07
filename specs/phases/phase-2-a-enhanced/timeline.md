# Phase 2 - Enhanced Features: Timeline

**Total Duration:** 3 weeks (15 working days)
**Start Date:** After Phase 1 MVP deployment

---

## Overview

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | Backend + Mobile FCM | Tasks module, notifications, FCM setup |
| Week 2 | Mobile Tasks + Web Setup | Task screens, web dashboard foundation |
| Week 3 | KMZ Import + Polish | Import module, testing, deployment |

---

## Week 1: Backend & Mobile FCM

### Day 1: Tasks Module - Part 1

**Backend:**
- [ ] Create tasks module structure
- [ ] Task entity with TypeORM decorators
- [ ] CreateTaskDto, UpdateTaskDto with validation
- [ ] AssignTaskDto, CompleteTaskDto
- [ ] Basic CRUD endpoints (create, list, get, update, delete)

**Deliverables:**
- Task entity created
- Basic CRUD API working

---

### Day 2: Tasks Module - Part 2

**Backend:**
- [ ] Task assignment endpoint
- [ ] Task workflow endpoints (accept, decline, start, complete)
- [ ] My-tasks endpoint for workers
- [ ] Status transition validation
- [ ] S3 upload for completion photos

**Deliverables:**
- Complete task workflow API
- Photo upload working

---

### Day 3: Notifications Module

**Backend:**
- [ ] Firebase Admin SDK setup
- [ ] NotificationToken entity
- [ ] Register/unregister token endpoints
- [ ] SendNotification service method
- [ ] Notification history endpoints
- [ ] Mark as read endpoint

**Deliverables:**
- FCM integration ready
- Token management working

---

### Day 4: Backend Integration & Testing

**Backend:**
- [ ] Trigger notification on task assignment
- [ ] Unit tests for tasks module (>80% coverage)
- [ ] Unit tests for notifications module (>80% coverage)
- [ ] API documentation (Swagger)
- [ ] Integration testing

**Deliverables:**
- >80% test coverage for new modules
- API docs updated

---

### Day 5: Mobile FCM Setup

**Mobile:**
- [ ] Install @react-native-firebase packages
- [ ] Configure Firebase for Android
- [ ] Request notification permissions
- [ ] Get and register FCM token
- [ ] Handle foreground notifications
- [ ] Handle background notifications
- [ ] Deep linking setup

**Deliverables:**
- Push notifications working on Android

---

## Week 2: Mobile Tasks & Web Dashboard

### Day 6: Worker Task Screens - Part 1

**Mobile:**
- [ ] TaskCard component
- [ ] PriorityBadge component
- [ ] TaskStatusBadge component
- [ ] MyTasksScreen with tab filter
- [ ] Tasks API service

**Deliverables:**
- Workers can view task list

---

### Day 7: Worker Task Screens - Part 2

**Mobile:**
- [ ] TaskDetailScreen
- [ ] Mini map integration
- [ ] Accept/decline actions
- [ ] Start task action
- [ ] Loading and error states

**Deliverables:**
- Workers can view task details and accept/decline

---

### Day 8: Task Completion & Supervisor Screens

**Mobile:**
- [ ] TaskCompleteScreen
- [ ] Photo capture for completion
- [ ] Complete task API call
- [ ] TasksDashboardScreen (Supervisor)
- [ ] CreateTaskScreen (Supervisor)
- [ ] Navigation updates

**Deliverables:**
- Complete task workflow on mobile

---

### Day 9: Web Dashboard - Setup & Auth

**Web:**
- [ ] Next.js project initialization
- [ ] TailwindCSS and Shadcn/ui setup
- [ ] API client configuration
- [ ] Login page
- [ ] Auth middleware
- [ ] Main layout with sidebar

**Deliverables:**
- Web project scaffolded
- Login working

---

### Day 10: Web Dashboard - Core Pages

**Web:**
- [ ] Dashboard overview page
- [ ] StatsCard components
- [ ] Live worker map page
- [ ] Google Maps integration
- [ ] Worker markers with popups

**Deliverables:**
- Dashboard and map pages functional

---

## Week 3: KMZ Import & Polish

### Day 11: Web Dashboard - Reports & Attendance

**Web:**
- [ ] Reports list page with table
- [ ] Report filters (date, area, condition)
- [ ] Report detail modal
- [ ] Attendance view page
- [ ] Export to CSV

**Deliverables:**
- Complete web dashboard pages

---

### Day 12: KMZ Import Module - Part 1

**Backend:**
- [ ] Import module structure
- [ ] KMZ file upload endpoint
- [ ] KMZ extraction (jszip)
- [ ] KML parsing (xml2js)
- [ ] Extract Placemark coordinates

**Deliverables:**
- KMZ parsing working

---

### Day 13: KMZ Import Module - Part 2

**Backend:**
- [ ] Preview parsed areas endpoint
- [ ] Confirm import endpoint
- [ ] Area creation with polygon boundaries
- [ ] Update Area entity for polygon
- [ ] GPS validation with polygon (point-in-polygon)

**Deliverables:**
- Complete KMZ import flow

---

### Day 14: Testing & Bug Fixes

**All:**
- [ ] Integration testing (backend-mobile)
- [ ] Integration testing (backend-web)
- [ ] Unit test coverage check (>80%)
- [ ] Bug fixes from testing
- [ ] Performance testing
- [ ] Load testing (500 workers simulation)

**Deliverables:**
- All integration tests passing
- Performance benchmarks met

---

### Day 15: Deployment & Documentation

**All:**
- [ ] Deploy backend updates
- [ ] Deploy web dashboard
- [ ] Build new mobile APK
- [ ] Update API documentation
- [ ] User guides for new features
- [ ] KMZ import guide
- [ ] Demo and handover

**Deliverables:**
- Phase 2 deployed to production
- Documentation complete

---

## Parallel Work Streams

```
Week 1:
Backend: Tasks → Notifications → Testing
Mobile:  ─────────────────────→ FCM Setup

Week 2:
Mobile:  Task Screens (Worker) → Task Screens (Supervisor)
Web:     ─────────────────────→ Setup → Dashboard

Week 3:
Backend: KMZ Import → Testing → Deploy
Mobile:  Bug Fixes → APK Build → Deploy
Web:     Reports → Attendance → Deploy
```

---

## Dependencies

| Task | Depends On |
|------|------------|
| Mobile FCM | Firebase project setup |
| Mobile Task screens | Backend tasks module |
| Mobile notifications | Backend notifications module |
| Web dashboard | Backend API operational |
| KMZ import UI | Import module backend |

---

## Risk Mitigation

| Risk | Mitigation | Day |
|------|------------|-----|
| FCM configuration issues | Start FCM setup early, test on real device | Day 5 |
| KMZ parsing edge cases | Test with multiple real DLH files | Day 12 |
| Web dashboard delays | Scope limited to view-only | Day 9-11 |
| Integration issues | Dedicated integration testing day | Day 14 |

---

## Milestones

| Milestone | Target Day | Success Criteria |
|-----------|------------|------------------|
| Tasks API Complete | Day 4 | All endpoints working, >80% coverage |
| Push Notifications Working | Day 5 | Android receives test notification |
| Mobile Task Workflow Complete | Day 8 | Worker can accept/complete task |
| Web Dashboard Live | Day 11 | Supervisor can login and view map |
| KMZ Import Working | Day 13 | Can import polygon from KMZ file |
| Phase 2 Deployed | Day 15 | All features in production |

---

## Daily Standup Questions

1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers or concerns?
4. Is the timeline still realistic?

---

**Last Updated:** 2026-01-16
