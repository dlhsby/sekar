/**
 * MonitoringV2 Slice Tests
 * Phase 3 sub-phase 3-5: Snapshot storage, incremental WS patch, layer toggles,
 * selected user/area, cluster zoom threshold, and fetchSnapshot thunk.
 */

import monitoringV2Reducer, {
  setSnapshot,
  applyPatch,
  toggleLayer,
  setSelectedUser,
  setSelectedArea,
  setClusterZoomThreshold,
  fetchSnapshot,
  type MonitoringV2State,
  type MonitoringV2Snapshot,
} from '../monitoringV2Slice';
import type { LiveUser } from '../../../types/models.types';

// ─── Mock apiClient ────────────────────────────────────────────────────────────

jest.mock('../../../services/api/apiClient', () => ({
  get: jest.fn(),
}));

import apiClient from '../../../services/api/apiClient';
const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeWorker = (overrides: Partial<LiveUser> = {}): LiveUser => ({
  id: 'user-1',
  full_name: 'Ahmad',
  role: 'satgas',
  phone: null,
  status: 'active',
  location_id: 'area-1',
  location_name: 'Taman A',
  district_id: 'district-1',
  district_name: 'Rayon 1',
  latitude: -7.25,
  longitude: 112.75,
  accuracy: 10,
  battery_level: 85,
  last_update: '2026-04-26T08:00:00Z',
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  shift_definition_id: null,
  clock_in_time: '2026-04-26T07:00:00Z',
  current_task_status: null,
  current_task_title: null,
  ...overrides,
});

const workerA = makeWorker({ id: 'worker-A', status: 'active', battery_level: 90 });
const workerB = makeWorker({ id: 'worker-B', status: 'absent', battery_level: 50 });

const initialSnapshot: MonitoringV2Snapshot = {
  scope: 'city',
  scope_id: null,
  workers: [workerA, workerB],
  generated_at: '2026-04-26T08:00:00Z',
};

function stateWithWorkers(): MonitoringV2State {
  return monitoringV2Reducer(undefined, setSnapshot(initialSnapshot));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('monitoringV2Slice', () => {
  describe('initial state', () => {
    it('starts with empty workers array', () => {
      const state = monitoringV2Reducer(undefined, { type: '@@INIT' });
      expect(state.snapshot.workers).toEqual([]);
    });

    it('starts with workers and districts layers visible', () => {
      const state = monitoringV2Reducer(undefined, { type: '@@INIT' });
      expect(state.visibleLayers.workers).toBe(true);
      expect(state.visibleLayers.districts).toBe(true);
      expect(state.visibleLayers.areas).toBe(true);
    });

    it('starts with plants, overdue layers hidden', () => {
      const state = monitoringV2Reducer(undefined, { type: '@@INIT' });
      expect(state.visibleLayers.plants).toBe(false);
      expect(state.visibleLayers.overdue).toBe(false);
    });

    it('starts with no selected user or area', () => {
      const state = monitoringV2Reducer(undefined, { type: '@@INIT' });
      expect(state.selectedUserId).toBeNull();
      expect(state.selectedAreaId).toBeNull();
    });

    it('starts with cluster zoom threshold of 0.05', () => {
      const state = monitoringV2Reducer(undefined, { type: '@@INIT' });
      expect(state.clusterZoomThreshold).toBe(0.05);
    });

    it('starts with loading false and no error', () => {
      const state = monitoringV2Reducer(undefined, { type: '@@INIT' });
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setSnapshot', () => {
    it('replaces the snapshot in state', () => {
      const state = monitoringV2Reducer(undefined, setSnapshot(initialSnapshot));
      expect(state.snapshot.workers).toHaveLength(2);
      expect(state.snapshot.scope).toBe('city');
      expect(state.snapshot.generated_at).toBe('2026-04-26T08:00:00Z');
    });

    it('clears error when snapshot is set', () => {
      // First force an error state
      const errorState = monitoringV2Reducer(
        undefined,
        fetchSnapshot.rejected(new Error('fail'), 'req-1', { scope: 'city' }, 'Gagal'),
      );
      expect(errorState.error).toBeTruthy();
      // Now set snapshot — should clear error
      const newState = monitoringV2Reducer(errorState, setSnapshot(initialSnapshot));
      expect(newState.error).toBeNull();
    });
  });

  describe('applyPatch', () => {
    it('updates an existing worker by id', () => {
      const state = stateWithWorkers();
      const patched = monitoringV2Reducer(
        state,
        applyPatch({ id: 'worker-A', battery_level: 20, status: 'absent' }),
      );
      const workerAUpdated = patched.snapshot.workers.find(w => w.id === 'worker-A');
      expect(workerAUpdated?.battery_level).toBe(20);
      expect(workerAUpdated?.status).toBe('absent');
    });

    it('does not mutate other workers when patching one', () => {
      const state = stateWithWorkers();
      const patched = monitoringV2Reducer(
        state,
        applyPatch({ id: 'worker-A', battery_level: 1 }),
      );
      const workerBUnchanged = patched.snapshot.workers.find(w => w.id === 'worker-B');
      expect(workerBUnchanged?.battery_level).toBe(50);
      expect(workerBUnchanged?.status).toBe('absent');
    });

    it('preserves array length when patching', () => {
      const state = stateWithWorkers();
      const patched = monitoringV2Reducer(
        state,
        applyPatch({ id: 'worker-B', latitude: -7.30 }),
      );
      expect(patched.snapshot.workers).toHaveLength(2);
    });

    it('does nothing when id is not found', () => {
      const state = stateWithWorkers();
      const patched = monitoringV2Reducer(
        state,
        applyPatch({ id: 'nonexistent', battery_level: 99 }),
      );
      expect(patched.snapshot.workers).toHaveLength(2);
      patched.snapshot.workers.forEach(w => {
        expect(w.battery_level).not.toBe(99);
      });
    });

    it('can update latitude and longitude in a patch', () => {
      const state = stateWithWorkers();
      const patched = monitoringV2Reducer(
        state,
        applyPatch({ id: 'worker-A', latitude: -7.30, longitude: 112.80 }),
      );
      const updated = patched.snapshot.workers.find(w => w.id === 'worker-A');
      expect(updated?.latitude).toBe(-7.30);
      expect(updated?.longitude).toBe(112.80);
    });
  });

  describe('toggleLayer', () => {
    it('flips workers layer from true to false', () => {
      const state = monitoringV2Reducer(undefined, toggleLayer('workers'));
      expect(state.visibleLayers.workers).toBe(false);
    });

    it('flips plants layer from false to true', () => {
      const state = monitoringV2Reducer(undefined, toggleLayer('plants'));
      expect(state.visibleLayers.plants).toBe(true);
    });

    it('flips overdue layer from false to true', () => {
      const state = monitoringV2Reducer(undefined, toggleLayer('overdue'));
      expect(state.visibleLayers.overdue).toBe(true);
    });

    it('flips districts layer from true to false', () => {
      const state = monitoringV2Reducer(undefined, toggleLayer('districts'));
      expect(state.visibleLayers.districts).toBe(false);
    });

    it('flips areas layer from true to false', () => {
      const state = monitoringV2Reducer(undefined, toggleLayer('areas'));
      expect(state.visibleLayers.areas).toBe(false);
    });

    it('double-toggle returns to original value', () => {
      let state = monitoringV2Reducer(undefined, toggleLayer('workers'));
      expect(state.visibleLayers.workers).toBe(false);
      state = monitoringV2Reducer(state, toggleLayer('workers'));
      expect(state.visibleLayers.workers).toBe(true);
    });

    it('toggling one layer does not affect others', () => {
      const state = monitoringV2Reducer(undefined, toggleLayer('workers'));
      expect(state.visibleLayers.plants).toBe(false);
      expect(state.visibleLayers.overdue).toBe(false);
      expect(state.visibleLayers.districts).toBe(true);
      expect(state.visibleLayers.areas).toBe(true);
    });
  });

  describe('setSelectedUser', () => {
    it('sets selectedUserId', () => {
      const state = monitoringV2Reducer(undefined, setSelectedUser('user-123'));
      expect(state.selectedUserId).toBe('user-123');
    });

    it('clears selectedUserId when null is passed', () => {
      let state = monitoringV2Reducer(undefined, setSelectedUser('user-123'));
      state = monitoringV2Reducer(state, setSelectedUser(null));
      expect(state.selectedUserId).toBeNull();
    });
  });

  describe('setSelectedArea', () => {
    it('sets selectedAreaId', () => {
      const state = monitoringV2Reducer(undefined, setSelectedArea('area-99'));
      expect(state.selectedAreaId).toBe('area-99');
    });

    it('clears selectedAreaId when null is passed', () => {
      let state = monitoringV2Reducer(undefined, setSelectedArea('area-99'));
      state = monitoringV2Reducer(state, setSelectedArea(null));
      expect(state.selectedAreaId).toBeNull();
    });
  });

  describe('setClusterZoomThreshold', () => {
    it('updates clusterZoomThreshold', () => {
      const state = monitoringV2Reducer(undefined, setClusterZoomThreshold(0.02));
      expect(state.clusterZoomThreshold).toBe(0.02);
    });
  });

  describe('fetchSnapshot thunk', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('sets loading true on pending', () => {
      const state = monitoringV2Reducer(
        undefined,
        fetchSnapshot.pending('req-1', { scope: 'city' }),
      );
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('sets loading false and updates snapshot on fulfilled', () => {
      const payload = {
        scope: 'city' as const,
        scope_id: null,
        workers: [workerA],
        generated_at: '2026-04-26T10:00:00Z',
      };
      const state = monitoringV2Reducer(
        undefined,
        fetchSnapshot.fulfilled(payload, 'req-1', { scope: 'city' }),
      );
      expect(state.loading).toBe(false);
      expect(state.snapshot.workers).toHaveLength(1);
      expect(state.snapshot.workers[0].id).toBe('worker-A');
      expect(state.snapshot.generated_at).toBe('2026-04-26T10:00:00Z');
    });

    it('sets loading false and error message on rejected', () => {
      const state = monitoringV2Reducer(
        undefined,
        fetchSnapshot.rejected(
          new Error('network'),
          'req-1',
          { scope: 'city' },
          'Gagal memuat snapshot monitoring',
        ),
      );
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Gagal memuat snapshot monitoring');
    });

    it('calls apiClient.get with correct URL for city scope', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            scope: 'city',
            scope_id: null,
            workers: [],
            generated_at: '2026-04-26T08:00:00Z',
          },
        },
      } as any);

      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = fetchSnapshot({ scope: 'city' });
      await thunk(dispatch, getState, undefined);

      expect(mockGet).toHaveBeenCalledWith('/monitoring/snapshot?scope=city');
    });

    it('appends id param when scope id is provided', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          data: {
            scope: 'district',
            scope_id: 'district-1',
            workers: [],
            generated_at: '2026-04-26T08:00:00Z',
          },
        },
      } as any);

      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = fetchSnapshot({ scope: 'district', id: 'district-1' });
      await thunk(dispatch, getState, undefined);

      expect(mockGet).toHaveBeenCalledWith(
        '/monitoring/snapshot?scope=district&id=district-1',
      );
    });
  });
});
