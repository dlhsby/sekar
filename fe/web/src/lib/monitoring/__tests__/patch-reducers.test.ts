import {
  applyWorkerPatch,
  applyWorkerRemoved,
  recomputeTotals,
} from '../patch-reducers';
import type { MonitoringSnapshotData, SnapshotWorker } from '../../api/monitoring-v2';

function worker(over: Partial<SnapshotWorker>): SnapshotWorker {
  return {
    user_id: 'u1',
    full_name: 'Worker One',
    role: 'satgas',
    lat: -7.25,
    lng: 112.75,
    status: 'active',
    area_id: 'area-1',
    area_name: 'Area 1',
    rayon_id: 'rayon-1',
    rayon_name: 'Rayon 1',
    last_update: '2026-07-04T00:00:00Z',
    is_within_area: true,
    battery_level: 80,
    ...over,
  };
}

function snapshot(workers: SnapshotWorker[]): MonitoringSnapshotData {
  return {
    workers,
    area_summaries: [],
    ...recomputeTotals(workers),
    generated_at: '2026-07-04T00:00:00Z',
  };
}

describe('patch-reducers', () => {
  it('recomputeTotals counts by status', () => {
    const totals = recomputeTotals([
      worker({ user_id: 'a', status: 'active' }),
      worker({ user_id: 'b', status: 'active' }),
      worker({ user_id: 'c', status: 'missing' }),
    ]);
    expect(totals.total_active).toBe(2);
    expect(totals.total_missing).toBe(1);
    expect(totals.total_offline).toBe(0);
  });

  it('updates an existing worker in place without mutating input', () => {
    const data = snapshot([worker({ user_id: 'u1', status: 'active' })]);
    const next = applyWorkerPatch(data, { user_id: 'u1', status: 'missing', lat: -7.3, lng: 112.8 });

    expect(next).not.toBe(data);
    expect(data.workers[0].status).toBe('active'); // original untouched
    expect(next.workers[0].status).toBe('missing');
    expect(next.workers[0].lat).toBe(-7.3);
    expect(next.total_active).toBe(0);
    expect(next.total_missing).toBe(1);
  });

  it('does not overwrite existing fields with undefined', () => {
    const data = snapshot([worker({ user_id: 'u1', area_name: 'Area 1' })]);
    const next = applyWorkerPatch(data, { user_id: 'u1', status: 'inactive' });
    expect(next.workers[0].area_name).toBe('Area 1'); // preserved
    expect(next.workers[0].status).toBe('inactive');
  });

  it('inserts a new worker when the patch carries coordinates', () => {
    const data = snapshot([worker({ user_id: 'u1' })]);
    const next = applyWorkerPatch(data, {
      user_id: 'u2',
      status: 'active',
      lat: -7.1,
      lng: 112.6,
      full_name: 'Worker Two',
    });
    expect(next.workers).toHaveLength(2);
    expect(next.total_active).toBe(2);
  });

  it('ignores an unknown worker with no coordinates', () => {
    const data = snapshot([worker({ user_id: 'u1' })]);
    const next = applyWorkerPatch(data, { user_id: 'ghost', status: 'active' });
    expect(next).toBe(data); // same reference, no change
  });

  it('removes a worker and refreshes totals', () => {
    const data = snapshot([
      worker({ user_id: 'u1', status: 'active' }),
      worker({ user_id: 'u2', status: 'active' }),
    ]);
    const next = applyWorkerRemoved(data, 'u1');
    expect(next.workers).toHaveLength(1);
    expect(next.total_active).toBe(1);
  });

  it('returns same reference when removing an absent worker', () => {
    const data = snapshot([worker({ user_id: 'u1' })]);
    expect(applyWorkerRemoved(data, 'nope')).toBe(data);
  });
});
