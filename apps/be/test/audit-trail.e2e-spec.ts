import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { AuditChainService } from '../src/modules/audit/audit-chain.service';

/**
 * Audit trail v2 (ADR-061) end to end — the parts no unit test can prove:
 *  - the TypeORM subscriber really writes a row, with the request's actor,
 *    for a CRUD call made through the HTTP stack;
 *  - refused writes are recorded as `denied`;
 *  - sealing chains rows and the DB refuses to change a sealed row.
 */
describe('Audit trail (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let admin: string;
  let rayon: string;

  const http = () => request(app.getHttpServer());
  const login = async (identifier: string): Promise<string> =>
    (await http().post('/api/v1/auth/login').send({ identifier, password: '12345678' })).body
      .access_token;

  const rowsFor = (entityId: string) =>
    db.query(
      `SELECT action, actor_role, changes, entity_label FROM audit_logs
        WHERE entity_type = 'district' AND entity_id = $1 ORDER BY seq`,
      [entityId],
    ) as Promise<
      Array<{ action: string; actor_role: string; changes: unknown; entity_label: string }>
    >;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('captures create → update → delete with actor and field diff', async () => {
    const name = `Rayon E2E Audit ${Date.now()}`;
    const created = await http()
      .post('/api/v1/districts')
      .set('Authorization', `Bearer ${admin}`)
      .send({ name });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    await http()
      .patch(`/api/v1/districts/${id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ name: `${name} B` })
      .expect(200);
    await http()
      .delete(`/api/v1/districts/${id}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(204);

    const rows = await rowsFor(id);
    expect(rows.map((r) => r.action)).toEqual(['create', 'update', 'delete']);
    expect(rows.every((r) => r.actor_role === 'admin_system')).toBe(true);
    expect(rows[1].changes).toEqual({ name: [name, `${name} B`] });
    expect(rows[2].entity_label).toBe(`${name} B`);
  });

  it('records a refused write as denied', async () => {
    const before = Date.now();
    await http()
      .post('/api/v1/districts')
      .set('Authorization', `Bearer ${rayon}`)
      .send({ name: 'Tidak Boleh' })
      .expect(403);

    // The denial is written fire-and-forget; give it a moment.
    let rows: Array<{ outcome: string }> = [];
    for (let i = 0; i < 20 && rows.length === 0; i += 1) {
      rows = await db.query(
        `SELECT outcome FROM audit_logs
          WHERE action = 'denied_write' AND actor_role = 'kepala_rayon'
            AND metadata->>'path' = '/api/v1/districts' AND created_at >= to_timestamp($1 / 1000.0)`,
        [before],
      );
      if (rows.length === 0) await new Promise((r) => setTimeout(r, 50));
    }
    expect(rows).toEqual([{ outcome: 'denied' }]);
  });

  it('seals the chain and refuses to alter a sealed row', async () => {
    await app.get(AuditChainService).sealPending();

    const verify = await http().get('/api/v1/audit/verify').set('Authorization', `Bearer ${admin}`);
    expect(verify.status).toBe(200);
    expect(verify.body.intact).toBe(true);
    expect(verify.body.sealed).toBeGreaterThan(0);

    await expect(
      db.query(
        `UPDATE audit_logs SET action = 'tampered'
          WHERE chain_pos = (SELECT MAX(chain_pos) FROM audit_logs)`,
      ),
    ).rejects.toThrow(/sealed/);
    await expect(
      db.query(`DELETE FROM audit_logs WHERE seq = (SELECT MIN(seq) FROM audit_logs)`),
    ).rejects.toThrow(/append-only/);
  });

  it('keeps master-data history behind audit:read', async () => {
    const res = await http()
      .get('/api/v1/audit/district/00000000-0000-0000-0000-000000000001')
      .set('Authorization', `Bearer ${rayon}`);
    expect(res.status).toBe(403);
  });
});
