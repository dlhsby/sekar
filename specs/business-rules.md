# SEKAR Business Rules

**Version:** 1.0.1
**Last Updated:** 2026-01-21
**Status:** Canonical Reference

---

## Overview

This document serves as the **single source of truth** for all business rules and configurable parameters in the SEKAR system. All other specifications must reference this document for business logic values.

**Purpose:**
- Prevent inconsistencies across specifications
- Centralize configurable parameters
- Document business logic decisions
- Facilitate configuration changes

---

## GPS and Location Rules

### Boundary Validation

| Parameter | Value | Rationale | Phase |
|-----------|-------|-----------|-------|
| **Boundary Tolerance** | 100 meters | Balance between flexibility and accuracy for Surabaya parks | Phase 1 |
| **GPS Accuracy Threshold** | ±50 meters | Minimum acceptable GPS accuracy (validated in be/src/common/constants/gps.constants.ts) | Phase 1 |
| **Location Update Interval** | 5 minutes | Balance battery life vs tracking granularity | Phase 1 |
| **Out-of-Bounds Warning** | 80 meters | Warn before rejection threshold | Phase 2 |

**Decision Context:**
- 100m chosen after testing at 30+ Surabaya locations
- Accounts for GPS drift near buildings and trees
- Can be tightened to 50m in Phase 3+ if needed

### Location Tracking

| Parameter | Value | Rationale | Phase |
|-----------|-------|-----------|-------|
| **Tracking Frequency (Active Shift)** | Every 5 minutes | Battery optimization | Phase 1 |
| **Tracking Frequency (High Activity)** | Every 2 minutes | Detailed movement tracking | Phase 3 |
| **Maximum Location Age** | 10 minutes | Consider stale if older | Phase 1 |
| **Location Batch Size** | 20 locations | Upload when threshold reached | Phase 1 |

### GPS Spoofing Detection (Phase 3+)

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Maximum Speed** | 25 km/h | Flag if exceeded (bicycles max ~20 km/h) |
| **Teleport Detection** | 500 meters in 30 seconds | Physically impossible movement |
| **Pattern Analysis Window** | 30 minutes | Analyze location history |

---

## Attendance and Shift Rules

### Clock-In Requirements

| Requirement | Rule | Phase |
|-------------|------|-------|
| **GPS Validation** | Must be within 100m of assigned area | Phase 1 |
| **Selfie Photo** | Required, front camera, max 5MB | Phase 1 |
| **Photo Compression** | Target 500KB, 1200px max dimension | Phase 1 |
| **Time Window** | Can clock in up to 30 minutes early | Phase 2 |
| **Duplicate Prevention** | Cannot clock in if already active shift | Phase 1 |

### Clock-Out Requirements

| Requirement | Rule | Phase |
|-------------|------|-------|
| **GPS Validation** | Must be within 100m of assigned area | Phase 1 |
| **Minimum Shift Duration** | 5 minutes (updated from 15 based on user feedback) | Phase 1 |
| **Maximum Shift Duration** | 12 hours (auto clock-out + alert) | Phase 2 |
| **Work Reports** | At least 1 report required for shifts >2 hours | Phase 2 |

### Shift Calculations

| Metric | Formula | Notes |
|--------|---------|-------|
| **Work Duration** | `clock_out_time - clock_in_time` | Excludes break time (Phase 2+) |
| **Overtime Threshold** | 8 hours per day | Indonesian labor law standard |
| **Daily Hours Limit** | 12 hours | Safety regulation |

---

## Work Report Rules

### Report Submission Requirements

| Requirement | Rule | Phase |
|-------------|------|-------|
| **Active Shift Required** | Can only submit during clocked-in shift | Phase 1 |
| **Photo Evidence** | Minimum 1 photo, maximum 5 photos | Phase 1 |
| **Photo Size** | Max 5MB original, compressed to <500KB | Phase 1 |
| **Video Evidence** | Optional, max 30MB, 30 seconds | Phase 2 |
| **Description** | Minimum 10 characters, maximum 500 characters | Phase 1 |
| **GPS Coordinates** | Automatically captured from device | Phase 1 |

### Report Types (Work Categories)

| Type | Code | Description | Phase |
|------|------|-------------|-------|
| Pembersihan | CLEANING | General cleaning activities | Phase 1 |
| Pemangkasan | PRUNING | Tree and plant pruning | Phase 1 |
| Penyiraman | WATERING | Plant watering | Phase 1 |
| Pemupukan | FERTILIZING | Fertilizer application | Phase 1 |
| Perbaikan | REPAIR | Infrastructure repairs | Phase 1 |
| Lainnya | OTHER | Other maintenance work | Phase 1 |

### Report Review (Supervisor)

| Parameter | Rule | Phase |
|-----------|------|-------|
| **Review Deadline** | 24 hours from submission | Phase 2 |
| **Auto-Approval** | After 48 hours if not reviewed | Phase 3 |
| **Rejection Reason** | Required if status = 'rejected' | Phase 1 |
| **Re-submission** | Allowed once per report | Phase 2 |

---

## Authentication and Authorization

### Password Policy

| Rule | Value | Phase |
|------|-------|-------|
| **Minimum Length** | 8 characters | Phase 1 |
| **Complexity** | Optional (not enforced in Phase 1) | Phase 1 |
| **Expiration** | Never (Phase 1), 90 days (Phase 3+) | Phase 1 |
| **History** | Cannot reuse last 3 passwords (Phase 3+) | Phase 3 |
| **Failed Attempts** | 5 attempts before 15-minute lockout | Phase 2 |

### Token Lifetimes

| Token Type | Lifetime | Renewal | Phase |
|------------|----------|---------|-------|
| **Access Token (JWT)** | 15 minutes | Via refresh token | Phase 1 |
| **Refresh Token** | 7 days | One-time use rotation | Phase 1 |
| **Session (Web)** | 8 hours | Sliding window | Phase 6 |

### Role Permissions

| Resource | Worker | Supervisor | Admin |
|----------|--------|------------|-------|
| **Clock In/Out** | Own only | View all | View all |
| **Submit Reports** | Yes | Yes | Yes |
| **Review Reports** | No | Assigned areas | All |
| **Manage Users** | No | No | Yes |
| **Manage Areas** | No | View only | Yes |
| **View Dashboard** | Own data | Assigned areas | All |
| **Export Data** | No | Assigned areas | All |

---

## API Rate Limits

### Request Limits

| Endpoint Category | Limit | Window | Phase |
|-------------------|-------|--------|-------|
| **Authentication** | 5 requests | 1 minute | Phase 1 |
| **General API** | 100 requests | 1 minute | Phase 1 |
| **File Upload** | 10 requests | 1 minute | Phase 1 |
| **Bulk Operations** | 5 requests | 5 minutes | Phase 6 |
| **Report Generation** | 3 requests | 10 minutes | Phase 3 |

### Response Codes

| Scenario | Status Code | Error Code |
|----------|-------------|------------|
| Rate limit exceeded | 429 Too Many Requests | `RATE_LIMIT_EXCEEDED` |
| Temporary ban (abuse) | 403 Forbidden | `RATE_LIMIT_ABUSE` |

---

## Data Retention and Cleanup

### Retention Periods

| Data Type | Retention | Archive After | Delete After | Phase |
|-----------|-----------|---------------|--------------|-------|
| **Active Shifts** | Forever | N/A | Never | Phase 1 |
| **Location Logs** | Forever | 6 months (cold storage) | Never | Phase 1 |
| **Work Reports** | Forever | 1 year | Never | Phase 1 |
| **Photos (Synced)** | 7 days local | Upload immediately | After sync | Phase 1 |
| **Photos (Server)** | Forever | 1 year (S3 Glacier) | Never | Phase 1 |
| **Deleted Users** | 90 days (soft delete) | N/A | 90 days | Phase 1 |
| **Audit Logs** | 1 year | 1 year | N/A | Phase 6 |

### Database Partitioning

| Table | Partition By | Partition Size | Phase |
|-------|--------------|----------------|-------|
| **location_logs** | RANGE (logged_at) | 1 month | Phase 1 |
| **audit_logs** | RANGE (created_at) | 3 months | Phase 6 |

---

## Media and File Handling

### Photo Specifications

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Original Max Size** | 5 MB | Mobile camera raw limit |
| **Compressed Target Size** | 500 KB | Balance quality vs bandwidth |
| **Max Dimensions** | 1200 x 1200 px | Sufficient for evidence |
| **Compression Quality** | 70% JPEG | Optimal size/quality ratio |
| **Thumbnail Size** | 200 x 200 px | For list views |
| **Accepted Formats** | JPEG, PNG | Standard image formats |

### Video Specifications (Phase 2+)

| Parameter | Value |
|-----------|-------|
| **Max Duration** | 30 seconds |
| **Max File Size** | 30 MB |
| **Accepted Formats** | MP4, MOV |
| **Compression** | H.264 codec |
| **Resolution** | 720p max |

### Storage Quotas

| User Type | Photo Quota | Video Quota (Phase 2+) |
|-----------|-------------|------------------------|
| **Worker** | 50 MB per day | 100 MB per day |
| **Supervisor** | Unlimited | Unlimited |
| **Admin** | Unlimited | Unlimited |

---

## Offline Queue Management

### Queue Limits

| Parameter | Value | Phase |
|-----------|-------|-------|
| **Max Queue Size** | 100 items | Phase 1 |
| **Max Queue Age** | 7 days | Phase 1 |
| **Auto-Retry Attempts** | 3 attempts | Phase 1 |
| **Retry Backoff** | 1min, 5min, 15min | Phase 1 |
| **Queue Priority** | Clock-ins > Reports > Location logs | Phase 1 |

### Sync Behavior

| Scenario | Behavior |
|----------|----------|
| **Network Restored** | Auto-sync queue oldest-first |
| **Conflict Detected** | Server wins, local marked as conflict |
| **Sync Failure** | Keep in queue, increment retry count |
| **Queue Full** | Block new actions, alert user |

---

## Notifications (Phase 2+)

### Push Notification Triggers

| Event | Recipient | Timing |
|-------|-----------|--------|
| **New Task Assigned** | Worker | Immediate |
| **Report Reviewed** | Worker | Within 5 minutes |
| **Shift Reminder** | Worker | 15 minutes before |
| **Late Clock-In** | Supervisor | 30 minutes after shift start |
| **No Reports Submitted** | Supervisor | After 4 hours of shift |
| **Worker Out-of-Bounds** | Supervisor | Immediate |

### Notification Delivery

| Parameter | Value |
|-----------|-------|
| **Max Daily Per User** | 50 notifications |
| **Quiet Hours** | 22:00 - 06:00 WIB |
| **Retry on Failure** | 3 attempts over 1 hour |

---

## Performance Thresholds

### Response Time Targets

| Endpoint Type | Target | Max Acceptable | Phase |
|---------------|--------|----------------|-------|
| **Authentication** | <200ms | 500ms | Phase 1 |
| **Clock-In/Out** | <500ms | 1s | Phase 1 |
| **List Workers** | <300ms | 800ms | Phase 1 |
| **Submit Report** | <1s | 3s | Phase 1 |
| **Photo Upload** | <5s | 15s | Phase 1 |
| **Dashboard Load** | <1s | 2s | Phase 1 |

### Database Query Targets

| Query Type | Target | Max Acceptable |
|------------|--------|----------------|
| **Single Record** | <10ms | 50ms |
| **List Query** | <100ms | 500ms |
| **Dashboard Aggregations** | <500ms | 1s |
| **Report Generation** | <5s | 15s |

---

## Scalability Parameters

### System Capacity (Current)

| Metric | Phase 1 Target | Phase 2+ Target |
|--------|----------------|-----------------|
| **Concurrent Users** | 50 workers | 500 workers |
| **Active Shifts** | 30 simultaneous | 300 simultaneous |
| **Daily Reports** | 100 reports | 1,000 reports |
| **Location Logs** | 48,000/day | 480,000/day |
| **API Requests** | 10,000/hour | 100,000/hour |

### Database Connection Pooling

| Environment | Pool Size | Max Connections |
|-------------|-----------|-----------------|
| **Development** | 5 per instance | 20 total |
| **Production** | 15 per instance | 60 total (4 instances) |
| **RDS max_connections** | 150 | Reserve 90 for overhead |

---

## Error Handling

### Retry Logic

| Error Type | Retry | Backoff | Max Attempts |
|------------|-------|---------|--------------|
| **Network Timeout** | Yes | Exponential (1s, 2s, 4s) | 3 |
| **503 Service Unavailable** | Yes | Linear (5s, 10s, 15s) | 3 |
| **500 Internal Server Error** | Yes | Linear (1s, 5s, 10s) | 3 |
| **401 Unauthorized** | No | N/A | 0 (redirect to login) |
| **400 Bad Request** | No | N/A | 0 (show error to user) |
| **409 Conflict** | No | N/A | 0 (resolve manually) |

### Circuit Breaker (Phase 2+)

| Parameter | Value |
|-----------|-------|
| **Failure Threshold** | 50% error rate over 1 minute |
| **Open Duration** | 30 seconds |
| **Half-Open Test** | 1 request |

---

## Localization

### Language Support

| Phase | Languages | Default |
|-------|-----------|---------|
| Phase 1 | Indonesian only | id-ID |
| Phase 5+ | Indonesian, English | id-ID |

### Date/Time Format

| Context | Format | Example |
|---------|--------|---------|
| **Timestamps** | ISO 8601 with WIB | 2026-01-16T14:30:00+07:00 |
| **Display (Short)** | DD/MM/YYYY HH:mm | 16/01/2026 14:30 |
| **Display (Long)** | DD MMMM YYYY, HH:mm WIB | 16 Januari 2026, 14:30 WIB |
| **API Responses** | ISO 8601 UTC | 2026-01-16T07:30:00Z |

### Number Format

| Type | Format | Example |
|------|--------|---------|
| **Currency** | Rp #.###.###,- | Rp 1.500.000,- |
| **Decimal** | #.###,## | 123.456,78 |
| **Distance** | ### meter | 150 meter |

---

## Compliance and Security

### Data Privacy (Phase 3+)

| Requirement | Rule |
|-------------|------|
| **PII Retention** | 2 years after user deletion |
| **Data Export** | User can request JSON export |
| **Right to Erasure** | Full deletion after 90-day soft delete |
| **Location Sharing** | Opt-in for supervisor tracking |

### Security Standards

| Standard | Compliance Level | Phase |
|----------|------------------|-------|
| **OWASP Top 10** | Full compliance | Phase 1 |
| **HTTPS** | Required for all endpoints | Phase 1 |
| **Certificate Pinning** | Mobile apps | Phase 3 |
| **Jailbreak Detection** | Mobile apps | Phase 3 |

---

## Configuration Override Process

**How to Change a Business Rule:**

1. **Propose Change** - Create GitHub issue with rationale
2. **Impact Analysis** - Assess affected specs, code, tests
3. **Update This Document** - Change value and rationale
4. **Update Specs** - Update all referencing specification files
5. **Update Code** - Move hardcoded value to environment config
6. **Update Tests** - Update test data and assertions
7. **Deploy** - Use feature flag for gradual rollout (Phase 2+)

**Example: Changing GPS Tolerance**

```
Current: 100 meters
Proposed: 75 meters
Rationale: Improved GPS accuracy from hardware upgrade

Affected Files:
- specs/business-rules.md (this file)
- specs/architecture/data-flow.md
- specs/architecture/security.md
- specs/phases/phase-1-mvp/README.md
- be/src/common/utils/gps.util.ts
- be/src/common/utils/gps.util.spec.ts
- fe/mobile/src/utils/gpsUtils.ts

Configuration:
- Add GPS_BOUNDARY_TOLERANCE_METERS=75 to .env
```

---

## References

This document is referenced by:
- `specs/architecture/system-overview.md`
- `specs/architecture/data-flow.md`
- `specs/architecture/security.md`
- `specs/api/contracts.md`
- `specs/mobile/screens.md`
- `specs/mobile/offline-sync.md`
- `specs/database/schema.md`
- All phase-specific implementation guides

**Last Reviewed:** 2026-01-21
**Next Review:** After Phase 2 begins
**Maintained By:** System Architect + Product Owner
