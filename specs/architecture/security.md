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

#### Role Hierarchy
```
Admin (Highest)
  ├─ Full system access
  ├─ User management
  ├─ System configuration
  └─ View all data

Supervisor
  ├─ View assigned workers
  ├─ Approve/reject reports
  ├─ View analytics for their team
  └─ Cannot modify system settings

Worker (Lowest)
  ├─ Clock-in/out
  ├─ Submit reports
  ├─ View own data only
  └─ Cannot access other workers' data
```

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

| Resource | Worker | Supervisor | Admin |
|----------|--------|------------|-------|
| **Users** |
| View own profile | ✅ | ✅ | ✅ |
| View all users | ❌ | ✅ (assigned only) | ✅ |
| Create user | ❌ | ❌ | ✅ |
| Update user | ❌ (own only) | ❌ | ✅ |
| Delete user | ❌ | ❌ | ✅ |
| **Shifts** |
| Clock-in/out | ✅ (own) | ❌ | ✅ |
| View shifts | ✅ (own) | ✅ (assigned workers) | ✅ |
| Modify shifts | ❌ | ❌ | ✅ |
| **Reports** |
| Submit report | ✅ | ❌ | ✅ |
| View reports | ✅ (own) | ✅ (assigned workers) | ✅ |
| Approve/reject | ❌ | ✅ | ✅ |
| **Areas** |
| View areas | ✅ (assigned) | ✅ (managed) | ✅ |
| Create/modify | ❌ | ❌ | ✅ |
| **Assignments** |
| View assignments | ✅ (own) | ✅ (team) | ✅ |
| Create/modify | ❌ | ❌ (request only) | ✅ |

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
    'https://sekar.DLH-sby.go.id', // Production web
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

**File:** `be/src/app.module.ts`

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

**File:** `be/src/modules/auth/auth.controller.ts`

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
// File: be/src/config/throttler.config.ts
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
  'sekar-api.DLH-sby.go.id': {
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

### Latest Audit: February 5, 2026

| Component | Vulnerabilities | Status |
|-----------|----------------|--------|
| Backend | 3 high (nested deps) | ⚠️ Acceptable risk |
| Web | 0 | ✅ Secure |
| Mobile | 6 high (nested deps) | ⚠️ Acceptable risk |

### Known Issues

**fast-xml-parser DoS (CVE: GHSA-37qj-frw5-hhjh)**
- **Backend:** Via firebase-admin → @google-cloud/storage (3 instances)
- **Mobile:** Via @react-native-community/cli (6 instances, dev-only)
- **Risk:** Low - nested dev dependencies, not exploitable in production
- **Status:** Awaiting upstream fixes (Google, React Native teams)
- **Decision:** Approved for production deployment

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

**Document Owner:** Software Architect
**Last Updated:** 2026-02-05
**Status:** Active
**Related Docs:** [`system-overview.md`](./system-overview.md), [`data-flow.md`](./data-flow.md), [`../api/authentication.md`](../api/authentication.md)
