/**
 * Service Capacity Slice Tests
 * State management for rayon capacity calendars
 * Phase 3 sub-phase 3-10
 */

import { configureStore } from '@reduxjs/toolkit';
import serviceCapacityReducer, {
  fetchCapacity,
  clearError,
  resetState,
} from '../serviceCapacitySlice';
import * as serviceCapacityApi from '../../../services/api/serviceCapacityApi';

jest.mock('../../../services/api/serviceCapacityApi');

const mockServiceCapacityApi = serviceCapacityApi as jest.Mocked<typeof serviceCapacityApi>;

const mockCapacityRow = {
  year: 2026,
  week: 18,
  capacity_units: 10,
  booked_units: 5,
};

describe('serviceCapacitySlice', () => {
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    store = configureStore({
      reducer: {
        serviceCapacity: serviceCapacityReducer,
      },
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = store.getState().serviceCapacity;
      expect(state.calendarByRayon).toEqual({});
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchCapacity Thunk', () => {
    it('sets loading to true on pending', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: [mockCapacityRow],
                }),
              100,
            );
          }),
      );

      const promise = store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      expect(store.getState().serviceCapacity.loading).toBe(true);
      await promise;
    });

    it('stores capacity data by rayon on success', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        success: true,
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByRayon['r1']).toEqual([mockCapacityRow]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('stores multiple rayons separately', async () => {
      mockServiceCapacityApi.getCapacityCalendar
        .mockResolvedValueOnce({
          success: true,
          data: [mockCapacityRow],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ ...mockCapacityRow, year: 2027 }],
        });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r2',
          year: 2027,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByRayon['r1']).toEqual([mockCapacityRow]);
      expect(state.calendarByRayon['r2']).toEqual([
        { ...mockCapacityRow, year: 2027 },
      ]);
    });

    it('clears error on success', async () => {
      // First set an error state
      store = configureStore({
        reducer: {
          serviceCapacity: serviceCapacityReducer,
        },
        preloadedState: {
          serviceCapacity: {
            calendarByRayon: {},
            loading: false,
            error: { error: 'Previous error', code: 'ERR_PREVIOUS' },
          },
        },
      });

      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        success: true,
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.error).toBeNull();
    });

    it('handles API error response', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        error: { error: 'API Error', code: 'ERR_API' },
        data: null,
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.error).toEqual({ error: 'API Error', code: 'ERR_API' });
      expect(state.loading).toBe(false);
    });

    it('handles thrown errors', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockRejectedValue(
        new Error('Network error'),
      );

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.error?.error).toBe('Network error');
      expect(state.loading).toBe(false);
    });

    it('includes error code in state when available', async () => {
      const customError = new Error('Custom error') as any;
      customError.code = 'ERR_CUSTOM';
      mockServiceCapacityApi.getCapacityCalendar.mockRejectedValue(customError);

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.error?.code).toBe('ERR_CUSTOM');
    });

    it('calls API with correct parameters', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        success: true,
        data: [],
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 20,
          serviceType: 'pruning',
        }),
      );

      expect(mockServiceCapacityApi.getCapacityCalendar).toHaveBeenCalledWith(
        'r1',
        {
          year: 2026,
          fromWeek: 18,
          toWeek: 20,
          serviceType: 'pruning',
        },
      );
    });

    it('handles empty response data', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        success: true,
        data: [],
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByRayon['r1']).toEqual([]);
      expect(state.error).toBeNull();
    });

    it('handles null data in response', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        success: true,
        data: null,
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByRayon['r1']).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  describe('clearError Action', () => {
    it('clears error state', async () => {
      store = configureStore({
        reducer: {
          serviceCapacity: serviceCapacityReducer,
        },
        preloadedState: {
          serviceCapacity: {
            calendarByRayon: {},
            loading: false,
            error: { error: 'Test error', code: 'ERR_TEST' },
          },
        },
      });

      store.dispatch(clearError());

      const state = store.getState().serviceCapacity;
      expect(state.error).toBeNull();
    });

    it('preserves other state when clearing error', async () => {
      store = configureStore({
        reducer: {
          serviceCapacity: serviceCapacityReducer,
        },
        preloadedState: {
          serviceCapacity: {
            calendarByRayon: { r1: [mockCapacityRow] },
            loading: false,
            error: { error: 'Test error', code: 'ERR_TEST' },
          },
        },
      });

      store.dispatch(clearError());

      const state = store.getState().serviceCapacity;
      expect(state.calendarByRayon).toEqual({ r1: [mockCapacityRow] });
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('resetState Action', () => {
    it('resets state to initial value', async () => {
      store = configureStore({
        reducer: {
          serviceCapacity: serviceCapacityReducer,
        },
        preloadedState: {
          serviceCapacity: {
            calendarByRayon: { r1: [mockCapacityRow] },
            loading: true,
            error: { error: 'Test error', code: 'ERR_TEST' },
          },
        },
      });

      store.dispatch(resetState());

      const state = store.getState().serviceCapacity;
      expect(state.calendarByRayon).toEqual({});
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('State Immutability', () => {
    it('does not mutate existing calendar entries when adding new rayon', async () => {
      mockServiceCapacityApi.getCapacityCalendar
        .mockResolvedValueOnce({
          success: true,
          data: [mockCapacityRow],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ ...mockCapacityRow, week: 19 }],
        });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const r1DataBefore = store
        .getState()
        .serviceCapacity.calendarByRayon['r1'];

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r2',
          year: 2026,
          fromWeek: 19,
          toWeek: 19,
          serviceType: 'pruning',
        }),
      );

      const r1DataAfter = store
        .getState()
        .serviceCapacity.calendarByRayon['r1'];
      expect(r1DataAfter).toEqual(r1DataBefore);
    });

    it('replaces calendar data when fetching same rayon again', async () => {
      mockServiceCapacityApi.getCapacityCalendar
        .mockResolvedValueOnce({
          success: true,
          data: [mockCapacityRow],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ ...mockCapacityRow, booked_units: 7 }],
        });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByRayon['r1']).toEqual([
        { ...mockCapacityRow, booked_units: 7 },
      ]);
    });
  });

  describe('Multiple Weeks', () => {
    it('stores multiple weeks in single fetch', async () => {
      const multiWeekData = [
        mockCapacityRow,
        { ...mockCapacityRow, week: 19 },
        { ...mockCapacityRow, week: 20 },
      ];

      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        success: true,
        data: multiWeekData,
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 20,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByRayon['r1']).toEqual(multiWeekData);
      expect(state.calendarByRayon['r1'].length).toBe(3);
    });
  });

  describe('Service Type Filtering', () => {
    it('supports pruning service type', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        success: true,
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      expect(
        mockServiceCapacityApi.getCapacityCalendar,
      ).toHaveBeenCalledWith('r1', expect.objectContaining({ serviceType: 'pruning' }));
    });

    it('supports other service type', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        success: true,
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'other',
        }),
      );

      expect(
        mockServiceCapacityApi.getCapacityCalendar,
      ).toHaveBeenCalledWith('r1', expect.objectContaining({ serviceType: 'other' }));
    });

    it('works without service type parameter', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        success: true,
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          rayonId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
        }),
      );

      expect(
        mockServiceCapacityApi.getCapacityCalendar,
      ).toHaveBeenCalledWith('r1', expect.objectContaining({ serviceType: undefined }));
    });
  });
});
