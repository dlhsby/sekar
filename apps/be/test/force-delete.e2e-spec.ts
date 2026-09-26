import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TimezoneUtil } from '../src/common/utils/timezone.util';

/**
 * Force delete (ADR-062) end to end on a real database. The invariants the
 * user fixed: an in-use record CAN be deleted, only its FUTURE is cancelled,
 * past/today history is never touched, and the whole cascade is audited under
 * one root row carrying the operator's reason.
 */
describe('Force delete (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let admin: string;
  let rayon: string;
  let workerId: string;
  let shiftId: string;
  let typeId: string;

  const http = () => request(app.getHttpServer());
  const login = async (identifier: string): Promise<string> =>
    (await http().post('/api/v1/auth/login').send({ identifier, password: '12345678' })).body
      .access_token;
  const one = async <T>(sql: string, params: unknown[] = []): Promise<T> =>
    ((await db.query(sql, params)) as T[])[0];
  const day = (offset: number) =>
    TimezoneUtil.jakartaDateString(new Date(Date.now() + offset * 86_400_000));
  const stamp = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const makeDistrict = async (name: string) =>
    (await one<{ id: string }>(`INSERT INTO districts (name) VALUES ($1) RETURNING id`, [name])).id;
  const makeRegion = async (districtId: string, name: string) =>
    (
      await one<{ id: string }>(
        `INSERT INTO regions (district_id, name) VALUES ($1, $2) RETURNING id`,
        [districtId, name],
      )
    ).id;
  const makeLocation = async (districtId: string, name: string, regionId: string | null = null) =>
    (
      await one<{ id: string }>(
        `INSERT INTO locations (name, district_id, region_id, location_type_id, gps_lat, gps_lng)
         VALUES ($1, $2, $3, $4, -7.25, 112.75) RETURNING id`,
        [name, districtId, regionId, typeId],
      )
    ).id;
  const makeRow = async (date: string, locationId: string, districtId: string, eventId?: string) =>
    (
      await one<{ id: string }>(
        `INSERT INTO schedules (user_id, schedule_date, shift_definition_id, location_id, district_id, schedule_event_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [workerId, date, shiftId, locationId, districtId, eventId ?? null],
      )
    ).id;
  const isDeleted = async (table: string, id: string) =>
    (
      await one<{ deleted: boolean }>(
        `SELECT deleted_at IS NOT NULL AS deleted FROM ${table} WHERE id = $1`,
        [id],
      )
    ).deleted;

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
    admin = await login('admin_system_1');
    rayon = await login('kepala_rayon_barat_1_1');
    workerId = (
      await one<{ id: string }>(
        `SELECT id FROM users WHERE role = 'satgas' AND deleted_at IS NULL LIMIT 1`,
      )
    ).id;
    shiftId = (
      await one<{ id: string }>(`SELECT id FROM shift_definitions WHERE deleted_at IS NULL LIMIT 1`)
    ).id;
    typeId = (
      await one<{ id: string }>(`SELECT id FROM location_types WHERE deleted_at IS NULL LIMIT 1`)
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('lokasi in use', () => {
    let districtId: string;
    let locationId: string;
    let name: string;
    let rows: { past: string; today: string; future: string };
    let eventId: string;

    beforeAll(async () => {
      name = `Lokasi Hapus ${stamp()}`;
      districtId = await makeDistrict(`Rayon Induk ${stamp()}`);
      locationId = await makeLocation(districtId, name);
      eventId = (
        await one<{ id: string }>(
          `INSERT INTO schedule_events (scope, start_date, shift_definition_id, recurrence_type, location_id, user_id)
           VALUES ('static', $1, $2, 'daily', $3, $4) RETURNING id`,
          [day(-3), shiftId, locationId, workerId],
        )
      ).id;
      rows = {
        past: await makeRow(day(-1), locationId, districtId, eventId),
        today: await makeRow(day(0), locationId, districtId, eventId),
        future: await makeRow(day(2), locationId, districtId, eventId),
      };
    });

    it('previews the impact counting only the future', async () => {
      const res = await http()
        .get(`/api/v1/deletions/location/${locationId}/impact`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
      expect(res.body).toMatchObject({
        confirm_label: name,
        impact: { future_schedules: 1, schedule_series: 1 },
        replacement_required: 0,
      });
    });

    it('refuses without the exact typed name', async () => {
      const res = await http()
        .post(`/api/v1/deletions/location/${locationId}`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ confirm_name: 'salah', reason: 'Uji hapus paksa' })
        .expect(400);
      expect(res.body.error?.code ?? res.body.code).toBe('DELETE_CONFIRMATION_MISMATCH');
      expect(await isDeleted('locations', locationId)).toBe(false);
    });

    it('refuses a role without area:delete', async () => {
      await http()
        .post(`/api/v1/deletions/location/${locationId}`)
        .set('Authorization', `Bearer ${rayon}`)
        .send({ confirm_name: name, reason: 'Uji hapus paksa' })
        .expect(403);
    });

    it('deletes, cancels only the future and keeps history', async () => {
      const res = await http()
        .post(`/api/v1/deletions/location/${locationId}`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ confirm_name: `  ${name.toUpperCase()} `, reason: 'Lokasi ditutup permanen' })
        .expect(200);

      expect(await isDeleted('locations', locationId)).toBe(true);
      expect(await isDeleted('schedules', rows.past)).toBe(false);
      expect(await isDeleted('schedules', rows.today)).toBe(false);
      expect(await isDeleted('schedules', rows.future)).toBe(true);
      // The series is ended at today, not deleted — its past occurrences stay linked.
      const ev = await one<{ end_date: string; deleted: boolean }>(
        `SELECT to_char(end_date, 'YYYY-MM-DD') AS end_date, deleted_at IS NOT NULL AS deleted
           FROM schedule_events WHERE id = $1`,
        [eventId],
      );
      expect(ev).toEqual({ end_date: day(0), deleted: false });

      const audit = (await db.query(
        `SELECT action, reason, parent_id FROM audit_logs WHERE id = $1 OR parent_id = $1 ORDER BY seq`,
        [res.body.audit_id],
      )) as Array<{ action: string; reason: string; parent_id: string | null }>;
      expect(audit[0]).toMatchObject({
        action: 'force_delete',
        reason: 'Lokasi ditutup permanen',
        parent_id: null,
      });
      expect(audit.slice(1).map((a) => a.action)).toContain('delete');
      expect(audit.slice(1).every((a) => a.parent_id === res.body.audit_id)).toBe(true);
    });
  });

  it('a rayon force delete cascades to its kawasan and lokasi', async () => {
    const name = `Rayon Kaskade ${stamp()}`;
    const districtId = await makeDistrict(name);
    const regionId = await makeRegion(districtId, `Kawasan ${stamp()}`);
    const locationId = await makeLocation(districtId, `Lokasi ${stamp()}`, regionId);

    await http()
      .post(`/api/v1/deletions/district/${districtId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ confirm_name: name, reason: 'Penggabungan rayon' })
      .expect(200);

    expect(await isDeleted('districts', districtId)).toBe(true);
    expect(await isDeleted('regions', regionId)).toBe(true);
    expect(await isDeleted('locations', locationId)).toBe(true);
  });

  it('a role still held by users needs a replacement', async () => {
    const code = `uji_${stamp()}`;
    const roleName = `Peran Uji ${stamp()}`;
    const roleId = (
      await one<{ id: string }>(
        `INSERT INTO roles (code, name, is_system) VALUES ($1, $2, false) RETURNING id`,
        [code, roleName],
      )
    ).id;
    const userId = (
      await one<{ id: string }>(
        `INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, 'x', 'Uji Peran', $2) RETURNING id`,
        [`uji_${stamp()}`, code],
      )
    ).id;

    const refused = await http()
      .post(`/api/v1/deletions/role/${roleId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ confirm_name: roleName, reason: 'Peran tidak dipakai' })
      .expect(409);
    expect(refused.body.error?.code ?? refused.body.code).toBe('DELETE_REPLACEMENT_REQUIRED');

    // Not satgas/linmas: other suites pick "the first satgas" and run in parallel.
    const targetRole = (
      await one<{ id: string }>(`SELECT id FROM roles WHERE code = 'staff_kecamatan'`)
    ).id;
    await http()
      .post(`/api/v1/deletions/role/${roleId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ confirm_name: roleName, reason: 'Peran tidak dipakai', replacement_id: targetRole })
      .expect(200);
    expect(
      (await one<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [userId])).role,
    ).toBe('staff_kecamatan');

    await db.query(`UPDATE users SET deleted_at = now() WHERE id = $1`, [userId]);
  });
});
