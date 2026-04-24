# API Error Handling

Complete error handling patterns and standards for SEKAR Backend API.

## Error Response Format

All API errors follow a consistent JSON structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-01-16T07:30:00.000Z",
  "path": "/api/shifts/clock-in"
}
```

### Error Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | number | HTTP status code |
| `message` | string \| string[] | Error message(s) |
| `error` | string | Error type/category |
| `timestamp` | string | ISO 8601 timestamp |
| `path` | string | Request path that caused the error |

---

## Standardized Error Codes (53 Total)

The SEKAR API uses standardized error codes defined in `ApiErrorCode` enum for consistent error handling.

### Authentication Errors (5 codes)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid username or password provided during login |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT token has expired and needs to be refreshed |
| `AUTH_TOKEN_INVALID` | 401 | JWT token is malformed, invalid, or tampered with |
| `AUTH_ACCOUNT_INACTIVE` | 401 | User account has been deactivated by admin |
| `AUTH_USER_NOT_FOUND` | 401 | User not found or has been deleted |

### Shift Errors (7 codes)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SHIFT_ALREADY_ACTIVE` | 400 | Worker already has an active shift and cannot clock in again |
| `SHIFT_NOT_FOUND` | 404 | Shift with given ID not found |
| `SHIFT_NOT_ACTIVE` | 400 | No active shift found for clock-out operation |
| `SHIFT_GPS_OUT_OF_BOUNDS` | 400 | GPS coordinates are outside the allowed area boundary ⚠️ Phase 2C: No longer thrown — soft polygon geofencing sets `clock_in_outside_boundary` flag instead |
| `SHIFT_NOT_ASSIGNED` | 400 | Worker is not assigned to any area or the requested area ⚠️ Phase 2C: Updated — area auto-detected from schedule, clock-in allowed with no area |
| `SHIFT_PHOTO_UPLOAD_FAILED` | 400 | Failed to upload clock-in/out selfie photo |
| `SHIFT_DURATION_TOO_SHORT` | 400 | Shift duration is below the minimum required duration (default: 5 minutes, configurable) |

### Activity Errors (11 codes) ✅ Implemented (Phase 2C)

> Renamed from `REPORT_*` to `ACTIVITY_*` per [ADR-010](../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md). Table `work_reports` → `activities`.

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ACTIVITY_SHIFT_REQUIRED` | 400 | Activity must be created during an active shift |
| `ACTIVITY_SHIFT_NOT_FOUND` | 404 | Shift not found or doesn't belong to user |
| `ACTIVITY_EDIT_WINDOW_CLOSED` | 403 | Activities can only be edited within 1 hour of creation |
| `ACTIVITY_PHOTO_REQUIRED` | 400 | Activity requires a photo attachment |
| `ACTIVITY_NOT_FOUND` | 404 | Activity not found |
| `ACTIVITY_ACCESS_DENIED` | 403 | User can only access their own activities |
| `ACTIVITY_PHOTO_UPLOAD_FAILED` | 400 | Failed to upload activity photo |
| `ACTIVITY_MUST_CLOCK_IN` | 400 | Must have active shift to submit activity |
| `ACTIVITY_ROLE_MISMATCH` | 403 | Activity type not applicable to user's role |
| `ACTIVITY_MAX_PHOTOS` | 400 | Maximum 3 photos per activity |
| `ACTIVITY_MIN_PHOTOS` | 400 | Minimum 1 photo required |
| `ACTIVITY_ALREADY_PROCESSED` | 400 | Aktivitas sudah diproses (approve/reject on non-pending activity) |
| `ACTIVITY_HIERARCHY_MISMATCH` | 403 | Approver role doesn't match submitter's hierarchy level |
| `ACTIVITY_SCOPE_MISMATCH` | 403 | Approver not in same area/rayon as activity |
| `ACTIVITY_REJECTION_REASON_REQUIRED` | 400 | Alasan penolakan wajib diisi |

### Task Workflow Errors (7 codes) ✅ Implemented (Phase 2C)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TASK_NOT_ASSIGNEE` | 403 | Anda bukan penerima tugas ini (accept/decline by non-assignee) |
| `TASK_INVALID_STATUS_FOR_ACCEPT` | 400 | Tugas tidak dalam status ditugaskan (accept when not assigned) |
| `TASK_DECLINE_REASON_REQUIRED` | 400 | Alasan penolakan wajib diisi |
| `TASK_NOT_COMPLETED` | 400 | Tugas belum diselesaikan (verify on non-completed task) |
| `TASK_VERIFY_UNAUTHORIZED` | 403 | Anda tidak berwenang memverifikasi tugas ini (wrong hierarchy) |
| `TASK_VERIFY_SCOPE_MISMATCH` | 403 | Anda hanya dapat memverifikasi tugas di area/rayon Anda |
| `TASK_REVISION_REASON_REQUIRED` | 400 | Alasan revisi wajib diisi |

### Sync Errors (3 codes)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SYNC_CONFLICT` | 409 | Data conflict detected during sync operation |
| `SYNC_STALE_DATA` | 412 | Client data is outdated and needs refresh |
| `SYNC_PARTIAL_FAILURE` | 207 | Some items in batch operation failed |

### Area Errors (2 codes)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AREA_NOT_FOUND` | 404 | Area not found |
| `AREA_CODE_DUPLICATE` | 409 | Area code already exists |

### Worker Assignment Errors ~~(2 codes)~~ ✅ REMOVED (Phase 2C)

> `worker_assignments` table dropped. Area association managed via `schedules` table. Error codes `ASSIGNMENT_NOT_FOUND` and `ASSIGNMENT_ALREADY_EXISTS` removed.

### Monitoring Errors (6 codes) ✅ Implemented (Phase 2D)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MONITORING_CONFIG_INVALID` | 400 | Invalid monitoring configuration value. Threshold value outside allowed range (e.g., active_max_age < 60 or > 600) |
| `MONITORING_CONFIG_NOT_FOUND` | 404 | Monitoring configuration not found. Requested config key does not exist |
| `MONITORING_BOUNDARY_INVALID` | 400 | Invalid boundary polygon. GeoJSON polygon is malformed or has < 3 points |
| `MONITORING_BOUNDARY_OUTSIDE_BOUNDS` | 400 | Boundary outside Surabaya. Polygon coordinates fall outside Surabaya city bounds |
| `MONITORING_REASSIGN_SCOPE_DENIED` | 403 | Cannot reassign outside your scope. Supervisor trying to reassign worker outside their rayon/area scope |
| `MONITORING_REASSIGN_CONFLICT` | 409 | Worker already reassigned. Worker has a pending reassignment that hasn't been processed |

### General Errors (5 codes)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed (DTO validation) |
| `NOT_FOUND` | 404 | Resource not found |
| `FORBIDDEN` | 403 | User doesn't have permission to perform action |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `BAD_REQUEST` | 400 | Invalid request parameters |

---

## HTTP Status Codes

### Success Codes (2xx)
- `200 OK` - Successful GET, PATCH, DELETE requests
- `201 Created` - Successful POST requests creating new resources
- `204 No Content` - Successful DELETE with no response body

### Client Error Codes (4xx)
- `400 Bad Request` - Invalid input, validation errors
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User lacks permission for the requested action
- `404 Not Found` - Requested resource doesn't exist
- `409 Conflict` - Resource conflict (e.g., duplicate entry, business rule violation)
- `413 Payload Too Large` - Request body or file too large
- `422 Unprocessable Entity` - Valid JSON but semantic errors

### Server Error Codes (5xx)
- `500 Internal Server Error` - Unexpected server error
- `503 Service Unavailable` - Service temporarily unavailable

---

## Error Categories

### 1. Validation Errors (400)

**Cause:** Input data fails class-validator checks

**Example Request:**
```http
POST /api/users HTTP/1.1
Content-Type: application/json

{
  "name": "",
  "phone": "123",
  "password": "weak"
}
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "phone must be between 10 and 13 characters",
    "password must be at least 6 characters"
  ],
  "error": "Bad Request"
}
```

**Implementation:**
```typescript
// DTO with class-validator
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Length(10, 13)
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

---

### 2. Authentication Errors (401)

#### Invalid or Missing Token

**Cause:** JWT token missing, malformed, or expired

**Request:**
```http
GET /api/users/me HTTP/1.1
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### Invalid Credentials

**Cause:** Wrong phone/password combination

**Request:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "phone": "081234567890",
  "password": "wrongpassword"
}
```

**Response (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**Implementation:**
```typescript
// auth.service.ts
async validateUser(phone: string, password: string): Promise<User> {
  const user = await this.usersService.findByPhone(phone);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new UnauthorizedException('Invalid credentials');
  }
  
  return user;
}
```

---

### 3. Authorization Errors (403)

**Cause:** User authenticated but lacks permission

**Request:**
```http
DELETE /api/users/abc-123 HTTP/1.1
Authorization: Bearer <worker_token>
```

**Response (403):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Implementation:**
```typescript
// Controller with role guard
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@Delete(':id')
async delete(@Param('id') id: string) {
  // Only admin can access
}
```

---

### 4. Not Found Errors (404)

**Cause:** Requested resource doesn't exist

**Request:**
```http
GET /api/areas/non-existent-uuid HTTP/1.1
Authorization: Bearer <token>
```

**Response (404):**
```json
{
  "statusCode": 404,
  "message": "Area not found",
  "error": "Not Found"
}
```

**Implementation:**
```typescript
// areas.service.ts
async findOne(id: string): Promise<Area> {
  const area = await this.areasRepository.findOne({
    where: { id, deleted_at: IsNull() },
  });
  
  if (!area) {
    throw new NotFoundException('Area not found');
  }
  
  return area;
}
```

---

### 5. Conflict Errors (409)

**Cause:** Business rule violation or duplicate resource

#### Already Clocked In
**Request:**
```http
POST /api/shifts/clock-in HTTP/1.1
Content-Type: application/json

{
  "area_id": "area-uuid",
  "latitude": -7.2756,
  "longitude": 112.7138
}
```

**Response (409):**
```json
{
  "statusCode": 409,
  "message": "Worker already has an active shift",
  "error": "Conflict"
}
```

#### Duplicate Phone Number
**Request:**
```http
POST /api/users HTTP/1.1
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "081234567890",
  "password": "password123"
}
```

**Response (409):**
```json
{
  "statusCode": 409,
  "message": "Phone number already exists",
  "error": "Conflict"
}
```

**Implementation:**
```typescript
// users.service.ts
async create(createUserDto: CreateUserDto): Promise<User> {
  const existing = await this.usersRepository.findOne({
    where: { phone: createUserDto.phone },
  });
  
  if (existing) {
    throw new ConflictException('Phone number already exists');
  }
  
  // Continue with creation...
}
```

---

### 6. GPS Validation Errors (400)

**Cause:** GPS coordinates outside area boundary

**Request:**
```http
POST /api/shifts/clock-in HTTP/1.1
Content-Type: application/json

{
  "area_id": "area-uuid",
  "latitude": -7.3000,
  "longitude": 112.8000
}
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": "You are 543.2 meters away from the work area. Maximum distance allowed: 100 meters",
  "error": "Bad Request"
}
```

**Implementation:**
```typescript
// shifts.service.ts
async clockIn(userId: string, dto: ClockInDto): Promise<Shift> {
  const area = await this.areasService.findOne(dto.area_id);
  
  const distance = calculateHaversineDistance(
    dto.latitude,
    dto.longitude,
    area.latitude,
    area.longitude,
  );
  
  if (distance > area.radius) {
    throw new BadRequestException(
      `You are ${distance.toFixed(1)} meters away from the work area. ` +
      `Maximum distance allowed: ${area.radius} meters`
    );
  }
  
  // Continue with clock-in...
}
```

---

### 7. Minimum Shift Duration Errors (400)

**Cause:** Worker attempts to clock out before minimum shift duration (15 minutes)

**Request:**
```http
POST /api/shifts/clock-out HTTP/1.1
Content-Type: application/json
Authorization: Bearer {worker_token}

{
  "gps_lat": -7.2905,
  "gps_lng": 112.7398
}
```

**Response (400):**
```json
{
  "statusCode": 400,
  "code": "SHIFT_DURATION_TOO_SHORT",
  "message": "Shift duration too short. Minimum 5 minutes required, but only 2 minutes worked.",
  "error": "Bad Request"
}
```

**Implementation:**
```typescript
// shifts.service.ts
async clockOut(userId: string, dto: ClockOutDto): Promise<Shift> {
  const shift = await this.findActiveShift(userId);

  const shiftDurationMs = Date.now() - shift.clock_in_time.getTime();
  if (shiftDurationMs < MINIMUM_SHIFT_DURATION_MS) {
    const minutesWorked = Math.floor(shiftDurationMs / (60 * 1000));
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      ApiErrorCode.SHIFT_DURATION_TOO_SHORT,
      `Shift duration too short. Minimum ${MINIMUM_SHIFT_DURATION_MINUTES} minutes required, but only ${minutesWorked} minutes worked.`
    );
  }

  // Continue with clock-out...
}
```

**Business Rule:**
- Minimum shift duration: 15 minutes
- Prevents accidental clock-outs
- Prevents abuse of clock-in/clock-out system
- Defined in `common/constants/shift.constants.ts`

---

### 8. File Upload Errors

#### File Too Large (413)
**Response:**
```json
{
  "statusCode": 413,
  "message": "File too large. Maximum size: 5MB",
  "error": "Payload Too Large"
}
```

#### Invalid File Type (400)
**Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only JPEG and PNG images are allowed",
  "error": "Bad Request"
}
```

**Implementation:**
```typescript
// Multer configuration
const multerOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
      return callback(
        new BadRequestException('Only JPEG and PNG images are allowed'),
        false,
      );
    }
    callback(null, true);
  },
};
```

---

### 8. Database Errors (500)

**Cause:** Database connection failure, query timeout, constraint violations

**Response (500):**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

**Implementation:**
```typescript
// Exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message;
    } else {
      // Log unexpected errors
      console.error('Unexpected error:', exception);
      // Don't expose internal details to client
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

## Error Handling Best Practices

### 1. Use Specific Exception Classes

```typescript
// ✅ GOOD: Specific exceptions
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid GPS coordinates');
throw new ConflictException('Worker already has an active shift');

// ❌ BAD: Generic exceptions
throw new Error('Something went wrong');
throw new HttpException('Error', 500);
```

### 2. Provide Helpful Error Messages

```typescript
// ✅ GOOD: Actionable message
throw new BadRequestException(
  'You are 543.2 meters away from the work area. Maximum distance allowed: 100 meters'
);

// ❌ BAD: Vague message
throw new BadRequestException('GPS validation failed');
```

### 3. Don't Expose Sensitive Information

```typescript
// ✅ GOOD: Generic message for production
if (process.env.NODE_ENV === 'production') {
  throw new InternalServerErrorException('Internal server error');
} else {
  throw new InternalServerErrorException(`Database error: ${error.message}`);
}

// ❌ BAD: Exposing internal details
throw new InternalServerErrorException(
  `Database connection failed at host ${dbHost} with credentials ${dbUser}:${dbPass}`
);
```

### 4. Validate Early

```typescript
// ✅ GOOD: Validate in DTO
export class ClockInDto {
  @IsUUID()
  @IsNotEmpty()
  area_id: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

// Validation happens automatically before controller method
```

### 5. Use Exception Filters for Global Error Handling

```typescript
// main.ts
app.useGlobalFilters(new AllExceptionsFilter());
```

---

## Common Error Scenarios

### Scenario 1: Clock-In Validation Failure

**Issues Checked:**
1. ✅ User authenticated?
2. ✅ User has worker role?
3. ✅ Worker assigned to area?
4. ✅ GPS within area boundary?
5. ✅ No active shift exists?
6. ✅ Photo uploaded successfully?

**Possible Errors:**
- 401: Missing/invalid token
- 403: Not a worker
- 404: Area not found
- 400: GPS validation failed
- 409: Already clocked in
- 413: Photo too large

### Scenario 2: Activity Submission Failure

**Issues Checked:**
1. ✅ User authenticated?
2. ✅ Active shift exists?
3. ✅ User owns the shift?
4. ✅ Report type valid?
5. ✅ Description length valid?
6. ✅ Photos uploaded (1-3)?

**Possible Errors:**
- 401: Missing/invalid token
- 404: Shift not found
- 403: Not your shift
- 400: Validation failed
- 413: Photo(s) too large

---

## Testing Error Responses

### Unit Tests

```typescript
describe('ShiftsService', () => {
  it('should throw ConflictException if worker already has active shift', async () => {
    // Setup: Mock existing active shift
    jest.spyOn(shiftsRepository, 'findOne').mockResolvedValue(existingShift);

    // Act & Assert
    await expect(
      service.clockIn(userId, clockInDto)
    ).rejects.toThrow(ConflictException);
  });

  it('should throw BadRequestException if GPS is outside boundary', async () => {
    // Setup: Mock area with coordinates
    const area = { latitude: -7.27, longitude: 112.71, radius: 100 };
    jest.spyOn(areasService, 'findOne').mockResolvedValue(area);

    // Act: Try to clock in 500m away
    const dto = { area_id: 'uuid', latitude: -7.25, longitude: 112.70 };

    // Assert
    await expect(
      service.clockIn(userId, dto)
    ).rejects.toThrow(BadRequestException);
  });
});
```

### E2E Tests

```typescript
describe('POST /api/shifts/clock-in', () => {
  it('should return 400 when GPS validation fails', () => {
    return request(app.getHttpServer())
      .post('/api/shifts/clock-in')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        area_id: areaId,
        latitude: -7.30, // Too far
        longitude: 112.80,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('meters away from the work area');
      });
  });

  it('should return 409 when worker already has active shift', () => {
    return request(app.getHttpServer())
      .post('/api/shifts/clock-in')
      .set('Authorization', `Bearer ${workerToken}`)
      .send(validClockInDto)
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe('Worker already has an active shift');
      });
  });
});
```

---

## Error Logging

### Development
- Log full error stack traces
- Include request details
- Log database queries

### Production
- Log error messages without sensitive data
- Use structured logging (JSON)
- Send critical errors to monitoring service (Sentry)

**Implementation:**
```typescript
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(exception);
    }

    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(exception);
    }

    // Return sanitized error to client
    // ...
  }
}
```

---

---

## Phase 2E: Planned Error Codes (Client Feedback II)

| Code | HTTP | Message | Context |
|------|------|---------|---------|
| `IDENTIFIER_NOT_FOUND` | 401 | Invalid credentials | Phone number or username not found (same generic message) |
| `PHONE_NUMBER_DUPLICATE` | 409 | Phone number already in use | User creation/update with existing phone_number |
| `PROFILE_PICTURE_INVALID` | 400 | Invalid image format or size exceeded | Profile picture upload validation |
| `AREA_ASSIGNMENT_INVALID` | 400 | Cannot assign area outside user's rayon | Multi-area assignment validation |
| `AREA_ASSIGNMENT_DUPLICATE` | 409 | User already assigned to this area | Duplicate user_areas entry |
| `OVERTIME_NORMAL_SHIFT_ACTIVE` | 400 | Cannot start overtime while normal shift is active | Overtime clock-in validation |
| `OVERTIME_NOT_IN_PROGRESS` | 400 | No active overtime to end | Overtime clock-out without active overtime |
| `OVERTIME_ACTIVITY_REQUIRED` | 400 | Activity submission required to end overtime | Missing mandatory activity on overtime clock-out |
| `AUDIT_LOG_NOT_FOUND` | 404 | No audit history found for entity | Audit trail query with no results |

> **Full specification:** See [`specs/phases/phase-2-e-client-feedback-2/backend.md`](../phases/phase-2-e-client-feedback-2/backend.md)

---

**Document Owner:** Backend Developer
**Last Updated:** 2026-03-10
**Status:** Active
**Error Codes:** 53 + 9 planned = 62 codes (Phase 2E: +9 planned codes for phone login, profile picture, multi-area, overtime clock-in/out, audit trail)
**Related Docs:** [`contracts.md`](./contracts.md), [`authentication.md`](./authentication.md), [`../architecture/security.md`](../architecture/security.md)
