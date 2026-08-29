/**
 * useMonitoringSearch — client-side search across petugas and geography.
 *
 * Geography now arrives as a flat, COMPLETE index (`useGeoIndex`) rather than
 * the map's own boundaries. Searching what the map has loaded coupled "what can
 * I find" to "what am I looking at", and in viewport mode those actively differ.
 */

import { renderHook } from '@testing-library/react-native';
import { useMonitoringSearch } from '../useMonitoringSearch';
import type { LiveUser } from '../../types/models.types';
import type { GeoIndexEntry } from '../useGeoIndex';

const user = (id: string, name: string): LiveUser =>
  ({ id, full_name: name, role: 'satgas', location_name: 'Taman A', latitude: 1, longitude: 2 } as unknown as LiveUser);

const geoEntry = (
  id: string,
  name: string,
  type: GeoIndexEntry['type'],
  parentName: string | null = 'Rayon Pusat',
): GeoIndexEntry => ({ id, name, type, latitude: 5, longitude: 6, parentName });

const users = [user('u1', 'Budi Santoso'), user('u2', 'Ahmad')];
const districts: GeoIndexEntry[] = [
  { ...geoEntry('r1', 'Rayon Pusat', 'district', null), areaCount: 2 },
  geoEntry('k1', 'Kawasan Darmo', 'region'),
  geoEntry('a1', 'Taman Bungkul', 'location'),
  geoEntry('a2', 'Taman Apsari', 'location'),
];

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

describe('kawasan is findable', () => {
  it('returns a region result, a tier that had no result type at all', () => {
    // The search loop read districts and their areas and never touched
    // `regions`, so an entire geographic tier could not be found in any mode.
    const { result } = renderHook(() => useMonitoringSearch(users, districts, 'Darmo'));
    expect(result.current.region.map(r => r.name)).toEqual(['Kawasan Darmo']);
    expect(result.current.total).toBe(1);
  });

  it('gives a kawasan its parent rayon as the subtitle', () => {
    const { result } = renderHook(() => useMonitoringSearch(users, districts, 'Darmo'));
    expect(result.current.region[0].subtitle).toBe('Rayon Pusat');
  });

  it('lists kawasan as its own section in the combined view', () => {
    const { result } = renderHook(() => useMonitoringSearch(users, districts, 'a'));
    expect(result.current.semua.map(s => s.type)).toContain('region');
  });

  it('finds a lokasi regardless of what the map has loaded', () => {
    // The index is fetched whole and independently, so viewport mode narrowing
    // the map's own boundaries can no longer narrow what search can reach.
    const { result } = renderHook(() => useMonitoringSearch(users, districts, 'Bungkul'));
    expect(result.current.location.map(r => r.name)).toEqual(['Taman Bungkul']);
  });
});
