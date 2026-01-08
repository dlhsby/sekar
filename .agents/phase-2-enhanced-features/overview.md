# Phase 2 - Enhanced Features & Web Dashboard

## 🎯 Objectives
Expand the system based on MVP feedback with:
- Task assignment system
- Web dashboard for supervisors
- Push notifications
- KMZ file import
- Enhanced analytics

**Timeline:** 2-3 weeks
**Prerequisites:** Phase 1 MVP deployed and pilot feedback gathered

## 🎨 New Features

### 1. Task Assignment System
**Description:** Supervisors can assign urgent tasks to nearby workers

**Features:**
- Create task with description, location, priority
- Assign to specific worker or nearest available
- Push notification to assigned worker
- Worker can accept/decline/complete task
- Track task status and completion time
- Photo evidence upon task completion

**Database Changes:**
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20), -- 'urgent', 'high', 'normal', 'low'
  area_id INT REFERENCES areas(id),
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  assigned_to INT REFERENCES users(id),
  assigned_by INT REFERENCES users(id),
  assigned_at TIMESTAMP,
  status VARCHAR(20), -- 'pending', 'accepted', 'in_progress', 'completed', 'declined'
  accepted_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  completion_photo_url TEXT,
  completion_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Web Dashboard (Next.js)
**Description:** Browser-based dashboard for supervisors

**Features:**
- Same features as mobile supervisor app
- Better for large screen usage
- Real-time updates
- Export capabilities (CSV, PDF)
- Better analytics visualization
- Multi-area view

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Google Maps JavaScript API
- Chart.js or Recharts for analytics
- SWR or React Query for data fetching

**Pages:**
- `/login` - Authentication
- `/dashboard` - Overview with key metrics
- `/map` - Live worker map
- `/reports` - Reports list with filters
- `/attendance` - Attendance tracking
- `/tasks` - Task management
- `/analytics` - Analytics and insights
- `/settings` - Settings and configuration

### 3. Push Notifications
**Description:** Real-time notifications for important events

**Use Cases:**
- Worker receives task assignment
- Supervisor notified of urgent report
- Worker reminded to clock-out
- System maintenance notifications

**Tech Stack:**
- Firebase Cloud Messaging (FCM)
- Backend: FCM Admin SDK
- Mobile: @react-native-firebase/messaging

**Notification Types:**
- Task assigned
- Task reminder
- Shift reminder (clock-out)
- Report reviewed
- System announcements

### 4. KMZ File Import
**Description:** Import area boundaries from KMZ files

**Features:**
- Upload KMZ file with area boundaries
- Parse KML/KMZ coordinates
- Create/update areas from file
- Preview on map before import
- Validate GPS coordinates
- Bulk import multiple areas

**Implementation:**
- Backend: Parse KMZ using `jszip` and `xml2js`
- Extract coordinates and metadata
- Create area records in database
- Support polygon boundaries (not just radius)

**Database Changes:**
```sql
-- Add polygon support
ALTER TABLE areas ADD COLUMN boundary_polygon JSONB;
-- Store GeoJSON polygon
```

### 5. Enhanced Analytics
**Description:** Better insights into worker performance and area conditions

**Metrics:**
- Attendance rate by worker, area, area type
- Average shift duration
- Reports per worker per day
- Response time to tasks
- Area coverage heatmap
- Condition trend analysis
- Supervisor drive time reduction

**Visualizations:**
- Line charts (trends over time)
- Bar charts (comparisons)
- Heatmaps (area coverage)
- Pie charts (distribution)
- Tables (detailed data)

**Features:**
- Date range selection
- Export charts as images
- Export data as CSV/PDF
- Schedule automated reports (email)

---

## 🏗️ Architecture Updates

### Backend (NestJS)
**New Modules:**
- `tasks/` - Task management
- `notifications/` - Push notifications
- `analytics/` - Analytics queries
- `import/` - KMZ import functionality

### Web Dashboard (Next.js)
```
sekar-web/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── map/
│   │   ├── reports/
│   │   ├── attendance/
│   │   ├── tasks/
│   │   ├── analytics/
│   │   └── settings/
│   ├── api/
│   └── layout.tsx
├── components/
├── lib/
├── public/
└── styles/
```

### Mobile App Updates
**New Screens:**
- Task list screen (Worker)
- Task detail screen (Worker)
- Task creation screen (Supervisor)
- Enhanced analytics screen

**New Services:**
- FCM notification service
- Task API service

---

## 📅 Development Timeline (3 weeks)

### Week 1: Web Dashboard Foundation
**Day 1-2:**
- [ ] Next.js project setup
- [ ] Authentication pages
- [ ] Layout and navigation
- [ ] API client setup

**Day 3-4:**
- [ ] Dashboard overview page
- [ ] Live map page
- [ ] Reports list page
- [ ] Attendance page

**Day 5:**
- [ ] Responsive design
- [ ] Unit tests for components
- [ ] Deploy to AWS (Amplify or S3+CloudFront)

### Week 2: Task Assignment & Notifications
**Day 6-7:**
- [ ] Tasks backend module (NestJS)
- [ ] Task API endpoints
- [ ] Database migrations
- [ ] Unit tests (>80% coverage)

**Day 8-9:**
- [ ] Push notifications setup (FCM)
- [ ] Notification service (backend)
- [ ] Mobile app notification handling
- [ ] Task screens (mobile - worker & supervisor)

**Day 10:**
- [ ] Task screens (web dashboard)
- [ ] Integration testing
- [ ] End-to-end task workflow test

### Week 3: KMZ Import & Analytics
**Day 11-12:**
- [ ] KMZ import module (backend)
- [ ] File upload endpoint
- [ ] KMZ parsing logic
- [ ] Import UI (web dashboard)

**Day 13-14:**
- [ ] Analytics module (backend)
- [ ] Analytics queries optimization
- [ ] Analytics page (web dashboard)
- [ ] Charts and visualizations

**Day 15:**
- [ ] Enhanced analytics (mobile)
- [ ] Export functionality (CSV, PDF)
- [ ] Integration testing
- [ ] Performance testing

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Task creation and assignment
- [ ] Push notification sending
- [ ] KMZ file parsing
- [ ] Analytics query performance
- [ ] All new modules: >80% coverage

### Web Dashboard Tests
- [ ] Component unit tests
- [ ] Page navigation
- [ ] Form validations
- [ ] API integration
- [ ] Responsive design

### Mobile App Tests
- [ ] Task acceptance workflow
- [ ] Push notification reception
- [ ] Task completion with photo
- [ ] Notification deep-linking

### Integration Tests
- [ ] End-to-end task assignment
- [ ] Real-time updates on web dashboard
- [ ] KMZ import to area creation
- [ ] Analytics data accuracy

---

## 📦 Deliverables

### Code
- [ ] Updated backend with new modules
- [ ] Web dashboard application
- [ ] Updated mobile app with tasks
- [ ] Database migrations

### Documentation
- [ ] API documentation updates
- [ ] Web dashboard user guide
- [ ] Task management guide
- [ ] KMZ import guide

### Deployment
- [ ] Web dashboard deployed
- [ ] Backend updated in production
- [ ] Mobile app updated (new APK)
- [ ] FCM configured

---

## ✅ Success Criteria

1. ✅ Supervisors can assign tasks from web/mobile
2. ✅ Workers receive push notifications
3. ✅ Workers can complete tasks with photo evidence
4. ✅ Web dashboard is fully functional
5. ✅ KMZ files can be imported successfully
6. ✅ Analytics provide actionable insights
7. ✅ All new code has >80% test coverage
8. ✅ System handles 500 workers, 50 areas

---

## 💡 Considerations

### Performance
- Web dashboard should load map with 500+ workers
- Analytics queries optimized with database indexes
- Real-time updates via WebSocket or polling

### Scalability
- Task assignment algorithm for nearest worker
- Notification batching for system announcements
- Database partitioning for location_pings table

### User Experience
- Web dashboard matches mobile app UX
- Smooth transitions and loading states
- Clear error messages
- Keyboard shortcuts for web dashboard

---

## 🔄 Feedback Loop
After Phase 2:
- Gather feedback from supervisors on web dashboard
- Analyze task completion times
- Evaluate notification effectiveness
- Plan Phase 3 based on insights

