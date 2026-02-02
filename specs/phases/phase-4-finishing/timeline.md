# Phase 4: Integrated Implementation Timeline

**Total Duration:** 10-12 weeks
**Start Date:** After Phase 2 deployment
**Scope:** Analytics, Assets, and iOS Platform

---

## Overview

Phase 4 consolidates three major feature sets into a single integrated development cycle:
- **Analytics & Reporting** (Weeks 1-3)
- **Asset Management** (Weeks 4-6)
- **iOS Platform** (Weeks 7-9)
- **Integration & Polish** (Weeks 10-12)

| Week | Primary Focus | Components |
|------|---------------|------------|
| 1-2 | Analytics Backend + Web | Backend, Web, Testing |
| 3 | Analytics Mobile + Testing | Mobile, Integration |
| 4-5 | Assets Backend + Mobile | Backend, Mobile, Testing |
| 6 | Assets Web + Testing | Web, Integration |
| 7-8 | iOS Platform Setup | Mobile, Backend, iOS |
| 9 | iOS Security & i18n | Mobile, Backend, Web |
| 10-11 | iOS Testing & Store | Mobile, QA, Documentation |
| 12 | Final Integration | All Components, Deployment |

---

## Part A: Analytics & Reporting (Weeks 1-3)

### Week 1: Backend Analytics Foundation

#### Days 1-2: Analytics Module

**Backend:**
- [ ] Create analytics module structure
- [ ] AnalyticsQueryDto with validation
- [ ] Worker analytics query implementation
- [ ] Worker analytics endpoint
- [ ] Area analytics query implementation
- [ ] Area analytics endpoint
- [ ] Operational analytics query
- [ ] Dashboard summary endpoint
- [ ] Database indexes for optimization
- [ ] Query caching (optional)

**Deliverables:**
- Complete analytics API
- All queries optimized (<2s response)

---

#### Days 3-4: Report Builder Module

**Backend:**
- [ ] Create report-builder module
- [ ] ReportTemplate entity
- [ ] GeneratedReport entity
- [ ] Template CRUD endpoints
- [ ] PDF generator with Puppeteer
- [ ] CSV generator
- [ ] Excel generator (ExcelJS)
- [ ] Generate report endpoint
- [ ] S3 upload for generated files
- [ ] Archive list/download endpoints

**Deliverables:**
- PDF generation working
- All export formats functional
- Reports stored in S3

---

#### Day 5: Backend Testing & Scheduler

**Backend:**
- [ ] Unit tests for analytics (>80% coverage)
- [ ] Unit tests for report-builder (>80% coverage)
- [ ] @nestjs/schedule configuration
- [ ] Basic scheduler service setup
- [ ] Integration testing

**Deliverables:**
- >80% test coverage
- Scheduler module ready

---

### Week 2: Web Analytics Dashboard

#### Days 6-7: Analytics Pages

**Web:**
- [ ] Analytics dashboard page
- [ ] Worker analytics page structure
- [ ] Data fetching hooks
- [ ] LineChart component (Recharts)
- [ ] BarChart component
- [ ] PieChart component
- [ ] Worker analytics table
- [ ] Top performers leaderboard
- [ ] Area analytics page
- [ ] Date range picker integration
- [ ] Filter components

**Deliverables:**
- Complete analytics pages
- Charts rendering with data
- Filtering functional

---

#### Day 8: Report Builder Web

**Web:**
- [ ] Report builder page layout
- [ ] Report type selector
- [ ] Metric selection UI
- [ ] Filter configuration
- [ ] Generate and download buttons
- [ ] Templates list page
- [ ] Archive page

**Deliverables:**
- Report builder functional
- Export working from web

---

#### Day 9: Email & Scheduler

**Backend:**
- [ ] AWS SES email service
- [ ] Email templates (HTML)
- [ ] Daily/weekly report jobs
- [ ] Job execution logging

**Deliverables:**
- Email delivery working
- Automated reports functional

---

#### Day 10: Web Testing & Polish

**Web:**
- [ ] Component unit tests
- [ ] Integration tests
- [ ] Performance testing
- [ ] Bug fixes
- [ ] Documentation updates

**Deliverables:**
- >70% web test coverage
- All web features polished

---

### Week 3: Mobile Analytics & Integration

#### Days 11-12: Mobile Analytics

**Mobile:**
- [ ] Worker analytics screen
- [ ] Performance card for home screen
- [ ] Supervisor team analytics screen
- [ ] Chart components (react-native-chart-kit)
- [ ] Period selector
- [ ] Refresh functionality
- [ ] Unit tests for analytics screens

**Deliverables:**
- Mobile analytics working
- Charts rendering on mobile

---

#### Days 13-15: Analytics Integration & Testing

**All Components:**
- [ ] Integration testing (end-to-end)
- [ ] Performance testing (query times)
- [ ] Load testing for analytics
- [ ] Bug fixes across all platforms
- [ ] Documentation updates
- [ ] Deploy backend updates
- [ ] Deploy web updates
- [ ] Build mobile APK with analytics

**Deliverables:**
- Analytics features deployed
- All tests passing

---

## Part B: Asset Management (Weeks 4-6)

### Week 4: Backend Assets Foundation

#### Days 16-17: Assets Module

**Backend:**
- [ ] Create assets module with NestJS CLI
- [ ] Asset entity with TypeORM decorators
- [ ] AssetType entity
- [ ] AssetAssignment entity
- [ ] Database migration
- [ ] Basic DTOs (Create, Update, Query)
- [ ] AssetsService - CRUD operations
- [ ] AssetsController with Swagger
- [ ] Query DTOs with filters
- [ ] Assignment/return endpoints
- [ ] Assignment history endpoint

**Deliverables:**
- Complete CRUD API for assets
- Assignment workflow functional

---

#### Day 18: QR Code Generation

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

#### Days 19-20: Maintenance Module & Testing

**Backend:**
- [ ] Create maintenance module
- [ ] MaintenanceRecord entity
- [ ] Maintenance DTOs
- [ ] MaintenanceService - CRUD
- [ ] MaintenanceController with Swagger
- [ ] Start/complete maintenance workflow
- [ ] Upcoming maintenance query
- [ ] Overdue maintenance detection
- [ ] Calendar data endpoint
- [ ] Unit tests for AssetsService (>80%)
- [ ] Unit tests for AssetsController
- [ ] Unit tests for MaintenanceService (>80%)
- [ ] Unit tests for MaintenanceController

**Deliverables:**
- Maintenance CRUD API complete
- All backend tests passing
- >80% code coverage

---

### Week 5: Mobile Asset Management

#### Days 21-22: QR Scanner

**Mobile:**
- [ ] Install react-native-vision-camera
- [ ] Configure camera permissions (Android)
- [ ] Configure camera permissions (iOS)
- [ ] QRScanner component
- [ ] QROverlay component
- [ ] QRScannerScreen
- [ ] Barcode parsing and validation
- [ ] API integration for asset lookup
- [ ] Navigation to asset details
- [ ] Error handling for invalid QR
- [ ] Manual code entry option
- [ ] Recent scans storage (AsyncStorage)
- [ ] Torch/flashlight toggle

**Deliverables:**
- Camera opens successfully
- QR codes detected and parsed
- Full scanner workflow working

---

#### Days 23-24: Asset Screens

**Mobile:**
- [ ] AssetDetailsScreen component
- [ ] AssetCard component
- [ ] StatusBadge component
- [ ] ConditionIndicator component
- [ ] API integration for asset details
- [ ] Assignment history display
- [ ] Maintenance history display
- [ ] AssetCheckoutScreen
- [ ] AssetReturnScreen
- [ ] ConditionSelector component
- [ ] Photo capture for condition
- [ ] Checkout API integration
- [ ] Return API integration
- [ ] Success/error handling
- [ ] MyAssetsScreen (worker's checked out assets)

**Deliverables:**
- Asset details display correctly
- Checkout workflow complete
- Return workflow complete

---

#### Day 25: Maintenance Reporting

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
- >70% mobile test coverage

---

### Week 6: Web Asset Dashboard

#### Days 26-27: Assets Management Pages

**Web:**
- [ ] Assets list page layout
- [ ] Data table with TanStack Table
- [ ] Column definitions
- [ ] Sorting functionality
- [ ] Filter components (type, status, area)
- [ ] Search input
- [ ] Pagination
- [ ] Bulk selection
- [ ] Asset details page
- [ ] Asset summary card with photo
- [ ] QR code display
- [ ] Tab navigation (Details, History, Maintenance)
- [ ] Add asset page/modal
- [ ] Edit asset modal
- [ ] Delete confirmation
- [ ] Form validation

**Deliverables:**
- Assets list displays with data
- Asset CRUD from web working
- All tabs functional

---

#### Day 28: QR Code Generator

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

#### Day 29: Maintenance Calendar

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

#### Day 30: Assets Integration & Testing

**All Components:**
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
- Assets features deployed
- All tests passing

---

## Part C: iOS Platform (Weeks 7-9)

### Week 7: iOS Setup & Authentication

#### Days 31-32: iOS Build Configuration

**Mobile:**
- [ ] Apple Developer Program setup (if not done)
- [ ] Create App ID in Developer portal
- [ ] Enable capabilities (Sign in with Apple, Push, Siri)
- [ ] Create development certificate
- [ ] Create distribution certificate
- [ ] Create provisioning profiles
- [ ] Configure Xcode project
- [ ] Verify CocoaPods installation
- [ ] Build on iOS simulator
- [ ] Update Info.plist permissions
- [ ] Configure background modes
- [ ] Setup App Groups (if needed)
- [ ] Configure APNs for push notifications
- [ ] Build and test on physical device
- [ ] Fix any platform-specific issues

**Deliverables:**
- iOS project builds successfully
- App runs on physical iOS device
- All permissions working

---

#### Days 33-34: Apple Sign-In

**Mobile:**
- [ ] Install react-native-apple-authentication
- [ ] Pod install
- [ ] AppleSignInButton component
- [ ] AppleAuthService implementation
- [ ] Handle first-time sign-in (get email/name)
- [ ] Handle returning sign-in

**Backend:**
- [ ] Install apple-signin-auth
- [ ] AppleAuthService backend
- [ ] POST /auth/apple endpoint
- [ ] POST /auth/apple/link endpoint
- [ ] DELETE /auth/apple/unlink endpoint
- [ ] Update user entity (appleId field)
- [ ] Database migration
- [ ] Integration tests
- [ ] API documentation update
- [ ] Unit tests

**Deliverables:**
- Apple Sign-In button on login screen
- Backend verifies Apple tokens
- Link/unlink functionality working

---

#### Day 35: Siri Shortcuts

**Mobile:**
- [ ] Install react-native-siri-shortcut
- [ ] Pod install
- [ ] Configure Siri capability
- [ ] SiriShortcuts service
- [ ] Donate clock-in shortcut
- [ ] Donate clock-out shortcut
- [ ] Donate report shortcut
- [ ] Handle shortcut activation
- [ ] Deep link navigation
- [ ] Test Siri Shortcuts end-to-end

**Deliverables:**
- "Hey Siri, mulai shift" triggers clock-in
- Shortcuts appear in Shortcuts app
- All shortcuts working

---

### Week 8: Security Features

#### Days 36-37: Biometric Authentication

**Mobile:**
- [ ] Install react-native-biometrics
- [ ] Pod install
- [ ] BiometricAuth service
- [ ] Check biometric availability
- [ ] Face ID / Touch ID prompt
- [ ] Biometric login flow
- [ ] Settings toggle for biometric
- [ ] Secure token storage
- [ ] BiometricSettingsScreen

**Deliverables:**
- Face ID / Touch ID login works
- Settings to enable/disable
- Secure token storage functional

---

#### Days 38-39: Fraud Detection

**Mobile:**
- [ ] FraudDetection service
- [ ] Device info collection
- [ ] Emulator detection
- [ ] Root/jailbreak detection (basic)
- [ ] Mock location detection (Android)
- [ ] Integrate with clock-in flow
- [ ] Show warning for suspicious activity

**Backend:**
- [ ] Create fraud-detection module
- [ ] FraudLog entity
- [ ] DeviceFingerprint entity
- [ ] Database migration
- [ ] FraudDetectionService
- [ ] Mock location detection
- [ ] Velocity anomaly detection
- [ ] POST /fraud/check-location endpoint
- [ ] GET /fraud/logs endpoint (Admin)
- [ ] PATCH /fraud/logs/:id endpoint
- [ ] GET /fraud/stats endpoint
- [ ] App attestation challenge generation
- [ ] iOS App Attest verification (basic)
- [ ] GET /auth/devices endpoint
- [ ] DELETE /auth/devices/:id endpoint
- [ ] Unit tests

**Web:**
- [ ] Fraud dashboard page
- [ ] Fraud logs table
- [ ] Fraud detail modal
- [ ] Review/dismiss actions
- [ ] Device management page
- [ ] Device list table
- [ ] Toggle device trust
- [ ] Remove device
- [ ] User fraud history section

**Deliverables:**
- Device info sent with location requests
- Backend validates location integrity
- Fraud attempts logged
- Admin can view and review fraud logs

---

#### Day 40: Internationalization

**Mobile:**
- [ ] Install i18next and react-i18next
- [ ] Create i18n configuration
- [ ] Extract strings from all screens
- [ ] Create id.json (Indonesian)
- [ ] Create en.json (English)
- [ ] LanguageSelector component
- [ ] Persist language preference
- [ ] Sync with backend
- [ ] Date/number formatting

**Backend:**
- [ ] PUT /users/me/language endpoint
- [ ] Store language preference

**Deliverables:**
- App supports Indonesian and English
- Language persists across sessions
- All strings translated

---

### Week 9: iOS Testing & Preparation

#### Days 41-42: iOS Testing

**Mobile:**
- [ ] Test Apple Sign-In on multiple devices
- [ ] Test Siri Shortcuts on multiple devices
- [ ] Test Face ID on iPhone X+
- [ ] Test Touch ID on older devices
- [ ] Test biometric fallback
- [ ] Test fraud detection scenarios
- [ ] Test language switching
- [ ] Test all screens in both languages
- [ ] Performance testing
- [ ] Memory leak testing

**Deliverables:**
- All iOS features tested
- Bug list documented

---

#### Days 43-44: Bug Fixes & App Store Prep

**Mobile:**
- [ ] Fix all critical bugs
- [ ] Fix all major bugs
- [ ] App Store screenshots (6.7")
- [ ] App Store screenshots (6.5")
- [ ] App Store screenshots (5.5")
- [ ] App icon (all sizes)
- [ ] App description (Indonesian)
- [ ] App description (English)
- [ ] Privacy policy URL
- [ ] Keywords

**Deliverables:**
- All bugs fixed
- App Store assets ready

---

#### Day 45: TestFlight

**Mobile:**
- [ ] Create archive build
- [ ] Upload to App Store Connect
- [ ] Submit for TestFlight review
- [ ] Internal testing group
- [ ] Beta testing group (external)
- [ ] Collect feedback

**Deliverables:**
- TestFlight build available
- Beta testers can access

---

## Part D: Final Integration & Deployment (Weeks 10-12)

### Week 10: Integration & Refinement

#### Days 46-48: Cross-Platform Integration

**All Components:**
- [ ] End-to-end testing (all features)
- [ ] Analytics → Assets workflow
- [ ] Assets → Analytics reporting
- [ ] iOS-specific feature testing
- [ ] Performance testing across platforms
- [ ] Security review
- [ ] Accessibility audit
- [ ] Address TestFlight feedback
- [ ] Fix beta issues
- [ ] Cross-browser testing (web)
- [ ] Cross-device testing (mobile)

**Deliverables:**
- All features integrated
- Critical bugs fixed
- Performance targets met

---

#### Days 49-50: Documentation & Training

**Documentation:**
- [ ] Update API documentation
- [ ] Update mobile README
- [ ] Update web README
- [ ] Update deployment guides
- [ ] Create user guides
- [ ] Create admin guides
- [ ] Update CLAUDE.md
- [ ] Update COMPLETION_STATUS.md

**Training:**
- [ ] Admin training materials
- [ ] Supervisor training materials
- [ ] Worker onboarding materials

**Deliverables:**
- Comprehensive documentation
- Training materials ready

---

### Week 11: App Store & Final Testing

#### Days 51-53: App Store Submission

**Mobile (iOS):**
- [ ] Final bug fixes
- [ ] Create release build
- [ ] Complete App Store listing
- [ ] Submit for App Store review
- [ ] Prepare review notes
- [ ] Test account for reviewers

**Mobile (Android):**
- [ ] Update Play Store listing
- [ ] Build release APK/AAB
- [ ] Upload to Play Console
- [ ] Roll out to beta track

**Deliverables:**
- iOS app submitted to App Store
- Android app updated on Play Store
- Awaiting Apple review

---

#### Days 54-55: Load Testing & Optimization

**Backend:**
- [ ] Load testing with production-like data
- [ ] Database query optimization
- [ ] API rate limiting verification
- [ ] Cache performance tuning
- [ ] S3 upload/download optimization

**Web:**
- [ ] Lighthouse performance audit
- [ ] Bundle size optimization
- [ ] Image optimization
- [ ] CDN configuration

**Deliverables:**
- Performance benchmarks met
- System ready for production load

---

### Week 12: Production Deployment

#### Days 56-57: Staged Rollout

**Backend:**
- [ ] Deploy to staging environment
- [ ] Smoke tests on staging
- [ ] Database migration (production)
- [ ] Deploy to production
- [ ] Verify all endpoints
- [ ] Monitor error rates

**Web:**
- [ ] Deploy to staging
- [ ] Verify all pages
- [ ] Deploy to production
- [ ] Verify deployment
- [ ] Monitor metrics

**Mobile:**
- [ ] Monitor App Store review status
- [ ] Prepare for gradual rollout
- [ ] Update Firebase Remote Config
- [ ] Monitor crash reports

**Deliverables:**
- Backend in production
- Web dashboard in production
- Mobile updates pending approval

---

#### Days 58-60: Monitoring & Support

**All Components:**
- [ ] 24/7 monitoring setup
- [ ] Alert thresholds configured
- [ ] Support team briefed
- [ ] User communication plan
- [ ] Rollback plan ready
- [ ] Monitor user feedback
- [ ] Hot fixes as needed
- [ ] Phase 4 retrospective
- [ ] Phase 4 sign-off

**Deliverables:**
- Phase 4 complete
- System stable in production
- Support team ready

---

## Parallel Work Streams

```
Weeks 1-3: ANALYTICS
Backend:  Analytics API → Report Gen → Scheduler ────────────→
Web:                      Analytics Pages → Report Builder ───→
Mobile:                                     Analytics Screens →

Weeks 4-6: ASSETS
Backend:  Assets API → QR Service → Maintenance ─────────────→
Mobile:              QR Scanner → Asset Screens → Actions ───→
Web:                                Assets Pages → Calendar →

Weeks 7-9: iOS
Mobile:   iOS Setup → Apple Auth → Siri → Biometrics ───────→
Backend:              Apple Auth → Fraud Detection ──────────→
Web:                                Fraud Dashboard ─────────→

Weeks 10-12: INTEGRATION
All:      Integration Testing → Documentation → Deployment ──→
```

---

## Dependencies & Critical Path

| Feature | Depends On | Critical Path |
|---------|------------|---------------|
| Web Analytics | Backend Analytics API | Yes |
| Mobile Analytics | Backend Analytics API | Yes |
| Report Builder Web | PDF/CSV/Excel generators | Yes |
| Scheduled Reports | Scheduler + Email service | No |
| Mobile QR Scanner | Backend Assets API | Yes |
| Web Assets Pages | Backend Assets API | Yes |
| Web Maintenance Calendar | Backend Maintenance API | Yes |
| Apple Sign-In Mobile | iOS build configured | Yes |
| Apple Sign-In Backend | Apple Developer account | Yes |
| Siri Shortcuts | iOS build configured | No |
| Biometric Login | Token storage setup | No |
| Fraud Dashboard Web | Fraud Detection Backend | No |
| TestFlight | Apple Developer account | Yes |
| App Store Submission | TestFlight approved | Yes |

---

## Risk Mitigation

| Risk | Mitigation Strategy | Week | Impact |
|------|---------------------|------|--------|
| Slow analytics queries | Add indexes early, test with production-like data | 1 | High |
| Puppeteer PDF issues | Test PDF generation locally, fallback to pdfmake | 1 | Medium |
| AWS SES configuration | Set up SES sandbox early, verify domain | 2 | Medium |
| Chart performance | Use pagination, limit data points | 2 | Medium |
| Camera permission issues | Test on multiple devices early | 5 | High |
| QR code scanning accuracy | Add manual entry fallback | 5 | High |
| Print layout issues | Test across browsers | 6 | Low |
| Calendar performance | Paginate events by month | 6 | Medium |
| S3 upload failures | Add retry logic, local fallback | 4 | Medium |
| Apple Developer issues | Start enrollment early | 7 | High |
| Certificate problems | Document all steps | 7 | High |
| Apple Sign-In complexity | Follow Apple docs closely | 7 | High |
| Siri integration issues | Have fallback (manual) | 7 | Low |
| App Store rejection | Prepare thorough review notes | 11 | High |
| Translation quality | Have native speakers review | 8 | Medium |

---

## Milestones & Success Criteria

| Week | Milestone | Success Criteria |
|------|-----------|------------------|
| 2 | Analytics API Complete | All endpoints <2s response |
| 2 | Report Generation Working | PDF/CSV/Excel downloadable |
| 2 | Backend Tests Passing | >80% coverage |
| 3 | Web Analytics Live | Charts render with data |
| 3 | Mobile Analytics Live | Charts render on mobile |
| 5 | Assets API Complete | All CRUD + QR generation |
| 5 | Maintenance API Complete | All CRUD + queries |
| 5 | Backend Tests Passing | >80% coverage |
| 6 | Mobile Scanner Working | Scan → details flow |
| 6 | Mobile Asset Actions | Checkout/return working |
| 6 | Web Assets Management | CRUD from dashboard |
| 6 | QR Printing Working | Bulk print functional |
| 6 | Calendar Working | View and manage maintenance |
| 8 | iOS Build Working | Runs on physical device |
| 8 | Apple Sign-In Working | Can sign in with Apple ID |
| 8 | Siri Shortcuts Working | Voice command triggers action |
| 9 | Biometric Auth Working | Face ID/Touch ID login |
| 9 | Fraud Detection Working | Mock location blocked |
| 9 | i18n Complete | ID/EN translations |
| 11 | TestFlight Build | Beta testers can access |
| 11 | App Store Submitted | Pending Apple review |
| 12 | Phase 4 Deployed | All features in production |

---

## Resource Allocation

| Role | Weeks 1-3 | Weeks 4-6 | Weeks 7-9 | Weeks 10-12 |
|------|-----------|-----------|-----------|-------------|
| Backend Developer | Full time | Full time | Part time | Support |
| Mobile Developer | Part time | Full time | Full time | Part time |
| Web Developer | Full time | Full time | Part time | Part time |
| iOS Developer | - | - | Full time | Part time |
| QA Engineer | Part time | Part time | Part time | Full time |
| DevOps Engineer | - | Part time | Part time | Full time |

---

## Performance Benchmarks

| Metric | Target | Test Method |
|--------|--------|-------------|
| Worker analytics query | <2s | 500 workers, 1 month |
| Area analytics query | <2s | 50 areas, 1 month |
| Dashboard summary | <1s | All data |
| PDF generation | <30s | Monthly report |
| CSV generation | <5s | 10K rows |
| Assets list query | <1s | 1000 assets, paginated |
| Asset history query | <500ms | 100 assignments |
| QR generation | <2s | Single QR code |
| Bulk QR generation | <30s | 50 QR codes |
| Maintenance calendar | <1s | 1 month of events |
| App launch (iOS) | <3s | Cold start |
| Apple Sign-In | <5s | Complete flow |
| Biometric prompt | <500ms | Show prompt |
| Language switch | <1s | Complete switch |
| Fraud check | <2s | Location validation |

---

## Daily Standup Questions

1. What did you complete yesterday?
2. What are you working on today?
3. Are performance targets being met?
4. Are there any blockers?
5. **Week 1-3:** Are analytics queries fast enough?
6. **Week 4-6:** Is QR scanning working on test devices?
7. **Week 7-9:** Are iOS builds successful on physical devices?
8. **Week 10-12:** Are we ready for production deployment?

---

## App Store Checklist

### Pre-Submission
- [ ] App ID registered
- [ ] Certificates valid
- [ ] Provisioning profiles valid
- [ ] Screenshots captured (3 sizes)
- [ ] App icon uploaded
- [ ] Description written (ID + EN)
- [ ] Keywords optimized
- [ ] Privacy policy live
- [ ] Support URL live
- [ ] Age rating set (4+)
- [ ] Test account ready

### Submission
- [ ] Archive created
- [ ] Build uploaded to App Store Connect
- [ ] App Store listing complete
- [ ] Review notes added
- [ ] Submitted for review

---

## Related Documentation

- [Backend Implementation](./backend.md)
- [Mobile Implementation](./mobile.md)
- [Web Implementation](./web.md)
- [iOS Platform](./ios.md)
- [Testing Guide](./testing.md)
- [README](./README.md)
- [STATUS](./STATUS.md)

---

**Last Updated:** 2026-01-30
