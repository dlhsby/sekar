/**
 * MonitoringV2 Slice
 * Phase 3 sub-phase 3-5: Snapshot-based monitoring state with layer toggles,
 * cluster zoom threshold, selected user/area, and incremental WS patch support.
 *
 * Key design choices:
 * - `applyPatch` uses Immer's draft mutation (enabled by RTK's createSlice) to
 *   update a single worker in-place without rebuilding the full array.
 * - `fetchSnapshot` hits GET /monitoring/snapshot and stores the full response.
 * - `toggleLayer` flips a single boolean in `visibleLayers`.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { LiveUser, AggregateNode, MonitoringAggregateResponse } from '../../types/models.types';
import { getMonitoringAggregate } from '../../services/api/monitoringApi';
import apiClient from '../../services/api/apiClient';
import i18n from '../../i18n/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonitoringV2Snapshot {
  scope: 'city' | 'rayon' | 'location';
  scope_id: string | null;
  workers: LiveUser[];
  generated_at: string | null;
}

export interface MonitoringV2VisibleLayers {
  workers: boolean;
  plants: boolean;
  overdue: boolean;
  rayons: boolean;
  areas: boolean;
}

export type MonitoringScope = 'surabaya' | 'city' | 'rayon' | 'location';

/** Current drill position on the map (Surabaya → rayon → location). */
export interface MonitoringView {
  scope: MonitoringScope;
  id: string | null;
  rayonId: string | null;
  name: string | null;
}

export interface MonitoringV2State {
  snapshot: MonitoringV2Snapshot;
  visibleLayers: MonitoringV2VisibleLayers;
  selectedUserId: string | null;
  selectedAreaId: string | null;
  clusterZoomThreshold: number;
  loading: boolean;
  error: string | null;
  // Unified drill-down state (Surabaya → rayon → area → workers).
  view: MonitoringView;
  /** The scope the user's role can never drill above. */
  floor: MonitoringScope;
  aggregate: MonitoringAggregateResponse | null;
  aggregateLoading: boolean;
}

export interface FetchSnapshotParams {
  scope: 'city' | 'rayon' | 'location';
  id?: string;
}

export interface FetchAggregateParams {
  scope: 'city' | 'rayon';
  id?: string;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: MonitoringV2State = {
  snapshot: {
    scope: 'city',
    scope_id: null,
    workers: [],
    generated_at: null,
  },
  visibleLayers: {
    workers: true,
    plants: false,
    overdue: false,
    rayons: true,
    areas: true,
  },
  selectedUserId: null,
  selectedAreaId: null,
  /** lat-delta threshold below which individual markers are shown instead of clusters */
  clusterZoomThreshold: 0.05,
  loading: false,
  error: null,
  view: { scope: 'surabaya', id: null, rayonId: null, name: null },
  floor: 'surabaya',
  aggregate: null,
  aggregateLoading: false,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * Fetch a fresh monitoring snapshot from the server.
 * Endpoint: GET /monitoring/snapshot?scope=city|rayon|location[&id=<uuid>]
 */
export const fetchSnapshot = createAsyncThunk(
  'monitoringV2/fetchSnapshot',
  async (params: FetchSnapshotParams, { rejectWithValue }) => {
    try {
      const query = params.id
        ? `?scope=${params.scope}&id=${params.id}`
        : `?scope=${params.scope}`;
      const response = await apiClient.get<{
        data?: {
          scope: 'city' | 'rayon' | 'location';
          scope_id: string | null;
          workers: LiveUser[];
          generated_at: string;
        };
        error?: string;
      }>(`/monitoring/snapshot${query}`);

      if (response.data?.error) {
        return rejectWithValue(response.data.error);
      }

      const payload = response.data?.data;
      if (!payload) {
        return rejectWithValue(i18n.t('monitoring:screen.error.emptySnapshot'));
      }

      return payload;
    } catch {
      return rejectWithValue(i18n.t('monitoring:screen.error.failedSnapshot'));
    }
  },
);

/**
 * Fetch the aggregate ("Ringkasan") rollup for the current scope.
 * Endpoint: GET /monitoring/aggregate?scope=city|rayon[&id=<uuid>]
 */
export const fetchAggregate = createAsyncThunk(
  'monitoringV2/fetchAggregate',
  async (params: FetchAggregateParams, { rejectWithValue }) => {
    try {
      const res = await getMonitoringAggregate(params.scope, params.id);
      if (res.error || !res.data) {
        return rejectWithValue(res.error ?? i18n.t('monitoring:screen.error.failedSnapshot'));
      }
      return res.data;
    } catch {
      return rejectWithValue(i18n.t('monitoring:screen.error.failedSnapshot'));
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const monitoringV2Slice = createSlice({
  name: 'monitoringV2',
  initialState,
  reducers: {
    /**
     * Replace the entire snapshot (e.g., after a full refresh or scope change).
     */
    setSnapshot(state, action: PayloadAction<MonitoringV2Snapshot>) {
      state.snapshot = action.payload;
      state.error = null;
    },

    /**
     * Apply a partial update to a single worker identified by `id`.
     * Uses Immer draft mutation — no array rebuild needed.
     * Designed for high-frequency WebSocket patches.
     */
    applyPatch(
      state,
      action: PayloadAction<Partial<LiveUser> & { id: string }>,
    ) {
      const index = state.snapshot.workers.findIndex(
        w => w.id === action.payload.id,
      );
      if (index !== -1) {
        // Immer allows direct mutation inside createSlice reducers
        Object.assign(state.snapshot.workers[index], action.payload);
      }
    },

    /**
     * Toggle a single layer's visibility in the map toggle sheet.
     */
    toggleLayer(
      state,
      action: PayloadAction<keyof MonitoringV2VisibleLayers>,
    ) {
      state.visibleLayers[action.payload] = !state.visibleLayers[action.payload];
    },

    /**
     * Set the currently selected user (opens detail panel).
     * Pass null to clear the selection.
     */
    setSelectedUser(state, action: PayloadAction<string | null>) {
      state.selectedUserId = action.payload;
    },

    /**
     * Set the currently selected area (opens area detail).
     * Pass null to clear the selection.
     */
    setSelectedArea(state, action: PayloadAction<string | null>) {
      state.selectedAreaId = action.payload;
    },

    /**
     * Override the lat-delta threshold used to decide between cluster markers
     * and individual UserMarker components.
     */
    setClusterZoomThreshold(state, action: PayloadAction<number>) {
      state.clusterZoomThreshold = action.payload;
    },

    /**
     * Initialise the drill view + floor from the viewer's role.
     * korlap → area; kepala_rayon/admin_rayon → rayon; city roles → surabaya.
     */
    initMonitoringView(
      state,
      action: PayloadAction<{ view: MonitoringView; floor: MonitoringScope }>,
    ) {
      state.view = action.payload.view;
      state.floor = action.payload.floor;
      state.selectedUserId = null;
    },

    /** Surabaya → the rayon list (city scope). */
    enterCity(state) {
      state.view = { scope: 'city', id: null, rayonId: null, name: null };
      state.selectedUserId = null;
    },

    /** Drill one level deeper from a tapped rayon/location node. */
    drillTo(
      state,
      action: PayloadAction<{ id: string; type: 'rayon' | 'location'; name: string; rayonId: string | null }>,
    ) {
      const n = action.payload;
      if (n.type === 'rayon') {
        state.view = { scope: 'rayon', id: n.id, rayonId: n.id, name: n.name };
      } else {
        state.view = {
          scope: 'location',
          id: n.id,
          rayonId: n.rayonId ?? state.view.rayonId,
          name: n.name,
        };
      }
      state.selectedUserId = null;
    },

    /** Drill back up one level, never above the role floor. */
    drillBack(state) {
      if (state.view.scope === state.floor) return;
      if (state.view.scope === 'location') {
        state.view = {
          scope: 'rayon',
          id: state.view.rayonId,
          rayonId: state.view.rayonId,
          name: null,
        };
      } else if (state.view.scope === 'rayon') {
        state.view = { scope: 'city', id: null, rayonId: null, name: null };
      } else if (state.view.scope === 'city') {
        state.view = { scope: 'surabaya', id: null, rayonId: null, name: null };
      }
      state.selectedUserId = null;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchAggregate.pending, state => {
      state.aggregateLoading = true;
    });
    builder.addCase(fetchAggregate.fulfilled, (state, action) => {
      state.aggregateLoading = false;
      state.aggregate = action.payload;
    });
    builder.addCase(fetchAggregate.rejected, state => {
      state.aggregateLoading = false;
    });
    builder.addCase(fetchSnapshot.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchSnapshot.fulfilled, (state, action) => {
      state.loading = false;
      state.snapshot = {
        scope: action.payload.scope,
        scope_id: action.payload.scope_id,
        workers: action.payload.workers,
        generated_at: action.payload.generated_at,
      };
    });
    builder.addCase(fetchSnapshot.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string ?? i18n.t('common:ui.errorOccurred');
    });
  },
});

export const {
  setSnapshot,
  applyPatch,
  toggleLayer,
  setSelectedUser,
  setSelectedArea,
  setClusterZoomThreshold,
  initMonitoringView,
  enterCity,
  drillTo,
  drillBack,
} = monitoringV2Slice.actions;

// Re-export for consumers that render aggregate bubbles.
export type { AggregateNode };

export default monitoringV2Slice.reducer;
