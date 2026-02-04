/**
 * Mock API Fixtures for E2E Tests
 * Provides mock data and route handlers for Playwright tests
 */

import { Page, Route } from '@playwright/test';

/**
 * Environment variable to control whether to use real API or mocks
 * Set USE_REAL_API=true to test against real backend
 */
export const USE_REAL_API = process.env.USE_REAL_API === 'true';

/**
 * Mock Authentication Tokens
 */
export const mockTokens = {
  access_token: 'mock-access-token-for-testing',
  refresh_token: 'mock-refresh-token-for-testing',
};

/**
 * Mock User Data
 */
export const mockUsers = {
  admin: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'admin',
    full_name: 'Admin User',
    email: 'admin@sekar.test',
    role: 'admin',
    phone: '081234567890',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  koordinator: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'koordinator_bungkul',
    full_name: 'Koordinator Bungkul',
    email: 'koordinator@sekar.test',
    role: 'koordinator_lapangan',
    phone: '081234567891',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  kepalaRayon: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    username: 'kepala_rayon_selatan',
    full_name: 'Kepala Rayon Selatan',
    email: 'kepala@sekar.test',
    role: 'kepala_rayon',
    phone: '081234567892',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  worker: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    username: 'worker1',
    full_name: 'Worker One',
    email: 'worker1@sekar.test',
    role: 'worker',
    phone: '081234567893',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  topManagement: {
    id: '550e8400-e29b-41d4-a716-446655440004',
    username: 'top_management1',
    full_name: 'Top Management User',
    email: 'management@sekar.test',
    role: 'top_management',
    phone: '081234567894',
    created_at: '2026-01-01T00:00:00.000Z',
  },
};

/**
 * Mock API responses
 */
export const mockApiResponses = {
  // Auth endpoints
  login: (username: string) => {
    const userKey = Object.keys(mockUsers).find(
      (key) => mockUsers[key as keyof typeof mockUsers].username === username
    );
    const user = userKey ? mockUsers[userKey as keyof typeof mockUsers] : null;

    if (!user) {
      return {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      };
    }

    return {
      access_token: mockTokens.access_token,
      refresh_token: mockTokens.refresh_token,
      user,
    };
  },

  refresh: {
    access_token: mockTokens.access_token,
    refresh_token: mockTokens.refresh_token,
    user: mockUsers.admin,
  },

  me: mockUsers.admin,

  // Users endpoints
  usersList: {
    data: Object.values(mockUsers),
    meta: {
      total: 5,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  },

  // Tasks endpoints
  tasksList: {
    data: [
      {
        id: '650e8400-e29b-41d4-a716-446655440000',
        title: 'Bersihkan Taman Bungkul',
        description: 'Membersihkan seluruh area taman',
        status: 'open',
        priority: 'high',
        created_at: '2026-02-01T08:00:00.000Z',
      },
      {
        id: '650e8400-e29b-41d4-a716-446655440001',
        title: 'Pemangkasan Pohon',
        description: 'Pemangkasan pohon di area utara',
        status: 'in_progress',
        priority: 'medium',
        created_at: '2026-02-02T09:00:00.000Z',
      },
    ],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  },

  // Reports endpoints
  reportsList: {
    data: [
      {
        id: '750e8400-e29b-41d4-a716-446655440000',
        title: 'Laporan Harian - Taman Bungkul',
        description: 'Pembersihan selesai',
        status: 'submitted',
        created_at: '2026-02-03T10:00:00.000Z',
      },
    ],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  },

  // Areas endpoints
  areasList: {
    data: [
      {
        id: '850e8400-e29b-41d4-a716-446655440000',
        name: 'Taman Bungkul',
        type: 'taman_kota',
        rayon_id: '950e8400-e29b-41d4-a716-446655440000',
        area: 15000,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '850e8400-e29b-41d4-a716-446655440001',
        name: 'Taman Flora',
        type: 'taman_kota',
        rayon_id: '950e8400-e29b-41d4-a716-446655440001',
        area: 12000,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  },

  // Rayons endpoints
  rayonsList: {
    data: [
      {
        id: '950e8400-e29b-41d4-a716-446655440000',
        name: 'Rayon Selatan',
        code: 'RYN-001',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '950e8400-e29b-41d4-a716-446655440001',
        name: 'Rayon Utara',
        code: 'RYN-002',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    meta: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  },

  // Dashboard stats
  dashboardStats: {
    total_users: 5,
    total_areas: 2,
    total_tasks: 2,
    total_reports: 1,
    active_workers: 3,
  },

  // Schedules endpoints
  schedulesList: {
    data: [
      {
        id: 'a50e8400-e29b-41d4-a716-446655440000',
        user_id: '550e8400-e29b-41d4-a716-446655440003',
        area_id: '850e8400-e29b-41d4-a716-446655440000',
        shift_definition_id: 'b50e8400-e29b-41d4-a716-446655440000',
        effective_date: '2026-02-01',
        end_date: null,
        created_at: '2026-01-15T08:00:00.000Z',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Worker One',
          email: 'worker1@sekar.test',
        },
        area: {
          id: '850e8400-e29b-41d4-a716-446655440000',
          name: 'Taman Bungkul',
          code: 'TB-001',
        },
        shift_definition: {
          id: 'b50e8400-e29b-41d4-a716-446655440000',
          name: 'Shift Pagi',
          code: 'SHIFT1',
          start_time: '07:00',
          end_time: '15:00',
        },
      },
      {
        id: 'a50e8400-e29b-41d4-a716-446655440001',
        user_id: '550e8400-e29b-41d4-a716-446655440004',
        area_id: '850e8400-e29b-41d4-a716-446655440001',
        shift_definition_id: 'b50e8400-e29b-41d4-a716-446655440001',
        effective_date: '2026-02-01',
        end_date: '2026-02-28',
        created_at: '2026-01-15T08:00:00.000Z',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'Worker Two',
          email: 'worker2@sekar.test',
        },
        area: {
          id: '850e8400-e29b-41d4-a716-446655440001',
          name: 'Taman Flora',
          code: 'TF-001',
        },
        shift_definition: {
          id: 'b50e8400-e29b-41d4-a716-446655440001',
          name: 'Shift Siang',
          code: 'SHIFT2',
          start_time: '14:00',
          end_time: '22:00',
        },
      },
    ],
    meta: {
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  },

  // Shift definitions
  shiftDefinitions: [
    {
      id: 'b50e8400-e29b-41d4-a716-446655440000',
      name: 'Shift Pagi',
      code: 'SHIFT1',
      start_time: '07:00',
      end_time: '15:00',
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440001',
      name: 'Shift Siang',
      code: 'SHIFT2',
      start_time: '14:00',
      end_time: '22:00',
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440002',
      name: 'Shift Malam',
      code: 'SHIFT3',
      start_time: '21:00',
      end_time: '05:00',
    },
  ],

  // Monitoring - City Stats
  cityStats: {
    timestamp: new Date().toISOString(),
    summary: {
      total_rayons: 7,
      total_areas: 15,
      total_workers: 45,
      total_linmas: 12,
      workers_online: 28,
      linmas_online: 8,
      active_shifts: 3,
      reports_today: 42,
      tasks_pending: 5,
      tasks_in_progress: 8,
    },
  },

  // Monitoring - Rayon Stats
  rayonStats: {
    timestamp: new Date().toISOString(),
    rayon: {
      id: '950e8400-e29b-41d4-a716-446655440000',
      name: 'Rayon Selatan',
    },
    summary: {
      total_areas: 5,
      total_workers: 15,
      total_linmas: 4,
      workers_online: 12,
      linmas_online: 3,
      active_shifts: 2,
      reports_today: 18,
      understaffed_areas: 1,
    },
  },

  // Monitoring - Area Stats
  areaStats: {
    timestamp: new Date().toISOString(),
    area: {
      id: '850e8400-e29b-41d4-a716-446655440000',
      name: 'Taman Bungkul',
      rayon: 'Rayon Selatan',
      coverage_area: 15000,
    },
    current_shift: {
      definition: {
        id: 'b50e8400-e29b-41d4-a716-446655440000',
        name: 'Shift Pagi',
        start_time: '07:00',
        end_time: '15:00',
      },
      required_workers: 6,
      required_linmas: 2,
      assigned_workers: 6,
      assigned_linmas: 2,
      active_workers: 5,
      active_linmas: 2,
    },
  },

  // Monitoring - Live Workers
  liveWorkers: {
    timestamp: new Date().toISOString(),
    workers: [
      {
        user_id: '550e8400-e29b-41d4-a716-446655440003',
        full_name: 'Worker One',
        role: 'worker' as const,
        area_id: '850e8400-e29b-41d4-a716-446655440000',
        area_name: 'Taman Bungkul',
        shift_id: 'shift-001',
        gps_lat: -7.2756,
        gps_lng: 112.7512,
        location_timestamp: new Date().toISOString(),
        battery_level: 75,
        status: 'online' as const,
      },
      {
        user_id: '550e8400-e29b-41d4-a716-446655440004',
        full_name: 'Worker Two',
        role: 'worker' as const,
        area_id: '850e8400-e29b-41d4-a716-446655440001',
        area_name: 'Taman Flora',
        shift_id: 'shift-002',
        gps_lat: -7.2756,
        gps_lng: 112.7512,
        location_timestamp: new Date().toISOString(),
        battery_level: 15,
        status: 'online' as const,
      },
      {
        user_id: '550e8400-e29b-41d4-a716-446655440005',
        full_name: 'Linmas One',
        role: 'linmas' as const,
        area_id: '850e8400-e29b-41d4-a716-446655440000',
        area_name: 'Taman Bungkul',
        shift_id: 'shift-003',
        gps_lat: -7.2756,
        gps_lng: 112.7512,
        location_timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        battery_level: 45,
        status: 'offline' as const,
      },
    ],
    total: 3,
  },
};

/**
 * Setup mock API routes for Playwright tests
 */
export async function setupMockApi(page: Page, currentUser?: keyof typeof mockUsers) {
  if (USE_REAL_API) {
    console.log('Using real API - skipping mocks');
    return;
  }

  const user = currentUser ? mockUsers[currentUser] : mockUsers.admin;

  // Mock auth endpoints
  await page.route('**/api/v1/auth/login', async (route: Route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    const response = mockApiResponses.login(postData.username);

    if ('error' in response) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    }
  });

  await page.route('**/api/v1/auth/refresh', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.refresh),
    });
  });

  await page.route('**/api/v1/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });

  // Mock users endpoints
  await page.route('**/api/v1/users', async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.usersList),
      });
    } else if (method === 'POST') {
      const postData = route.request().postDataJSON();
      const newUser = {
        id: `new-user-${Date.now()}`,
        ...postData,
        created_at: new Date().toISOString(),
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newUser),
      });
    }
  });

  await page.route('**/api/v1/users/*', async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUsers.admin),
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockUsers.admin, ...postData }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 204,
      });
    }
  });

  // Mock tasks endpoints (with wildcard pattern matching)
  await page.route('**/api/v1/tasks', async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.tasksList),
      });
    } else if (method === 'POST') {
      const postData = route.request().postDataJSON();
      const newTask = {
        id: `new-task-${Date.now()}`,
        ...postData,
        status: 'open',
        created_at: new Date().toISOString(),
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newTask),
      });
    }
  });

  // Mock individual task endpoints
  await page.route('**/api/v1/tasks/*', async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.tasksList.data[0]),
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockApiResponses.tasksList.data[0], ...postData }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({ status: 204 });
    }
  });

  // Mock reports endpoints
  await page.route('**/api/v1/reports', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.reportsList),
    });
  });

  // Mock individual report endpoints
  await page.route('**/api/v1/reports/*', async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.reportsList.data[0]),
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockApiResponses.reportsList.data[0], ...postData }),
      });
    }
  });

  // Mock areas endpoints
  await page.route('**/api/v1/areas', async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.areasList),
      });
    } else if (method === 'POST') {
      const postData = route.request().postDataJSON();
      const newArea = {
        id: `new-area-${Date.now()}`,
        ...postData,
        created_at: new Date().toISOString(),
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newArea),
      });
    }
  });

  // Mock individual area endpoints
  await page.route('**/api/v1/areas/*', async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.areasList.data[0]),
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockApiResponses.areasList.data[0], ...postData }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({ status: 204 });
    }
  });

  // Mock rayons endpoints
  await page.route('**/api/v1/rayons', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.rayonsList),
    });
  });

  // Mock individual rayon endpoints
  await page.route('**/api/v1/rayons/*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.rayonsList.data[0]),
    });
  });

  // Mock monitoring endpoints
  await page.route('**/api/v1/monitoring/city', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.cityStats),
    });
  });

  await page.route('**/api/v1/monitoring/rayon/*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.rayonStats),
    });
  });

  await page.route('**/api/v1/monitoring/area/*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.areaStats),
    });
  });

  await page.route('**/api/v1/monitoring/live-workers**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.liveWorkers),
    });
  });

  // Mock schedules endpoints
  await page.route('**/api/v1/schedules', async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.schedulesList),
      });
    } else if (method === 'POST') {
      const postData = route.request().postDataJSON();
      const newSchedule = {
        id: `new-schedule-${Date.now()}`,
        ...postData,
        created_at: new Date().toISOString(),
        user: mockUsers.worker,
        area: mockApiResponses.areasList.data[0],
        shift_definition: mockApiResponses.shiftDefinitions[0],
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newSchedule),
      });
    }
  });

  await page.route('**/api/v1/schedules/*', async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.schedulesList.data[0]),
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockApiResponses.schedulesList.data[0], ...postData }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({ status: 204 });
    }
  });

  // Mock shift definitions endpoint
  await page.route('**/api/v1/shift-definitions**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.shiftDefinitions),
    });
  });

  // Mock dashboard stats
  await page.route('**/api/v1/dashboard/stats', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.dashboardStats),
    });
  });
}

/**
 * Set authentication cookies for mock user
 */
export async function setMockAuthCookies(page: Page, userRole: keyof typeof mockUsers = 'admin') {
  if (USE_REAL_API) {
    return; // Don't set mock cookies when using real API
  }

  const user = mockUsers[userRole];

  await page.context().addCookies([
    {
      name: 'access_token',
      value: mockTokens.access_token,
      url: 'http://localhost:3001',
      sameSite: 'Lax' as const,
      expires: Date.now() / 1000 + 7 * 24 * 60 * 60, // 7 days
    },
    {
      name: 'refresh_token',
      value: mockTokens.refresh_token,
      url: 'http://localhost:3001',
      sameSite: 'Lax' as const,
      expires: Date.now() / 1000 + 30 * 24 * 60 * 60, // 30 days
    },
    {
      name: 'user',
      value: JSON.stringify(user),
      url: 'http://localhost:3001',
      sameSite: 'Lax' as const,
      expires: Date.now() / 1000 + 7 * 24 * 60 * 60, // 7 days
    },
  ]);
}
