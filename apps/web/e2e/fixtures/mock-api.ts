/**
 * Mock API Fixtures for E2E Tests (Phase 4-R — current routes + ADR-009 roles)
 *
 * The web client calls `${NEXT_PUBLIC_API_URL}/api/v1/...`, so every handler
 * matches `**​/api/v1/...`. Roles are the ADR-009 lowercase enum. A catch-all is
 * registered FIRST so the specific handlers (added after) win — Playwright uses
 * the most-recently-added matching route.
 */

import { Page, Route } from '@playwright/test';

export const USE_REAL_API = process.env.USE_REAL_API === 'true';

export const mockTokens = {
  access_token: 'mock-access-token-for-testing',
  refresh_token: 'mock-refresh-token-for-testing',
};

/** ADR-009 roles. Keys are friendly test handles; `role` is the real enum value. */
export const mockUsers = {
  admin: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'admin',
    full_name: 'Admin Sistem',
    role: 'admin_system',
    phone_number: '081200000000',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    permissions: ['*', 'settings:read', 'settings:manage', 'tasks:*', 'overtime:*'],
  },
  superadmin: {
    id: '550e8400-e29b-41d4-a716-446655440009',
    username: 'superadmin',
    full_name: 'Super Admin',
    role: 'superadmin',
    phone_number: '081200000009',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    permissions: ['*'],
  },
  korlap: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'korlap1',
    full_name: 'Koordinator Lapangan',
    role: 'korlap',
    phone_number: '081200000001',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    permissions: ['tasks:*', 'overtime:*', 'monitoring:read'],
  },
  kepalaRayon: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    username: 'kepala_rayon1',
    full_name: 'Kepala Rayon Selatan',
    role: 'kepala_rayon',
    phone_number: '081200000002',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    permissions: ['tasks:*', 'overtime:*', 'monitoring:read', 'schedules:*'],
  },
  topManagement: {
    id: '550e8400-e29b-41d4-a716-446655440004',
    username: 'topmgmt1',
    full_name: 'Top Management',
    role: 'management',
    phone_number: '081200000004',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    permissions: ['*', 'settings:read', 'settings:manage'],
  },
  adminData: {
    id: '550e8400-e29b-41d4-a716-446655440006',
    username: 'admindata1',
    full_name: 'Admin Data',
    role: 'admin_rayon',
    phone_number: '081200000006',
    rayon_id: '950e8400-0000-0000-0000-000000000001',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    permissions: ['pruning_requests:*', 'tasks:*', 'monitoring:read'],
  },
  staffKecamatan: {
    id: '550e8400-e29b-41d4-a716-446655440007',
    username: 'kecamatan1',
    full_name: 'Staff Kecamatan Tegalsari',
    role: 'staff_kecamatan',
    phone_number: '081200000007',
    kecamatan_name: 'Tegalsari',
    rayon_id: '950e8400-0000-0000-0000-000000000001',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    permissions: ['pruning_requests:submit'],
  },
  satgas: {
    id: '550e8400-e29b-41d4-a716-446655440010',
    username: 'satgas1',
    full_name: 'Satgas Lapangan',
    role: 'satgas',
    phone_number: '081200000010',
    rayon_id: '950e8400-0000-0000-0000-000000000001',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    permissions: ['monitoring:read', 'activities:*'],
  },
  linmas: {
    id: '550e8400-e29b-41d4-a716-446655440011',
    username: 'linmas1',
    full_name: 'Linmas Keamanan',
    role: 'linmas',
    phone_number: '081200000011',
    rayon_id: '950e8400-0000-0000-0000-000000000001',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    permissions: ['monitoring:read', 'activities:*'],
  },
} as const;

export type MockUserKey = keyof typeof mockUsers;

const DISTRICT = { id: '950e8400-0000-0000-0000-000000000001', name: 'Surabaya Selatan' };
const REGION = { id: 'reg-001', name: 'Kawasan Utara' };
const LOCATION = {
  id: '850e8400-0000-0000-0000-000000000001',
  name: 'Taman Bungkul',
  code: 'TB-01',
  coverage_area: '15000.00',
  location_type: { id: 'lt1', name: 'Taman Kota', category: 'ACTIVE' },
  district: DISTRICT,
  region: REGION,
};

const SHIFT = {
  id: 'b50e8400-0000-0000-0000-000000000001',
  name: 'Shift Pagi',
  code: 'SHIFT1',
  start_time: '06:00:00',
  end_time: '14:00:00',
  crosses_midnight: false,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

const paginated = <T>(data: T[]) => ({
  data,
  meta: { total: data.length, page: 1, limit: 20, totalPages: 1 },
});

/** Per-endpoint mock payloads (current shapes). */
export const mockData = {
  users: paginated(Object.values(mockUsers)),
  tasks: paginated([
    {
      id: '650e8400-0000-0000-0000-000000000001',
      title: 'Perantingan Taman Bungkul',
      description: 'Pangkas dahan kering',
      status: 'assigned',
      priority: 'high',
      assigned_to: { id: mockUsers.korlap.id, full_name: mockUsers.korlap.full_name },
      location: { id: LOCATION.id, name: LOCATION.name },
      district: DISTRICT,
      due_date: '2026-06-20',
      created_at: '2026-06-01T08:00:00.000Z',
      updated_at: '2026-06-01T08:00:00.000Z',
      created_by: mockUsers.admin.id,
    },
    {
      id: '650e8400-0000-0000-0000-000000000002',
      title: 'Penyiraman Taman Flora',
      description: 'Siram seluruh area',
      status: 'in_progress',
      priority: 'normal',
      assigned_to: { id: mockUsers.korlap.id, full_name: mockUsers.korlap.full_name },
      location: { id: LOCATION.id, name: LOCATION.name },
      district: DISTRICT,
      due_date: '2026-06-18',
      created_at: '2026-06-02T08:00:00.000Z',
      updated_at: '2026-06-02T08:00:00.000Z',
      created_by: mockUsers.admin.id,
    },
  ]),
  overtime: paginated([
    {
      id: 'ot1',
      user: { id: mockUsers.korlap.id, full_name: mockUsers.korlap.full_name },
      location: { id: LOCATION.id, name: LOCATION.name },
      date: '2026-06-10',
      start_time: '18:00',
      end_time: '21:00',
      hours: 3,
      reason: 'Acara kota',
      status: 'pending',
      created_at: '2026-06-09T00:00:00.000Z',
    },
  ]),
  activities: paginated([
    {
      id: 'ac1',
      title: 'Aktivitas Pembersihan',
      activity_type: { id: 'act1', name: 'Pembersihan' },
      user: { id: mockUsers.korlap.id, full_name: mockUsers.korlap.full_name },
      location: { id: LOCATION.id, name: LOCATION.name },
      status: 'pending',
      created_at: '2026-06-05T08:00:00.000Z',
    },
  ]),
  locations: paginated([LOCATION]),
  locationTypes: [LOCATION.location_type],
  districts: [DISTRICT],
  regions: [REGION],
  districtStats: { total_users: 12, total_locations: 4, active_tasks: 3, total_location_coverage: '60000.00' },
  schedules: paginated([
    {
      id: 'sc1',
      user_id: mockUsers.korlap.id,
      user: { id: mockUsers.korlap.id, full_name: mockUsers.korlap.full_name, username: 'korlap1', role: 'korlap' },
      location_id: LOCATION.id,
      location: { id: LOCATION.id, name: LOCATION.name, code: LOCATION.code },
      shift_definition_id: SHIFT.id,
      shift_definition: SHIFT,
      effective_date: '2026-06-01',
      end_date: null,
      created_at: '2026-05-15T08:00:00.000Z',
      updated_at: '2026-05-15T08:00:00.000Z',
    },
  ]),
  shiftDefinitions: [SHIFT],
  pruningRequests: {
    items: [
      {
        id: 'pr1',
        referenceCode: 'PR-2026-001',
        submittedBy: mockUsers.staffKecamatan.id,
        submitter: { id: mockUsers.staffKecamatan.id, full_name: 'Staff Kecamatan Tegalsari', role: 'staff_kecamatan' },
        kecamatanName: 'Tegalsari',
        districtId: DISTRICT.id,
        district: DISTRICT,
        address: 'Jalan Darmo No. 1, Surabaya',
        gpsLat: -7.2756,
        gpsLng: 112.7512,
        expectedDate: null,
        expectedYear: 2026,
        expectedIsoWeek: 24,
        estimatedPlantCount: 3,
        treeCount: 3,
        treeHeightEstimate: '5-7 meter',
        treeDiameterEstimate: '30-50 cm',
        requesterName: 'Budi',
        requesterPhone: '08123',
        rtLeaderName: 'Joko',
        rtLeaderPhone: '08124',
        photoUrls: [],
        notes: 'Menutupi jalan',
        status: 'submitted',
        reviewedBy: null,
        reviewer: null,
        reviewedAt: null,
        reviewNotes: null,
        assignedTaskId: null,
        createdAt: '2026-06-08T08:00:00.000Z',
        updatedAt: '2026-06-08T08:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  },
  snapshot: {
    success: true,
    data: {
      workers: [],
      area_summaries: [],
      total_active: 0,
      total_offline: 0,
      total_absent: 0,
      total_outside_area: 0,
      generated_at: '2026-06-10T08:00:00.000Z',
    },
  },
  boundaries: { rayons: [], areas: [] },
  notifications: [
    {
      id: 'n1',
      user_id: mockUsers.admin.id,
      title: 'Tugas baru ditugaskan',
      body: 'Perantingan Taman Bungkul',
      type: 'task_assigned',
      data: { task_id: '650e8400-0000-0000-0000-000000000001' },
      is_read: false,
      read_at: null,
      created_at: '2026-06-10T08:00:00.000Z',
    },
  ],
  teamCategories: [
    { id: 'tc1', name: 'Tim Pemeliharaan', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
    { id: 'tc2', name: 'Tim Pembersihan', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  ],
  notificationPreferences: [
    { type: 'task_assigned', enabled: true },
    { type: 'overtime_approved', enabled: false },
  ],
};

/** Fallback empty shape for any unmocked GET so pages render instead of hanging. */
function fallbackBody(url: string): string {
  if (url.includes('/unread-count')) return JSON.stringify({ count: 0 });
  if (url.includes('/notifications')) return JSON.stringify([]);
  if (url.includes('/boundaries')) return JSON.stringify({ rayons: [], areas: [] });
  if (url.includes('/snapshot')) return JSON.stringify(mockData.snapshot);
  if (/\/(area-types|activity-types|shift-definitions)/.test(url)) return JSON.stringify([]);
  // Default: a paginated envelope (most list hooks tolerate it).
  return JSON.stringify({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Register all mock routes. Catch-all first, specific handlers after (last wins).
 */
export async function setupMockApi(page: Page, currentUser: MockUserKey = 'admin') {
  if (USE_REAL_API) return;
  const user = mockUsers[currentUser];

  // 0) Catch-all — keeps unmocked endpoints from hanging the page.
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: fallbackBody(req.url()) });
    return json(route, { success: true });
  });

  // 1) Auth
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { identifier?: string; username?: string };
    const id = body?.identifier ?? body?.username;
    const match = Object.values(mockUsers).find((u) => u.username === id) ?? user;
    if (!id) return json(route, { message: 'Invalid credentials', error: 'Unauthorized' }, 401);
    return json(route, { access_token: mockTokens.access_token, refresh_token: mockTokens.refresh_token, user: match });
  });
  await page.route('**/api/v1/auth/refresh', (route) =>
    json(route, { access_token: mockTokens.access_token, refresh_token: mockTokens.refresh_token, user }),
  );
  await page.route('**/api/v1/auth/me', (route) => json(route, user));
  await page.route('**/api/v1/auth/logout', (route) => json(route, { message: 'ok' }));
  await page.route('**/api/v1/auth/change-password', (route) =>
    json(route, { access_token: mockTokens.access_token, refresh_token: mockTokens.refresh_token, user }),
  );

  // 2) Users + profile + notification prefs
  await page.route('**/api/v1/users/me', (route) => json(route, user));
  await page.route('**/api/v1/users/*/notification-preferences', (route) =>
    json(route, mockData.notificationPreferences),
  );
  await page.route('**/api/v1/users/*/profile-picture', (route) =>
    json(route, { ...user, profile_picture_url: 'https://example.test/p.jpg' }),
  );
  await page.route('**/api/v1/users?**', (route) => json(route, mockData.users));
  await page.route('**/api/v1/users', (route) => json(route, mockData.users));
  await page.route('**/api/v1/users/*', (route) => json(route, Object.values(mockUsers)[0]));

  // 3) Tasks
  await page.route('**/api/v1/tasks/my-tasks**', (route) => json(route, mockData.tasks));
  await page.route('**/api/v1/tasks/tagged**', (route) => json(route, mockData.tasks));
  await page.route('**/api/v1/tasks?**', (route) => json(route, mockData.tasks));
  await page.route('**/api/v1/tasks', (route) => json(route, mockData.tasks));
  await page.route('**/api/v1/tasks/*', (route) => json(route, mockData.tasks.data[0]));

  // 4) Overtime + activities
  await page.route('**/api/v1/overtime**', (route) => json(route, mockData.overtime));
  await page.route('**/api/v1/activities**', (route) => json(route, mockData.activities));

  // 5) Districts + Regions + Locations / area-types (Phase 5+ geography: city→district→region→location)
  // Districts endpoint (renamed from rayons at backend; UI still calls it rayon/district)
  await page.route('**/api/v1/districts?**', (route) => json(route, mockData.districts));
  await page.route('**/api/v1/districts', (route) => json(route, mockData.districts));
  await page.route('**/api/v1/districts/*', (route) => json(route, mockData.districts[0]));

  // Regions (kawasan) endpoint
  await page.route('**/api/v1/regions?**', (route) => json(route, mockData.regions));
  await page.route('**/api/v1/regions', (route) => json(route, mockData.regions));
  await page.route('**/api/v1/regions/*', (route) => json(route, mockData.regions[0]));

  // Locations (lokasi, formerly areas) endpoint
  await page.route('**/api/v1/location-types**', (route) => json(route, mockData.locationTypes));
  await page.route('**/api/v1/locations?**', (route) => json(route, mockData.locations));
  await page.route('**/api/v1/locations', (route) => json(route, mockData.locations));
  await page.route('**/api/v1/locations/*', (route) => json(route, LOCATION));

  // Legacy area endpoints (deprecated but kept for compatibility)
  await page.route('**/api/v1/area-types**', (route) => json(route, mockData.locationTypes));
  // Backward compatibility: old area/rayon routes now point to new location/district responses
  await page.route('**/api/v1/areas?**', (route) => json(route, mockData.locations));
  await page.route('**/api/v1/areas', (route) => json(route, mockData.locations));
  await page.route('**/api/v1/areas/*', (route) => json(route, LOCATION));
  await page.route('**/api/v1/rayons', (route) => json(route, mockData.districts));
  await page.route('**/api/v1/rayons?**', (route) => json(route, mockData.districts));
  await page.route('**/api/v1/rayons/*', (route) => json(route, DISTRICT));
  await page.route('**/api/v1/rayons/*/locations**', (route) => json(route, mockData.locations));
  await page.route('**/api/v1/rayons/*/stats', (route) => json(route, mockData.districtStats));

  // 6) Schedules + shifts + team categories + staff requirements
  await page.route('**/api/v1/shift-definitions**', (route) => json(route, mockData.shiftDefinitions));
  await page.route('**/api/v1/team-categories?**', (route) => json(route, mockData.teamCategories));
  await page.route('**/api/v1/team-categories', (route) => json(route, mockData.teamCategories));
  await page.route('**/api/v1/team-categories/*', (route) => json(route, mockData.teamCategories[0]));

  // Staff requirements (for capacity planning)
  await page.route('**/api/v1/staff-requirements**', (route) => json(route, []));

  // Special day overrides (holidays, etc.)
  await page.route('**/api/v1/special-day-overrides**', (route) => json(route, []));

  // Schedule range and date-specific queries
  await page.route('**/api/v1/schedules/range**', (route) => json(route, []));
  await page.route('**/api/v1/schedules/date/**', (route) => json(route, []));
  await page.route('**/api/v1/schedules/year-summary**', (route) => json(route, []));

  // Standard schedules endpoints
  await page.route('**/api/v1/schedules?**', (route) => json(route, mockData.schedules));
  await page.route('**/api/v1/schedules', (route) => json(route, mockData.schedules));
  await page.route('**/api/v1/schedules/*', (route) => json(route, mockData.schedules.data[0]));

  // 7) Pruning requests
  await page.route('**/api/v1/pruning-requests?**', (route) => {
    if (route.request().url().includes('mine=true')) {
      return json(route, mockData.pruningRequests.items);
    }
    return json(route, mockData.pruningRequests);
  });
  await page.route('**/api/v1/pruning-requests', (route) => {
    const m = route.request().method();
    if (m === 'POST') return json(route, mockData.pruningRequests.items[0], 201);
    return json(route, mockData.pruningRequests);
  });
  await page.route('**/api/v1/pruning-requests/*', (route) => json(route, mockData.pruningRequests.items[0]));

  // 8) Monitoring
  await page.route('**/api/v1/monitoring/snapshot**', (route) => json(route, mockData.snapshot));
  await page.route('**/api/v1/monitoring/boundaries**', (route) => json(route, mockData.boundaries));
  await page.route('**/api/v1/monitoring/aggregate**', async (route) => {
    const url = new URL(route.request().url());
    const scope = url.searchParams.get('scope');
    const id = url.searchParams.get('id');

    // Return mock aggregate by scope
    if (scope === 'region' && id) {
      return json(route, {
        scope: 'region',
        scope_id: id,
        nodes: [
          {
            id: 'region-1',
            name: 'Kawasan Utara',
            type: 'region',
            center_lat: -7.28,
            center_lng: 112.75,
            counts_by_status: { active: 2, offline: 1, absent: 0, outside_area: 0 },
            counts_by_role: { satgas: 2, linmas: 1 },
            worker_count: 3,
            online_count: 2,
            required: 3,
            is_understaffed: false,
            roster: { scheduled: 3, clocked_in: 3, not_clocked_in: 0 },
            presence: {
              aktif: { dalam: 2, luar: 0 },
              tidak_aktif: { dalam: 0, luar: 1 },
            },
            location_count: 2,
          },
        ],
        totals: { active: 2, offline: 1, absent: 0, outside_area: 0 },
        roster_totals: { scheduled: 3, clocked_in: 3, not_clocked_in: 0 },
        presence_totals: {
          aktif: { dalam: 2, luar: 0 },
          tidak_aktif: { dalam: 0, luar: 1 },
        },
        generated_at: '2026-06-10T08:00:00.000Z',
      });
    }

    // District scope: return both regions and locations (with region_id)
    if (scope === 'district' && id) {
      return json(route, {
        scope: 'district',
        scope_id: id,
        nodes: [
          {
            id: 'region-1',
            name: 'Kawasan Utara',
            type: 'region',
            center_lat: -7.28,
            center_lng: 112.75,
            counts_by_status: { active: 2, offline: 1, absent: 0, outside_area: 0 },
            counts_by_role: { satgas: 2, linmas: 1 },
            worker_count: 3,
            online_count: 2,
            required: 3,
            is_understaffed: false,
            roster: { scheduled: 3, clocked_in: 3, not_clocked_in: 0 },
            presence: {
              aktif: { dalam: 2, luar: 0 },
              tidak_aktif: { dalam: 0, luar: 1 },
            },
            location_count: 2,
          },
          {
            id: LOCATION.id,
            name: LOCATION.name,
            type: 'location',
            center_lat: -7.2915,
            center_lng: 112.7395,
            counts_by_status: { active: 1, offline: 0, absent: 0, outside_area: 0 },
            counts_by_role: { satgas: 1 },
            worker_count: 1,
            online_count: 1,
            required: 2,
            is_understaffed: true,
            roster: { scheduled: 2, clocked_in: 1, not_clocked_in: 1 },
            presence: {
              aktif: { dalam: 1, luar: 0 },
              tidak_aktif: { dalam: 0, luar: 0 },
            },
            district_id: id,
            region_id: 'region-1',
          },
        ],
        totals: { active: 3, offline: 1, absent: 0, outside_area: 0 },
        roster_totals: { scheduled: 5, clocked_in: 4, not_clocked_in: 1 },
        presence_totals: {
          aktif: { dalam: 3, luar: 0 },
          tidak_aktif: { dalam: 0, luar: 1 },
        },
        generated_at: '2026-06-10T08:00:00.000Z',
      });
    }

    // City scope: return districts
    return json(route, {
      scope: 'city',
      scope_id: null,
      nodes: [
        {
          id: DISTRICT.id,
          name: DISTRICT.name,
          type: 'district',
          center_lat: -7.29,
          center_lng: 112.74,
          counts_by_status: { active: 3, offline: 1, absent: 0, outside_area: 0 },
          counts_by_role: { satgas: 3, linmas: 1 },
          worker_count: 4,
          online_count: 3,
          required: 5,
          is_understaffed: true,
          roster: { scheduled: 5, clocked_in: 4, not_clocked_in: 1 },
          presence: {
            aktif: { dalam: 3, luar: 0 },
            tidak_aktif: { dalam: 0, luar: 1 },
          },
          location_count: 1,
        },
      ],
      totals: { active: 3, offline: 1, absent: 0, outside_area: 0 },
      roster_totals: { scheduled: 5, clocked_in: 4, not_clocked_in: 1 },
      presence_totals: {
        aktif: { dalam: 3, luar: 0 },
        tidak_aktif: { dalam: 0, luar: 1 },
      },
      generated_at: '2026-06-10T08:00:00.000Z',
    });
  });

  // 9) Notifications
  await page.route('**/api/v1/notifications/unread-count', (route) => json(route, { count: 1 }));
  await page.route('**/api/v1/notifications/read-all', (route) => json(route, { marked: 1 }));
  await page.route('**/api/v1/notifications/*/read', (route) => json(route, mockData.notifications[0]));
  await page.route('**/api/v1/notifications**', (route) => json(route, mockData.notifications));
}

/** Set auth cookies so a visit lands authenticated (bypasses the login form). */
export async function setMockAuthCookies(page: Page, userRole: MockUserKey = 'admin') {
  if (USE_REAL_API) return;
  const url = process.env.BASE_URL || 'http://localhost:3001';
  await page.context().addCookies([
    { name: 'access_token', value: mockTokens.access_token, url, sameSite: 'Lax' },
    { name: 'refresh_token', value: mockTokens.refresh_token, url, sameSite: 'Lax' },
    { name: 'user', value: JSON.stringify(mockUsers[userRole]), url, sameSite: 'Lax' },
  ]);
}
