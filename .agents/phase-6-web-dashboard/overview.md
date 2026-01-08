# Phase 6 - Web Dashboard (Next.js)

## 🎯 Objectives
Build a comprehensive web dashboard for supervisors and administrators using Next.js.

**Timeline:** 3-4 weeks  
**Prerequisites:** Phase 1 MVP deployed, backend API operational

## 🌐 Why Web Dashboard?

### Advantages Over Mobile for Supervisors
- **Larger screen** - Better for data analysis and multi-area overview
- **Desktop productivity** - Keyboard shortcuts, multiple windows
- **Better for reports** - Export capabilities, printing
- **Analytics visualization** - Charts and graphs more readable
- **Bulk operations** - Easier to manage multiple workers/areas
- **File management** - Upload KMZ files, bulk imports

### Use Cases
1. **Office-based supervisors** reviewing daily reports
2. **Managers** analyzing performance across multiple areas
3. **Administrators** managing users, areas, and assignments
4. **Report generation** for stakeholders
5. **Data export** for external systems

---

## 🎨 Features Overview

### 1. Dashboard & Analytics
**Pages:**
- Overview dashboard with KPIs
- Real-time statistics
- Charts and visualizations
- Quick actions panel

**Features:**
- Total workers active today
- Total areas covered
- Reports submitted today
- Average attendance rate
- Response time metrics
- Area condition trends
- Interactive charts (Chart.js or Recharts)

### 2. Live Worker Map
**Features:**
- Google Maps integration
- Real-time worker locations
- Color-coded markers by area type
- Worker info popup on click
- Filter by area, area type, status
- Auto-refresh (configurable interval)
- Cluster markers for performance
- Search workers by name

### 3. Reports Management
**Features:**
- Reports list with advanced filters
- Sortable columns
- Bulk actions (mark as reviewed, export)
- Report detail view with lightbox
- Image gallery
- Video player
- GPS location on map
- Export filtered results (CSV, PDF)
- Print view

### 4. Attendance & Time Tracking
**Features:**
- Daily attendance overview
- Calendar view
- Worker time sheets
- Late clock-ins tracking
- Early clock-outs tracking
- Hours worked summary
- Export attendance reports
- Payroll data export

### 5. Worker Management
**Features:**
- Worker list (CRUD)
- Worker profiles
- Area assignments
- Performance metrics per worker
- Work history
- Attendance records
- Reports submitted

### 6. Area Management
**Features:**
- Area list (CRUD)
- Area types management
- GPS boundaries configuration
- KMZ file import
- Area details with workers
- Area performance metrics
- Map view of all areas

### 7. User & Role Management (Admin)
**Features:**
- User accounts management
- Role-based access control
- Create supervisor accounts
- Reset passwords
- Activity logs
- Permission management

### 8. Analytics & Insights
**Features:**
- Worker performance leaderboard
- Area condition trends
- Attendance rate over time
- Peak activity hours
- Response time analysis
- Custom date ranges
- Comparative analysis
- Predictive insights

### 9. Report Builder
**Features:**
- Custom report templates
- Select metrics and filters
- Schedule automated reports
- Email delivery
- Save report configurations
- Export options (PDF, Excel, CSV)

### 10. Settings & Configuration
**Features:**
- System settings
- GPS boundary radius
- Location tracking interval
- Notification preferences
- Map settings
- Theme customization
- Language settings (ID/EN)

---

## 🏗️ Technical Architecture

### Tech Stack

#### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI Library:** TailwindCSS
- **Component Library:** Shadcn/ui or MUI
- **State Management:** Zustand or React Context
- **Data Fetching:** TanStack Query (React Query)
- **Maps:** Google Maps JavaScript API
- **Charts:** Chart.js or Recharts
- **Tables:** TanStack Table
- **Forms:** React Hook Form + Zod
- **Date Pickers:** date-fns + react-day-picker

#### Backend Integration
- REST API from NestJS backend
- JWT authentication
- WebSocket for real-time updates (optional)
- Server-side rendering for SEO
- API route handlers for server actions

#### Deployment
- **Hosting:** AWS Amplify or Vercel
- **CDN:** CloudFront
- **Environment:** Production, Staging, Development

### Project Structure

```
fe/web/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard overview
│   │   ├── map/
│   │   │   └── page.tsx               # Live worker map
│   │   ├── reports/
│   │   │   ├── page.tsx               # Reports list
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Report detail
│   │   ├── attendance/
│   │   │   └── page.tsx               # Attendance tracking
│   │   ├── workers/
│   │   │   ├── page.tsx               # Workers list
│   │   │   ├── new/
│   │   │   │   └── page.tsx           # Create worker
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # Worker detail
│   │   │       └── edit/
│   │   │           └── page.tsx       # Edit worker
│   │   ├── areas/
│   │   │   ├── page.tsx               # Areas list
│   │   │   ├── new/
│   │   │   │   └── page.tsx           # Create area
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # Area detail
│   │   │       └── edit/
│   │   │           └── page.tsx       # Edit area
│   │   ├── users/
│   │   │   └── page.tsx               # User management
│   │   ├── analytics/
│   │   │   └── page.tsx               # Analytics dashboard
│   │   ├── settings/
│   │   │   └── page.tsx               # Settings
│   │   └── profile/
│   │       └── page.tsx               # User profile
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts           # NextAuth configuration
│   └── layout.tsx                      # Root layout
├── components/
│   ├── ui/                             # Shadcn/ui components
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── StatsCard.tsx
│   │   └── RecentActivity.tsx
│   ├── map/
│   │   ├── WorkerMap.tsx
│   │   ├── WorkerMarker.tsx
│   │   └── MapControls.tsx
│   ├── reports/
│   │   ├── ReportCard.tsx
│   │   ├── ReportFilters.tsx
│   │   ├── ReportTable.tsx
│   │   └── ReportDetail.tsx
│   ├── charts/
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── PieChart.tsx
│   │   └── AreaChart.tsx
│   └── forms/
│       ├── WorkerForm.tsx
│       ├── AreaForm.tsx
│       └── UserForm.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts                  # Axios/Fetch client
│   │   ├── auth.ts
│   │   ├── workers.ts
│   │   ├── areas.ts
│   │   ├── reports.ts
│   │   └── analytics.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useWorkers.ts
│   │   ├── useReports.ts
│   │   └── useAnalytics.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── gps.ts
│   │   └── export.ts
│   └── types/
│       ├── api.ts
│       └── models.ts
├── public/
│   ├── images/
│   └── icons/
├── styles/
│   └── globals.css
├── middleware.ts                       # Auth middleware
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 📅 Development Timeline (4 weeks)

### Week 1: Foundation & Core Pages

**Day 1-2: Project Setup**
- [ ] Next.js project initialization
- [ ] TailwindCSS setup
- [ ] Shadcn/ui or MUI installation
- [ ] Project structure creation
- [ ] TypeScript configuration
- [ ] API client setup
- [ ] Authentication flow

**Day 3-4: Dashboard & Layout**
- [ ] Main layout with sidebar
- [ ] Header with user menu
- [ ] Dashboard overview page
- [ ] Stats cards
- [ ] Recent activity feed
- [ ] Quick actions

**Day 5: Authentication**
- [ ] Login page
- [ ] Auth middleware
- [ ] Protected routes
- [ ] Session management
- [ ] Logout functionality

### Week 2: Worker Management & Maps

**Day 6-7: Worker Management**
- [ ] Workers list page
- [ ] Worker detail page
- [ ] Create/edit worker forms
- [ ] Area assignment interface
- [ ] Worker search and filters
- [ ] Pagination

**Day 8-9: Live Map**
- [ ] Google Maps integration
- [ ] Worker markers
- [ ] Real-time updates
- [ ] Marker clustering
- [ ] Info popups
- [ ] Map controls and filters

**Day 10: Areas Management**
- [ ] Areas list page
- [ ] Area detail page
- [ ] Create/edit area forms
- [ ] KMZ file upload
- [ ] GPS boundaries visualization

### Week 3: Reports & Attendance

**Day 11-12: Reports Management**
- [ ] Reports list with filters
- [ ] Report detail page
- [ ] Image lightbox
- [ ] Video player
- [ ] Bulk actions
- [ ] Export functionality

**Day 13-14: Attendance**
- [ ] Attendance overview
- [ ] Calendar view
- [ ] Time sheets
- [ ] Export reports
- [ ] Analytics integration

**Day 15: Analytics Dashboard**
- [ ] Charts implementation
- [ ] Performance metrics
- [ ] Trend analysis
- [ ] Custom date ranges
- [ ] Export charts

### Week 4: Advanced Features & Polish

**Day 16-17: User Management & Settings**
- [ ] User management (admin)
- [ ] Role-based access control
- [ ] Settings page
- [ ] System configuration
- [ ] Profile management

**Day 18-19: Report Builder**
- [ ] Custom report templates
- [ ] Report scheduling
- [ ] Email delivery setup
- [ ] Template management

**Day 20-21: Testing & Optimization**
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Accessibility audit
- [ ] Browser compatibility testing

**Day 22: Deployment**
- [ ] Build production bundle
- [ ] Deploy to AWS Amplify/Vercel
- [ ] Configure environment variables
- [ ] Setup CI/CD
- [ ] Documentation

---

## 🎨 UI/UX Design

### Design Principles
- **Clean & Professional** - Government-appropriate design
- **Data-Dense** - Maximize information display
- **Responsive** - Works on desktop, tablet, mobile
- **Fast** - Optimized loading and interactions
- **Accessible** - WCAG 2.1 AA compliant

### Color Scheme
- **Primary:** Green (#2E7D32) - Consistent with mobile
- **Secondary:** Blue (#1976D2)
- **Background:** White (#FFFFFF)
- **Surface:** Gray 100 (#F5F5F5)
- **Text:** Gray 900 (#212121)
- **Border:** Gray 300 (#E0E0E0)

### Layout
- **Sidebar:** 240px width, collapsible
- **Header:** 64px height with breadcrumbs
- **Content:** Fluid width with max-width container
- **Cards:** Shadow elevation, rounded corners
- **Tables:** Striped rows, hover states

### Components
- **Buttons:** Large click targets, loading states
- **Forms:** Inline validation, error messages
- **Tables:** Sortable, filterable, paginated
- **Charts:** Interactive, tooltips, legends
- **Modals:** Centered, backdrop blur

---

## 🧪 Testing Requirements

### Unit Tests
- Component tests (React Testing Library)
- Utility function tests
- Hook tests
- API client tests
- Target: >80% coverage

### Integration Tests
- Page navigation
- Form submissions
- API integrations
- Authentication flow

### E2E Tests (Playwright/Cypress)
- Login flow
- Create worker flow
- View reports flow
- Export data flow
- Admin operations

### Performance Tests
- Lighthouse scores (>90)
- Page load times (<2s)
- Time to Interactive (<3s)
- Large dataset handling (1000+ rows)

---

## 🔒 Security

### Authentication
- JWT token-based auth
- HttpOnly cookies for session
- CSRF protection
- Secure password handling

### Authorization
- Role-based access control
- Route protection
- API permission checks
- Audit logging

### Data Protection
- Input sanitization
- XSS prevention
- SQL injection prevention (backend)
- HTTPS only
- Environment variables for secrets

---

## 📦 Deliverables

### Code
- [ ] Next.js web application
- [ ] Component library
- [ ] API client
- [ ] Test suite
- [ ] Storybook (optional)

### Documentation
- [ ] Setup guide
- [ ] User manual
- [ ] API integration guide
- [ ] Deployment guide
- [ ] Component documentation

### Deployment
- [ ] Production build
- [ ] Staging environment
- [ ] CI/CD pipeline
- [ ] Environment configuration
- [ ] Monitoring setup

---

## ✅ Success Criteria

1. ✅ Supervisors can view all workers on map
2. ✅ Reports can be filtered and exported
3. ✅ Attendance tracking is accurate
4. ✅ Page load times <2 seconds
5. ✅ Works on all modern browsers
6. ✅ Mobile responsive
7. ✅ WCAG 2.1 AA compliant
8. ✅ >80% test coverage
9. ✅ Zero critical security vulnerabilities
10. ✅ Successfully deployed to production

---

## 🚨 Known Limitations (Phase 6)

**Acceptable for Phase 6:**
- No real-time WebSocket (polling instead)
- Basic report builder (advanced features in Phase 7)
- Limited mobile optimization (focus on desktop)
- No offline support
- English UI only (Indonesian in Phase 7)

**Will be addressed in future:**
- Advanced analytics (ML/AI)
- Custom dashboard builder
- White-label support
- API rate limiting
- Advanced caching strategies

---

## 🔄 Integration with Mobile App

### API Compatibility
- Uses same backend API endpoints
- Same authentication mechanism
- Consistent data models
- Shared validation rules

### Feature Parity
- All supervisor mobile features available
- Additional desktop-specific features
- Better analytics and reporting
- Bulk operations support

---

## 💡 Advanced Features (Optional)

### Real-time Updates
- WebSocket for live data
- Server-Sent Events (SSE)
- Optimistic UI updates

### Advanced Analytics
- Heatmaps
- Predictive analytics
- Machine learning insights
- Custom dashboards

### Collaboration
- Multi-user real-time editing
- Comments on reports
- Activity feed
- Notifications

---

## 📞 Support & Maintenance

### Post-Launch
- Monitor performance metrics
- Gather user feedback
- Fix critical bugs within 24h
- Regular security updates
- Feature enhancements

### Training
- User training sessions
- Video tutorials
- Documentation
- FAQ section
- Admin guide

---

*Last updated: January 2026*  
*Phase: 6 - Web Dashboard*  
*Tech Stack: Next.js 15, TypeScript, TailwindCSS*

