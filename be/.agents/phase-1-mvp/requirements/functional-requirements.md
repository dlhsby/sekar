# Functional Requirements - Phase 1 MVP

## Overview

This document describes WHAT the backend must do, organized by user role and feature area.

---

## 1. Authentication

### FR-AUTH-01: User Login
**As a** user (worker/supervisor/admin)  
**I want to** login with username and password  
**So that** I can access the system

**Acceptance Criteria:**
- [x] Accept username and password
- [x] Validate credentials against database
- [x] Return JWT token on success (7-day expiration)
- [x] Return user info (id, username, full_name, role)
- [x] Return 401 for invalid credentials
- [x] Password never returned in response

### FR-AUTH-02: Get Current User
**As a** logged-in user  
**I want to** retrieve my profile information  
**So that** I can see my role and assigned area

**Acceptance Criteria:**
- [x] Require valid JWT token
- [x] Return user info with assigned area (if worker)
- [x] Return 401 for invalid/expired token

---

## 2. User Management

### FR-USER-01: Create User (Admin)
**As an** admin  
**I want to** create new user accounts  
**So that** workers and supervisors can access the system

**Acceptance Criteria:**
- [x] Only admin role can create users
- [x] Username must be unique
- [x] Password is hashed before storage
- [x] Default role is 'worker' if not specified
- [x] Return created user (without password)

### FR-USER-02: List Users (Admin/Supervisor)
**As an** admin or supervisor  
**I want to** view all users  
**So that** I can manage the team

**Acceptance Criteria:**
- [x] Admin and supervisor can view
- [x] Workers cannot view user list
- [x] Return all active users (not soft-deleted)
- [x] Include role information

### FR-USER-03: Get User Details (Admin/Supervisor)
**As an** admin or supervisor  
**I want to** view a specific user's details  
**So that** I can see their information

**Acceptance Criteria:**
- [x] Return user info by ID
- [x] Include assigned area for workers
- [x] Return 404 for non-existent user

### FR-USER-04: Update User (Admin)
**As an** admin  
**I want to** update user information  
**So that** I can correct or modify user data

**Acceptance Criteria:**
- [x] Only admin can update
- [x] Can update: full_name, role
- [x] Password update with re-hashing
- [x] Username cannot be changed

### FR-USER-05: Deactivate User (Admin)
**As an** admin  
**I want to** deactivate a user account  
**So that** they can no longer access the system

**Acceptance Criteria:**
- [x] Soft delete (mark as inactive)
- [x] User cannot login after deactivation
- [x] User does not appear in active lists

---

## 3. Area Management

### FR-AREA-01: Create Area Type
**As an** admin  
**I want to** define area types  
**So that** areas can be categorized

**Acceptance Criteria:**
- [ ] Create area type with code, name, description
- [ ] Code must be unique
- [ ] Predefined types: park, pedestrian, mini_garden, street

### FR-AREA-02: List Area Types
**As a** user  
**I want to** see all area types  
**So that** I can filter by type

**Acceptance Criteria:**
- [ ] Return all area types
- [ ] Include code, name, description

### FR-AREA-03: Create Area
**As an** admin  
**I want to** create work areas  
**So that** workers can be assigned to them

**Acceptance Criteria:**
- [ ] Name, area_type_id required
- [ ] GPS coordinates (lat, lng) required
- [ ] Radius in meters (default 100m)
- [ ] Optional address field

### FR-AREA-04: List Areas
**As a** user  
**I want to** see all work areas  
**So that** I know where to work

**Acceptance Criteria:**
- [ ] Return all active areas
- [ ] Include area type information
- [ ] Filter by area type (optional)

### FR-AREA-05: Update Area
**As an** admin  
**I want to** update area information  
**So that** I can correct boundaries or names

**Acceptance Criteria:**
- [ ] Update name, GPS, radius, address
- [ ] Cannot change area type (delete and recreate)

### FR-AREA-06: Delete Area
**As an** admin  
**I want to** remove an area  
**So that** it's no longer used

**Acceptance Criteria:**
- [ ] Soft delete preferred
- [ ] Cannot delete if workers assigned

---

## 4. Worker Assignments

### FR-ASSIGN-01: Assign Worker to Area
**As an** admin/supervisor  
**I want to** assign workers to areas  
**So that** they can clock in at their designated location

**Acceptance Criteria:**
- [ ] One worker can have one area assignment (MVP)
- [ ] Store assignment date
- [ ] Return worker's current assignment

### FR-ASSIGN-02: Get Worker Assignment
**As a** user  
**I want to** see a worker's assigned area  
**So that** I know where they should be

**Acceptance Criteria:**
- [ ] Return area info for worker
- [ ] Return null if not assigned

### FR-ASSIGN-03: Remove Assignment
**As an** admin/supervisor  
**I want to** remove a worker's assignment  
**So that** they can be reassigned

**Acceptance Criteria:**
- [ ] Remove assignment record
- [ ] Worker can still view historical data

---

## 5. Shift Tracking

### FR-SHIFT-01: Clock In
**As a** worker  
**I want to** clock in to start my shift  
**So that** my attendance is recorded

**Acceptance Criteria:**
- [ ] Require GPS coordinates
- [ ] Require selfie photo
- [ ] Validate GPS within assigned area (±100m)
- [ ] Upload selfie to S3
- [ ] Create shift record with clock_in_time
- [ ] Return 400 if already clocked in
- [ ] Return 400 if outside area boundary

### FR-SHIFT-02: Clock Out
**As a** worker  
**I want to** clock out to end my shift  
**So that** my hours are recorded

**Acceptance Criteria:**
- [ ] Require GPS coordinates
- [ ] Update shift with clock_out_time
- [ ] Calculate total hours worked
- [ ] Return 400 if not clocked in

### FR-SHIFT-03: Get Current Shift
**As a** worker  
**I want to** see my current shift status  
**So that** I know if I'm clocked in

**Acceptance Criteria:**
- [ ] Return active shift if exists
- [ ] Include area name, clock_in_time, hours_worked
- [ ] Return null if not clocked in

### FR-SHIFT-04: Validate GPS Boundary
**As the** system  
**I want to** validate GPS is within area boundary  
**So that** workers can only clock in at their assigned location

**Acceptance Criteria:**
- [ ] Calculate distance from area center
- [ ] Compare against area radius
- [ ] Return boolean result
- [ ] Handle edge cases (equator, poles)

---

## 6. Work Reports

### FR-REPORT-01: Create Report
**As a** worker  
**I want to** submit work reports  
**So that** I can document my work

**Acceptance Criteria:**
- [ ] Require active shift
- [ ] Include notes (max 500 chars)
- [ ] Optional condition rating (Baik/Cukup/Buruk)
- [ ] Include GPS coordinates
- [ ] Create report with timestamp

### FR-REPORT-02: Upload Media
**As a** worker  
**I want to** attach photos/videos to reports  
**So that** I can provide evidence

**Acceptance Criteria:**
- [ ] Accept image/* and video/*
- [ ] Max file size 50MB
- [ ] Upload to S3
- [ ] Create report_media record
- [ ] Generate thumbnail for images (optional)

### FR-REPORT-03: Get My Reports
**As a** worker  
**I want to** see my submitted reports  
**So that** I can review my work

**Acceptance Criteria:**
- [ ] Filter by date
- [ ] Return reports with media URLs
- [ ] Order by newest first

### FR-REPORT-04: Get Report Details
**As a** user  
**I want to** view report details  
**So that** I can see the full information

**Acceptance Criteria:**
- [ ] Return all report fields
- [ ] Include media list
- [ ] Include worker and area info

### FR-REPORT-05: Review Report (Supervisor)
**As a** supervisor  
**I want to** mark reports as reviewed  
**So that** I track what I've seen

**Acceptance Criteria:**
- [ ] Set reviewed = true
- [ ] Record reviewed_by and reviewed_at
- [ ] Only supervisors can review

---

## 7. Location Tracking

### FR-LOC-01: Batch Upload Pings
**As a** worker (mobile app)  
**I want to** upload location pings in batch  
**So that** my location history is recorded

**Acceptance Criteria:**
- [ ] Accept array of pings
- [ ] Each ping: timestamp, lat, lng, accuracy
- [ ] Associate with active shift
- [ ] Efficient bulk insert
- [ ] Return inserted count

---

## 8. Supervisor Dashboard

### FR-SUP-01: Get Active Workers
**As a** supervisor  
**I want to** see all currently active workers  
**So that** I know who is working

**Acceptance Criteria:**
- [ ] Return workers with active shifts
- [ ] Include last known location
- [ ] Include area and area type
- [ ] Include clock-in time

### FR-SUP-02: Get Reports (Filtered)
**As a** supervisor  
**I want to** view reports with filters  
**So that** I can review specific reports

**Acceptance Criteria:**
- [ ] Filter by date (default today)
- [ ] Filter by worker_id
- [ ] Filter by area_id
- [ ] Filter by area_type
- [ ] Include thumbnails

### FR-SUP-03: Get Attendance
**As a** supervisor  
**I want to** see attendance for a date  
**So that** I can track who worked

**Acceptance Criteria:**
- [ ] Filter by date
- [ ] Filter by area/area_type
- [ ] Return clock-in/out times
- [ ] Calculate hours worked
- [ ] Include reports count

---

## Priority Legend

- **P0 - Critical:** Must have for pilot
- **P1 - High:** Important but workaround exists
- **P2 - Medium:** Nice to have

| Feature | Priority |
|---------|----------|
| Auth | P0 |
| Users CRUD | P0 |
| Areas CRUD | P0 |
| Clock-in/out | P0 |
| GPS Validation | P0 |
| Work Reports | P0 |
| Photo Upload | P0 |
| Location Tracking | P1 |
| Supervisor Dashboard | P0 |
| Report Review | P1 |

---

*Last Updated: January 2026*

