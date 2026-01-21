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

**Last Updated:** 2026-01-16
