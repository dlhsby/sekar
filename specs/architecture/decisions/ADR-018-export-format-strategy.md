# ADR-018: Export Format Strategy (CSV + Excel via exceljs)

## Status

Accepted

## Date

2026-03-12

## Context

Phase 3 Requirement #10 requires export functionality for all entity types (users, areas, rayons, tasks, activities, overtime, schedules). We need to decide:

1. Which formats to support
2. Which library to use for Excel generation
3. How to handle large exports (>5000 rows)

### Requirements

- CSV export for all 7 entity types (simple, universal)
- Excel export with formatting (headers, column widths, data types)
- KMZ export for areas (boundary polygon data)
- Role-based access control (some entities restricted)
- Large dataset handling without blocking the server

## Decision

**Support CSV + Excel (via exceljs) + KMZ (for areas only)**, with async job processing for large exports.

### Format Strategy

| Format | Library | Use Case | Max Sync Rows |
|--------|---------|----------|--------------|
| CSV | Built-in (stream) | Universal import/export, data migration | 5,000 |
| XLSX | exceljs | Formatted reports, human-readable | 5,000 |
| KMZ | archiver + XML builder | Area boundary export for GIS tools | Always sync (few areas) |

### Why exceljs

| Library | Stars | Streaming | Formatting | Size | License |
|---------|-------|-----------|------------|------|---------|
| exceljs | 13k+ | Yes | Full (fonts, colors, borders, auto-width) | 2.5MB | MIT |
| xlsx (SheetJS) | 35k+ | Community only | Limited (CE) | 3.1MB | Apache 2.0 |
| excel4node | 1k | No | Good | 1.2MB | MIT |

exceljs supports streaming writes (critical for large exports) and full formatting without requiring a commercial license.

### Async Export Pattern

```
Request flow:
1. POST /export { entityType: "users", format: "xlsx", filters: { startDate, ... } }
   - Semantically correct: creates an export job (resource creation = POST)
2. If estimated rows < 5,000 → stream response directly (200 OK with file)
3. If estimated rows >= 5,000 → create export_jobs record, return 202 Accepted { jobId }
4. Background: generate file, upload to S3, update export_jobs.status
5. Client polls: GET /export/jobs/{jobId} → { status, file_url }
6. Cleanup: cron deletes export_jobs and S3 files after 30 days
```

## Consequences

### Positive

- CSV covers universal interoperability (other systems, bulk import)
- Excel provides human-friendly reports with formatting
- KMZ maintains GIS tool compatibility for area boundaries
- Streaming prevents memory exhaustion on large exports
- Async jobs prevent request timeouts for large datasets

### Negative

- exceljs adds ~2.5MB to backend bundle
- Async exports require polling (no real-time progress)
- S3 storage for export files adds cost (mitigated by 30-day cleanup)
- Three format implementations to maintain

### Mitigations

- exceljs is tree-shakeable; only import what's needed
- Export files are temporary (30-day retention cron)
- Rate limiting (5 exports/min) prevents abuse

### Retry Policy

Export jobs that remain in `processing` status for more than 10 minutes are considered stalled. A cron job scans for these jobs and retries them automatically:

- **Maximum retries:** 3 attempts
- **Retry intervals:** immediate re-queue → 5 minutes → 10 minutes
- **After 3 failures:** job status set to `failed` with the last error message stored; no further retries are attempted; the client polling `GET /export/jobs/{jobId}` will receive `{ status: "failed", error: "<message>" }`
- **Rationale:** Transient S3 upload failures and temporary DB connection issues should self-heal within a few minutes; 3 retries cover the vast majority of transient errors without masking persistent failures

## Alternatives Considered

1. **PDF export** — Rejected; not easily importable, complex layout engine needed
2. **JSON export** — Rejected; not user-friendly for non-technical users
3. **Google Sheets API** — Rejected; requires Google account, adds external dependency
4. **xlsx (SheetJS Pro)** — Rejected; full features require commercial license
