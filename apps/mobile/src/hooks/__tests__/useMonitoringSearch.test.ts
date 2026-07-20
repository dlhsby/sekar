/**
 * useMonitoringSearch tests — Phase 4 M3 (CP-S2).
 * Client-side search across petugas (liveUsers) + areas + districts.
 */

import { renderHook } from '@testing-library/react-native';
import { useMonitoringSearch } from '../useMonitoringSearch';
import type { LiveUser, DistrictBoundary } from '../../types/models.types';

const user = (id: string, name: string): LiveUser =>
  ({ id, full_name: name, role: 'satgas', location_name: 'Taman A', latitude: 1, longitude: 2 } as unknown as LiveUser);

const area = (id: string, name: string) =>
  ({ id, name, center_lat: 5, center_lng: 6, district_name: 'Rayon Pusat' });

const district = (id: string, name: string, areas: ReturnType<typeof area>[] = []): DistrictBoundary =>
  ({ id, name, center_lat: 3, center_lng: 4, area_count: areas.length, areas } as unknown as DistrictBoundary);

const users = [user('u1', 'Budi Santoso'), user('u2', 'Ahmad')];
const districts = [district('r1', 'Rayon Pusat', [area('a1', 'Taman Bungkul'), area('a2', 'Taman Apsari')])];

describe('useMonitoringSearch', () => {
  it('returns empty results for a blank query', () => {
    const { result } = renderHook(() => useMonitoringSearch(users, districts, '   '));
    expect(result.current.total).toBe(0);
    expect(result.current.semua).toEqual([]);
  });

  it('matches petugas by full name', () => {
    const { result } = renderHook(() => useMonitoringSearch(users, districts, 'budi'));
    expect(result.current.petugas.map((p) => p.name)).toEqual(['Budi Santoso']);
    expect(result.current.petugas[0].type).toBe('petugas');
    expect(result.current.petugas[0].subtitle).toContain('Satgas');
  });

  it('matches locations by name and districts by name', () => {
    const locations = renderHook(() => useMonitoringSearch(users, districts, 'taman')).result.current.location;
    expect(locations.map((a) => a.name).sort()).toEqual(['Taman Apsari', 'Taman Bungkul']);

    const rs = renderHook(() => useMonitoringSearch(users, districts, 'pusat')).result.current.district;
    expect(rs.map((r) => r.name)).toEqual(['Rayon Pusat']);
    expect(rs[0].subtitle).toBe('2 area');
  });

  it('groups the Semua tab by type, dropping empty sections', () => {
    const { result } = renderHook(() => useMonitoringSearch(users, districts, 'taman'));
    // "taman" hits location names only (petugas match full_name only).
    expect(result.current.semua.map((s) => s.title)).toEqual(['Area']);
    expect(result.current.total).toBe(2);
  });
});
