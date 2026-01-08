# Phase 6 Web Dashboard - Functional Requirements

## 1. Authentication & Authorization

### FR-WEB-AUTH-001: User Login
- The system SHALL allow supervisors and administrators to log in using username and password
- The system SHALL redirect to the dashboard after successful login
- The system SHALL persist the session for 24 hours

### FR-WEB-AUTH-002: Role-Based Access
- The system SHALL restrict certain features based on user role
- Supervisors SHALL access reports, attendance, and map
- Administrators SHALL access all features including user management

### FR-WEB-AUTH-003: Session Management
- The system SHALL automatically log out after 24 hours of inactivity
- The system SHALL redirect to login on unauthorized access

---

## 2. Dashboard

### FR-WEB-DASH-001: Summary Statistics
- The dashboard SHALL display:
  - Active workers count (currently clocked in)
  - Reports submitted today
  - Areas with coverage
  - Pending tasks count

### FR-WEB-DASH-002: Charts
- The dashboard SHALL display:
  - Weekly attendance bar chart
  - Reports by condition pie chart
  - Trend indicators (up/down arrows)

### FR-WEB-DASH-003: Recent Activity
- The dashboard SHALL show the 10 most recent reports
- Each report entry SHALL show worker, area, time, and condition

---

## 3. Live Map

### FR-WEB-MAP-001: Worker Display
- The map SHALL show markers for all currently active workers
- Each marker SHALL display the worker's current GPS location
- Clicking a marker SHALL show worker info (name, area, clock-in time)

### FR-WEB-MAP-002: Area Boundaries
- The map SHALL display area boundaries as polygons
- Areas SHALL be color-coded by type
- Area names SHALL be displayed as labels

### FR-WEB-MAP-003: Real-time Updates
- The map SHALL refresh worker locations every 30 seconds
- The map SHALL indicate last update time

### FR-WEB-MAP-004: Filtering
- Users SHALL be able to filter by area
- Users SHALL be able to filter by area type
- The worker list SHALL update based on filters

---

## 4. Reports Management

### FR-WEB-RPT-001: List View
- The system SHALL display reports in a paginated table
- The table SHALL support sorting by date, worker, area
- The table SHALL support searching by worker name

### FR-WEB-RPT-002: Filters
- Users SHALL be able to filter by date range
- Users SHALL be able to filter by area
- Users SHALL be able to filter by worker
- Users SHALL be able to filter by condition
- Users SHALL be able to filter by review status

### FR-WEB-RPT-003: Report Detail
- Clicking a report SHALL open a detail view
- The detail view SHALL show:
  - Full notes
  - All photos/videos
  - Location on map
  - Worker info
  - Review status

### FR-WEB-RPT-004: Review Action
- Supervisors SHALL be able to mark reports as reviewed
- The system SHALL record reviewer ID and timestamp
- Supervisors SHALL be able to add review notes

### FR-WEB-RPT-005: Export
- Users SHALL be able to export reports to CSV
- Export SHALL respect current filters

---

## 5. Attendance Management

### FR-WEB-ATT-001: Daily View
- The system SHALL display daily attendance list
- Each entry SHALL show: worker, area, clock-in, clock-out, hours worked

### FR-WEB-ATT-002: Highlights
- Late arrivals (>15 min) SHALL be highlighted
- Early departures SHALL be highlighted
- No-shows SHALL be indicated

### FR-WEB-ATT-003: Export
- Users SHALL be able to export attendance to CSV
- Export SHALL include calculated hours

---

## 6. Worker Management

### FR-WEB-USR-001: List Workers
- The system SHALL display all workers in a table
- Table SHALL show: name, role, assigned area, status

### FR-WEB-USR-002: Add Worker
- Administrators SHALL be able to create new worker accounts
- Required fields: username, full name, password, role

### FR-WEB-USR-003: Edit Worker
- Administrators SHALL be able to edit worker details
- Administrators SHALL be able to change area assignment

### FR-WEB-USR-004: Deactivate Worker
- Administrators SHALL be able to deactivate workers
- Deactivated workers SHALL not be able to log in

---

## 7. Area Management

### FR-WEB-AREA-001: List Areas
- The system SHALL display all areas in a table
- Table SHALL show: name, type, GPS, radius, worker count

### FR-WEB-AREA-002: Add Area
- Administrators SHALL be able to create new areas
- Map picker SHALL be available for GPS selection
- Radius SHALL be configurable

### FR-WEB-AREA-003: Edit Area
- Administrators SHALL be able to edit area details
- Polygon boundaries SHALL be editable

### FR-WEB-AREA-004: KMZ Import
- Administrators SHALL be able to import areas from KMZ files
- The system SHALL preview imported areas before confirming
- The system SHALL validate KMZ file format

---

## 8. Analytics

### FR-WEB-ANA-001: Worker Performance
- The system SHALL display worker performance metrics
- Metrics SHALL include: attendance rate, reports per day, task completion

### FR-WEB-ANA-002: Area Coverage
- The system SHALL display area coverage statistics
- Statistics SHALL include: daily coverage, reports per area

### FR-WEB-ANA-003: Date Range
- Users SHALL be able to select custom date ranges
- Preset ranges SHALL include: This week, This month, Last month

---

## 9. Report Builder

### FR-WEB-RB-001: Custom Reports
- Users SHALL be able to configure custom reports
- Configurable options: metrics, filters, date range, format

### FR-WEB-RB-002: Generate Report
- Users SHALL be able to generate reports on demand
- Available formats: PDF, CSV, Excel

### FR-WEB-RB-003: Scheduled Reports
- Administrators SHALL be able to schedule automated reports
- Schedule options: Daily, Weekly, Monthly
- Reports SHALL be sent via email

---

*Last Updated: January 2026*

