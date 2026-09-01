/**
 * Security E2E (Phase 4-9 D1) — auth bypass / RBAC / IDOR probes.
 *
 * Unlike the UI specs (mocked API), these hit the REAL backend API directly —
 * 401/403 semantics are meaningless against route mocks. Requires:
 *   - backend on API_URL (default http://localhost:3000) with seeded users
 *     (`npm run db:seed:staging` — satgas_pusat_1 / kepala_rayon_pusat_1 etc.)
 * The whole suite self-skips when the backend is unreachable, so the mocked
 * UI suite stays runnable without infra.
 */
import { test, expect, request, APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API = `${API_URL}/api/v1`;
/** A city-level admin login (dev seed: admin/12345678; staging: superadmin) */
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin';

let backendUp = false;

async function loginAs(api: APIRequestContext, identifier: string, password = '12345678') {
  const res = await api.post(`${API}/auth/login`, { data: { identifier, password } });
  expect(res.status(), `login as ${identifier}`).toBe(200);
  const body = await res.json();
  const token: string | undefined =
    body?.data?.access_token ?? body?.access_token ?? body?.data?.tokens?.access_token;
  expect(token, `access token for ${identifier}`).toBeTruthy();
  return token as string;
}

test.beforeAll(async () => {
  const api = await request.newContext();
  try {
    const res = await api.get(`${API}/health`, { timeout: 3000 });
    backendUp = res.ok();
  } catch {
    backendUp = false;
  } finally {
    await api.dispose();
  }
});

test.beforeEach(() => {
  test.skip(!backendUp, 'Real backend not running — security suite needs the API on :3000');
});

test.describe('Security: authentication (401)', () => {
  test('rejects protected endpoints without a token', async () => {
    const api = await request.newContext();
    for (const path of ['/users', '/monitoring/live-users', '/audit', '/schedules']) {
      const res = await api.get(`${API}${path}`);
      expect(res.status(), path).toBe(401);
    }
    await api.dispose();
  });

  test('rejects a forged bearer token', async () => {
    const api = await request.newContext({
      extraHTTPHeaders: { Authorization: 'Bearer forged.invalid.token' },
    });
    const res = await api.get(`${API}/users`);
    expect(res.status()).toBe(401);
    await api.dispose();
  });
});

test.describe('Security: role gates (403)', () => {
  test('satgas cannot access monitoring, audit, or user management', async () => {
    const anon = await request.newContext();
    const token = await loginAs(anon, 'satgas_pusat_1');
    await anon.dispose();

    const api = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    for (const path of ['/monitoring/live-users', '/audit', '/users']) {
      const res = await api.get(`${API}${path}`);
      expect(res.status(), path).toBe(403);
    }
    await api.dispose();
  });

  test('kepala_rayon cannot request a city-scope monitoring snapshot', async () => {
    const anon = await request.newContext();
    const token = await loginAs(anon, 'kepala_rayon_pusat_1');
    await anon.dispose();

    const api = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const res = await api.get(`${API}/monitoring/snapshot?scope=city`);
    expect(res.status()).toBe(403);
    await api.dispose();
  });

  test('satgas cannot reassign workers', async () => {
    const anon = await request.newContext();
    const token = await loginAs(anon, 'satgas_pusat_1');
    await anon.dispose();

    const api = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const res = await api.post(`${API}/monitoring/reassign`, {
      data: {
        user_id: '00000000-0000-4000-8000-000000000001',
        target_area_id: '00000000-0000-4000-8000-000000000002',
      },
    });
    expect(res.status()).toBe(403);
    await api.dispose();
  });
});

test.describe('Security: IDOR', () => {
  test('korlap cannot read location history of a user outside their scope', async () => {
    const anon = await request.newContext();
    const korlapToken = await loginAs(anon, 'korlap_pusat_1');
    // Find a user definitely outside korlap_pusat's areas: another rayon's satgas
    const adminToken = await loginAs(anon, ADMIN_USER);
    await anon.dispose();

    const admin = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
    });
    const usersRes = await admin.get(`${API}/users?page=1&limit=100`);
    expect(usersRes.status()).toBe(200);
    const usersBody = await usersRes.json();
    const users: { id: string; username: string }[] =
      usersBody?.data?.data ?? usersBody?.data ?? [];
    const candidates = users.filter((u) => /selatan|timur|barat|utara/.test(u.username));

    // The scope check intentionally fails open for users with NO tracking row
    // (their area is unknown and their history is empty) — so the IDOR probe
    // needs an out-of-scope user that is actually tracked to an area.
    let outsider: { id: string; username: string } | undefined;
    for (const candidate of candidates) {
      const summaryRes = await admin.get(`${API}/monitoring/users/${candidate.id}/day-summary`);
      if (!summaryRes.ok()) continue;
      const summary = await summaryRes.json();
      const areaId = summary?.data?.area_id ?? summary?.area_id;
      if (areaId) {
        outsider = candidate;
        break;
      }
    }
    await admin.dispose();
    test.skip(
      !outsider,
      'No tracked out-of-scope user in this dataset (needs live tracking rows — staging run)',
    );

    const korlap = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${korlapToken}` },
    });
    const res = await korlap.get(
      `${API}/monitoring/users/${outsider!.id}/location-history?date=2026-06-10`,
    );
    expect([403, 404]).toContain(res.status());
    expect(res.status()).not.toBe(200);
    await korlap.dispose();
  });

  test('a user cannot fetch another user record by id (satgas → admin)', async () => {
    const anon = await request.newContext();
    const satgasToken = await loginAs(anon, 'satgas_pusat_1');
    const adminToken = await loginAs(anon, ADMIN_USER);
    await anon.dispose();

    const admin = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
    });
    const meRes = await admin.get(`${API}/auth/me`);
    const meBody = await meRes.json();
    const adminId = meBody?.data?.id ?? meBody?.id;
    await admin.dispose();
    test.skip(!adminId, 'Could not resolve superadmin id');

    const satgas = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${satgasToken}` },
    });
    const res = await satgas.get(`${API}/users/${adminId}`);
    expect(res.status()).toBe(403);
    await satgas.dispose();
  });
});

test.describe('Security: login rate limit', () => {
  test('throttles repeated failed logins (5/min)', async () => {
    // Dev raises AUTH_LOGIN_THROTTLE_LIMIT to 1000 — only assert on
    // prod-shaped environments that opt in.
    test.skip(
      process.env.EXPECT_LOGIN_THROTTLE !== 'true',
      'Set EXPECT_LOGIN_THROTTLE=true on staging (throttle limit must be the prod 5/min)',
    );
    const api = await request.newContext();
    let throttled = false;
    // Bogus username so we never lock a real account; 7 attempts > 5/min limit
    for (let i = 0; i < 7; i += 1) {
      const res = await api.post(`${API}/auth/login`, {
        data: { identifier: 'nonexistent-security-probe', password: 'wrong-password-123' },
      });
      if (res.status() === 429) {
        throttled = true;
        break;
      }
    }
    expect(throttled).toBe(true);
    await api.dispose();
  });
});
