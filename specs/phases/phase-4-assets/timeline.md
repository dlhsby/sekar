# Phase 4 - Asset Management: Timeline

**Total Duration:** 3 weeks (15 working days)
**Start Date:** After Phase 3 deployment

---

## Overview

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | Backend Modules | Assets, Maintenance APIs, QR generation |
| Week 2 | Mobile App | QR scanner, asset screens |
| Week 3 | Web Dashboard | Asset management, calendar |

---

## Week 1: Backend Development

### Day 1: Assets Module Foundation

**Backend:**
- [ ] Create assets module with NestJS CLI
- [ ] Asset entity with TypeORM decorators
- [ ] AssetType entity
- [ ] Database migration
- [ ] Basic DTOs (Create, Update)

**Deliverables:**
- Asset entity with all required fields
- Migration applied successfully

---

### Day 2: Assets CRUD & Assignment

**Backend:**
- [ ] AssetAssignment entity
- [ ] AssetsService - CRUD operations
- [ ] AssetsController with Swagger
- [ ] Query DTOs with filters
- [ ] Assignment/return endpoints
- [ ] Assignment history endpoint

**Deliverables:**
- Complete CRUD API for assets
- Assignment workflow functional

---

### Day 3: QR Code Generation

**Backend:**
- [ ] Install qrcode package
- [ ] QrCodeService implementation
- [ ] S3 integration for QR storage
- [ ] Auto-generate QR on asset creation
- [ ] Bulk QR generation endpoint
- [ ] Get asset by code endpoint

**Deliverables:**
- QR codes generated automatically
- Bulk generation working

---

### Day 4: Maintenance Module

**Backend:**
- [ ] Create maintenance module
- [ ] MaintenanceRecord entity
- [ ] Maintenance DTOs
- [ ] MaintenanceService - CRUD
- [ ] MaintenanceController with Swagger
- [ ] Start/complete maintenance workflow

**Deliverables:**
- Maintenance CRUD API complete
- Workflow transitions working

---

### Day 5: Maintenance Queries & Backend Testing

**Backend:**
- [ ] Upcoming maintenance query
- [ ] Overdue maintenance detection
- [ ] Calendar data endpoint
- [ ] Unit tests for AssetsService (>80%)
- [ ] Unit tests for AssetsController
- [ ] Unit tests for MaintenanceService (>80%)
- [ ] Unit tests for MaintenanceController

**Deliverables:**
- All backend tests passing
- >80% code coverage

---

## Week 2: Mobile Development

### Day 6: QR Scanner Setup

**Mobile:**
- [ ] Install react-native-vision-camera
- [ ] Configure camera permissions (Android)
- [ ] Configure camera permissions (iOS)
- [ ] QRScanner component
- [ ] QROverlay component
- [ ] QRScannerScreen

**Deliverables:**
- Camera opens successfully
- QR codes can be detected

---

### Day 7: Scanner Integration

**Mobile:**
- [ ] Barcode parsing and validation
- [ ] API integration for asset lookup
- [ ] Navigation to asset details
- [ ] Error handling for invalid QR
- [ ] Manual code entry option
- [ ] Recent scans storage (AsyncStorage)
- [ ] Torch/flashlight toggle

**Deliverables:**
- Full scanner workflow working
- Recent scans persist

---

### Day 8: Asset Details Screen

**Mobile:**
- [ ] AssetDetailsScreen component
- [ ] AssetCard component
- [ ] StatusBadge component
- [ ] ConditionIndicator component
- [ ] API integration for asset details
- [ ] Assignment history display
- [ ] Maintenance history display

**Deliverables:**
- Asset details display correctly
- History tabs working

---

### Day 9: Asset Checkout/Return

**Mobile:**
- [ ] AssetCheckoutScreen
- [ ] AssetReturnScreen
- [ ] ConditionSelector component
- [ ] Photo capture for condition
- [ ] Checkout API integration
- [ ] Return API integration
- [ ] Success/error handling
- [ ] MyAssetsScreen (worker's checked out assets)

**Deliverables:**
- Checkout workflow complete
- Return workflow complete

---

### Day 10: Maintenance Reporting

**Mobile:**
- [ ] MaintenanceReportScreen
- [ ] IssueTypeSelector component
- [ ] PrioritySelector component
- [ ] Multi-photo upload
- [ ] Maintenance API integration
- [ ] Offline queue support
- [ ] Success confirmation
- [ ] Unit tests for mobile components

**Deliverables:**
- Maintenance can be reported
- Offline queue functional

---

## Week 3: Web Dashboard

### Day 11: Assets List Page

**Web:**
- [ ] Assets list page layout
- [ ] Data table with TanStack Table
- [ ] Column definitions
- [ ] Sorting functionality
- [ ] Filter components (type, status, area)
- [ ] Search input
- [ ] Pagination
- [ ] Bulk selection

**Deliverables:**
- Assets list displays with data
- Filters working

---

### Day 12: Asset Details & Forms

**Web:**
- [ ] Asset details page
- [ ] Asset summary card with photo
- [ ] QR code display
- [ ] Tab navigation (Details, History, Maintenance)
- [ ] Add asset page/modal
- [ ] Edit asset modal
- [ ] Delete confirmation
- [ ] Form validation

**Deliverables:**
- Asset CRUD from web working
- All tabs functional

---

### Day 13: QR Code Generator

**Web:**
- [ ] QR generator page layout
- [ ] Asset selection list
- [ ] QR code preview grid
- [ ] Print size options
- [ ] Layout options (2/3/4 per row)
- [ ] Include options (name, code, type)
- [ ] react-to-print integration
- [ ] Download as PDF (jspdf)

**Deliverables:**
- QR codes generated in bulk
- Print and download working

---

### Day 14: Maintenance Calendar

**Web:**
- [ ] Maintenance calendar page
- [ ] FullCalendar integration
- [ ] Event rendering with status colors
- [ ] Event click → detail modal
- [ ] Create maintenance modal
- [ ] Edit maintenance modal
- [ ] Upcoming maintenance list
- [ ] Overdue maintenance alerts

**Deliverables:**
- Calendar displays maintenance
- CRUD operations working

---

### Day 15: Integration Testing & Deployment

**All:**
- [ ] Backend E2E tests
- [ ] Mobile integration tests
- [ ] Web integration tests
- [ ] QR scanning end-to-end test
- [ ] Performance testing
- [ ] Bug fixes
- [ ] Deploy backend updates
- [ ] Deploy web updates
- [ ] Build mobile APK
- [ ] Documentation updates

**Deliverables:**
- Phase 4 deployed
- All tests passing

---

## Parallel Work Streams

```
Week 1:
Backend:  Assets Module → QR Service → Maintenance Module → Testing
          ────────────────────────────────────────────────────────→

Week 2:
Mobile:   QR Scanner Setup → Asset Screens → Actions → Maintenance
          ────────────────────────────────────────────────────────→

Week 3:
Web:      Assets List → Details/Forms → QR Generator → Calendar
          ────────────────────────────────────────────────────────→
```

---

## Dependencies

| Task | Depends On |
|------|------------|
| Mobile QR scanner | Backend assets API |
| Mobile asset details | Backend assets API |
| Mobile checkout/return | Backend assignment API |
| Mobile maintenance report | Backend maintenance API |
| Web assets list | Backend assets API |
| Web QR generator | QrCodeService |
| Web maintenance calendar | Backend maintenance API |

---

## Risk Mitigation

| Risk | Mitigation | Day |
|------|------------|-----|
| Camera permission issues | Test on multiple devices early | Day 6 |
| QR code scanning accuracy | Add manual entry fallback | Day 7 |
| Print layout issues | Test across browsers | Day 13 |
| Calendar performance | Paginate events by month | Day 14 |
| S3 upload failures | Add retry logic, local fallback | Day 3 |

---

## Milestones

| Milestone | Target Day | Success Criteria |
|-----------|------------|------------------|
| Assets API Complete | Day 3 | All CRUD + QR generation |
| Maintenance API Complete | Day 5 | All CRUD + queries |
| Backend Tests Passing | Day 5 | >80% coverage |
| Mobile Scanner Working | Day 7 | Scan → details flow |
| Mobile Asset Actions | Day 9 | Checkout/return working |
| Web Assets Management | Day 12 | CRUD from dashboard |
| QR Printing Working | Day 13 | Bulk print functional |
| Calendar Working | Day 14 | View and manage maintenance |
| Phase 4 Deployed | Day 15 | All features in production |

---

## Resource Allocation

| Role | Week 1 | Week 2 | Week 3 |
|------|--------|--------|--------|
| Backend Developer | Full time | Support | Support |
| Mobile Developer | - | Full time | Support |
| Web Developer | - | - | Full time |
| QA Engineer | - | Testing | Testing |

---

## Daily Standup Questions

1. What did you complete yesterday?
2. What are you working on today?
3. Are there any blockers?
4. Is QR scanning working on test devices?
5. Are print layouts rendering correctly?

---

**Last Updated:** 2026-01-16
