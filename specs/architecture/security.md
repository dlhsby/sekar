# Security Architecture

Comprehensive security specifications, threat model, and mitigation strategies for SEKAR system.

## Security Principles

### Defense in Depth
Multiple layers of security controls to protect against threats:
1. **Network Layer:** HTTPS/TLS, firewall rules, VPC security groups
2. **Application Layer:** Authentication, authorization, input validation
3. **Data Layer:** Encryption at rest, access controls, audit logging
4. **Physical Layer:** AWS data center security (managed by AWS)

### Principle of Least Privilege
Users and services only have access to resources they absolutely need:
- **Workers:** Can only access their own shifts and reports
- **Supervisors:** Can only access data for workers they supervise
- **Admins:** Full system access

### Security by Default
- HTTPS enforced for all communications
- Strong password requirements
- JWT tokens expire after 7 days
- File upload size limits enforced
- Rate limiting enabled (Phase 2+)

---

## Authentication & Authorization

### AUTH-1: JWT Token Authentication

#### Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_uuid",
    "phone": "081234567890",
    "role": "worker",
    "iat": 1234567890,
    "exp": 1235172690
  },
  "signature": "..."
}
```

#### Token Generation
```typescript
// Backend: auth.service.ts
async generateToken(user: User): Promise<string> {
  const payload = {
    sub: user.id,
    phone: user.phone,
    role: user.role,
  };

  return this.jwtService.sign(payload, {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d', // 7 days
  });
}
```

#### Token Validation
```typescript
// Backend: jwt.strategy.ts
async validate(payload: JwtPayload): Promise<User> {
  const user = await this.usersService.findOne(payload.sub);

  if (!user || user.deleted_at) {
    throw new UnauthorizedException('User not found');
  }

  return user; // Attached to request.user
}
```

#### Token Storage

**Mobile (React Native):**
```typescript
import EncryptedStorage from 'react-native-encrypted-storage';

// Store token securely
await EncryptedStorage.setItem('auth_token', token);

// Retrieve token
const token = await EncryptedStorage.getItem('auth_token');

// Remove token (logout)
await EncryptedStorage.removeItem('auth_token');
```

**Web (Next.js - Phase 6):**
```typescript
// Store in HttpOnly cookie (more secure)
response.cookie('auth_token', token, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

#### Token Expiration Handling

**Mobile Client:**
```typescript
// axios interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await logout();
      navigation.navigate('Login');
    }
    return Promise.reject(error);
  }
);
```

---

### AUTH-2: Role-Based Access Control (RBAC)

#### Role Hierarchy — 8 Roles + 1 External (ADR-009/032/033)

**8 Core Roles:**
- `satgas` — Field worker (clock-in/out, reports)
- `linmas` — Security/patrol (clock-in/out, reports)
- `korlap` — Field coordinator (multi-area assignment, monitoring)
- `admin_rayon` — Data manager (disposition authority over pruning requests, scoped by rayon)
- `kepala_rayon` — Rayon head (approvals, rayon oversight)
- `management` — Executive dashboard
- `admin_system` — System administration
- `superadmin` — Full system access

**External Role:**
- `staff_kecamatan` — Kecamatan staff (pruning request submission only, non-clockable)

#### Implementation

**Backend Guards:**
```typescript
// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// Usage in controller
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Supervisor')
@Get('all-workers')
async getAllWorkers() {
  // Only Admin and Supervisor can access
}
```

#### Permission Matrix

Permission matrix has expanded to 8 core roles + 1 external. See `specs/COMPLETION_STATUS.md` and `specs/architecture/decisions/ADR-009.md` (role system), `ADR-032.md` (admin_rayon disposition), `ADR-033.md` (staff_kecamatan) for comprehensive breakdown.

---

## Data Protection

### DP-1: Password Security

#### Password Requirements
- Minimum 6 characters (Phase 1)
- Minimum 8 characters with complexity (Phase 2+):
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character

#### Password Hashing
```typescript
import * as bcrypt from 'bcrypt';

// Hash password on user creation/update
async hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verify password on login
async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

**Why bcrypt?**
- Adaptive: Can increase cost factor as hardware improves
- Salt included: Protects against rainbow table attacks
- Slow by design: Makes brute-force attacks impractical
- Industry standard: Well-tested and trusted

---

### DP-2: Data Encryption

#### Encryption at Rest

**Database (RDS):**
- AWS RDS encryption enabled
- AES-256 encryption
- Automated backups also encrypted

**Media Storage (S3):**
- Server-side encryption (SSE-S3)
- AES-256 encryption
- Automatic for all objects

**Mobile Local Storage:**
```typescript
// Sensitive data (tokens, credentials)
import EncryptedStorage from 'react-native-encrypted-storage';
await EncryptedStorage.setItem('auth_token', token);

// Non-sensitive data (cache, preferences)
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('last_sync', timestamp);
```

#### Encryption in Transit

**All Communications:**
- TLS 1.2+ enforced
- Mobile → API: HTTPS
- API → Database: SSL/TLS
- API → S3: HTTPS

**Certificate Management:**
- AWS Certificate Manager for TLS certificates
- Auto-renewal before expiration
- Redirect HTTP → HTTPS

---

### DP-3: Sensitive Data Handling

#### Data Classification

| Data Type | Classification | Storage | Retention |
|-----------|---------------|---------|-----------|
| Passwords | Secret | Database (hashed) | Until user deleted |
| JWT Tokens | Secret | Mobile (encrypted) | 7 days |
| Phone Numbers | PII | Database (plaintext) | Until user deleted |
| Names | PII | Database (plaintext) | Until user deleted |
| Photos/Videos | PII | S3 (encrypted) | 1 year |
| GPS Coordinates | PII | Database (plaintext) | 1 year |
| Shift Records | Internal | Database (plaintext) | 2 years |
| Work Reports | Internal | Database (plaintext) | 2 years |

#### PII Protection

**Logging:**
```typescript
// ❌ BAD: Logging sensitive data
logger.log(`User logged in: ${user.phone} with password ${password}`);

// ✅ GOOD: Redacting sensitive data
logger.log(`User logged in: ${user.id} [phone redacted]`);
```

**API Responses:**
```typescript
// ❌ BAD: Exposing password hash
{
  "id": "uuid",
  "name": "John Doe",
  "phone": "081234567890",
  "password": "$2b$10$...", // Never expose!
  "role": "worker"
}

// ✅ GOOD: Excluding sensitive fields
{
  "id": "uuid",
  "name": "John Doe",
  "phone": "081234567890",
  "role": "worker"
}
```

**Soft Delete:**
- Users are soft deleted (deleted_at timestamp)
- Preserves audit trail
- Can be permanently deleted after 90 days (Phase 2+)

---

## Input Validation & Sanitization

### IV-1: Backend Validation

#### DTO Validation with class-validator
```typescript
import { IsString, IsNotEmpty, MinLength, MaxLength, IsEnum } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  shift_id: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @IsEnum(WorkType)
  work_type: WorkType;
}
```

#### SQL Injection Prevention
```typescript
// ✅ GOOD: TypeORM parameterized queries
const user = await this.userRepository.findOne({
  where: { phone: phoneNumber }
});

// ❌ BAD: Raw SQL with concatenation (NEVER DO THIS!)
const query = `SELECT * FROM users WHERE phone = '${phoneNumber}'`;
```

---

### IV-2: XSS Prevention

#### Frontend Input Sanitization
```typescript
import DOMPurify from 'dompurify';

// Sanitize user input before displaying
const cleanDescription = DOMPurify.sanitize(userInput);
```

#### Content Security Policy (Phase 2+)
```typescript
// Backend: Set CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; object-src 'none';"
  );
  next();
});
```

---

### IV-3: File Upload Security

#### File Validation
```typescript
// Backend: multer configuration
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Invalid file type. Only JPEG/PNG allowed.'), false);
  }
};

const upload = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter,
});
```

#### File Scanning (Phase 2+)
- Integrate AWS Lambda with ClamAV
- Scan uploaded files for malware
- Quarantine suspicious files
- Notify admins of threats

---

## API Security

### AS-1: CORS Configuration

```typescript
// Backend: main.ts
app.enableCors({
  origin: [
    'http://localhost:19006', // Expo dev
    'http://10.0.2.2:19006',  // Android emulator
    'https://sekar.wahyutrip.com', // Production web
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

### AS-2: Rate Limiting ✅ (Implemented Phase 1)

**Status:** ✅ Implemented (January 2026)

Rate limiting prevents brute force attacks and API abuse by limiting the number of requests a client can make within a time window.

#### Global Configuration

**File:** `apps/be/src/app.module.ts`

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    // Global rate limit: 100 requests per minute
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute in milliseconds
        limit: 100, // Maximum requests per window
      },
    ]),
    // ... other modules
  ],
  providers: [
    // Apply globally to all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

#### Endpoint-Specific Rate Limits

**File:** `apps/be/src/modules/auth/auth.controller.ts`

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // Login: 5 attempts per minute (prevents brute force)
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with username and password' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  // Token refresh: 10 per minute
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshAccessToken(dto.refresh_token);
  }
}
```

#### Rate Limit Configuration by Endpoint Category

| Endpoint Category | Limit | Window | Rationale |
|-------------------|-------|--------|-----------|
| **Login** | 5 requests | 1 minute | Prevent brute force attacks |
| **Token Refresh** | 10 requests | 1 minute | Limit token generation abuse |
| **File Upload** | 10 requests | 1 minute | Prevent storage abuse |
| **Bulk Operations** | 5 requests | 5 minutes | Expensive operations (Phase 6) |
| **Report Generation** | 3 requests | 10 minutes | CPU-intensive (Phase 3) |
| **General API** | 100 requests | 1 minute | Default for all other endpoints |

**Reference:** See `specs/business-rules.md` for complete rate limit configuration.

#### Rate Limit Response

When a client exceeds the rate limit:

**Response:**
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642436160
Retry-After: 45

{
  "statusCode": 429,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "timestamp": "2026-01-16T14:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

#### Custom Rate Limit Storage (Production)

For multi-instance deployments, use Redis for shared rate limit state:

```typescript
// File: apps/be/src/config/throttler.config.ts
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'default',
      ttl: 60000,
      limit: 100,
    },
  ],
  storage: new ThrottlerStorageRedisService({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  }),
};
```

#### Monitoring Rate Limits

**CloudWatch Metrics (Phase 2+):**
- `rate_limit_exceeded_count` - Track blocked requests
- `rate_limit_by_endpoint` - Identify most rate-limited endpoints
- Alert when: Sustained rate limit hits >10% of traffic

**Logs:**
```json
{
  "level": "WARN",
  "message": "Rate limit exceeded",
  "ip": "192.168.1.100",
  "endpoint": "/api/v1/auth/login",
  "limit": 5,
  "ttl": 60
}
```

---

### AS-3: Request Validation

#### Header Validation
```typescript
// Ensure Authorization header exists
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  // All endpoints require JWT token
}
```

#### Content-Type Validation
```typescript
// Only accept JSON
@Post('create')
@Header('Content-Type', 'application/json')
async create(@Body() dto: CreateDto) {
  // ...
}
```

---

## Geographic Security

### GS-1: GPS Spoofing Detection (Phase 3+)

#### Multiple Validation Layers
1. **Accuracy Check:** GPS accuracy < 50 meters
2. **Velocity Check:** Movement speed < 100 km/h (reject if traveling too fast)
3. **Time Consistency:** Location updates in chronological order
4. **Pattern Analysis:** Flag unusual patterns (e.g., teleportation)

```typescript
// Backend validation
async validateLocation(lat: number, lng: number, timestamp: Date): Promise<void> {
  const lastLocation = await this.getLastLocation(userId);

  if (lastLocation) {
    const distance = calculateHaversine(lastLocation, { lat, lng });
    const timeDiff = (timestamp.getTime() - lastLocation.timestamp.getTime()) / 1000; // seconds
    const speed = (distance / timeDiff) * 3.6; // km/h

    if (speed > 100) {
      throw new BadRequestException('Suspicious movement speed detected');
    }
  }
}
```

---

### GS-2: Area Boundary Validation

#### Haversine Distance Calculation
```typescript
function calculateHaversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Validation
const distance = calculateHaversine(userLat, userLng, areaLat, areaLng);
if (distance > 100) {
  throw new BadRequestException('You are too far from the work area');
}
```

---

## Audit & Logging

### AL-1: Audit Trail (Phase 3+)

#### Events to Log
- User login/logout
- Clock-in/out events
- Report submissions
- Report approvals/rejections
- User creation/modification/deletion
- Area assignments
- Failed authentication attempts
- GPS validation failures

#### Audit Log Schema
```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  user_id: string;
  action: string; // 'login', 'clock-in', 'approve-report', etc.
  resource_type: string; // 'user', 'shift', 'report', etc.
  resource_id: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure';
  details?: object; // Additional context
}
```

---

### AL-2: Security Monitoring (Phase 2+)

#### Alerts for Suspicious Activity
- Multiple failed login attempts (>5 in 15 minutes)
- GPS validation failures
- Unusual API usage patterns
- Large file uploads (>10MB)
- Access to unauthorized resources

#### Integration with Sentry
```typescript
import * as Sentry from '@sentry/node';

// Capture security events
Sentry.captureMessage('Multiple failed login attempts', {
  level: 'warning',
  user: { id: userId, phone: userPhone },
  extra: { attemptCount: 5 },
});
```

---

## Mobile App Security

### MS-1: Secure Storage

#### Token Storage
```typescript
// Use encrypted storage for tokens
import EncryptedStorage from 'react-native-encrypted-storage';

export const storeToken = async (token: string) => {
  await EncryptedStorage.setItem('auth_token', token);
};

export const getToken = async (): Promise<string | null> => {
  return await EncryptedStorage.getItem('auth_token');
};

export const clearToken = async () => {
  await EncryptedStorage.removeItem('auth_token');
};
```

---

### MS-2: Certificate Pinning (Phase 3+)

```typescript
// Pin production API certificate
const certificatePin = {
  'sekar-api.wahyutrip.com': {
    pins: [
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    ],
  },
};
```

---

### MS-3: Root/Jailbreak Detection (Phase 3+)

```typescript
import JailMonkey from 'jail-monkey';

// Check if device is rooted/jailbroken
if (JailMonkey.isJailBroken()) {
  Alert.alert(
    'Security Warning',
    'This app cannot run on rooted/jailbroken devices for security reasons.'
  );
  // Disable sensitive features
}
```

---

## Compliance & Privacy

### CP-1: Data Retention Policy

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| User accounts | Until deletion request | Soft delete → Hard delete after 90 days |
| Shift records | 2 years | Automated cleanup |
| Work reports | 2 years | Automated cleanup |
| Photos/videos | 1 year | S3 lifecycle policy |
| Location history | 1 year | Automated cleanup |
| Audit logs | 7 years | Archived to S3 Glacier |

---

### CP-2: GDPR-Like Considerations (Future)

#### Right to Access
- Users can request their data via API endpoint (Phase 3+)
- Export format: JSON

#### Right to Deletion
- Users can request account deletion
- All PII removed within 30 days
- Audit logs anonymized

#### Data Minimization
- Only collect necessary data
- Don't store credit card info (not needed)
- Minimize GPS tracking to active shifts only

---

## Security Checklist

### Before Production Deployment

- [ ] Change JWT_SECRET to strong random value
- [ ] Enable AWS RDS encryption
- [ ] Enable S3 bucket encryption
- [ ] Configure CloudFront with HTTPS (Phase 3+)
- [ ] Set up AWS WAF rules (Phase 3+)
- [ ] Enable AWS GuardDuty (Phase 3+)
- [ ] Configure security groups (whitelist only)
- [ ] Enable VPC flow logs
- [ ] Set up CloudWatch alarms for security events
- [ ] Configure automated backups (daily)
- [ ] Test backup restoration process
- [ ] Enable MFA for AWS console access
- [ ] Review IAM policies (least privilege)
- [ ] Scan dependencies for vulnerabilities (npm audit)
- [ ] Remove all development/debug code
- [ ] Disable database auto-synchronize
- [ ] Use environment variables for all secrets
- [ ] Set up Sentry error tracking
- [ ] Configure CORS for production domains only
- [ ] Enable rate limiting
- [ ] Set up SSL/TLS monitoring
- [ ] Document incident response plan
- [ ] Train team on security best practices

---

## Incident Response Plan (Phase 2+)

### Severity Levels
- **Critical:** Data breach, system compromise
- **High:** Authentication bypass, unauthorized access
- **Medium:** DDoS attack, service degradation
- **Low:** Failed login attempts, minor bugs

### Response Steps
1. **Detect:** Monitor CloudWatch, Sentry alerts
2. **Assess:** Determine severity and impact
3. **Contain:** Isolate affected systems
4. **Investigate:** Review logs, identify root cause
5. **Remediate:** Fix vulnerability, restore service
6. **Document:** Write incident report
7. **Review:** Post-mortem, improve processes

---

## DEP-SEC: Dependency Security

### Latest Audit: June 16, 2026 (Phase 5 release-prep)

`npm audit` is reported two ways — **production** (`--omit=dev`, what actually ships) and **full** (incl. the test toolchain). Production is the gate; dev-only findings are tracked but not deployment blockers.

| Component | Production (`--omit=dev`) | Full (incl. dev) | Status |
|-----------|---------------------------|------------------|--------|
| Backend | **0** | 18 moderate (dev-only) | ✅ Secure (ships clean) |
| Web | **0** | 17 moderate (dev-only) | ✅ Secure (ships clean) |
| Mobile | (pending — see below) | — | ⏳ |

**Fixed this pass (were HIGH, runtime):** the socket.io / Node-WS stack CVEs — `ws` memory-exhaustion DoS (GHSA, `ws` 8.x), `engine.io`/`engine.io-client` (via `ws`), `socket.io-adapter`, and `form-data` CRLF injection — resolved on backend + web via in-range `npm audit fix`. Backend `@nestjs/swagger`'s transitive `js-yaml@4.1.1` (quadratic-DoS, GHSA-h67p-54hq-rp68, `<=4.1.1`) pinned to `4.2.0` via a scoped `overrides` entry in `apps/be/package.json`.

### Known Issues (accepted)

**js-yaml quadratic-complexity DoS (GHSA-h67p-54hq-rp68) — dev test toolchain only**
- **Backend + Web:** `@istanbuljs/load-nyc-config` → `js-yaml@3.14.x` (the 3.x API is incompatible with the patched 4.2.0, and istanbul has not released a fix), pulled by the `jest` / `ts-jest` / `babel-plugin-istanbul` coverage chain.
- **Risk:** Low — dev/test only, never bundled into the deployed artifact; the DoS requires hostile YAML, and the only YAML parsed is our own coverage config.
- **`npm audit fix --force` is NOT applied:** its only "fix" is a breaking downgrade of `jest` 30→25 / `@nestjs/swagger` 11→5. Rejected.
- **Decision:** Accepted for production (production audit is 0). Clears when the jest/istanbul chain ships js-yaml ≥4.2.0.

### Trivy

Container/filesystem scanning added in Phase 5 (`trivy fs` + `trivy image` on the built backend/web images). Run via the official image when not installed locally:
```bash
docker run --rm -v "$PWD:/work:ro" -v trivy-cache:/root/.cache/ \
  aquasec/trivy:latest fs /work --scanners vuln,secret,misconfig \
  --severity HIGH,CRITICAL --skip-dirs '**/node_modules'
```

### Dependency Management

**Automated Updates (Dependabot):**
- Patch updates: Weekly (auto-approved)
- Minor/major updates: Manual quarterly review
- React Native ecosystem: Major versions locked

**Security Monitoring:**
- Weekly: `npm audit` across all components
- GitHub Dependabot: Security alerts enabled
- Upstream tracking: firebase-admin, React Native CLI

**Update Policy:**
```bash
# Check for vulnerabilities
npm audit

# Apply security patches only
npm audit fix

# Force updates (breaking changes)
npm audit fix --force  # Use with caution
```

---

## Phase 3: Planned Security Additions (Plants Management + Monitoring Rebuild + Public Intake)

> **Authored:** 2026-04-24
> **Status:** Not implemented — specs only.

### Role & Authorization Changes

#### admin_rayon — Extended with Disposition Authority (ADR-032)

Phase 2C's ADR-009 explicitly excluded `admin_rayon` from approval flows (overtime, schedules). Phase 3 narrowly amends that boundary so `admin_rayon` can review and convert `pruning_requests`, scoped by `users.rayon_id`:

- **What changes:** New permission constant `PRUNING_REQUEST_REVIEWERS` (admin_rayon + management + admin_system + superadmin) governs `POST /pruning-requests/:id/review` and `POST /pruning-requests/:id/convert-to-task`. `admin_rayon` actions are additionally constrained by `pruning_requests.rayon_id = actor.rayon_id` (or null before review, in which case `admin_rayon` may assign it to their own rayon).
- **What does NOT change:** `admin_rayon` gains no rights over overtime approval, schedule approval, or user management. The extension is surgical: a single new capability, scoped tightly, audited via `audit_logs`.
- **Rationale:** `admin_rayon` is already rayon-scoped per ADR-013 (multi-area assignment) and is the organizational owner of per-rayon data operations. Creating a new `admin_rayon` role would duplicate responsibility.

#### staff_kecamatan — New External Role (ADR-033)

Kecamatan (sub-district) staff are outside the DLH org chart but need structured access to submit pruning requests and track outcomes. No existing role fits.

- **Capabilities:** `POST /pruning-requests` (own submissions only), `GET /pruning-requests?mine=true`, `GET /pruning-requests/:id` and `/result` for requests they submitted. No clock-in, no location tracking, no task assignment.
- **Identity model:** Regular `users` row with `role = 'staff_kecamatan'` and `is_active = true`. `rayon_id` is optional (kecamatan boundaries do not align with DLH rayons). Authentication reuses the existing JWT + phone/username identifier pipeline (ADR-012).
- **Guard sweep:** Every existing `@Roles(...)` decorator is reviewed to ensure `staff_kecamatan` is **not** inadvertently granted access. A role-matrix integration test covering every endpoint is required before Phase 3 ships.
- **Threat model:** External-facing role with data-submission capability — rate-limited per ADR-009 principles (5 req/min on `POST /pruning-requests`), photo uploads validated for MIME + size, `reference_code` is UUID-derived (no sequential enumeration).

### Infrastructure Trust Boundaries — Redis (ADR-029, ADR-016)

Redis 7 enters the production trust boundary earlier than Phase 4 planning had anticipated. Security implications:

- **Network posture:** Redis binds to a private subnet only, not publicly reachable. ACL user per service (Socket.IO adapter user, Streams consumer user, cache user) with minimum-necessary command access. No default user / no empty password.
- **Data classification:** Stream entries contain `user_id`, GPS coordinates, area IDs, timestamps — classified the same as `location_logs` (sensitive). `redis_stream_max_len` cap (100,000) prevents unbounded retention; TTL on cache keys is 5 minutes.
- **Failure mode:** If Redis is unreachable the monitoring pipeline falls back to in-process Socket.IO pub/sub (single-instance degraded mode) and the `/health` endpoint surfaces `redis: degraded`. Degraded mode is a known-state fallback, not a silent failure.
- **Secrets:** `REDIS_URL` (connection string with password) stored in AWS Secrets Manager; local/dev uses `.env.example` placeholder. Rotation policy: 90 days (matches IAM key rotation).
- **Audit:** Connection attempts logged via Redis `SLOWLOG` + application-level connect/disconnect events written to `audit_logs` with `entity_type = 'infrastructure'` for operations-initiated actions.

### Public Intake Surface Area

`POST /pruning-requests` is the first endpoint that accepts user-generated content from an external-org role. Additional controls:

- Photo URLs validated as S3 pre-signed puts into a dedicated `pruning-requests-media/` prefix (ACL-restricted, no public read).
- `notes` and `address` sanitized against XSS; JSON responses rely on existing NestJS class-serializer (no HTML passthrough).
- Geofence validation on `gps_lat`/`gps_lng` is advisory (request within Surabaya bounding box warns but does not block) — kecamatan staff may report issues near rayon boundaries.

---

**Document Owner:** Software Architect
**Last Updated:** 2026-06-20
**Status:** Active
**Related Docs:** [`system-overview.md`](./system-overview.md), [`data-flow.md`](./data-flow.md), [`../api/authentication.md`](../api/authentication.md), [`decisions/ADR-029-monitoring-v2-event-sourced-redis.md`](./decisions/ADR-029-monitoring-v2-event-sourced-redis.md), [`decisions/ADR-032-admin-data-disposition-authority-pruning-requests.md`](./decisions/ADR-032-admin-data-disposition-authority-pruning-requests.md), [`decisions/ADR-033-staff-kecamatan-role.md`](./decisions/ADR-033-staff-kecamatan-role.md)
