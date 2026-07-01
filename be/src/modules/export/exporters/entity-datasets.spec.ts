import {
  usersDataset,
  areasDataset,
  rayonsDataset,
  tasksDataset,
  activitiesDataset,
  overtimeDataset,
  areasPlacemarks,
} from './entity-datasets';
import type { User } from '../../users/entities/user.entity';
import type { Area } from '../../areas/entities/area.entity';
import type { Rayon } from '../../rayons/entities/rayon.entity';
import type { Task } from '../../tasks/entities/task.entity';
import type { Activity } from '../../activities/entities/activity.entity';
import type { Overtime } from '../../overtime/entities/overtime.entity';

const now = new Date('2026-06-10T00:00:00.000Z');

describe('entity dataset builders', () => {
  it('maps users (null phone → empty cell)', () => {
    const ds = usersDataset([
      {
        id: 'u1',
        username: 'a',
        full_name: 'A',
        phone_number: null,
        role: 'satgas',
        is_active: true,
        created_at: now,
      } as User,
    ]);
    expect(ds.headers).toContain('username');
    expect(ds.rows[0][3]).toBe('');
    expect(ds.rows[0][8]).toBe(now.toISOString());
  });

  it('maps areas', () => {
    const ds = areasDataset([
      {
        id: 'a1',
        name: 'Taman',
        area_type_id: 't1',
        gps_lat: -7.2,
        gps_lng: 112.7,
        radius_meters: 100,
        is_active: true,
      } as Area,
    ]);
    expect(ds.rows[0][1]).toBe('Taman');
  });

  it('maps rayons', () => {
    const ds = rayonsDataset([{ id: 'r1', name: 'Selatan', created_at: now } as Rayon]);
    expect(ds.rows[0][0]).toBe('r1');
    expect(ds.rows[0][1]).toBe('Selatan');
  });

  it('maps tasks (task_type from camelCase getter)', () => {
    const ds = tasksDataset([
      {
        id: 't1',
        title: 'Cut',
        status: 'pending',
        priority: 'medium',
        taskType: 'pruning',
        created_by: 'c1',
        created_at: now,
      } as unknown as Task,
    ]);
    expect(ds.rows[0][5]).toBe('pruning');
  });

  it('maps activities (photo_count derived from array length)', () => {
    const ds = activitiesDataset([
      {
        id: 'ac1',
        user_id: 'u1',
        activity_type_id: 'at1',
        description: 'x',
        status: 'pending',
        photo_urls: ['p1', 'p2'],
        created_at: now,
      } as Activity,
    ]);
    expect(ds.rows[0][8]).toBe(2);
  });

  it('maps overtime', () => {
    const ds = overtimeDataset([
      {
        id: 'o1',
        user_id: 'u1',
        start_datetime: now,
        end_datetime: null,
        status: 'pending',
        created_at: now,
      } as Overtime,
    ]);
    expect(ds.rows[0][4]).toBe('');
  });

});

describe('areasPlacemarks', () => {
  it('extracts a GeoJSON ring into placemark polygon coordinates', () => {
    const placemarks = areasPlacemarks([
      {
        name: 'Taman',
        address: 'Jl. A',
        gps_lat: -7.2,
        gps_lng: 112.7,
        boundary_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [112.7, -7.2],
              [112.71, -7.21],
              [112.72, -7.22],
            ],
          ],
        },
      } as unknown as Area,
    ]);
    expect(placemarks[0].polygon).toHaveLength(3);
    expect(placemarks[0].polygon?.[0]).toEqual({ longitude: 112.7, latitude: -7.2 });
  });

  it('returns a null polygon when boundary is missing or malformed', () => {
    const placemarks = areasPlacemarks([
      {
        name: 'A',
        address: null,
        gps_lat: 0,
        gps_lng: 0,
        boundary_polygon: null,
      } as unknown as Area,
    ]);
    expect(placemarks[0].polygon).toBeNull();
  });
});
