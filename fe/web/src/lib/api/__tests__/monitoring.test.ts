/**
 * Unit Tests: Monitoring API
 * Tests Phase 2D real-time monitoring endpoints via axios-mock-adapter
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';

describe('Monitoring API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  // -------------------------------------------------------------------------
  // GET /monitoring/city
  // -------------------------------------------------------------------------

  describe('GET /monitoring/city', () => {
    it('should return flat CityStats', async () => {
      const mockData = {
        total_rayons: 7,
        total_areas: 75,
        total_workers: 150,
        workers_online: 120,
        workers_offline: 30,
        active_shifts: 45,
        tasks_pending: 12,
        tasks_in_progress: 8,
        tasks_completed_today: 25,
        activities_submitted_today: 40,
        generated_at: '2026-03-05T08:00:00Z',
      };

      mockAxios.onGet('/monitoring/city').reply(200, mockData);

      const response = await apiClient.get('/monitoring/city');

      expect(response.status).toBe(200);
      expect(response.data.total_rayons).toBe(7);
      expect(response.data.total_areas).toBe(75);
      expect(response.data.total_workers).toBe(150);
      expect(response.data.workers_online).toBe(120);
      expect(response.data.workers_offline).toBe(30);
      expect(response.data.active_shifts).toBe(45);
      expect(response.data.tasks_pending).toBe(12);
      expect(response.data.tasks_in_progress).toBe(8);
      expect(response.data.tasks_completed_today).toBe(25);
      expect(response.data.activities_submitted_today).toBe(40);
      expect(response.data.generated_at).toBe('2026-03-05T08:00:00Z');
    });

    it('should handle server error', async () => {
      mockAxios.onGet('/monitoring/city').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      await expect(apiClient.get('/monitoring/city')).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // GET /monitoring/rayon/:id
  // -------------------------------------------------------------------------

  describe('GET /monitoring/rayon/:id', () => {
    it('should return flat RayonMonitoringStats', async () => {
      const mockData = {
        id: 'rayon-1',
        name: 'Rayon Selatan',
        code: 'RS',
        total_areas: 15,
        total_workers: 40,
        workers_online: 30,
        workers_offline: 10,
        active_shifts: 12,
        tasks_pending: 5,
        tasks_in_progress: 3,
        tasks_completed_today: 10,
        activities_submitted_today: 18,
        alerts: ['2 understaffed areas'],
        generated_at: '2026-03-05T08:00:00Z',
      };

      mockAxios.onGet('/monitoring/rayon/rayon-1').reply(200, mockData);

      const response = await apiClient.get('/monitoring/rayon/rayon-1');

      expect(response.status).toBe(200);
      expect(response.data.id).toBe('rayon-1');
      expect(response.data.name).toBe('Rayon Selatan');
      expect(response.data.code).toBe('RS');
      expect(response.data.total_areas).toBe(15);
      expect(response.data.total_workers).toBe(40);
      expect(response.data.workers_online).toBe(30);
      expect(response.data.workers_offline).toBe(10);
      expect(response.data.alerts).toHaveLength(1);
      expect(response.data.generated_at).toBe('2026-03-05T08:00:00Z');
    });

    it('should handle not found', async () => {
      mockAxios.onGet('/monitoring/rayon/unknown').reply(404, {
        statusCode: 404,
        message: 'Rayon not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/monitoring/rayon/unknown')).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // GET /monitoring/area/:id
  // -------------------------------------------------------------------------

  describe('GET /monitoring/area/:id', () => {
    it('should return flat AreaMonitoringStats', async () => {
      const mockData = {
        id: 'area-1',
        name: 'Taman Bungkul',
        area_type: 'taman',
        rayon_id: 'rayon-1',
        rayon_name: 'Rayon Selatan',
        coverage_area: 12500,
        total_users_assigned: 5,
        users_online: 4,
        users_offline: 1,
        is_fully_staffed: true,
        tasks_pending: 2,
        tasks_in_progress: 1,
        tasks_completed_today: 3,
        activities_submitted_today: 5,
        alerts: [],
        generated_at: '2026-03-05T08:00:00Z',
      };

      mockAxios.onGet('/monitoring/area/area-1').reply(200, mockData);

      const response = await apiClient.get('/monitoring/area/area-1');

      expect(response.status).toBe(200);
      expect(response.data.id).toBe('area-1');
      expect(response.data.name).toBe('Taman Bungkul');
      expect(response.data.area_type).toBe('taman');
      expect(response.data.rayon_id).toBe('rayon-1');
      expect(response.data.rayon_name).toBe('Rayon Selatan');
      expect(response.data.coverage_area).toBe(12500);
      expect(response.data.total_users_assigned).toBe(5);
      expect(response.data.users_online).toBe(4);
      expect(response.data.is_fully_staffed).toBe(true);
      expect(response.data.alerts).toHaveLength(0);
    });

    it('should handle nullable coverage_area', async () => {
      mockAxios.onGet('/monitoring/area/area-2').reply(200, {
        id: 'area-2',
        name: 'Jalur Hijau X',
        area_type: 'jalur_hijau',
        rayon_id: 'rayon-2',
        rayon_name: 'Rayon Utara',
        coverage_area: null,
        total_users_assigned: 3,
        users_online: 2,
        users_offline: 1,
        is_fully_staffed: false,
        tasks_pending: 0,
        tasks_in_progress: 0,
        tasks_completed_today: 0,
        activities_submitted_today: 1,
        alerts: ['Understaffed'],
        generated_at: '2026-03-05T08:00:00Z',
      });

      const response = await apiClient.get('/monitoring/area/area-2');

      expect(response.data.coverage_area).toBeNull();
      expect(response.data.is_fully_staffed).toBe(false);
      expect(response.data.alerts).toContain('Understaffed');
    });
  });

  // -------------------------------------------------------------------------
  // GET /monitoring/live-users
  // -------------------------------------------------------------------------

  describe('GET /monitoring/live-users', () => {
    const mockLiveUsersResponse = {
      total_active: 10,
      total_inactive: 5,
      total_outside_area: 3,
      total_missing: 1,
      total_offline: 6,
      users: [
        {
          id: 'user-1',
          full_name: 'Satgas Satu',
          role: 'satgas',
          phone: '+6281234567890',
          status: 'active',
          area_id: 'area-1',
          area_name: 'Taman Bungkul',
          rayon_id: 'rayon-1',
          rayon_name: 'Rayon Selatan',
          latitude: -7.289659,
          longitude: 112.739208,
          accuracy: 5,
          battery_level: 85,
          last_update: '2026-03-05T08:30:00Z',
          is_within_area: true,
          outside_boundary: false,
          shift_id: 'shift-1',
          shift_name: 'Pagi',
          clock_in_time: '2026-03-05T06:05:00Z',
          current_task_status: 'in_progress',
          current_task_title: 'Penyiraman Tanaman',
        },
      ],
      generated_at: '2026-03-05T08:30:00Z',
    };

    it('should return LiveUsersResponse with correct shape', async () => {
      mockAxios.onGet('/monitoring/live-users').reply(200, mockLiveUsersResponse);

      const response = await apiClient.get('/monitoring/live-users');

      expect(response.status).toBe(200);
      expect(response.data.total_active).toBe(10);
      expect(response.data.total_inactive).toBe(5);
      expect(response.data.total_outside_area).toBe(3);
      expect(response.data.total_missing).toBe(1);
      expect(response.data.total_offline).toBe(6);
      expect(response.data.users).toHaveLength(1);
      expect(response.data.generated_at).toBe('2026-03-05T08:30:00Z');
    });

    it('should return a LiveUser with all Phase 2D fields', async () => {
      mockAxios.onGet('/monitoring/live-users').reply(200, mockLiveUsersResponse);

      const response = await apiClient.get('/monitoring/live-users');
      const user = response.data.users[0];

      expect(user.id).toBe('user-1');
      expect(user.full_name).toBe('Satgas Satu');
      expect(user.role).toBe('satgas');
      expect(user.phone).toBe('+6281234567890');
      expect(user.status).toBe('active');
      expect(user.area_id).toBe('area-1');
      expect(user.area_name).toBe('Taman Bungkul');
      expect(user.rayon_id).toBe('rayon-1');
      expect(user.rayon_name).toBe('Rayon Selatan');
      expect(user.latitude).toBeCloseTo(-7.289659);
      expect(user.longitude).toBeCloseTo(112.739208);
      expect(user.accuracy).toBe(5);
      expect(user.battery_level).toBe(85);
      expect(user.is_within_area).toBe(true);
      expect(user.outside_boundary).toBe(false);
      expect(user.shift_id).toBe('shift-1');
      expect(user.shift_name).toBe('Pagi');
      expect(user.current_task_status).toBe('in_progress');
      expect(user.current_task_title).toBe('Penyiraman Tanaman');
    });

    it('should support rayon_id filter as query param', async () => {
      mockAxios.onGet(/\/monitoring\/live-users\?rayon_id=rayon-1/).reply(200, {
        total_active: 3,
        total_inactive: 1,
        total_outside_area: 0,
        total_missing: 0,
        total_offline: 2,
        users: [],
        generated_at: '2026-03-05T08:30:00Z',
      });

      const response = await apiClient.get('/monitoring/live-users?rayon_id=rayon-1');

      expect(response.data.total_active).toBe(3);
      expect(response.data.users).toHaveLength(0);
    });

    it('should handle server error', async () => {
      mockAxios.onGet('/monitoring/live-users').reply(500);

      await expect(apiClient.get('/monitoring/live-users')).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // GET /monitoring/users/:id/day-summary
  // -------------------------------------------------------------------------

  describe('GET /monitoring/users/:id/day-summary', () => {
    it('should return UserDaySummary', async () => {
      const mockSummary = {
        user_id: 'user-1',
        full_name: 'Satgas Satu',
        username: 'satgas1',
        role: 'satgas',
        phone: '+6281234567890',
        status: 'active',
        area_id: 'area-1',
        area_name: 'Taman Bungkul',
        rayon_id: 'rayon-1',
        rayon_name: 'Rayon Selatan',
        shift: {
          id: 'shift-1',
          name: 'Pagi',
          clock_in_time: '2026-03-05T06:05:00Z',
          clock_out_time: null,
          duration_minutes: 150,
          outside_boundary: false,
        },
        last_location: {
          latitude: -7.289659,
          longitude: 112.739208,
          accuracy: 5,
          battery_level: 85,
          logged_at: '2026-03-05T08:30:00Z',
          is_within_area: true,
        },
        activities_today: [
          {
            id: 'act-1',
            title: 'Laporan Pagi',
            activity_type: 'report',
            created_at: '2026-03-05T07:00:00Z',
            photo_url: 'https://example.com/photo.jpg',
          },
        ],
        tasks_today: [
          {
            id: 'task-1',
            title: 'Penyiraman Tanaman',
            status: 'in_progress',
            priority: 'medium',
          },
        ],
        whatsapp_links: {
          chat: 'https://wa.me/6281234567890',
          call: 'https://wa.me/6281234567890?call',
        },
      };

      mockAxios.onGet('/monitoring/users/user-1/day-summary').reply(200, mockSummary);

      const response = await apiClient.get('/monitoring/users/user-1/day-summary');

      expect(response.status).toBe(200);
      expect(response.data.user_id).toBe('user-1');
      expect(response.data.full_name).toBe('Satgas Satu');
      expect(response.data.status).toBe('active');
      expect(response.data.shift.name).toBe('Pagi');
      expect(response.data.shift.clock_out_time).toBeNull();
      expect(response.data.last_location.is_within_area).toBe(true);
      expect(response.data.activities_today).toHaveLength(1);
      expect(response.data.tasks_today).toHaveLength(1);
      expect(response.data.whatsapp_links.chat).toContain('wa.me');
    });

    it('should handle user not found', async () => {
      mockAxios.onGet('/monitoring/users/unknown/day-summary').reply(404, {
        statusCode: 404,
        message: 'User not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/monitoring/users/unknown/day-summary')).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // GET /monitoring/users/:id/location-history?date=YYYY-MM-DD
  // -------------------------------------------------------------------------

  describe('GET /monitoring/users/:id/location-history', () => {
    it('should return LocationHistory for the given date', async () => {
      const mockHistory = {
        user_id: 'user-1',
        user_name: 'Satgas Satu',
        role: 'satgas',
        date: '2026-03-05',
        shift_id: 'shift-1',
        shift_name: 'Pagi',
        area_id: 'area-1',
        area_name: 'Taman Bungkul',
        clock_in_time: '2026-03-05T06:05:00Z',
        clock_out_time: null,
        points: [
          {
            latitude: -7.289659,
            longitude: 112.739208,
            accuracy: 5,
            battery_level: 85,
            logged_at: '2026-03-05T06:10:00Z',
            is_within_area: true,
          },
          {
            latitude: -7.28971,
            longitude: 112.73925,
            accuracy: 4,
            battery_level: 84,
            logged_at: '2026-03-05T06:20:00Z',
            is_within_area: true,
          },
        ],
        total_points: 2,
        total_distance_meters: 12.5,
        time_inside_area_minutes: 90,
        time_outside_area_minutes: 0,
        generated_at: '2026-03-05T08:30:00Z',
      };

      mockAxios
        .onGet(/\/monitoring\/users\/user-1\/location-history\?date=2026-03-05/)
        .reply(200, mockHistory);

      const response = await apiClient.get(
        '/monitoring/users/user-1/location-history?date=2026-03-05'
      );

      expect(response.status).toBe(200);
      expect(response.data.user_id).toBe('user-1');
      expect(response.data.date).toBe('2026-03-05');
      expect(response.data.points).toHaveLength(2);
      expect(response.data.total_points).toBe(2);
      expect(response.data.total_distance_meters).toBe(12.5);
      expect(response.data.time_inside_area_minutes).toBe(90);
      expect(response.data.time_outside_area_minutes).toBe(0);
    });

    it('should return empty points when no history exists', async () => {
      mockAxios.onGet(/\/monitoring\/users\/user-1\/location-history\?date=2026-01-01/).reply(200, {
        user_id: 'user-1',
        user_name: 'Satgas Satu',
        role: 'satgas',
        date: '2026-01-01',
        shift_id: null,
        shift_name: null,
        area_id: null,
        area_name: null,
        clock_in_time: null,
        clock_out_time: null,
        points: [],
        total_points: 0,
        total_distance_meters: 0,
        time_inside_area_minutes: 0,
        time_outside_area_minutes: 0,
        generated_at: '2026-03-05T08:30:00Z',
      });

      const response = await apiClient.get(
        '/monitoring/users/user-1/location-history?date=2026-01-01'
      );

      expect(response.data.points).toHaveLength(0);
      expect(response.data.total_points).toBe(0);
      expect(response.data.shift_id).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // GET /monitoring/staffing-summary
  // -------------------------------------------------------------------------

  describe('GET /monitoring/staffing-summary', () => {
    it('should return StaffingSummaryResponse', async () => {
      const mockStaffing = {
        items: [
          {
            id: 'rayon-1',
            name: 'Rayon Selatan',
            type: 'rayon',
            roles: [
              {
                role: 'satgas',
                active: 8,
                idle: 2,
                outside_area: 1,
                missing: 0,
                offline: 3,
                total_assigned: 14,
                total_required: 15,
              },
            ],
            total_active: 8,
            total_idle: 2,
            total_outside_area: 1,
            total_missing: 0,
            total_offline: 3,
            is_fully_staffed: false,
          },
        ],
        generated_at: '2026-03-05T08:30:00Z',
      };

      mockAxios.onGet('/monitoring/staffing-summary').reply(200, mockStaffing);

      const response = await apiClient.get('/monitoring/staffing-summary');

      expect(response.status).toBe(200);
      expect(response.data.items).toHaveLength(1);
      expect(response.data.items[0].id).toBe('rayon-1');
      expect(response.data.items[0].type).toBe('rayon');
      expect(response.data.items[0].roles).toHaveLength(1);
      expect(response.data.items[0].total_active).toBe(8);
      expect(response.data.items[0].is_fully_staffed).toBe(false);
      expect(response.data.generated_at).toBe('2026-03-05T08:30:00Z');
    });

    it('should handle server error', async () => {
      mockAxios.onGet('/monitoring/staffing-summary').reply(503);

      await expect(apiClient.get('/monitoring/staffing-summary')).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // GET /monitoring/config
  // -------------------------------------------------------------------------

  describe('GET /monitoring/config', () => {
    it('should return MonitoringConfigResponse with configs array', async () => {
      const mockConfig = {
        configs: [
          {
            key: 'inactive_threshold_minutes',
            value: { minutes: 15 },
            description: 'Minutes of inactivity before status becomes inactive',
            updated_at: '2026-03-01T00:00:00Z',
          },
          {
            key: 'missing_threshold_minutes',
            value: { minutes: 60 },
            description: 'Minutes of inactivity before status becomes missing',
            updated_at: '2026-03-01T00:00:00Z',
          },
        ],
      };

      mockAxios.onGet('/monitoring/config').reply(200, mockConfig);

      const response = await apiClient.get('/monitoring/config');

      expect(response.status).toBe(200);
      expect(response.data.configs).toHaveLength(2);
      expect(response.data.configs[0].key).toBe('inactive_threshold_minutes');
      expect(response.data.configs[0].value).toEqual({ minutes: 15 });
      expect(response.data.configs[1].key).toBe('missing_threshold_minutes');
    });

    it('should handle unauthorized access', async () => {
      mockAxios.onGet('/monitoring/config').reply(403, {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      });

      await expect(apiClient.get('/monitoring/config')).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /monitoring/config/:key
  // -------------------------------------------------------------------------

  describe('PATCH /monitoring/config/:key', () => {
    it('should update a config item and return the updated MonitoringConfigItem', async () => {
      const updatedConfig = {
        key: 'inactive_threshold_minutes',
        value: { minutes: 20 },
        description: 'Minutes of inactivity before status becomes inactive',
        updated_at: '2026-03-05T09:00:00Z',
      };

      mockAxios.onPatch('/monitoring/config/inactive_threshold_minutes').reply(200, updatedConfig);

      const response = await apiClient.patch('/monitoring/config/inactive_threshold_minutes', {
        value: { minutes: 20 },
      });

      expect(response.status).toBe(200);
      expect(response.data.key).toBe('inactive_threshold_minutes');
      expect(response.data.value).toEqual({ minutes: 20 });
      expect(response.data.updated_at).toBe('2026-03-05T09:00:00Z');
    });

    it('should handle not found for unknown config key', async () => {
      mockAxios.onPatch('/monitoring/config/unknown_key').reply(404, {
        statusCode: 404,
        message: 'Config not found',
        error: 'NotFound',
      });

      await expect(
        apiClient.patch('/monitoring/config/unknown_key', { value: {} })
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // GET /monitoring/boundaries (Phase 2D-10 Gap Fix #9)
  // -------------------------------------------------------------------------

  describe('GET /monitoring/boundaries', () => {
    it('should return BoundariesResponse with rayons and areas', async () => {
      const mockBoundaries = {
        rayons: [
          {
            id: 'rayon-1',
            name: 'Rayon Selatan',
            code: 'RS',
            boundary_polygon: null,
            center_lat: -7.29,
            center_lng: 112.74,
            area_count: 2,
            is_understaffed: false,
            understaffed_area_count: 0,
            areas: [
              {
                id: 'area-1',
                name: 'Taman Bungkul',
                boundary_polygon: null,
                center_lat: -7.289659,
                center_lng: 112.739208,
                rayon_id: 'rayon-1',
                rayon_name: 'Rayon Selatan',
                radius_meters: 500,
                assigned_count: 5,
                is_understaffed: false,
                staffing_summary: [{ role: 'satgas', required: 3, active: 3 }],
              },
            ],
          },
        ],
        generated_at: '2026-03-05T08:30:00Z',
      };

      mockAxios.onGet('/monitoring/boundaries').reply(200, mockBoundaries);

      const response = await apiClient.get('/monitoring/boundaries');

      expect(response.status).toBe(200);
      expect(response.data.rayons).toHaveLength(1);
      expect(response.data.rayons[0].id).toBe('rayon-1');
      expect(response.data.rayons[0].areas).toHaveLength(1);
      expect(response.data.rayons[0].areas[0].name).toBe('Taman Bungkul');
      expect(response.data.rayons[0].areas[0].staffing_summary).toHaveLength(1);
      expect(response.data.generated_at).toBe('2026-03-05T08:30:00Z');
    });

    it('should handle server error', async () => {
      mockAxios.onGet('/monitoring/boundaries').reply(500);

      await expect(apiClient.get('/monitoring/boundaries')).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // POST /monitoring/reassign (Phase 2D-10 Gap Fix #10)
  // -------------------------------------------------------------------------

  describe('POST /monitoring/reassign', () => {
    it('should reassign a worker and return ReassignWorkerResponse', async () => {
      const mockResponse = {
        user_id: 'user-1',
        user_name: 'Budi Santoso',
        previous_area_id: 'area-1',
        previous_area_name: 'Taman Bungkul',
        new_area_id: 'area-2',
        new_area_name: 'Taman Flora',
        new_schedule_id: null,
        effective_date: '2026-03-05',
        reassigned_at: '2026-03-05T09:00:00Z',
      };

      mockAxios.onPost('/monitoring/reassign').reply(200, mockResponse);

      const response = await apiClient.post('/monitoring/reassign', {
        user_id: 'user-1',
        target_area_id: 'area-2',
        reason: 'Area understaffed',
        end_current_schedule: true,
      });

      expect(response.status).toBe(200);
      expect(response.data.user_id).toBe('user-1');
      expect(response.data.user_name).toBe('Budi Santoso');
      expect(response.data.previous_area_id).toBe('area-1');
      expect(response.data.new_area_id).toBe('area-2');
      expect(response.data.new_area_name).toBe('Taman Flora');
      expect(response.data.reassigned_at).toBe('2026-03-05T09:00:00Z');
    });

    it('should handle validation error', async () => {
      mockAxios.onPost('/monitoring/reassign').reply(400, {
        statusCode: 400,
        message: 'user_id is required',
        error: 'BadRequest',
      });

      await expect(
        apiClient.post('/monitoring/reassign', { target_area_id: 'area-2' })
      ).rejects.toThrow();
    });
  });
});
