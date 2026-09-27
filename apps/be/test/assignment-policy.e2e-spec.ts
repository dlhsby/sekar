import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TimezoneUtil } from '../src/common/utils/timezone.util';

/**
 * The assignment rule (ADR-063, UAT 2026-09-26) through the real HTTP stack
 * and database:
 *  - satgas/linmas: ONE individual place per shift + ONE team in that shift
 *    (same or different place);
 *  - korlap: any number of places and teams in the same shift;
 *  - the same rule on the manual roster path AND the calendar (event) path.
 * A dedicated shift definition keeps seeded rows out of the picture.
 */
describe('Assignment policy (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let admin: string;
  let shiftId: string;
  let linmas: string;
  let korlap: string;
  let categoryId: string;
  let places: string[];
  const eventIds: string[] = [];
  const date = TimezoneUtil.jakartaDateString(new Date(Date.now() + 5 * 86_400_000));

  const http = () => request(app.getHttpServer());
  const one = async <T>(sql: string, params: unknown[] = []): Promise<T> =>
    ((await db.query(sql, params)) as T[])[0];
  const codeOf = (body: { code?: string; error?: { code?: string } }) =>
    body.error?.code ?? body.code;

  const addForDay = (userId: string, locationId: string) =>
    http()
      .post('/api/v1/schedules')
      .set('Authorization', `Bearer ${admin}`)
      .send({ user_id: userId, date, shift_definition_id: shiftId, area_ids: [locationId] });

  const teamEvent = (locationId: string, members: string[]) =>
    http().post('/api/v1/schedule-events').set('Authorization', `Bearer ${admin}`).send({
      title: 'Tim uji kebijakan',
      recurrence_type: 'none',
      start_date: date,
      end_date: date,
      shift_definition_id: shiftId,
      scope: 'static',
      location_id: locationId,
      is_team: true,
      team_category_id: categoryId,
      pic_user_id: korlap,
      member_ids: members,
    });

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
    db = app.get(DataSource);

    admin = (
      await http()
        .post('/api/v1/auth/login')
        .send({ identifier: 'admin_system_1', password: '12345678' })
    ).body.access_token;

    shiftId = (
      await one<{ id: string }>(
        `INSERT INTO shift_definitions (name, start_time, end_time, crosses_midnight, is_active)
         VALUES ($1, '01:00:00', '02:00:00', false, true) RETURNING id`,
        [`Shift Uji ${Date.now()}`],
      )
    ).id;
    linmas = (
      await one<{ id: string }>(
        `SELECT id FROM users WHERE role = 'linmas' AND is_active AND deleted_at IS NULL ORDER BY username LIMIT 1`,
      )
    ).id;
    korlap = (
      await one<{ id: string }>(
        `SELECT id FROM users WHERE role = 'korlap' AND is_active AND deleted_at IS NULL ORDER BY username LIMIT 1`,
      )
    ).id;
    categoryId = (
      await one<{ id: string }>(
        `SELECT id FROM team_categories WHERE is_active AND deleted_at IS NULL LIMIT 1`,
      )
    ).id;
    places = (
      (await db.query(
        `SELECT id FROM locations WHERE is_active AND deleted_at IS NULL ORDER BY id LIMIT 3`,
      )) as Array<{ id: string }>
    ).map((r) => r.id);
  });

  afterAll(async () => {
    // Leave no trace for other suites: rows, events and the test shift.
    await db.query(`UPDATE schedules SET deleted_at = now() WHERE shift_definition_id = $1`, [
      shiftId,
    ]);
    await db.query(`UPDATE schedule_events SET deleted_at = now() WHERE shift_definition_id = $1`, [
      shiftId,
    ]);
    await db.query(`UPDATE shift_definitions SET deleted_at = now() WHERE id = $1`, [shiftId]);
    await app.close();
  });

  describe('linmas (1 place + 1 team per shift)', () => {
    it('takes a first individual place', async () => {
      expect((await addForDay(linmas, places[0])).status).toBe(201);
    });

    it('is refused a SECOND individual place in the same shift', async () => {
      const res = await addForDay(linmas, places[1]);
      expect(res.status).toBe(409);
      expect(codeOf(res.body)).toBe('SCHEDULE_PLACE_LIMIT');
    });

    it('CAN join a team at the SAME place in the same shift', async () => {
      const res = await teamEvent(places[0], [linmas]);
      expect(res.status).toBe(201);
      eventIds.push(res.body.event?.id ?? res.body.id);
      const rows = (await db.query(
        `SELECT team_category_id IS NOT NULL AS team FROM schedules
          WHERE user_id = $1 AND schedule_date = $2 AND shift_definition_id = $3 AND deleted_at IS NULL
          ORDER BY team`,
        [linmas, date, shiftId],
      )) as Array<{ team: boolean }>;
      expect(rows.map((r) => r.team)).toEqual([false, true]);
    });

    it('is refused a SECOND team in the same shift', async () => {
      const res = await teamEvent(places[1], [linmas]);
      expect(res.status).toBe(409);
      expect(codeOf(res.body)).toBe('SCHEDULE_TEAM_LIMIT');
    });
  });

  describe('korlap (unlimited)', () => {
    it('holds several places in the same shift while also leading a team', async () => {
      // Already PIC of the team at places[0] from the linmas tests.
      expect((await addForDay(korlap, places[1])).status).toBe(201);
      expect((await addForDay(korlap, places[2])).status).toBe(201);
    });

    it('still cannot be added twice to the same place', async () => {
      const res = await addForDay(korlap, places[1]);
      expect(res.status).toBe(409);
      expect(codeOf(res.body)).toBe('SCHEDULE_DUPLICATE');
    });
  });
});
