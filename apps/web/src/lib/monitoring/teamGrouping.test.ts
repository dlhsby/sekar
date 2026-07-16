/**
 * Unit Tests: teamGrouping
 * Tests team collapsing logic, zoom expansion, centroid calculation,
 * and handling of edge cases (single-member teams, null team_ids, non-finite coords).
 */

import { groupWorkersByTeam, type TeamGroup } from './teamGrouping';
import type { SimpleWorker } from '@/components/monitoring/SimpleMonitoringMap';

const mockWorker = (overrides: Partial<SimpleWorker> = {}): SimpleWorker => ({
  user_id: 'user-' + Math.random().toString(36).substr(2, 9),
  full_name: 'Test Worker',
  lat: -7.2,
  lng: 112.7,
  status: 'active',
  role: 'satgas',
  is_within_area: true,
  is_scheduled: true,
  team_id: null,
  team_name: null,
  team_color: null,
  ...overrides,
});

describe('teamGrouping', () => {
  describe('groupWorkersByTeam', () => {
    it('should return all workers individually at high zoom (>= expandZoom)', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: 'team-a', team_name: 'Alpha' }),
        mockWorker({ user_id: 'w2', team_id: 'team-a', team_name: 'Alpha' }),
      ];
      const result = groupWorkersByTeam(workers, 17, 17);
      expect(result).toHaveLength(2);
      expect(result.every((r) => !('kind' in r))).toBe(true); // All are SimpleWorker (no kind field)
    });

    it('should collapse a 2-member team into one TeamGroup below expandZoom', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: 'team-a', team_name: 'Alpha', lat: -7.0, lng: 112.0 }),
        mockWorker({ user_id: 'w2', team_id: 'team-a', team_name: 'Alpha', lat: -7.4, lng: 113.0 }),
      ];
      const result = groupWorkersByTeam(workers, 10, 17);
      expect(result).toHaveLength(1);
      const group = result[0] as TeamGroup;
      expect(group.kind).toBe('team');
      expect(group.team_id).toBe('team-a');
      expect(group.team_name).toBe('Alpha');
      expect(group.member_count).toBe(2);
      expect(group.member_ids).toEqual(['w1', 'w2']);
      // Centroid: lat = (-7.0 + -7.4) / 2 = -7.2, lng = (112.0 + 113.0) / 2 = 112.5
      expect(group.lat).toBeCloseTo(-7.2, 5);
      expect(group.lng).toBeCloseTo(112.5, 5);
    });

    it('should keep a 1-member team as an individual worker', () => {
      const workers = [mockWorker({ user_id: 'w1', team_id: 'team-a', team_name: 'Alpha' })];
      const result = groupWorkersByTeam(workers, 10, 17);
      expect(result).toHaveLength(1);
      const worker = result[0] as SimpleWorker;
      expect('kind' in worker && worker.kind === 'team').toBe(false);
      expect(worker.user_id).toBe('w1');
      expect(worker.team_id).toBe('team-a');
    });

    it('should keep workers with null team_id as individuals', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: null }),
        mockWorker({ user_id: 'w2', team_id: null }),
      ];
      const result = groupWorkersByTeam(workers, 10, 17);
      expect(result).toHaveLength(2);
      expect(result.every((r) => !('kind' in r))).toBe(true);
    });

    it('should mix teamless workers, 1-member teams, and 2+ member teams', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: null }),
        mockWorker({ user_id: 'w2', team_id: 'team-a', team_name: 'Alpha' }),
        mockWorker({ user_id: 'w3', team_id: 'team-a', team_name: 'Alpha' }),
        mockWorker({ user_id: 'w4', team_id: 'team-b', team_name: 'Beta' }),
      ];
      const result = groupWorkersByTeam(workers, 10, 17);
      expect(result).toHaveLength(3);
      // w1 (teamless), team-a group (w2+w3), w4 (1-member team-b)
      const hasTeamGroup = result.some((r) => 'kind' in r && r.kind === 'team');
      expect(hasTeamGroup).toBe(true);
    });

    it('should skip a 2+ member team if all members have non-finite coords', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: 'team-a', lat: NaN, lng: 112.0 }),
        mockWorker({ user_id: 'w2', team_id: 'team-a', lat: -7.0, lng: NaN }),
      ];
      const result = groupWorkersByTeam(workers, 10, 17);
      // Should fall back to rendering as individuals.
      expect(result).toHaveLength(2);
      expect(result.every((r) => !('kind' in r))).toBe(true);
    });

    it('should calculate centroid only from finite coordinates', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: 'team-a', lat: -7.0, lng: 112.0 }),
        mockWorker({ user_id: 'w2', team_id: 'team-a', lat: NaN, lng: NaN }),
        mockWorker({ user_id: 'w3', team_id: 'team-a', lat: -7.4, lng: 113.0 }),
      ];
      const result = groupWorkersByTeam(workers, 10, 17);
      expect(result).toHaveLength(1);
      const group = result[0] as TeamGroup;
      // Centroid: (2 finite members) = (-7.0 + -7.4) / 2 = -7.2, (112.0 + 113.0) / 2 = 112.5
      expect(group.lat).toBeCloseTo(-7.2, 5);
      expect(group.lng).toBeCloseTo(112.5, 5);
      expect(group.member_count).toBe(3);
    });

    it('should preserve team_name and team_color from the first member', () => {
      const workers = [
        mockWorker({
          user_id: 'w1',
          team_id: 'team-a',
          team_name: 'Team Alpha',
          team_color: 'var(--color-nb-danger)',
        }),
        mockWorker({
          user_id: 'w2',
          team_id: 'team-a',
          team_name: 'Team Alpha',
          team_color: 'var(--color-nb-danger)',
        }),
      ];
      const result = groupWorkersByTeam(workers, 10, 17);
      const group = result[0] as TeamGroup;
      expect(group.team_name).toBe('Team Alpha');
      expect(group.team_color).toBe('var(--color-nb-danger)');
    });

    it('should handle null team_color gracefully', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: 'team-a', team_name: 'Alpha', team_color: null }),
        mockWorker({ user_id: 'w2', team_id: 'team-a', team_name: 'Alpha', team_color: null }),
      ];
      const result = groupWorkersByTeam(workers, 10, 17);
      const group = result[0] as TeamGroup;
      expect(group.team_color).toBeNull();
    });

    it('should maintain stable insertion order', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: null }),
        mockWorker({ user_id: 'w2', team_id: 'team-a', team_name: 'Alpha' }),
        mockWorker({ user_id: 'w3', team_id: 'team-a', team_name: 'Alpha' }),
        mockWorker({ user_id: 'w4', team_id: null }),
      ];
      const result = groupWorkersByTeam(workers, 10, 17);
      // w1 (teamless), team-a group at first occurrence of team-a, w4 (teamless)
      const w1 = result[0] as SimpleWorker;
      const teamGroup = result[1] as TeamGroup;
      const w4 = result[2] as SimpleWorker;
      expect(w1.user_id).toBe('w1');
      expect(teamGroup.kind).toBe('team');
      expect(teamGroup.team_id).toBe('team-a');
      expect(w4.user_id).toBe('w4');
    });

    it('should handle large teams', () => {
      const workers = Array.from({ length: 50 }, (_, i) =>
        mockWorker({
          user_id: `w${i}`,
          team_id: 'team-large',
          team_name: 'Large Team',
          lat: -7.0 + i * 0.001,
          lng: 112.0 + i * 0.001,
        })
      );
      const result = groupWorkersByTeam(workers, 10, 17);
      expect(result).toHaveLength(1);
      const group = result[0] as TeamGroup;
      expect(group.member_count).toBe(50);
      expect(group.member_ids).toHaveLength(50);
    });

    it('should expand all workers at exactly expandZoom', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: 'team-a', team_name: 'Alpha' }),
        mockWorker({ user_id: 'w2', team_id: 'team-a', team_name: 'Alpha' }),
      ];
      const result = groupWorkersByTeam(workers, 17, 17);
      expect(result).toHaveLength(2);
      expect(result.every((r) => !('kind' in r))).toBe(true);
    });

    it('should collapse at zoom just below expandZoom', () => {
      const workers = [
        mockWorker({ user_id: 'w1', team_id: 'team-a', team_name: 'Alpha' }),
        mockWorker({ user_id: 'w2', team_id: 'team-a', team_name: 'Alpha' }),
      ];
      const result = groupWorkersByTeam(workers, 16.9, 17);
      expect(result).toHaveLength(1);
      expect((result[0] as TeamGroup).kind).toBe('team');
    });
  });
});
