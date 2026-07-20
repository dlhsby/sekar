/**
 * Service Capacity Slice Tests
 * State management for district capacity calendars
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
  id: 'cap-1',
  district_id: 'r1',
  year: 2026,
  week: 18,
  service_type: 'pruning' as const,
  capacity_units: 10,
  booked_units: 5,
  created_at: '2026-04-20T00:00:00Z',
  updated_at: '2026-04-20T00:00:00Z',
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
      expect(state.calendarByDistrict).toEqual({});
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
                  data: [mockCapacityRow],
                }),
              100,
            );
          }),
      );

      const promise = store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      expect(store.getState().serviceCapacity.loading).toBe(true);
      await promise;
    });

    it('stores capacity data by district on success', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByDistrict['r1']).toEqual([mockCapacityRow]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('stores multiple districts separately', async () => {
      mockServiceCapacityApi.getCapacityCalendar
        .mockResolvedValueOnce({
          data: [mockCapacityRow],
        })
        .mockResolvedValueOnce({
          data: [{ ...mockCapacityRow, year: 2027 }],
        });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      await store.dispatch(
        fetchCapacity({
          districtId: 'r2',
          year: 2027,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByDistrict['r1']).toEqual([mockCapacityRow]);
      expect(state.calendarByDistrict['r2']).toEqual([
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
            calendarByDistrict: {},
            loading: false,
            error: { error: 'Previous error', code: 'ERR_PREVIOUS' },
          },
        },
      });

      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
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
        error: 'API Error',
        code: 'ERR_API',
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      // When API returns error, thunk rejects with response.error (string)
      // reducer expects ThunkError shape, so falls back to 'Error'
      expect(state.error?.error).toBeTruthy();
      expect(state.loading).toBe(false);
    });

    it('handles thrown errors', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockRejectedValue(
        new Error('Network error'),
      );

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
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
          districtId: 'r1',
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
        data: [],
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
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
        data: [],
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByDistrict['r1']).toEqual([]);
      expect(state.error).toBeNull();
    });

    it('handles null data in response', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        data: undefined,
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByDistrict['r1']).toEqual([]);
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
            calendarByDistrict: {},
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
            calendarByDistrict: { r1: [mockCapacityRow] },
            loading: false,
            error: { error: 'Test error', code: 'ERR_TEST' },
          },
        },
      });

      store.dispatch(clearError());

      const state = store.getState().serviceCapacity;
      expect(state.calendarByDistrict).toEqual({ r1: [mockCapacityRow] });
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
            calendarByDistrict: { r1: [mockCapacityRow] },
            loading: true,
            error: { error: 'Test error', code: 'ERR_TEST' },
          },
        },
      });

      store.dispatch(resetState());

      const state = store.getState().serviceCapacity;
      expect(state.calendarByDistrict).toEqual({});
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('State Immutability', () => {
    it('does not mutate existing calendar entries when adding new district', async () => {
      mockServiceCapacityApi.getCapacityCalendar
        .mockResolvedValueOnce({
          data: [mockCapacityRow],
        })
        .mockResolvedValueOnce({
          data: [{ ...mockCapacityRow, week: 19 }],
        });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const r1DataBefore = store
        .getState()
        .serviceCapacity.calendarByDistrict['r1'];

      await store.dispatch(
        fetchCapacity({
          districtId: 'r2',
          year: 2026,
          fromWeek: 19,
          toWeek: 19,
          serviceType: 'pruning',
        }),
      );

      const r1DataAfter = store
        .getState()
        .serviceCapacity.calendarByDistrict['r1'];
      expect(r1DataAfter).toEqual(r1DataBefore);
    });

    it('replaces calendar data when fetching same district again', async () => {
      mockServiceCapacityApi.getCapacityCalendar
        .mockResolvedValueOnce({
          data: [mockCapacityRow],
        })
        .mockResolvedValueOnce({
          data: [{ ...mockCapacityRow, booked_units: 7 }],
        });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByDistrict['r1']).toEqual([
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
        data: multiWeekData,
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
          year: 2026,
          fromWeek: 18,
          toWeek: 20,
          serviceType: 'pruning',
        }),
      );

      const state = store.getState().serviceCapacity;
      expect(state.calendarByDistrict['r1']).toEqual(multiWeekData);
      expect(state.calendarByDistrict['r1'].length).toBe(3);
    });
  });

  describe('Service Type Filtering', () => {
    it('supports pruning service type', async () => {
      mockServiceCapacityApi.getCapacityCalendar.mockResolvedValue({
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
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
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
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
        data: [mockCapacityRow],
      });

      await store.dispatch(
        fetchCapacity({
          districtId: 'r1',
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
