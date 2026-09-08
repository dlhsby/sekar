import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * Contract guards for the users endpoints — the two shapes that broke in
 * production and that no unit test could see.
 *
 * Both defects needed the REAL app to surface:
 *
 *  - `GET /users/me/areas` returned 403 for a satgas, because
 *    `users/:userId/areas` (manager-gated, in another controller whose module
 *    registers first) shadowed the literal. Route order is a property of the
 *    assembled app, not of any one controller.
 *  - `PATCH /users/:id` returned 400 for every web submission, because the form
 *    sends `location_ids` while the DTO only declared `area_ids` and the global
 *    pipe runs `forbidNonWhitelisted: true`. A DTO unit test passes happily
 *    while the deployed contract rejects the only client that calls it.
 */
describe('Users contract (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const login = async (identifier: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier, password: '12345678' });
    return res.body.access_token;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();

    adminToken = await login('admin_system_1');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/me/areas', () => {
    it('is reachable by a field worker — not shadowed by the :userId route', async () => {
      const token = await login('satgas_shift_1');
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/areas')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).not.toBe(403);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('still requires authentication', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users/me/areas');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /users/:id accepts what the web form sends', () => {
    let targetId: string;
    let originalPhone: string | null;

    beforeAll(async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/users?limit=1&role=satgas')
        .set('Authorization', `Bearer ${adminToken}`);
      const user = (list.body.data ?? list.body.items ?? list.body)[0];
      targetId = user.id;
      originalPhone = user.phone_number ?? null;
    });

    afterAll(async () => {
      // Leave the fixture as we found it — the suite runs against a real DB.
      if (targetId) {
        await request(app.getHttpServer())
          .patch(`/api/v1/users/${targetId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ phone_number: originalPhone ?? undefined });
      }
    });

    it('accepts location_ids — the canonical name the web sends', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ location_ids: [] });

      expect(res.status).toBe(200);
    });

    it('still accepts the legacy area_ids alias', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ area_ids: [] });

      expect(res.status).toBe(200);
    });

    it('accepts a phone change in the full form payload — the reported bug', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          phone_number: '081246536898',
          district_id: null,
          region_id: null,
          shift_definition_id: null,
          location_ids: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.phone_number ?? res.body.data?.phone_number).toBe('081246536898');
    });

    it('still rejects a genuinely unknown field', async () => {
      // The whitelist is doing its job; the bug was the DTO missing a real field.
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ definitely_not_a_field: 'x' });

      expect(res.status).toBe(400);
    });
  });
});
