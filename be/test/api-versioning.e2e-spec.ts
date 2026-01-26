import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * E2E Tests for API Versioning
 *
 * Tests that the API versioning is correctly implemented:
 * - /api/v1/* endpoints work correctly
 * - Old /api/* paths return 404 or redirect to /api/v1
 * - Swagger docs available at /api/v1/docs
 * - X-API-Version header in responses
 * - Version-specific behavior
 *
 * API Versioning Strategy: URI Versioning (/api/v1, /api/v2, etc.)
 */
describe('API Versioning (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

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

    // Enable URI versioning
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.setGlobalPrefix('api');

    await app.init();

    // Get authentication token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('V1 API Endpoints', () => {
    describe('Authentication Endpoints', () => {
      it('POST /api/v1/auth/login should work', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username: 'admin', password: 'admin123' })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('access_token');
            expect(res.body).toHaveProperty('user');
          });
      });

      it('GET /api/v1/auth/profile should work', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('username');
            expect(res.body).toHaveProperty('role');
          });
      });
    });

    describe('Users Endpoints', () => {
      it('GET /api/v1/users should work', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
          });
      });

      it('GET /api/v1/users/:id should work', async () => {
        const usersResponse = await request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${authToken}`);

        const userId = usersResponse.body[0].id;

        return request(app.getHttpServer())
          .get(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(userId);
          });
      });
    });

    describe('Shifts Endpoints', () => {
      it('GET /api/v1/shifts should work', () => {
        return request(app.getHttpServer())
          .get('/api/v1/shifts')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it('GET /api/v1/shifts/active should work', () => {
        return request(app.getHttpServer())
          .get('/api/v1/shifts/active')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });
    });

    describe('Reports Endpoints', () => {
      it('GET /api/v1/reports should work', () => {
        return request(app.getHttpServer())
          .get('/api/v1/reports')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe('Areas Endpoints', () => {
      it('GET /api/v1/areas should work', () => {
        return request(app.getHttpServer())
          .get('/api/v1/areas')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe('Location Logs Endpoints', () => {
      it('GET /api/v1/location-logs should work', () => {
        return request(app.getHttpServer())
          .get('/api/v1/location-logs')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });
  });

  describe('Old API Paths (without version)', () => {
    it('POST /api/auth/login should return 404 or redirect', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect((res) => {
          // Should either be 404 or 301/302 redirect
          expect([301, 302, 404]).toContain(res.status);
        });
    });

    it('GET /api/users should return 404', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('GET /api/shifts should return 404', () => {
      return request(app.getHttpServer())
        .get('/api/shifts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('GET /api/reports should return 404', () => {
      return request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('API Documentation', () => {
    it('GET /api/v1/docs should return Swagger UI', () => {
      return request(app.getHttpServer())
        .get('/api/v1/docs')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect((res) => {
          expect(res.text).toContain('Swagger UI');
        });
    });

    it('GET /api/v1/docs-json should return OpenAPI JSON', () => {
      return request(app.getHttpServer())
        .get('/api/v1/docs-json')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('openapi');
          expect(res.body).toHaveProperty('info');
          expect(res.body).toHaveProperty('paths');
          expect(res.body.info.version).toBe('1.0');
        });
    });

    it('OpenAPI spec should include all v1 endpoints', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/docs-json').expect(200);

      const paths = Object.keys(response.body.paths);

      // Verify key endpoints are documented
      expect(paths).toContain('/api/v1/auth/login');
      expect(paths).toContain('/api/v1/users');
      expect(paths).toContain('/api/v1/shifts');
      expect(paths).toContain('/api/v1/reports');
      expect(paths).toContain('/api/v1/areas');
    });
  });

  describe('Version Headers', () => {
    it('should include X-API-Version header in responses', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.headers).toHaveProperty('x-api-version');
          expect(res.headers['x-api-version']).toBe('1');
        });
    });

    it('should include X-API-Version in authenticated responses', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.headers['x-api-version']).toBe('1');
        });
    });

    it('should include X-API-Version in error responses', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'invalid', password: 'wrong' })
        .expect(401)
        .expect((res) => {
          expect(res.headers['x-api-version']).toBe('1');
        });
    });
  });

  describe('Health Check Endpoints', () => {
    it('GET /api/health should work (no version)', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
        });
    });

    it('GET /api/v1/health should work', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('version');
          expect(res.body.version).toBe('1.0');
        });
    });
  });

  describe('API Root Endpoint', () => {
    it('GET /api should return API information', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('status');
          expect(res.body.message).toContain('SEKAR');
        });
    });

    it('GET /api/v1 should return v1 API information', () => {
      return request(app.getHttpServer())
        .get('/api/v1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('version', 'v1');
          expect(res.body).toHaveProperty('endpoints');
        });
    });
  });

  describe('Version Mismatch Handling', () => {
    it('GET /api/v2/users should return 404 (version not implemented)', () => {
      return request(app.getHttpServer())
        .get('/api/v2/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('Cannot GET /api/v2/users');
        });
    });

    it('GET /api/v99/users should return 404', () => {
      return request(app.getHttpServer())
        .get('/api/v99/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('CORS and Version Headers', () => {
    it('should include version header in CORS preflight response', () => {
      return request(app.getHttpServer())
        .options('/api/v1/users')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200)
        .expect((res) => {
          expect(res.headers).toHaveProperty('access-control-allow-origin');
          expect(res.headers['x-api-version']).toBe('1');
        });
    });
  });

  describe('Version Consistency', () => {
    it('should use consistent version across all v1 endpoints', async () => {
      const endpoints = [
        '/api/v1/health',
        '/api/v1/users',
        '/api/v1/shifts',
        '/api/v1/reports',
        '/api/v1/areas',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .expect((res) => {
            expect([200, 401]).toContain(res.status); // Some may require auth
          });

        if (response.status === 200) {
          expect(response.headers['x-api-version']).toBe('1');
        }
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain same response structure across versions', async () => {
      const v1Response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(201);

      // Verify response structure
      expect(v1Response.body).toHaveProperty('access_token');
      expect(v1Response.body).toHaveProperty('user');
      expect(v1Response.body.user).toHaveProperty('id');
      expect(v1Response.body.user).toHaveProperty('username');
      expect(v1Response.body.user).toHaveProperty('role');

      // Should NOT have password_hash
      expect(v1Response.body.user).not.toHaveProperty('password_hash');
    });
  });

  describe('Version in Error Responses', () => {
    it('should include version in 404 responses', () => {
      return request(app.getHttpServer())
        .get('/api/v1/non-existent-endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.headers['x-api-version']).toBe('1');
          expect(res.body).toHaveProperty('statusCode', 404);
        });
    });

    it('should include version in 401 responses', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401)
        .expect((res) => {
          expect(res.headers['x-api-version']).toBe('1');
          expect(res.body).toHaveProperty('statusCode', 401);
        });
    });

    it('should include version in validation error responses', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin' }) // Missing password
        .expect(400)
        .expect((res) => {
          expect(res.headers['x-api-version']).toBe('1');
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });
  });

  describe('API Metadata', () => {
    it('should expose API metadata at /api endpoint', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            message: expect.any(String),
            version: expect.any(String),
            status: expect.any(String),
          });
        });
    });

    it('should list available versions', async () => {
      const response = await request(app.getHttpServer()).get('/api').expect(200);

      expect(response.body).toHaveProperty('availableVersions');
      expect(Array.isArray(response.body.availableVersions)).toBe(true);
      expect(response.body.availableVersions).toContain('v1');
    });
  });
});
