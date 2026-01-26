import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ApiErrorCode } from '../src/common/enums/api-error-codes.enum';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * E2E Tests for Error Codes System
 *
 * Tests that API endpoints return correct error codes for various scenarios:
 * - Authentication errors (AUTH_*)
 * - Shift errors (SHIFT_*)
 * - Report errors (REPORT_*)
 * - Validation errors (VALIDATION_ERROR)
 *
 * These tests ensure mobile clients can handle errors programmatically
 * using the error codes instead of parsing error messages.
 */
describe('Error Codes (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let supervisorToken: string;
  let workerToken: string;
  let worker2Token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global configuration
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api/v1');

    await app.init();

    // Login as different users to get tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminLogin.body.access_token;

    const supervisorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'supervisor1', password: 'supervisor123' });
    supervisorToken = supervisorLogin.body.access_token;

    const workerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'worker1', password: 'worker123' });
    workerToken = workerLogin.body.access_token;

    const worker2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'worker2', password: 'worker123' });
    worker2Token = worker2Login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Error Codes', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should return AUTH_INVALID_CREDENTIALS for wrong password', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username: 'admin', password: 'wrongpassword' })
          .expect(401)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
            expect(res.body.message).toContain('Invalid credentials');
            expect(res.body.error).toBe('Unauthorized');
            expect(res.body.timestamp).toBeDefined();
            expect(res.body.path).toBe('/api/v1/auth/login');
          });
      });

      it('should return AUTH_INVALID_CREDENTIALS for non-existent user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username: 'nonexistent', password: 'password123' })
          .expect(401)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
            expect(res.body.message).toContain('Invalid credentials');
          });
      });

      it('should return AUTH_ACCOUNT_INACTIVE for inactive user', async () => {
        // First, deactivate a user as admin
        const usersResponse = await request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`);

        const testUser = usersResponse.body.find((u: any) => u.username === 'worker3');

        await request(app.getHttpServer())
          .patch(`/api/v1/users/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ is_active: false });

        // Try to login as inactive user
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username: 'worker3', password: 'worker123' })
          .expect(401)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.AUTH_ACCOUNT_INACTIVE);
            expect(res.body.message).toContain('inactive');
          });
      });

      it('should return VALIDATION_ERROR for missing credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username: 'admin' }) // Missing password
          .expect(400)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.BAD_REQUEST);
            expect(res.body.message).toBeDefined();
          });
      });
    });

    describe('Protected Endpoints without Token', () => {
      it('should return AUTH_TOKEN_INVALID for missing authorization header', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .expect(401)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.AUTH_TOKEN_INVALID);
          });
      });

      it('should return AUTH_TOKEN_INVALID for malformed token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', 'Bearer invalid-token-here')
          .expect(401)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.AUTH_TOKEN_INVALID);
          });
      });
    });
  });

  describe('Shift Error Codes', () => {
    describe('POST /api/v1/shifts/clock-in', () => {
      it('should return SHIFT_ALREADY_ACTIVE when worker already clocked in', async () => {
        // First clock-in
        const clockInDto = {
          area_id: 'valid-area-uuid',
          gps_lat: -7.2905,
          gps_lng: 112.7398,
          selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        };

        await request(app.getHttpServer())
          .post('/api/v1/shifts/clock-in')
          .set('Authorization', `Bearer ${workerToken}`)
          .send(clockInDto);

        // Try to clock-in again
        return request(app.getHttpServer())
          .post('/api/v1/shifts/clock-in')
          .set('Authorization', `Bearer ${workerToken}`)
          .send(clockInDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.SHIFT_ALREADY_ACTIVE);
            expect(res.body.message).toContain('Already clocked in');
            expect(res.body.details).toHaveProperty('activeShiftId');
          });
      });

      it('should return SHIFT_GPS_OUT_OF_BOUNDS when GPS outside area boundary', () => {
        const clockInDto = {
          area_id: 'valid-area-uuid',
          gps_lat: -7.3037, // Far from area center (~1.5km)
          gps_lng: 112.7375,
          selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        };

        return request(app.getHttpServer())
          .post('/api/v1/shifts/clock-in')
          .set('Authorization', `Bearer ${worker2Token}`)
          .send(clockInDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS);
            expect(res.body.message).toContain('GPS location');
            expect(res.body.details).toHaveProperty('distance');
            expect(res.body.details).toHaveProperty('maxDistance');
          });
      });

      it('should return SHIFT_NOT_ASSIGNED when worker not assigned to area', () => {
        const clockInDto = {
          area_id: 'non-assigned-area-uuid',
          gps_lat: -7.2905,
          gps_lng: 112.7398,
          selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        };

        return request(app.getHttpServer())
          .post('/api/v1/shifts/clock-in')
          .set('Authorization', `Bearer ${workerToken}`)
          .send(clockInDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.SHIFT_NOT_ASSIGNED);
            expect(res.body.message).toContain('not assigned');
          });
      });

      it('should return SHIFT_NOT_FOUND for invalid area_id', () => {
        const clockInDto = {
          area_id: '00000000-0000-0000-0000-000000000000',
          gps_lat: -7.2905,
          gps_lng: 112.7398,
          selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        };

        return request(app.getHttpServer())
          .post('/api/v1/shifts/clock-in')
          .set('Authorization', `Bearer ${workerToken}`)
          .send(clockInDto)
          .expect(404)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.AREA_NOT_FOUND);
            expect(res.body.message).toContain('not found');
          });
      });
    });

    describe('POST /api/v1/shifts/clock-out', () => {
      it('should return SHIFT_NOT_ACTIVE when no active shift found', () => {
        const clockOutDto = {
          gps_lat: -7.2906,
          gps_lng: 112.7399,
        };

        return request(app.getHttpServer())
          .post('/api/v1/shifts/clock-out')
          .set('Authorization', `Bearer ${worker2Token}`)
          .send(clockOutDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.SHIFT_NOT_ACTIVE);
            expect(res.body.message).toContain('No active shift');
          });
      });
    });
  });

  describe('Report Error Codes', () => {
    describe('POST /api/v1/reports', () => {
      it('should return REPORT_SHIFT_REQUIRED when creating report without active shift', () => {
        const createReportDto = {
          shift_id: 'non-existent-shift-uuid',
          report_type: 'task_completion',
          description: 'Completed cleaning',
          gps_lat: -7.2905,
          gps_lng: 112.7398,
        };

        return request(app.getHttpServer())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${workerToken}`)
          .send(createReportDto)
          .expect(404)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.REPORT_SHIFT_NOT_FOUND);
            expect(res.body.message).toContain('Shift not found');
          });
      });

      it('should return VALIDATION_ERROR for invalid report_type', () => {
        const createReportDto = {
          shift_id: 'valid-shift-uuid',
          report_type: 'invalid_type',
          description: 'Test report',
          gps_lat: -7.2905,
          gps_lng: 112.7398,
        };

        return request(app.getHttpServer())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${workerToken}`)
          .send(createReportDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.BAD_REQUEST);
            expect(res.body.message).toBeDefined();
          });
      });
    });

    describe('GET /api/v1/reports/:id', () => {
      it('should return REPORT_NOT_FOUND for non-existent report', () => {
        return request(app.getHttpServer())
          .get('/api/v1/reports/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${workerToken}`)
          .expect(404)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.REPORT_NOT_FOUND);
            expect(res.body.message).toContain('not found');
          });
      });

      it("should return REPORT_ACCESS_DENIED when worker accesses another worker's report", async () => {
        // Create a report as worker1
        const createReportDto = {
          shift_id: 'worker1-shift-uuid',
          report_type: 'task_completion',
          description: 'Test report',
          gps_lat: -7.2905,
          gps_lng: 112.7398,
        };

        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${workerToken}`)
          .send(createReportDto);

        const reportId = createResponse.body.id;

        // Try to access as worker2
        return request(app.getHttpServer())
          .get(`/api/v1/reports/${reportId}`)
          .set('Authorization', `Bearer ${worker2Token}`)
          .expect(403)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.REPORT_ACCESS_DENIED);
            expect(res.body.message).toContain('only access your own reports');
          });
      });
    });

    describe('PATCH /api/v1/reports/:id', () => {
      it('should return REPORT_EDIT_WINDOW_CLOSED when editing after 1 hour', async () => {
        // Create a report
        const createReportDto = {
          shift_id: 'valid-shift-uuid',
          report_type: 'task_completion',
          description: 'Original description',
          gps_lat: -7.2905,
          gps_lng: 112.7398,
        };

        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${workerToken}`)
          .send(createReportDto);

        const reportId = createResponse.body.id;

        // Mock time passing (in real test, would need to update created_at in DB)
        // Or create a report that's already >1 hour old

        const updateDto = {
          description: 'Updated description',
        };

        return request(app.getHttpServer())
          .patch(`/api/v1/reports/${reportId}`)
          .set('Authorization', `Bearer ${workerToken}`)
          .send(updateDto)
          .expect(403)
          .expect((res) => {
            expect(res.body.code).toBe(ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED);
            expect(res.body.message).toContain('within 1 hour');
          });
      });
    });
  });

  describe('General Error Codes', () => {
    it('should return FORBIDDEN when worker tries to access admin endpoint', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/users/some-uuid')
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.code).toBe(ApiErrorCode.FORBIDDEN);
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return NOT_FOUND for non-existent endpoint', () => {
      return request(app.getHttpServer())
        .get('/api/v1/non-existent-endpoint')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.code).toBe(ApiErrorCode.NOT_FOUND);
        });
    });

    it('should return BAD_REQUEST for validation errors', () => {
      return request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'ab', // Too short
          password: '123', // Too short
          // Missing required fields
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.code).toBe(ApiErrorCode.BAD_REQUEST);
          expect(res.body.message).toBeDefined();
        });
    });
  });

  describe('Error Response Structure', () => {
    it('should include all required fields in error response', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'invalid', password: 'wrong' })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body).toHaveProperty('code');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('error');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('path');

          // Validate types
          expect(typeof res.body.statusCode).toBe('number');
          expect(typeof res.body.code).toBe('string');
          expect(typeof res.body.message).toBe('string');
          expect(typeof res.body.error).toBe('string');
          expect(typeof res.body.timestamp).toBe('string');
          expect(typeof res.body.path).toBe('string');

          // Validate timestamp is ISO 8601
          expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
        });
    });

    it('should include details when available', async () => {
      // Clock in first
      await request(app.getHttpServer())
        .post('/api/v1/shifts/clock-in')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          area_id: 'valid-area-uuid',
          gps_lat: -7.2905,
          gps_lng: 112.7398,
          selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        });

      // Try to clock in again
      return request(app.getHttpServer())
        .post('/api/v1/shifts/clock-in')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          area_id: 'valid-area-uuid',
          gps_lat: -7.2905,
          gps_lng: 112.7398,
          selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('details');
          expect(res.body.details).toHaveProperty('activeShiftId');
        });
    });
  });

  describe('Error Code Consistency', () => {
    it('should return same error code for same error across different endpoints', async () => {
      // Test AUTH_TOKEN_INVALID across multiple endpoints
      const endpoints = ['/api/v1/users', '/api/v1/shifts', '/api/v1/reports', '/api/v1/areas'];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint).expect(401);

        expect(response.body.code).toBe(ApiErrorCode.AUTH_TOKEN_INVALID);
      }
    });

    it('should return same error code for NOT_FOUND across resources', async () => {
      const notFoundTests = [
        { method: 'get', path: '/api/v1/users/00000000-0000-0000-0000-000000000000' },
        { method: 'get', path: '/api/v1/shifts/00000000-0000-0000-0000-000000000000' },
        { method: 'get', path: '/api/v1/reports/00000000-0000-0000-0000-000000000000' },
        { method: 'get', path: '/api/v1/areas/00000000-0000-0000-0000-000000000000' },
      ];

      for (const test of notFoundTests) {
        const agent = request(app.getHttpServer()) as any;
        const response = await agent[test.method](test.path)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body.code).toMatch(/_NOT_FOUND$/);
      }
    });
  });
});
