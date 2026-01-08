# Non-Functional Requirements - Phase 1 MVP

## Overview

This document describes HOW the system should behave in terms of performance, security, reliability, and maintainability.

---

## 1. Performance

### NFR-PERF-01: Response Time
| Endpoint Type | Target | Maximum |
|---------------|--------|---------|
| Auth (login) | <500ms | <1s |
| Simple GET | <200ms | <500ms |
| List endpoints | <500ms | <1s |
| File upload | <5s | <10s |
| Batch insert (50 pings) | <1s | <2s |

### NFR-PERF-02: Throughput
- Support 30 concurrent users (MVP pilot)
- Handle 10 requests/second sustained
- Peak: 50 requests/second (morning clock-in)

### NFR-PERF-03: Database Performance
- All queries under 100ms
- Use indexes on frequently queried columns
- Optimize location_pings table for bulk inserts

### NFR-PERF-04: File Upload
- Max file size: 50MB
- Compress images on mobile before upload
- Direct S3 upload (not through backend for large files)

---

## 2. Security

### NFR-SEC-01: Authentication
- JWT tokens with 7-day expiration
- Tokens contain user_id and role only
- Refresh tokens not required (MVP)
- Bcrypt password hashing (10 rounds)

### NFR-SEC-02: Authorization
- Role-based access control (RBAC)
- Roles: worker, supervisor, admin
- Guards on all protected endpoints
- Workers can only access own data

### NFR-SEC-03: Input Validation
- Validate all inputs with class-validator
- Sanitize strings to prevent XSS
- Validate GPS coordinates (-90 to 90, -180 to 180)
- Validate file types (image/*, video/*)

### NFR-SEC-04: Data Protection
- No passwords in logs or responses
- Sensitive data encrypted in transit (HTTPS)
- Database credentials in environment variables
- AWS credentials via IAM roles (production)

### NFR-SEC-05: CORS Configuration
- Allow mobile app origins
- Restrict to known domains in production
- Configurable via environment variable

---

## 3. Reliability

### NFR-REL-01: Availability
- Target: 99% uptime during pilot
- Graceful handling of database connection issues
- Retry logic for S3 uploads

### NFR-REL-02: Error Handling
- Consistent error response format:
  ```json
  {
    "statusCode": 400,
    "message": "Error description",
    "error": "Bad Request"
  }
  ```
- Log all errors with context
- Don't expose internal errors to clients

### NFR-REL-03: Data Integrity
- Use database transactions for multi-step operations
- Validate foreign key relationships
- Prevent duplicate clock-ins

### NFR-REL-04: Backup
- Daily database backups (AWS RDS automated)
- S3 versioning for media (optional for MVP)

---

## 4. Scalability

### NFR-SCALE-01: Horizontal Scaling
- Stateless API design (no session state)
- JWT tokens for authentication (no server-side sessions)
- Database connection pooling

### NFR-SCALE-02: Database Scaling
- Prepared for 500 workers (Phase 5)
- Indexes on worker_id, shift_id, timestamp
- Consider partitioning location_pings by date (future)

### NFR-SCALE-03: Storage Scaling
- S3 for all media (unlimited storage)
- Organized folder structure: `sekar-media/{year}/{month}/{type}/{filename}`

---

## 5. Maintainability

### NFR-MAINT-01: Code Quality
- TypeScript strict mode
- ESLint + Prettier formatting
- Follow NestJS best practices
- SOLID principles

### NFR-MAINT-02: Testing
- >80% test coverage per module
- Unit tests for all service methods
- Integration tests for API endpoints
- Mocks for external services (S3, database)

### NFR-MAINT-03: Documentation
- JSDoc comments on public methods
- Swagger decorators on all endpoints
- README with setup instructions
- Environment variable documentation

### NFR-MAINT-04: Logging
- Request/response logging (non-sensitive)
- Error logging with stack traces
- Structured JSON logs for production
- Log levels: error, warn, info, debug

### NFR-MAINT-05: Monitoring
- Health check endpoint (`GET /api/health`)
- Database connection monitoring
- AWS CloudWatch (production)

---

## 6. Usability

### NFR-USE-01: API Design
- RESTful conventions
- Consistent naming (kebab-case URLs, camelCase JSON)
- Meaningful HTTP status codes
- Pagination for list endpoints (optional MVP)

### NFR-USE-02: Error Messages
- Human-readable error messages
- Indonesian language for user-facing errors (future)
- Include error codes for debugging

### NFR-USE-03: API Documentation
- Swagger UI at `/api/docs`
- Example requests and responses
- Authentication instructions

---

## 7. Compatibility

### NFR-COMPAT-01: Runtime
- Node.js 18+ LTS
- PostgreSQL 14+
- Compatible with AWS RDS PostgreSQL

### NFR-COMPAT-02: Deployment
- AWS Elastic Beanstalk compatible
- Docker compatible (optional)
- Environment-based configuration

---

## 8. Compliance

### NFR-COMP-01: Data Privacy
- Only collect necessary data
- GPS data only during active shifts
- Clear data retention policy (future)

### NFR-COMP-02: Audit Trail
- Log user actions (create, update, delete)
- Track who made changes (created_by, updated_by)
- Timestamps on all records

---

## Metrics Summary

| Category | Metric | Target |
|----------|--------|--------|
| Performance | Response time | <500ms |
| Performance | Concurrent users | 30 |
| Security | Password hashing | bcrypt 10 rounds |
| Security | Token expiration | 7 days |
| Reliability | Uptime | 99% |
| Testing | Coverage | >80% |
| Database | Query time | <100ms |

---

*Last Updated: January 2026*

