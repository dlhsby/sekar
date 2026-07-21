/**
 * Tests for the mobile team-grouping helper (ADR-048) — mirrors the web
 * teamGrouping tests: ≥2-member teams collapse to a centroid bubble; singles /
 * unteamed stay individual; order is stable; expand returns everyone.
 */

import { groupWorkersByTeam, isTeamGroup, type TeamGroup } from '../teamGrouping';
import type { LiveUser } from '../../types/monitoring.types';

function worker(over: Partial<LiveUser>): LiveUser {
  return {
    id: over.id ?? 'u',
    full_name: over.full_name ?? 'Worker',
    role: 'satgas',
    phone: null,
    status: 'active',
    location_id: null,
    location_name: '',
    district_id: null,
    district_name: null,
    latitude: over.latitude ?? -7.25,
    longitude: over.longitude ?? 112.75,
    accuracy: null,
    battery_level: null,
    last_update: '',
    is_within_area: true,
    outside_boundary: false,
    shift_id: 's',
    shift_name: '',
    shift_definition_id: null,
    clock_in_time: '',
    current_task_status: null,
    current_task_title: null,
    ...over,
  };
}

describe('groupWorkersByTeam', () => {
  it('collapses a ≥2-member team into one centroid bubble', () => {
    const out = groupWorkersByTeam([
      worker({ id: 'a', team_id: 't1', team_name: 'Tim Sapu', team_color: '#F00', latitude: -7.2, longitude: 112.7 }),
      worker({ id: 'b', team_id: 't1', team_name: 'Tim Sapu', latitude: -7.4, longitude: 112.9 }),
    ]);
    expect(out).toHaveLength(1);
    expect(isTeamGroup(out[0])).toBe(true);
    const g = out[0] as TeamGroup;
    expect(g.team_id).toBe('t1');
    expect(g.team_name).toBe('Tim Sapu');
    expect(g.team_color).toBe('#F00');
    expect(g.member_count).toBe(2);
    expect(g.member_ids.sort()).toEqual(['a', 'b']);
    expect(g.latitude).toBeCloseTo(-7.3, 5);
    expect(g.longitude).toBeCloseTo(112.8, 5);
  });

  it('keeps single-member teams and unteamed workers as individuals', () => {
    const out = groupWorkersByTeam([
      worker({ id: 'solo', team_id: 't2' }),
      worker({ id: 'free', team_id: null }),
    ]);
    expect(out.every(r => !isTeamGroup(r))).toBe(true);
    expect(out.map(r => (r as LiveUser).id)).toEqual(['solo', 'free']);
  });

  it('inserts the team bubble at the first member’s position (stable order)', () => {
    const out = groupWorkersByTeam([
      worker({ id: 'x', team_id: null }),
      worker({ id: 'a', team_id: 't1' }),
      worker({ id: 'y', team_id: null }),
      worker({ id: 'b', team_id: 't1' }),
    ]);
    // x, [team t1], y  — team slots where its first member was
    expect(out).toHaveLength(3);
    expect((out[0] as LiveUser).id).toBe('x');
    expect(isTeamGroup(out[1])).toBe(true);
    expect((out[2] as LiveUser).id).toBe('y');
  });

  it('falls back to individuals when all team members have non-finite coords', () => {
    const out = groupWorkersByTeam([
      worker({ id: 'a', team_id: 't1', latitude: NaN, longitude: NaN }),
      worker({ id: 'b', team_id: 't1', latitude: NaN, longitude: NaN }),
    ]);
    expect(out.every(r => !isTeamGroup(r))).toBe(true);
    expect(out).toHaveLength(2);
  });

  it('expand=true returns every worker individually (no collapsing)', () => {
    const out = groupWorkersByTeam(
      [worker({ id: 'a', team_id: 't1' }), worker({ id: 'b', team_id: 't1' })],
      true,
    );
    expect(out.every(r => !isTeamGroup(r))).toBe(true);
    expect(out).toHaveLength(2);
  });
});
