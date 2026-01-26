# Phase 5 - Backend Implementation Checklist

**Duration:** 5 days
**Prerequisites:** Phase 4 deployed

---

## Overview

Add backend support for iOS-specific authentication (Apple Sign-In), fraud detection, and enhanced security features.

---

## New Modules & Services

### 1. Apple Authentication

**Path:** `be/src/modules/auth/services/apple-auth.service.ts`

```typescript
// services/apple-auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyIdToken } from 'apple-signin-auth';

@Injectable()
export class AppleAuthService {
  private readonly clientId = process.env.APPLE_CLIENT_ID;

  async verifyAppleToken(identityToken: string): Promise<AppleTokenPayload> {
    try {
      const payload = await verifyIdToken(identityToken, {
        audience: this.clientId,
        ignoreExpiration: false,
      });

      return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === 'true',
        isPrivateEmail: payload.is_private_email === 'true',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Apple ID token');
    }
  }

  async findOrCreateUser(applePayload: AppleTokenPayload, fullName?: string): Promise<User> {
    let user = await this.usersService.findByAppleId(applePayload.sub);

    if (!user && applePayload.email) {
      user = await this.usersService.findByEmail(applePayload.email);
      if (user) {
        // Link Apple ID to existing account
        await this.usersService.linkAppleId(user.id, applePayload.sub);
      }
    }

    if (!user) {
      // Create new user with Apple ID
      user = await this.usersService.createAppleUser({
        appleId: applePayload.sub,
        email: applePayload.email,
        fullName: fullName || 'Apple User',
      });
    }

    return user;
  }
}
```

### 2. Fraud Detection Module

**Path:** `be/src/modules/fraud-detection/`

```
fraud-detection/
├── fraud-detection.module.ts
├── fraud-detection.service.ts
├── fraud-detection.service.spec.ts
├── dto/
│   ├── device-info.dto.ts
│   └── location-check.dto.ts
├── entities/
│   ├── fraud-log.entity.ts
│   └── device-fingerprint.entity.ts
└── guards/
    └── fraud-check.guard.ts
```

### 3. App Attestation Service

**Path:** `be/src/modules/auth/services/attestation.service.ts`

---

## Database Changes

### User Entity Update

```typescript
// Add to user.entity.ts
@Column({ name: 'apple_id', nullable: true, unique: true })
appleId: string;

@Column({ name: 'biometric_enabled', default: false })
biometricEnabled: boolean;

@Column({ name: 'preferred_language', default: 'id' })
preferredLanguage: string;
```

### Fraud Log Entity

```typescript
// entities/fraud-log.entity.ts
@Entity('fraud_logs')
export class FraudLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['mock_location', 'gps_spoofing', 'device_tampering', 'attestation_failure', 'velocity_anomaly'],
  })
  fraudType: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  reportedLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  reportedLng: number;

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  detectionDetails: Record<string, any>;

  @Column({ length: 50, nullable: true })
  ipAddress: string;

  @Column({
    type: 'enum',
    enum: ['detected', 'reviewed', 'confirmed', 'dismissed'],
    default: 'detected',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @CreateDateColumn()
  detectedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;
}
```

### Device Fingerprint Entity

```typescript
// entities/device-fingerprint.entity.ts
@Entity('device_fingerprints')
export class DeviceFingerprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 100 })
  deviceId: string;

  @Column({ length: 50 })
  platform: string; // 'ios' | 'android'

  @Column({ length: 50, nullable: true })
  osVersion: string;

  @Column({ length: 100, nullable: true })
  deviceModel: string;

  @Column({ length: 100, nullable: true })
  appVersion: string;

  @Column({ type: 'boolean', default: true })
  isTrusted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastAttestationAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  attestationData: Record<string, any>;

  @CreateDateColumn()
  firstSeenAt: Date;

  @UpdateDateColumn()
  lastSeenAt: Date;
}
```

---

## API Endpoints

### Apple Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/apple | Sign in with Apple | Public |
| POST | /auth/apple/link | Link Apple ID to account | JWT |
| DELETE | /auth/apple/unlink | Unlink Apple ID | JWT |

### Fraud Detection

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /fraud/report | Report suspicious activity | JWT |
| GET | /fraud/logs | List fraud logs (Admin) | JWT + Admin |
| GET | /fraud/logs/:id | Get fraud log details | JWT + Admin |
| PATCH | /fraud/logs/:id | Update fraud log status | JWT + Admin |
| GET | /fraud/stats | Fraud statistics | JWT + Admin |
| POST | /fraud/check-location | Validate location integrity | JWT |

### App Attestation

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /auth/attestation/challenge | Get attestation challenge | JWT |
| POST | /auth/attestation/verify-ios | Verify iOS App Attest | JWT |
| POST | /auth/attestation/verify-android | Verify Android SafetyNet | JWT |
| GET | /auth/devices | List user's trusted devices | JWT |
| DELETE | /auth/devices/:id | Remove trusted device | JWT |

### User Preferences

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| PUT | /users/me/language | Update preferred language | JWT |
| PUT | /users/me/biometric | Enable/disable biometric | JWT |

---

## DTOs

### Apple Sign-In DTO

```typescript
// dto/apple-signin.dto.ts
export class AppleSignInDto {
  @IsString()
  identityToken: string;

  @IsString()
  @IsOptional()
  user?: string; // Apple user ID

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
```

### Device Info DTO

```typescript
// dto/device-info.dto.ts
export class DeviceInfoDto {
  @IsString()
  deviceId: string;

  @IsEnum(['ios', 'android'])
  platform: string;

  @IsString()
  @IsOptional()
  osVersion?: string;

  @IsString()
  @IsOptional()
  deviceModel?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;

  @IsBoolean()
  @IsOptional()
  isMockLocationEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  isRooted?: boolean;

  @IsBoolean()
  @IsOptional()
  isEmulator?: boolean;
}
```

### Location Check DTO

```typescript
// dto/location-check.dto.ts
export class LocationCheckDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  accuracy: number;

  @IsNumber()
  @IsOptional()
  altitude?: number;

  @IsNumber()
  @IsOptional()
  speed?: number;

  @IsString()
  @IsOptional()
  provider?: string; // 'gps' | 'network' | 'fused'

  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo: DeviceInfoDto;
}
```

---

## Fraud Detection Service

```typescript
// fraud-detection.service.ts
@Injectable()
export class FraudDetectionService {
  async checkLocation(dto: LocationCheckDto, user: User): Promise<FraudCheckResult> {
    const checks: FraudCheck[] = [];

    // Check 1: Mock location detection
    if (dto.deviceInfo.isMockLocationEnabled) {
      checks.push({
        type: 'mock_location',
        passed: false,
        message: 'Mock location is enabled',
      });
    }

    // Check 2: Rooted/jailbroken device
    if (dto.deviceInfo.isRooted) {
      checks.push({
        type: 'device_tampering',
        passed: false,
        message: 'Device is rooted/jailbroken',
      });
    }

    // Check 3: Emulator detection
    if (dto.deviceInfo.isEmulator) {
      checks.push({
        type: 'device_tampering',
        passed: false,
        message: 'Running on emulator',
      });
    }

    // Check 4: Velocity check (impossible travel)
    const lastLocation = await this.getLastLocation(user.id);
    if (lastLocation) {
      const timeDiff = (Date.now() - lastLocation.timestamp.getTime()) / 1000; // seconds
      const distance = this.calculateDistance(
        lastLocation.lat, lastLocation.lng,
        dto.latitude, dto.longitude
      );
      const speed = distance / timeDiff; // meters per second

      // Max reasonable speed: 50 m/s (180 km/h)
      if (speed > 50) {
        checks.push({
          type: 'velocity_anomaly',
          passed: false,
          message: `Impossible travel speed: ${speed.toFixed(2)} m/s`,
        });
      }
    }

    // Check 5: Accuracy threshold
    if (dto.accuracy > 100) { // meters
      checks.push({
        type: 'gps_spoofing',
        passed: false,
        message: `Low accuracy: ${dto.accuracy}m`,
      });
    }

    // Log any failures
    const failedChecks = checks.filter(c => !c.passed);
    if (failedChecks.length > 0) {
      for (const check of failedChecks) {
        await this.logFraudAttempt(user, check.type, dto);
      }
    }

    return {
      passed: failedChecks.length === 0,
      checks,
    };
  }

  async logFraudAttempt(user: User, type: string, dto: LocationCheckDto): Promise<FraudLog> {
    const log = this.fraudLogRepository.create({
      user,
      fraudType: type,
      reportedLat: dto.latitude,
      reportedLng: dto.longitude,
      deviceInfo: dto.deviceInfo,
      detectionDetails: {
        accuracy: dto.accuracy,
        provider: dto.provider,
      },
    });

    return this.fraudLogRepository.save(log);
  }

  async getFraudStats(startDate: Date, endDate: Date): Promise<FraudStats> {
    const logs = await this.fraudLogRepository
      .createQueryBuilder('log')
      .where('log.detected_at BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getMany();

    return {
      total: logs.length,
      byType: this.groupByType(logs),
      byStatus: this.groupByStatus(logs),
      uniqueUsers: new Set(logs.map(l => l.user.id)).size,
    };
  }
}
```

---

## Implementation Checklist

### Day 1: Apple Sign-In Backend

- [ ] Install apple-signin-auth package
- [ ] AppleAuthService implementation
- [ ] Apple token verification
- [ ] Link/unlink Apple ID endpoints
- [ ] User entity update (appleId field)
- [ ] Database migration
- [ ] Unit tests

### Day 2: Fraud Detection Module

- [ ] Create fraud-detection module
- [ ] FraudLog entity
- [ ] DeviceFingerprint entity
- [ ] FraudDetectionService
- [ ] Mock location detection
- [ ] Velocity anomaly detection
- [ ] Database migration

### Day 3: Fraud Detection API

- [ ] Fraud check endpoint
- [ ] Fraud logs CRUD (Admin)
- [ ] Fraud statistics endpoint
- [ ] FraudCheckGuard for clock-in
- [ ] Unit tests

### Day 4: App Attestation

- [ ] iOS App Attest verification
- [ ] Android SafetyNet verification
- [ ] Challenge generation
- [ ] Attestation verification endpoint
- [ ] Device management endpoints
- [ ] Unit tests

### Day 5: User Preferences & Integration

- [ ] Language preference endpoint
- [ ] Biometric preference endpoint
- [ ] Integration with existing auth flow
- [ ] E2E tests
- [ ] API documentation update

---

## Dependencies

```bash
npm install apple-signin-auth
npm install @types/google-auth-library  # For SafetyNet
```

---

## Environment Variables

```env
# Apple Sign-In
APPLE_CLIENT_ID=com.sekar.DLH
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=YYYYYYYYYY
APPLE_PRIVATE_KEY_PATH=./keys/apple-auth-key.p8

# SafetyNet (Android)
SAFETYNET_API_KEY=your-api-key
```

---

## Test Coverage Requirements

| Module | Target | Tests |
|--------|--------|-------|
| AppleAuthService | >80% | Token verification, user linking |
| FraudDetectionService | >80% | All check types, logging |
| AttestationService | >80% | iOS/Android verification |
| FraudDetectionController | >80% | All endpoints |

---

## Success Criteria

1. Apple Sign-In tokens verified correctly
2. Apple ID can be linked/unlinked from accounts
3. Fraud detection catches mock locations
4. Velocity anomalies detected
5. Fraud logs accessible to admins
6. App attestation verifies device integrity
7. All endpoints documented in Swagger
8. >80% test coverage achieved

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing (>80% coverage)
- [ ] Apple Sign-In configured in Apple Developer Portal
- [ ] Test Apple token verification in staging
- [ ] Test fraud detection with mock scenarios
- [ ] Verify device attestation (iOS + Android)
- [ ] Database migration tested
- [ ] Fraud alert emails configured

### Environment Variables

```env
# Apple Sign-In
APPLE_CLIENT_ID=com.sekar.dlh
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=YYYYYYYYYY
APPLE_PRIVATE_KEY_PATH=./keys/apple-auth-key.p8

# SafetyNet (Android)
SAFETYNET_API_KEY=your-google-api-key

# Fraud Detection
FRAUD_DETECTION_ENABLED=true
MAX_VELOCITY_MPS=50  # 50 m/s = 180 km/h
MIN_ACCURACY_METERS=100
FRAUD_ALERT_EMAIL=security@dlh.surabaya.go.id

# App Attestation
IOS_APP_ATTEST_ENABLED=true
ANDROID_SAFETYNET_ENABLED=true
ATTESTATION_CACHE_TTL=3600  # 1 hour
```

### Deployment Steps

1. **Database Migration**
   ```bash
   npm run migration:run
   # Adds apple_id, fraud_logs, device_fingerprints tables
   ```

2. **Upload Apple Private Key**
   ```bash
   # Securely store Apple auth key
   mkdir -p ./keys
   chmod 600 ./keys/apple-auth-key.p8
   ```

3. **Verify Endpoints**
   ```bash
   curl http://localhost:3000/api/auth/apple
   curl http://localhost:3000/api/fraud/stats
   curl http://localhost:3000/api/auth/attestation/challenge
   ```

4. **Test Apple Sign-In**
   ```bash
   # Use real Apple ID token from iOS device
   curl -X POST http://localhost:3000/api/auth/apple \
     -H "Content-Type: application/json" \
     -d '{
       "identityToken": "<real-token>",
       "fullName": "Test User"
     }'
   ```

5. **Test Fraud Detection**
   ```bash
   # Simulate mock location detection
   curl -X POST http://localhost:3000/api/fraud/check-location \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "latitude": -7.2905,
       "longitude": 112.7398,
       "accuracy": 10,
       "deviceInfo": {
         "deviceId": "test-device",
         "platform": "android",
         "isMockLocationEnabled": true
       }
     }'
   ```

### Post-Deployment

- [ ] Monitor Apple Sign-In success rate
- [ ] Review fraud detection logs for false positives
- [ ] Verify app attestation challenge/response flow
- [ ] Check fraud alert emails delivered
- [ ] Monitor device fingerprint database growth
- [ ] Set up CloudWatch alarms for fraud spikes

### Rollback Plan

1. Disable Apple Sign-In: Set `APPLE_CLIENT_ID=` (empty)
2. Disable fraud detection: Set `FRAUD_DETECTION_ENABLED=false`
3. Revert database migration: `npm run migration:revert`
4. Redeploy previous version

---

## Integration Testing Scenarios

### Scenario 1: Apple Sign-In Flow

**Test Steps:**
1. User initiates Sign in with Apple on iOS device
2. iOS SDK returns identity token and user data
3. Mobile app sends token to backend `/auth/apple`
4. Backend verifies token with Apple servers
5. Backend creates/links user account
6. Backend returns JWT access token

**Expected Results:**
- Token verified successfully
- User account created or linked
- JWT token issued
- User can access protected endpoints

**Test Data:**
```json
{
  "identityToken": "eyJraWQiOiJXNldjT0tCIiwiYWxnIjoiUlMyNTYifQ...",
  "user": "001234.a1b2c3d4e5f6.1234",
  "email": "worker@privaterelay.appleid.com",
  "fullName": "John Doe"
}
```

### Scenario 2: Fraud Detection - Mock Location

**Test Steps:**
1. Worker enables mock location on Android device
2. Worker attempts to clock in
3. Mobile app detects mock location enabled
4. Mobile app sends device info to backend
5. Backend fraud detection service detects anomaly
6. Backend logs fraud attempt
7. Backend sends alert to admin

**Expected Results:**
- Fraud detected: `mock_location`
- Fraud log created with device info
- Admin email sent
- Clock-in rejected with clear error message

**Test Data:**
```json
{
  "latitude": -7.2905,
  "longitude": 112.7398,
  "accuracy": 5,
  "deviceInfo": {
    "deviceId": "android-device-123",
    "platform": "android",
    "osVersion": "14",
    "isMockLocationEnabled": true,
    "isRooted": false
  }
}
```

### Scenario 3: Fraud Detection - Velocity Anomaly

**Test Steps:**
1. Worker clocks in at Location A
2. 5 minutes later, worker tries to clock in at Location B (50km away)
3. Backend calculates speed: 50,000m / 300s = 166.67 m/s (600 km/h)
4. Speed exceeds threshold (50 m/s = 180 km/h)
5. Backend detects velocity anomaly
6. Backend logs fraud attempt

**Expected Results:**
- Fraud detected: `velocity_anomaly`
- Fraud log with calculated speed
- Clock-in rejected
- Alert sent to supervisor

### Scenario 4: App Attestation - iOS

**Test Steps:**
1. iOS app starts up
2. App generates attestation challenge from backend
3. App calls App Attest framework
4. App sends attestation to backend
5. Backend verifies attestation with Apple servers
6. Backend marks device as trusted

**Expected Results:**
- Challenge generated successfully
- Attestation verified
- Device fingerprint created
- Device marked as trusted

---

## Performance Criteria

| Operation | Target | Acceptable | Notes |
|-----------|--------|------------|-------|
| Apple token verification | <500ms | <1s | Network call to Apple |
| Fraud check - mock location | <100ms | <200ms | Local check |
| Fraud check - velocity | <200ms | <500ms | DB query for last location |
| App attestation verification | <1s | <2s | Network call to Apple/Google |
| Fraud log query (admin) | <500ms | <1s | Paginated, 1K logs |

---

## API Response Examples

### POST /auth/apple

**Request:**
```json
{
  "identityToken": "eyJraWQiOi...",
  "user": "001234.a1b2c3d4e5f6.1234",
  "email": "worker@privaterelay.appleid.com",
  "fullName": "John Doe"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "8127dc81-97cf-4c6e-a1b4-b1ace284ea78",
    "username": "worker1",
    "full_name": "John Doe",
    "role": "worker",
    "appleId": "001234.a1b2c3d4e5f6.1234"
  }
}
```

### POST /fraud/check-location

**Response (400 Bad Request - Fraud Detected):**
```json
{
  "statusCode": 400,
  "message": "Fraud detected: Mock location is enabled",
  "error": "Bad Request",
  "fraudCheckResult": {
    "passed": false,
    "checks": [
      {
        "type": "mock_location",
        "passed": false,
        "message": "Mock location is enabled"
      }
    ]
  },
  "fraudLogId": "fraud-log-uuid"
}
```

**Response (200 OK - No Fraud):**
```json
{
  "passed": true,
  "checks": [
    {
      "type": "mock_location",
      "passed": true,
      "message": "Location source verified"
    },
    {
      "type": "velocity_check",
      "passed": true,
      "message": "Travel speed normal (2.5 m/s)"
    },
    {
      "type": "accuracy_check",
      "passed": true,
      "message": "GPS accuracy acceptable (8m)"
    }
  ]
}
```

### GET /fraud/stats

**Response (200 OK):**
```json
{
  "period": {
    "start": "2026-01-01",
    "end": "2026-01-31"
  },
  "total": 47,
  "byType": {
    "mock_location": 25,
    "velocity_anomaly": 12,
    "device_tampering": 8,
    "gps_spoofing": 2
  },
  "byStatus": {
    "detected": 15,
    "reviewed": 20,
    "confirmed": 10,
    "dismissed": 2
  },
  "uniqueUsers": 8,
  "topOffenders": [
    {
      "userId": "worker-uuid",
      "fullName": "Worker Five",
      "fraudCount": 12,
      "lastIncident": "2026-01-28T14:30:00.000Z"
    }
  ]
}
```

---

**Last Updated:** 2026-01-21
