import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * Contract for `GET /monitoring/boundaries?level=area` — the payload web search
 * builds its index from.
 *
 * Kawasan carry no stored centre, so the web places each kawasan at the middle
 * of its lokasi, found through each lokasi's `region_id`. This payload omitted
 * `region_id` entirely, so no kawasan was searchable.
 *
 * It slipped through TWICE because both the web unit test and the first attempt
 * at a fix used hand-written fixtures that included `region_id` — which the real
 * response never did. This test asserts against the real response from a real
 * database, which is the only layer that could have caught it.
 */
describe('GET /monitoring/boundaries (e2e contract)', () => {
  let app: INestApplication;
  let token: string;

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

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'superadmin', password: '12345678' });
    token = res.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  const fetchAreas = async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/monitoring/boundaries?level=area')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    return (body.districts as Array<{ areas?: Array<Record<string, unknown>> }>).flatMap(
      (d) => d.areas ?? [],
    );
  };

  it('sends region_id on EVERY lokasi — null when outside a kawasan, never absent', async () => {
    const areas = await fetchAreas();
    expect(areas.length).toBeGreaterThan(0);
    const missing = areas.filter((a) => !Object.prototype.hasOwnProperty.call(a, 'region_id'));
    expect(missing).toHaveLength(0);
  });
});
