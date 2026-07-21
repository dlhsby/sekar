/**
 * Tests for the PR2.5 monitoring drill helpers: the snapshot→LiveUser adapter and
 * the display_scope-based `scopeMatches` filter.
 */

import {
  snapshotWorkerToLiveUser,
  scopeMatches,
  type SnapshotWorker,
} from '../monitoringScope';

const baseSnapshot: SnapshotWorker = {
  user_id: 'u-1',
  full_name: 'Satgas Satu',
  role: 'satgas',
  status: 'active',
  lat: -7.25,
  lng: 112.75,
  location_id: 'loc-1',
  location_name: 'Taman Bungkul',
  district_id: 'dist-1',
  district_name: 'Rayon Pusat',
  region_id: 'reg-1',
  region_name: 'Kawasan Darmo',
  display_scope: 'location',
  display_scope_id: 'loc-1',
  is_within_area: true,
  is_scheduled: true,
  team_id: null,
};

describe('snapshotWorkerToLiveUser', () => {
  it('renames user_id→id and lat/lng→latitude/longitude', () => {
    const u = snapshotWorkerToLiveUser(baseSnapshot);
    expect(u.id).toBe('u-1');
    expect(u.latitude).toBe(-7.25);
    expect(u.longitude).toBe(112.75);
  });

  it('carries display_scope + team + lifecycle fields through unchanged', () => {
    const u = snapshotWorkerToLiveUser({
      ...baseSnapshot,
      display_scope: 'district',
      display_scope_id: 'dist-1',
      team_id: 't-9',
      team_name: 'Tim Sapu',
      team_color: '#FF0000',
      is_scheduled: false,
      lifecycle_state: 'terlambat',
      is_late: true,
    });
    expect(u.display_scope).toBe('district');
    expect(u.display_scope_id).toBe('dist-1');
    expect(u.team_id).toBe('t-9');
    expect(u.team_name).toBe('Tim Sapu');
    expect(u.is_scheduled).toBe(false);
    expect(u.lifecycle_state).toBe('terlambat');
    expect(u.is_late).toBe(true);
  });

  it('derives outside_boundary from is_within_area', () => {
    expect(snapshotWorkerToLiveUser({ ...baseSnapshot, is_within_area: false }).outside_boundary).toBe(true);
    expect(snapshotWorkerToLiveUser({ ...baseSnapshot, is_within_area: true }).outside_boundary).toBe(false);
  });

  it('defaults is_within_area to true (within) when the snapshot omits it', () => {
    const { is_within_area, ...noAxis } = baseSnapshot;
    const u = snapshotWorkerToLiveUser(noAxis as SnapshotWorker);
    expect(u.is_within_area).toBe(true);
    expect(u.outside_boundary).toBe(false);
  });

  it('fills omitted optional fields with non-throwing defaults', () => {
    const minimal: SnapshotWorker = {
      user_id: 'u-2',
      full_name: 'X',
      role: 'linmas',
      status: 'offline',
      lat: 0,
      lng: 0,
      location_id: null,
    };
    const u = snapshotWorkerToLiveUser(minimal);
    expect(u.phone).toBeNull();
    expect(u.location_name).toBe('');
    expect(u.shift_id).toBe('');
    expect(u.team_id).toBeNull();
    expect(u.role_marker_icon).toBeNull();
  });
});

describe('scopeMatches', () => {
  const cityWorker = { display_scope: 'city' as const, display_scope_id: null };
  const districtWorker = { display_scope: 'district' as const, display_scope_id: 'dist-1' };
  const regionWorker = { display_scope: 'region' as const, display_scope_id: 'reg-1' };
  const locationWorker = { display_scope: 'location' as const, display_scope_id: 'loc-1' };

  it('city scope shows only city-scope workers (incl. ad-hoc "Luar Jadwal")', () => {
    expect(scopeMatches(cityWorker, 'city', null)).toBe(true);
    expect(scopeMatches(locationWorker, 'city', null)).toBe(false);
    expect(scopeMatches(districtWorker, 'city', null)).toBe(false);
  });

  it('district scope requires display_scope=district AND matching id', () => {
    expect(scopeMatches(districtWorker, 'district', 'dist-1')).toBe(true);
    expect(scopeMatches(districtWorker, 'district', 'dist-2')).toBe(false);
    expect(scopeMatches(locationWorker, 'district', 'dist-1')).toBe(false);
  });

  it('region scope requires display_scope=region AND matching id', () => {
    expect(scopeMatches(regionWorker, 'region', 'reg-1')).toBe(true);
    expect(scopeMatches(regionWorker, 'region', 'reg-2')).toBe(false);
  });

  it('location scope requires display_scope=location AND matching id', () => {
    expect(scopeMatches(locationWorker, 'location', 'loc-1')).toBe(true);
    expect(scopeMatches(locationWorker, 'location', 'loc-2')).toBe(false);
    expect(scopeMatches(regionWorker, 'location', 'loc-1')).toBe(false);
  });

  it('treats a missing display_scope as location (partial-rollout safe)', () => {
    expect(scopeMatches({ display_scope_id: 'loc-1' }, 'location', 'loc-1')).toBe(true);
    expect(scopeMatches({ display_scope_id: 'loc-1' }, 'city', null)).toBe(false);
  });
});
