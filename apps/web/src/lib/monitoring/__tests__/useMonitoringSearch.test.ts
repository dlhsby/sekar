import { renderHook } from '@testing-library/react';
import { useMonitoringSearch } from '../useMonitoringSearch';
import type { SnapshotWorker } from '@/lib/api/monitoring-v2';
import type { DistrictBoundary } from '@/lib/api/monitoring-types';

const labels = { petugas: 'Officers', area: 'Area', district: 'Rayon' };

const workers: SnapshotWorker[] = [
  {
    user_id: 'w1',
    full_name: 'Budi Santoso',
    role: 'satgas',
    lat: -7.25,
    lng: 112.75,
    status: 'active',
    location_id: 'a1',
    location_name: 'Taman Bungkul',
    district_id: 'r1',
    district_name: 'Rayon Pusat',
    last_update: '',
    is_within_area: true,
    battery_level: 80,
  },
];

const districts: DistrictBoundary[] = [
  {
    id: 'r1',
    name: 'Rayon Pusat',
    border_color: 'var(--color-nb-primary)',
    boundary_polygon: null,
    center_lat: -7.29,
    center_lng: 112.74,
    area_count: 2,
    is_understaffed: false,
    understaffed_area_count: 0,
    regions: [],
    areas: [
      {
        id: 'a1',
        name: 'Taman Bungkul',
        boundary_polygon: null,
        center_lat: -7.29,
        center_lng: 112.74,
        district_id: 'r1',
        district_name: 'Rayon Pusat',
        assigned_count: 3,
        is_understaffed: false,
        staffing_summary: [],
      },
    ],
  },
];

describe('useMonitoringSearch', () => {
  it('returns empty for a blank query', () => {
    const { result } = renderHook(() => useMonitoringSearch(workers, districts, '  ', labels));
    expect(result.current.total).toBe(0);
    expect(result.current.sections).toHaveLength(0);
  });

  it('matches petugas by name with role · area subtitle', () => {
    const { result } = renderHook(() => useMonitoringSearch(workers, districts, 'budi', labels));
    expect(result.current.petugas).toHaveLength(1);
    const p = result.current.petugas[0];
    expect(p.type).toBe('petugas');
    expect(p.subtitle).toContain('Taman Bungkul');
    expect(p.latitude).toBe(-7.25);
  });

  it('matches areas and districts, grouped into sections', () => {
    const { result } = renderHook(() => useMonitoringSearch(workers, districts, 'taman', labels));
    expect(result.current.area).toHaveLength(1);
    expect(result.current.sections.map((s) => s.type)).toContain('area');

    const r = renderHook(() => useMonitoringSearch(workers, districts, 'rayon pusat', labels));
    expect(r.result.current.district).toHaveLength(1);
    expect(r.result.current.district[0].subtitle).toBe('2 area');
  });

  it('is case-insensitive and only includes non-empty sections', () => {
    const { result } = renderHook(() => useMonitoringSearch(workers, districts, 'BUNGKUL', labels));
    expect(result.current.total).toBeGreaterThan(0);
    expect(result.current.sections.every((s) => s.data.length > 0)).toBe(true);
  });
});
