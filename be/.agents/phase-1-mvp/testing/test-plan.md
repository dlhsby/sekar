# Test Plan - Phase 1 MVP

## Overview

Testing strategy for SEKAR Backend MVP ensuring quality and reliability.

---

## Testing Standards

### Coverage Requirements
| Category | Target | Minimum |
|----------|--------|---------|
| Unit Tests | >80% | 80% |
| Branch Coverage | >75% | 70% |
| Critical Paths | >90% | 85% |

### Testing Framework
- **Framework:** Jest
- **Mocking:** Jest mocks
- **HTTP Testing:** Supertest
- **Database:** In-memory SQLite or test PostgreSQL

---

## Test Categories

### 1. Unit Tests

Each module's service must have unit tests covering:
- All public methods
- Success cases
- Error cases
- Edge cases

**Naming Convention:**
```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test
    });
  });
});
```

### 2. Integration Tests

API endpoint tests verifying:
- Request validation
- Response format
- Status codes
- Authentication/authorization

### 3. E2E Tests

Full workflow tests:
- Clock-in → Report → Clock-out flow
- Authentication flow

---

## Module Test Coverage

### Auth Module (>80%)

| Method | Test Cases |
|--------|------------|
| `login` | Valid credentials, Invalid password, User not found, Inactive user |
| `validateUser` | Valid user, Invalid password, User not found |
| `getProfile` | Valid token, With assignment, Without assignment |

**Sample Tests:**
```typescript
describe('AuthService', () => {
  describe('login', () => {
    it('should return token for valid credentials', async () => {
      const result = await service.login('worker1', 'worker123');
      expect(result.token).toBeDefined();
      expect(result.user.username).toBe('worker1');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      await expect(service.login('worker1', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      await expect(service.login('nobody', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
```

### Users Module (>80%)

| Method | Test Cases |
|--------|------------|
| `create` | Valid user, Duplicate username, Missing fields |
| `findAll` | Return all active, Filter by role |
| `findOne` | User exists, User not found |
| `update` | Valid update, Password rehash, User not found |
| `remove` | Soft delete, User not found |

### AreaTypes Module (>80%)

| Method | Test Cases |
|--------|------------|
| `findAll` | Return all types |
| `findByCode` | Type exists, Type not found |

### Areas Module (>80%)

| Method | Test Cases |
|--------|------------|
| `create` | Valid area, Invalid GPS, Invalid type |
| `findAll` | Return all, Filter by type |
| `findOne` | Area exists, Area not found |
| `update` | Valid update, Area not found |
| `remove` | Soft delete, Has workers assigned |

### Worker Assignments Module (>80%)

| Method | Test Cases |
|--------|------------|
| `assign` | Valid assignment, Already assigned, Worker not found, Area not found |
| `findByWorkerId` | Has assignment, No assignment |
| `remove` | Remove existing, Not assigned |

### Shifts Module (>80%)

| Method | Test Cases |
|--------|------------|
| `clockIn` | Valid clock-in, Already clocked in, Outside boundary, Not assigned, Missing selfie |
| `clockOut` | Valid clock-out, Not clocked in, Wrong user |
| `findActiveShift` | Has active, No active |
| `calculateHoursWorked` | Full shift, Ongoing shift |

**GPS Boundary Tests:**
```typescript
describe('clockIn', () => {
  it('should reject clock-in outside area boundary', async () => {
    // Mock area with center at -7.2905, 112.7398, radius 100m
    // Try clock-in at -7.3037, 112.7375 (>1km away)
    await expect(
      service.clockIn(userId, {
        area_id: 1,
        gps_lat: -7.3037,
        gps_lng: 112.7375,
        selfie_photo: 'data:image/jpeg;base64,...',
      }),
    ).rejects.toThrow('GPS location outside area boundary');
  });

  it('should accept clock-in within area boundary', async () => {
    // Mock area with center at -7.2905, 112.7398, radius 100m
    // Clock-in at -7.2905, 112.7399 (~10m away)
    const result = await service.clockIn(userId, {
      area_id: 1,
      gps_lat: -7.2905,
      gps_lng: 112.7399,
      selfie_photo: 'data:image/jpeg;base64,...',
    });
    expect(result.id).toBeDefined();
  });
});
```

### Reports Module (>80%)

| Method | Test Cases |
|--------|------------|
| `create` | Valid report, No active shift, Invalid condition |
| `uploadMedia` | Valid upload, Report not found, Invalid file type |
| `findMyReports` | Has reports, No reports, Filter by date |
| `findOne` | Report exists, Report not found |
| `review` | Mark reviewed, Already reviewed, Not supervisor |

### Location Module (>80%)

| Method | Test Cases |
|--------|------------|
| `uploadBatch` | Valid batch, Empty batch, No active shift, Large batch (50+ pings) |

**Batch Upload Test:**
```typescript
describe('uploadBatch', () => {
  it('should insert 50 pings efficiently', async () => {
    const pings = Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 600000).toISOString(),
      gps_lat: -7.2905 + i * 0.0001,
      gps_lng: 112.7398 + i * 0.0001,
      accuracy: 10,
    }));

    const start = Date.now();
    const result = await service.uploadBatch(userId, { pings });
    const duration = Date.now() - start;

    expect(result).toBe(50);
    expect(duration).toBeLessThan(1000); // Under 1 second
  });
});
```

### Supervisor Module (>80%)

| Method | Test Cases |
|--------|------------|
| `getActiveWorkers` | Has active, No active workers |
| `getReports` | All reports, Filter by date, Filter by worker, Filter by area |
| `getAttendance` | Full attendance, Filter by area |

---

## Utility Tests

### GpsUtil Tests

```typescript
describe('GpsUtil', () => {
  describe('calculateDistance', () => {
    it('should return 0 for identical coordinates', () => {
      expect(GpsUtil.calculateDistance(-7.2905, 112.7398, -7.2905, 112.7398)).toBe(0);
    });

    it('should calculate distance accurately', () => {
      // Known distance: ~111km per degree at equator
      const distance = GpsUtil.calculateDistance(0, 0, 0, 1);
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    it('should handle negative coordinates', () => {
      const distance = GpsUtil.calculateDistance(-7.2905, 112.7398, -7.3037, 112.7375);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('isWithinBoundary', () => {
    const center = { lat: -7.2905, lng: 112.7398 };
    const radius = 100; // 100 meters

    it('should return true for point at center', () => {
      expect(GpsUtil.isWithinBoundary(center.lat, center.lng, center.lat, center.lng, radius)).toBe(true);
    });

    it('should return true for point just inside boundary', () => {
      // ~50 meters away
      expect(GpsUtil.isWithinBoundary(-7.2905, 112.74025, center.lat, center.lng, radius)).toBe(true);
    });

    it('should return false for point outside boundary', () => {
      // ~1.5km away
      expect(GpsUtil.isWithinBoundary(-7.3037, 112.7375, center.lat, center.lng, radius)).toBe(false);
    });
  });
});
```

---

## Integration Tests

### Authentication Flow

```typescript
describe('Auth (e2e)', () => {
  it('POST /auth/login - should authenticate user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'worker1', password: 'worker123' })
      .expect(200);

    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe('worker');
  });

  it('GET /auth/me - should return current user', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.username).toBe('worker1');
  });
});
```

### Clock-In/Out Flow

```typescript
describe('Shifts (e2e)', () => {
  it('should complete clock-in to clock-out flow', async () => {
    // Clock in
    const clockIn = await request(app.getHttpServer())
      .post('/api/shifts/clock-in')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        area_id: 1,
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        selfie_photo: 'data:image/jpeg;base64,...',
      })
      .expect(201);

    const shiftId = clockIn.body.shift_id;

    // Check current shift
    const current = await request(app.getHttpServer())
      .get('/api/shifts/current')
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);

    expect(current.body.shift_id).toBe(shiftId);

    // Clock out
    const clockOut = await request(app.getHttpServer())
      .post('/api/shifts/clock-out')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        shift_id: shiftId,
        gps_lat: -7.2905,
        gps_lng: 112.7398,
      })
      .expect(200);

    expect(clockOut.body.total_hours).toBeGreaterThan(0);
  });
});
```

---

## Quality Gates

### Pre-Commit
- [ ] All unit tests pass
- [ ] Coverage >80%
- [ ] No linting errors

### Pre-Merge
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage >80%
- [ ] Code reviewed

### Pre-Deploy
- [ ] All tests pass
- [ ] E2E tests pass
- [ ] Performance tests pass

---

## Test Execution

### Running Tests

```bash
# All unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# Specific file
npm test -- auth.service.spec.ts

# E2E tests
npm run test:e2e
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run lint
    - run: npm run test:cov
    - uses: codecov/codecov-action@v3
```

---

*Last Updated: January 2026*

