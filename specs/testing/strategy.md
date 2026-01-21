# Testing Strategy - SEKAR System

## Overview

This document defines the comprehensive testing strategy for SEKAR (Sistem Evaluasi Kerja Satgas RTH), covering backend API, mobile applications, and overall quality assurance approach.

---

## Testing Philosophy

### Core Principles

1. **Quality First**: Maintain >80% test coverage across all modules
2. **Test-Driven Mindset**: Write tests alongside implementation
3. **Fast Feedback**: Unit tests execute in <5 seconds
4. **Comprehensive Coverage**: Test happy paths, edge cases, and failure scenarios
5. **Maintainable Tests**: Clear, readable, and self-documenting test code

### Test Pyramid

```
              /\
             /  \  E2E Tests (5%)
            /    \  - Critical user flows
           /------\  - API integration tests
          /        \ Integration Tests (15%)
         /          \ - Module interactions
        /            \ - Database operations
       /--------------\ Unit Tests (80%)
                       - Service logic
                       - Controller validation
                       - Utility functions
                       - Component behavior
```

**Distribution Rationale:**
- **80% Unit Tests**: Fast, isolated, test business logic
- **15% Integration Tests**: Verify module interactions
- **5% E2E Tests**: Validate critical user workflows

---

## Coverage Requirements

### Global Standards

| Type | Minimum Coverage | Target Coverage |
|------|-----------------|-----------------|
| Lines | 80% | 90%+ |
| Statements | 80% | 90%+ |
| Branches | 80% | 85%+ |
| Functions | 80% | 90%+ |

### Critical Modules (95%+ Required)

- Authentication & Authorization
- Clock-in/out validation
- GPS boundary verification
- Payment-related logic (if applicable)
- User role management

### Exempted from Coverage

- DTO/Entity definitions (structural)
- Module declarations
- Database migrations
- Seed scripts
- Main/bootstrap files
- Interface definitions

---

## Testing Tools & Frameworks

### Backend (NestJS)

| Tool | Purpose | Version |
|------|---------|---------|
| **Jest** | Test runner & assertion library | ^29.5.0 |
| **@nestjs/testing** | NestJS test utilities | ^11.0.0 |
| **Supertest** | HTTP assertion for E2E tests | ^6.3.3 |
| **ts-jest** | TypeScript support for Jest | ^29.1.0 |

**Jest Configuration:**
```json
{
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "collectCoverageFrom": [
    "**/*.(t|j)s",
    "!**/*.spec.ts",
    "!**/*.module.ts",
    "!**/main.ts",
    "!**/seed.ts",
    "!**/*.interface.ts",
    "!**/entities/*.entity.ts",
    "!**/dto/*.dto.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### Mobile (React Native)

| Tool | Purpose | Version |
|------|---------|---------|
| **Jest** | Test runner | ^29.6.3 |
| **@testing-library/react-native** | Component testing | ^13.3.3 |
| **@testing-library/jest-native** | Native matchers | ^5.4.3 |
| **react-test-renderer** | Render components for testing | ^18.3.1 |

**Future (Phase 3+):**
- **Detox**: E2E testing for mobile apps
- **Maestro**: Mobile UI testing alternative

---

## Test Organization

### Backend Structure

```
be/src/
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts      # Unit tests
│   │   ├── auth.controller.ts
│   │   ├── auth.controller.spec.ts   # Unit tests
│   │   ├── guards/
│   │   │   ├── roles.guard.ts
│   │   │   └── roles.guard.spec.ts
│   │   └── strategies/
│   │       ├── jwt.strategy.ts
│   │       └── jwt.strategy.spec.ts
│   └── users/
│       ├── users.service.ts
│       ├── users.service.spec.ts
│       ├── users.controller.ts
│       └── users.controller.spec.ts
└── test/
    ├── app.e2e-spec.ts               # E2E tests
    └── jest-e2e.json                 # E2E config
```

**Naming Convention:** `[name].spec.ts` for unit tests, `[name].e2e-spec.ts` for E2E

### Mobile Structure

```
fe/mobile/
├── src/
│   ├── components/
│   │   ├── WorkerClockIn/
│   │   │   ├── WorkerClockIn.tsx
│   │   │   └── __tests__/
│   │   │       └── WorkerClockIn.test.tsx
│   │   └── MapView/
│   │       ├── MapView.tsx
│   │       └── __tests__/
│   │           └── MapView.test.tsx
│   ├── utils/
│   │   ├── gpsUtils.ts
│   │   └── __tests__/
│   │       └── gpsUtils.test.ts
│   └── store/
│       ├── slices/
│       │   ├── authSlice.ts
│       │   └── __tests__/
│       │       └── authSlice.test.ts
└── __mocks__/                        # Global mocks
    ├── @react-native-async-storage/
    ├── react-native-geolocation-service/
    └── @env.js
```

**Naming Convention:** `[name].test.tsx` or `[name].test.ts` in `__tests__/` folders

---

## Testing Standards

### AAA Pattern (Arrange-Act-Assert)

All tests follow the AAA pattern for clarity:

```typescript
describe('AuthService', () => {
  it('should successfully login with valid credentials', async () => {
    // Arrange: Set up test data and mocks
    const loginDto = { username: 'worker1', password: 'worker123' };
    const mockUser = { id: '123', username: 'worker1', role: UserRole.WORKER };
    mockUserRepository.findOne.mockResolvedValue(mockUser);

    // Act: Execute the function under test
    const result = await service.login(loginDto);

    // Assert: Verify the outcome
    expect(result).toHaveProperty('access_token');
    expect(result.user.username).toBe('worker1');
  });
});
```

### Test Categories

#### 1. Happy Path Tests
Test successful operations with valid inputs:
```typescript
it('should create shift when GPS is within boundary', async () => {
  // Valid clock-in scenario
});
```

#### 2. Edge Case Tests
Test boundary conditions and unusual inputs:
```typescript
it('should handle GPS at exact boundary edge', async () => {
  // GPS coordinate exactly at radius limit
});
```

#### 3. Error Path Tests
Test failure scenarios and error handling:
```typescript
it('should throw UnauthorizedException with invalid password', async () => {
  // Invalid credentials
});
```

#### 4. Integration Tests
Test interactions between modules:
```typescript
it('should upload photo to S3 and save report', async () => {
  // Multiple services working together
});
```

---

## Mock Strategy

### What to Mock

1. **External Services**: AWS S3, third-party APIs
2. **Repositories**: Database access via TypeORM
3. **Time-Dependent Logic**: Use fixed dates/times
4. **Network Requests**: Mock Axios/fetch
5. **Native Modules**: React Native permissions, geolocation

### What NOT to Mock

1. **Business Logic**: Test actual implementation
2. **Utility Functions**: Test real behavior
3. **DTOs/Entities**: Use real classes
4. **Type-only Imports**: No need to mock

### Mock Examples

**Backend Repository Mock:**
```typescript
const mockUserRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
};
```

**Mobile Native Module Mock:**
```typescript
// __mocks__/react-native-geolocation-service.ts
export default {
  getCurrentPosition: jest.fn((success) => {
    success({
      coords: {
        latitude: -7.2905,
        longitude: 112.7398,
        accuracy: 10,
      },
    });
  }),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
};
```

---

## Test Execution

### Backend Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test -- auth.service.spec.ts

# Run E2E tests
npm run test:e2e

# Run tests with debug
npm run test:debug
```

### Mobile Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- gpsUtils.test.ts

# Update snapshots
npm test -- -u
```

### CI/CD Integration

**GitHub Actions Example:**
```yaml
- name: Run tests
  run: |
    cd be
    npm test -- --coverage
    npm run test:e2e

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./be/coverage/lcov.info
    flags: backend
```

---

## Quality Gates

### Pre-Commit Checks

1. Run linter (ESLint)
2. Run formatter (Prettier)
3. Run unit tests for changed files

### Pull Request Requirements

1. All tests passing (100%)
2. Coverage threshold met (>80%)
3. No linting errors
4. No type errors (TypeScript)
5. E2E tests passing for affected features

### Pre-Deployment Checks

1. Full test suite passing
2. E2E tests passing
3. Performance tests passing (load testing)
4. Security scan complete
5. Database migrations tested

---

## Test Data Management

### Principles

1. **Isolation**: Each test should be independent
2. **Repeatability**: Tests produce same results every run
3. **Cleanup**: Reset state after tests
4. **Realistic Data**: Use production-like test data

### Test Database

**Backend:**
- Use in-memory SQLite for unit tests (fast)
- Use Docker PostgreSQL for E2E tests (realistic)
- Seed data before each E2E test suite
- Truncate tables after tests

**Mobile:**
- Mock AsyncStorage
- Mock SQLite database
- Use fixtures for predictable data

See [test-data.md](./test-data.md) for comprehensive fixtures.

---

## Performance Testing

### Load Testing (Phase 3+)

**Tools:**
- **Artillery**: API load testing
- **k6**: Performance testing

**Scenarios:**
- 500 workers clock-in simultaneously
- 100 photo uploads concurrently
- 1000 location pings/minute

**Acceptance Criteria:**
- API response time: <200ms (p95)
- Database queries: <50ms (p95)
- No errors under normal load

---

## Security Testing

### Test Security Concerns

1. **Authentication**: Test JWT expiration, invalid tokens
2. **Authorization**: Test role-based access control
3. **Input Validation**: Test SQL injection, XSS attempts
4. **File Upload**: Test malicious files, size limits
5. **GPS Spoofing**: Test boundary validation

**Example:**
```typescript
it('should reject request without valid JWT token', async () => {
  return request(app.getHttpServer())
    .get('/api/users/me')
    .expect(401);
});

it('should reject worker accessing supervisor endpoints', async () => {
  return request(app.getHttpServer())
    .get('/api/supervisor/reports')
    .set('Authorization', `Bearer ${workerToken}`)
    .expect(403);
});
```

---

## Testing Schedule

### Daily (During Development)

- Run unit tests locally before commits
- Fix failing tests immediately
- Review coverage reports

### Weekly

- Run full E2E test suite
- Review test coverage trends
- Update test documentation

### Release (Pre-Deployment)

- Full test suite (unit + integration + E2E)
- Performance testing
- Security scan
- Manual smoke testing

---

## Continuous Improvement

### Metrics to Track

1. **Test Coverage**: Line, branch, function coverage
2. **Test Execution Time**: Keep unit tests <5s, E2E <2min
3. **Flaky Tests**: Track and fix unreliable tests
4. **Bug Escape Rate**: Bugs found in production vs. caught by tests

### Review Process

**Monthly Test Review:**
- Identify gaps in coverage
- Remove obsolete tests
- Refactor slow tests
- Update test data

---

## Common Testing Pitfalls

### Avoid These Mistakes

1. **Over-Mocking**: Don't mock everything, test real behavior when possible
2. **Brittle Tests**: Don't test implementation details, test outcomes
3. **Slow Tests**: Keep unit tests fast (<100ms per test)
4. **Test Pollution**: Ensure tests don't affect each other
5. **Copy-Paste**: Avoid duplicating test setup, use helper functions

### Best Practices

1. **One Assertion Per Test** (when possible): Makes failures clear
2. **Descriptive Test Names**: Should read like documentation
3. **Test Data Builders**: Use factory functions for test objects
4. **Shared Setup**: Use `beforeEach` for common setup
5. **Clear Error Messages**: Custom matchers for better failure messages

---

## Resources

### Official Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Supertest](https://github.com/ladjs/supertest)

### Internal Documentation

- [Backend Testing Guide](./backend-testing.md)
- [Mobile Testing Guide](./mobile-testing.md)
- [Test Data & Fixtures](./test-data.md)
- [Backend Status](../../be/.agents/CURRENT_STATUS.md)
- [Mobile Status](../../fe/mobile/.agents/CURRENT_STATUS.md)

---

## Contact & Support

**Questions about testing?**
- Review this document first
- Check component-specific guides (backend/mobile)
- Refer to existing test examples in codebase

---

*Last Updated: January 2026*
*Current Test Status: 256 backend tests (100% coverage), 62 mobile tests*
*Project: SEKAR - Worker Tracking System*
