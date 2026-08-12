import { renderHook } from '@testing-library/react';
import { useMonitoringSearch } from '../useMonitoringSearch';
import type { SnapshotWorker } from '@/lib/api/monitoring-v2';
import type { GeoIndexEntry } from '../useGeoIndex';

const labels = { petugas: 'Officers', area: 'Area', region: 'Kawasan', district: 'Rayon' };

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

/**
 * The flat index every tier lives in — the point of the change: geography no
 * longer arrives nested inside whatever the map happened to have loaded.
 */
const geo: GeoIndexEntry[] = [
  {
    id: 'r1',
    name: 'Rayon Pusat',
    tier: 'district',
    latitude: -7.29,
    longitude: 112.74,
    childCount: 2,
    districtId: 'r1',
  },
  {
    id: 'k1',
    name: 'Kawasan Darmo',
    tier: 'region',
    latitude: -7.28,
    longitude: 112.73,
    parentName: 'Rayon Pusat',
    districtId: 'r1',
  },
  {
    id: 'a1',
    name: 'Taman Bungkul',
    tier: 'location',
    latitude: -7.29,
    longitude: 112.74,
    parentName: 'Rayon Pusat',
    districtId: 'r1',
    regionId: 'k1',
  },
];

describe('useMonitoringSearch', () => {
  it('returns empty for a blank query', () => {
    const { result } = renderHook(() => useMonitoringSearch(workers, geo, '  ', labels));
    expect(result.current.total).toBe(0);
    expect(result.current.sections).toHaveLength(0);
  });

  it('matches petugas by name with role · area subtitle', () => {
    const { result } = renderHook(() => useMonitoringSearch(workers, geo, 'budi', labels));
    expect(result.current.petugas).toHaveLength(1);
    const p = result.current.petugas[0];
    expect(p.type).toBe('petugas');
    expect(p.subtitle).toContain('Taman Bungkul');
    expect(p.latitude).toBe(-7.25);
  });

  it('matches areas and geo, grouped into sections', () => {
    const { result } = renderHook(() => useMonitoringSearch(workers, geo, 'taman', labels));
    expect(result.current.area).toHaveLength(1);
    expect(result.current.sections.map((s) => s.type)).toContain('area');

    const r = renderHook(() => useMonitoringSearch(workers, geo, 'rayon pusat', labels));
    expect(r.result.current.district).toHaveLength(1);
    expect(r.result.current.district[0].subtitle).toBe('2 area');
  });

  it('is case-insensitive and only includes non-empty sections', () => {
    const { result } = renderHook(() => useMonitoringSearch(workers, geo, 'BUNGKUL', labels));
    expect(result.current.total).toBeGreaterThan(0);
    expect(result.current.sections.every((s) => s.data.length > 0)).toBe(true);
  });
});
