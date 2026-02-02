# Manual Testing Checklist

**Phase:** 3 - Polishing & E2E Testing
**Status:** Not Started

---

## Overview

This document provides a comprehensive manual testing checklist for SEKAR across mobile and web platforms.

---

## Mobile App Testing (17 Screens)

### Authentication Screens

#### LoginScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Valid login | Navigate to dashboard | | |
| 2 | Invalid credentials | Show error message | | |
| 3 | Empty fields validation | Show validation errors | | |
| 4 | Password visibility toggle | Show/hide password | | |
| 5 | Remember me functionality | Persist session | | |
| 6 | Network error handling | Show offline message | | |

#### SplashScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | App launch with token | Navigate to dashboard | | |
| 2 | App launch without token | Navigate to login | | |
| 3 | Token refresh on launch | Silent token refresh | | |

### Worker Screens

#### WorkerDashboardScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display shift status | Show clock-in/out status | | |
| 2 | Show today's tasks | List assigned tasks | | |
| 3 | Show recent reports | List recent submissions | | |
| 4 | Navigate to clock screen | Open clock screen | | |
| 5 | Pull to refresh | Refresh data | | |
| 6 | Skeleton loading | Show skeleton on load | | |
| 7 | Empty state (no tasks) | Show appropriate message | | |

#### ClockScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Clock in with valid GPS | Success message | | |
| 2 | Clock in outside area | Error with distance | | |
| 3 | Clock in without GPS | Request permission | | |
| 4 | Clock out | Confirmation dialog | | |
| 5 | Minimum shift duration | Block early clock-out | | |
| 6 | Display current location | Show on map | | |
| 7 | Battery level check | Show warning if low | | |

#### MapScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display assigned area | Show polygon | | |
| 2 | Show current location | Blue marker | | |
| 3 | Map clustering (many points) | Cluster markers | | |
| 4 | Zoom to current location | Center map | | |
| 5 | Area boundary colors | Correct colors per status | | |

#### ReportSubmissionScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Select activity type | Show dropdown | | |
| 2 | Add description | Text input | | |
| 3 | Take photo | Open camera | | |
| 4 | Select from gallery | Open picker | | |
| 5 | Remove photo | Delete from list | | |
| 6 | Submit report | Success message | | |
| 7 | Validation errors | Show field errors | | |
| 8 | Network error | Show retry option | | |

#### TaskDetailScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display task details | Show all fields | | |
| 2 | Start task | Update status | | |
| 3 | Navigate to complete | Open complete screen | | |
| 4 | Show task location | Display on map | | |

#### TaskCompleteScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Complete task | Success message | | |
| 2 | Add completion notes | Text input | | |
| 3 | Add completion photo | Camera/gallery | | |
| 4 | Validation on submit | Show errors | | |

#### TasksReportsScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | List all tasks | Show tasks list | | |
| 2 | Filter by status | Filter works | | |
| 3 | List all reports | Show reports list | | |
| 4 | Navigate to detail | Open detail screen | | |

### Profile & Settings

#### ProfileScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display user info | Show name, NIP, role | | |
| 2 | Show rayon assignment | Display rayon | | |
| 3 | Show schedule | Display shift info | | |
| 4 | Logout | Clear session, navigate | | |

### Common Components

#### Neo Brutalism Components
| # | Component | Test Cases | Status |
|---|-----------|------------|--------|
| 1 | NBButton | All variants, disabled, loading | |
| 2 | NBCard | Elevated, outlined, filled | |
| 3 | NBBadge | All colors, sizes | |
| 4 | NBTextInput | States, validation, password | |
| 5 | NBTab | Selection, scroll | |
| 6 | NBEmptyState | All 9 variants | |
| 7 | NBAlert | All 4 variants | |
| 8 | NBSkeleton | Loading animation | |

---

## Web Dashboard Testing (18 Pages)

### Authentication

#### Login Page
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Valid login | Navigate to dashboard | | |
| 2 | Invalid credentials | Show error | | |
| 3 | Session persistence | Stay logged in | | |
| 4 | Token refresh | Silent refresh | | |

### Dashboard Pages

#### Dashboard Overview
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display statistics | Show cards with counts | | |
| 2 | Real-time updates | Live data refresh | | |
| 3 | Map overview | Show all areas | | |
| 4 | Recent activity | List recent events | | |

#### Users Management
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | List all users | Paginated table | | |
| 2 | Search users | Filter by name/NIP | | |
| 3 | Create user | Form validation, save | | |
| 4 | Edit user | Update fields | | |
| 5 | Delete user | Confirmation, soft delete | | |
| 6 | Role filter | Filter by role | | |

#### Areas Management
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | List all areas | Table with map preview | | |
| 2 | Create area | Draw polygon on map | | |
| 3 | Edit area | Modify polygon | | |
| 4 | Delete area | Confirmation | | |
| 5 | KMZ import | Upload and parse | | |

#### Rayons Management
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | List all rayons | Show 7 rayons | | |
| 2 | Edit rayon | Update name, supervisor | | |
| 3 | View rayon details | Show assigned areas | | |

#### Schedules
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | View schedule calendar | Show shifts | | |
| 2 | Assign worker to shift | Drag and drop | | |
| 3 | View shift definitions | Show 3 shifts | | |
| 4 | Special day override | Create holiday | | |

#### Tasks
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | List all tasks | Filterable table | | |
| 2 | Create task | Form with assignment | | |
| 3 | Edit task | Update details | | |
| 4 | Delete task | Confirmation | | |
| 5 | Task status workflow | Pending→In Progress→Done | | |

#### Reports
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | List all reports | Paginated table | | |
| 2 | View report details | Show photos, location | | |
| 3 | Approve report | Update status | | |
| 4 | Reject report | Add reason | | |
| 5 | Export reports | CSV download | | |

#### Monitoring
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Real-time worker locations | Map with markers | | |
| 2 | Clock-in/out status | Live updates | | |
| 3 | Staffing overview | Per-area breakdown | | |
| 4 | Alerts | Show anomalies | | |

### Settings

#### Settings Page
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | View system settings | Display current config | | |
| 2 | Update settings | Save changes | | |
| 3 | Activity type management | CRUD operations | | |

---

## Cross-Browser Testing

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | Latest | | Primary |
| Firefox | Latest | | |
| Safari | Latest | | macOS only |
| Edge | Latest | | |

---

## Cross-Device Testing

### Mobile Devices
| Device | OS Version | Status | Notes |
|--------|------------|--------|-------|
| Samsung Galaxy S21 | Android 13 | | Primary |
| Google Pixel 6 | Android 14 | | |
| Xiaomi Redmi Note 11 | Android 12 | | Budget device |
| Samsung Tab S7 | Android 13 | | Tablet |

### Tablets
| Device | OS Version | Status | Notes |
|--------|------------|--------|-------|
| Samsung Tab S7 | Android 13 | | |
| iPad (9th gen) | iOS 17 | | If iOS supported |

---

## Accessibility Testing

### WCAG 2.1 AA Compliance

| Category | Test | Status |
|----------|------|--------|
| **Perceivable** | | |
| | Color contrast (4.5:1 text, 3:1 large) | |
| | Text resizing up to 200% | |
| | Images have alt text | |
| | Captions for media | |
| **Operable** | | |
| | Keyboard navigation | |
| | Focus indicators visible | |
| | No keyboard traps | |
| | Touch targets ≥48x48px | |
| **Understandable** | | |
| | Error messages clear | |
| | Labels on form fields | |
| | Consistent navigation | |
| **Robust** | | |
| | Screen reader compatible | |
| | Valid HTML | |

### Screen Reader Testing

| Reader | Platform | Status |
|--------|----------|--------|
| TalkBack | Android | |
| VoiceOver | iOS | |
| NVDA | Windows | |
| VoiceOver | macOS | |

---

## Network Condition Testing

| Condition | Test Cases | Status |
|-----------|------------|--------|
| **Fast 4G/5G** | Normal operation | |
| **Slow 3G** | Loading states, timeouts | |
| **Offline** | Cached data, queue actions | |
| **Intermittent** | Retry logic, sync | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |
