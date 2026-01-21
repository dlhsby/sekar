# Phase 6 - Full Web Dashboard: Timeline

**Total Duration:** 3 weeks (15 working days)
**Start Date:** After Phase 5 deployment

---

## Overview

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | CRUD Operations | Users, Areas, Assets management |
| Week 2 | Reporting & Config | Report builder, settings |
| Week 3 | Audit & Polish | Audit log, testing, deployment |

---

## Week 1: CRUD Operations

### Day 1: User Management - List & Create

**Web:**
- [ ] Users list page layout
- [ ] Users data table with TanStack Table
- [ ] Filter by role
- [ ] Filter by area
- [ ] Filter by status
- [ ] Search functionality
- [ ] Add user modal
- [ ] Form validation
- [ ] API integration

**Deliverables:**
- Users list displays with filters
- Can create new users

---

### Day 2: User Management - Edit & Detail

**Web:**
- [ ] Edit user modal
- [ ] Delete user with confirmation
- [ ] User detail page
- [ ] Profile summary
- [ ] Area assignment
- [ ] Password reset
- [ ] Activity history
- [ ] Bulk selection

**Deliverables:**
- Full user CRUD complete
- User detail page functional

---

### Day 3: Area Management - List & Map

**Web:**
- [ ] Areas list page
- [ ] Areas map view (Leaflet)
- [ ] Filter by type
- [ ] Search functionality
- [ ] Area markers on map
- [ ] Map clustering (if many areas)

**Backend:**
- [ ] Audit interceptor setup
- [ ] Basic audit logging

**Deliverables:**
- Areas list and map view working

---

### Day 4: Area Management - Editor

**Web:**
- [ ] Add area modal
- [ ] AreaMapEditor component
- [ ] GPS coordinate picker
- [ ] Radius slider
- [ ] Edit area modal
- [ ] Delete area
- [ ] Assigned workers section

**Deliverables:**
- Full area CRUD with map editing

---

### Day 5: Asset Management Enhancement

**Web:**
- [ ] Enhance asset list (from Phase 4)
- [ ] Asset type management page
- [ ] Create asset type
- [ ] Edit asset type
- [ ] Delete asset type
- [ ] QR batch printing improvements

**Deliverables:**
- Asset type management complete

---

### Day 6: Bulk Import

**Web:**
- [ ] Bulk import page layout
- [ ] CSVImporter component
- [ ] Drag & drop file upload
- [ ] Template downloads (users, areas, assets)
- [ ] CSV preview
- [ ] Validation display

**Backend:**
- [ ] Bulk import endpoints
- [ ] CSV parsing service
- [ ] Import validation logic

**Deliverables:**
- Can import users/areas/assets from CSV

---

### Day 7: Bulk Export

**Web:**
- [ ] Export section UI
- [ ] Entity selection
- [ ] Format selection (CSV, Excel)
- [ ] Filter options
- [ ] Download progress

**Backend:**
- [ ] Export endpoints
- [ ] CSV generation
- [ ] Excel generation (ExcelJS)

**Deliverables:**
- Can export data to CSV/Excel

---

## Week 2: Reporting & Configuration

### Day 8: Report Builder - Foundation

**Web:**
- [ ] Report builder page layout
- [ ] Report type selector
- [ ] Date range picker
- [ ] Filter configuration panel
- [ ] Column selection checkboxes

**Deliverables:**
- Report builder UI structure

---

### Day 9: Report Builder - Generation

**Web:**
- [ ] Column ordering (drag & drop)
- [ ] Live preview section
- [ ] Preview data table
- [ ] Generate PDF button
- [ ] Generate CSV button
- [ ] Generate Excel button
- [ ] Download handling

**Backend:**
- [ ] Custom report generation endpoint
- [ ] PDF generation with Puppeteer
- [ ] Report data aggregation

**Deliverables:**
- Can generate and download reports

---

### Day 10: Scheduled Reports

**Web:**
- [ ] Scheduled reports page
- [ ] Schedules list table
- [ ] Create schedule modal
- [ ] CronBuilder component
- [ ] Email recipients input
- [ ] Enable/disable toggle
- [ ] Run now button
- [ ] Edit schedule
- [ ] Delete schedule
- [ ] Run history

**Backend:**
- [ ] ScheduledReport entity
- [ ] Report scheduler service
- [ ] Cron job management
- [ ] Schedule CRUD endpoints

**Deliverables:**
- Can schedule recurring reports

---

### Day 11: Email Service & System Settings

**Backend:**
- [ ] Email service with nodemailer
- [ ] Report email templates
- [ ] Send report as attachment
- [ ] Error notification emails
- [ ] Settings module
- [ ] Settings CRUD endpoints

**Web:**
- [ ] System settings page
- [ ] General settings section
- [ ] Attendance settings
- [ ] GPS settings
- [ ] Report settings
- [ ] Save settings
- [ ] Reset to defaults

**Deliverables:**
- Email delivery working
- Settings configurable from UI

---

### Day 12: Audit Module Backend

**Backend:**
- [ ] Audit module complete
- [ ] AuditLog entity
- [ ] AuditService
- [ ] AuditInterceptor refinement
- [ ] GET /audit-logs endpoint
- [ ] Filters (user, action, entity, date)
- [ ] Export audit logs
- [ ] Unit tests (>80%)

**Deliverables:**
- All admin actions logged automatically

---

## Week 3: Audit UI, Testing & Deployment

### Day 13: Audit Log UI

**Web:**
- [ ] Audit log page
- [ ] Audit log data table
- [ ] Filter by user
- [ ] Filter by action
- [ ] Filter by entity
- [ ] Filter by date range
- [ ] Search
- [ ] ChangeDiffModal component
- [ ] Export to CSV

**Deliverables:**
- Audit log viewer complete

---

### Day 14: Testing & Bug Fixes

**All:**
- [ ] Unit tests for web components
- [ ] Unit tests for API hooks
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Cross-browser testing
- [ ] Responsive design testing
- [ ] Performance optimization
- [ ] Bug fixes

**Deliverables:**
- All tests passing
- Critical bugs fixed

---

### Day 15: Deployment & Documentation

**All:**
- [ ] Deploy backend updates
- [ ] Configure email service (production)
- [ ] Configure cron jobs (production)
- [ ] Deploy web dashboard
- [ ] Production smoke testing
- [ ] User acceptance testing
- [ ] Documentation updates
- [ ] Admin user guide
- [ ] Phase 6 sign-off

**Deliverables:**
- Phase 6 deployed to production
- Documentation complete

---

## Parallel Work Streams

```
Week 1:
Web:      User CRUD → Area CRUD → Asset Enhancement → Bulk Ops
          ────────────────────────────────────────────────────→
Backend:           Audit Setup → Bulk Import/Export
                   ────────────────────────────────→

Week 2:
Web:      Report Builder → Scheduled Reports → Settings
          ────────────────────────────────────────────→
Backend:  Report Gen → Email Service → Settings → Audit API
          ────────────────────────────────────────────────→

Week 3:
Web:      Audit Log UI → Testing → Documentation
          ─────────────────────────────────────→
Backend:  Audit Tests → Bug Fixes → Deployment
          ─────────────────────────────────────→
```

---

## Dependencies

| Task | Depends On |
|------|------------|
| User detail page | Users list |
| Area map editor | Leaflet setup |
| Bulk import | CSV parser, validation |
| Bulk export | ExcelJS, json2csv |
| Report generation | Puppeteer, data queries |
| Scheduled reports | Email service, cron |
| Audit log UI | Audit backend API |

---

## Risk Mitigation

| Risk | Mitigation | Day |
|------|------------|-----|
| Leaflet integration issues | Test early, have fallback | Day 3 |
| CSV parsing edge cases | Comprehensive validation | Day 6 |
| Puppeteer memory issues | Optimize PDF generation | Day 9 |
| Email delivery failures | Test with sandbox, add retries | Day 11 |
| Audit log performance | Add indexes, pagination | Day 12 |

---

## Milestones

| Milestone | Target Day | Success Criteria |
|-----------|------------|------------------|
| User CRUD Complete | Day 2 | Full CRUD working |
| Area CRUD Complete | Day 4 | Map editor working |
| Bulk Operations | Day 7 | Import/export working |
| Report Builder | Day 9 | Can generate reports |
| Scheduled Reports | Day 10 | Emails sent on schedule |
| Settings Configurable | Day 11 | Settings saved |
| Audit Log Complete | Day 13 | All actions logged |
| Phase 6 Deployed | Day 15 | In production |

---

## Resource Allocation

| Role | Week 1 | Week 2 | Week 3 |
|------|--------|--------|--------|
| Web Developer | Full time | Full time | Full time |
| Backend Developer | 3 days | 4 days | 2 days |
| QA Engineer | - | 1 day | 3 days |

---

## Daily Standup Questions

1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?
4. Are CRUD operations working end-to-end?
5. Is email delivery reliable?

---

**Last Updated:** 2026-01-16
