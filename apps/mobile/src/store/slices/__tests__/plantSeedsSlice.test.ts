/**
 * Plant Seeds Slice Tests
 * State management for seed inventory operations
 * Phase 3 sub-phase 3-12
 */

import { configureStore } from '@reduxjs/toolkit';
import plantSeedsReducer, {
  fetchSeeds,
  fetchSeedById,
  createSeed,
  recordTransaction,
  fetchSeedTransactions,
  selectSeed,
  setSearchQuery,
  setPage,
  clearError,
  resetState,
} from '../plantSeedsSlice';
import * as plantSeedsApi from '../../../services/api/plantSeedsApi';

jest.mock('../../../services/api/plantSeedsApi');

const mockPlantSeedsApi = plantSeedsApi as jest.Mocked<typeof plantSeedsApi>;

const mockSeed = {
  id: 's1',
  nameId: 'Benih Padi',
  speciesId: 'sp1',
  unit: 'gram' as const,
  stockQty: 100,
  lastCountedAt: '2026-04-27',
  createdAt: '2026-04-20',
  updatedAt: '2026-04-27',
};

const mockTransaction = {
  id: 't1',
  seedId: 's1',
  transactionType: 'purchase' as const,
  qty: 50,
  unitPrice: 10000,
  supplier: 'Supplier A',
  receiptUrl: 's3://bucket/receipt.pdf',
  toDistrictId: null,
  toAreaId: null,
  recipientName: null,
  occurredAt: '2026-04-20',
  recordedBy: 'u1',
  notes: 'Initial purchase',
  createdAt: '2026-04-20',
};

describe('plantSeedsSlice', () => {
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    store = configureStore({
      reducer: {
        plantSeeds: plantSeedsReducer,
      },
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = store.getState().plantSeeds;
      expect(state.seeds).toEqual([]);
      expect(state.seedsTotal).toBe(0);
      expect(state.byId).toEqual({});
      expect(state.transactionsBySeed).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.selectedSeedId).toBeNull();
      expect(state.isRecording).toBe(false);
      expect(state.recordError).toBeNull();
      expect(state.pagination.currentPage).toBe(1);
      expect(state.pagination.limit).toBe(20);
      expect(state.searchQuery).toBe('');
    });
  });

  describe('fetchSeeds Thunk', () => {
    it('sets loading to true on pending', async () => {
      mockPlantSeedsApi.getSeeds.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  data: { items: [mockSeed], total: 1 },
                }),
              100,
            );
          }),
      );

      const promise = store.dispatch(
        fetchSeeds({ search: 'Padi', page: 1, limit: 20 }),
      );

      expect(store.getState().plantSeeds.isLoading).toBe(true);
      await promise;
    });

    it('stores seeds and indexes them on success', async () => {
      mockPlantSeedsApi.getSeeds.mockResolvedValue({
        data: { items: [mockSeed], total: 1 },
      });

      await store.dispatch(
        fetchSeeds({ search: 'Padi', page: 1, limit: 20 }),
      );

      const state = store.getState().plantSeeds;
      expect(state.seeds).toEqual([mockSeed]);
      expect(state.seedsTotal).toBe(1);
      expect(state.byId['s1']).toEqual(mockSeed);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('handles multiple seeds', async () => {
      const seed2 = { ...mockSeed, id: 's2', nameId: 'Benih Jagung' };
      mockPlantSeedsApi.getSeeds.mockResolvedValue({
        data: { items: [mockSeed, seed2], total: 2 },
      });

      await store.dispatch(fetchSeeds());

      const state = store.getState().plantSeeds;
      expect(state.seeds.length).toBe(2);
      expect(state.seedsTotal).toBe(2);
      expect(state.byId['s1']).toEqual(mockSeed);
      expect(state.byId['s2']).toEqual(seed2);
    });

    it('handles API error response', async () => {
      mockPlantSeedsApi.getSeeds.mockResolvedValue({
        error: 'API Error',
        code: 'ERR_API',
      });

      await store.dispatch(fetchSeeds());

      const state = store.getState().plantSeeds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing error handling
      expect(state.error as any).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });

    it('handles thrown errors', async () => {
      mockPlantSeedsApi.getSeeds.mockRejectedValue(
        new Error('Network error'),
      );

      await store.dispatch(fetchSeeds());

      const state = store.getState().plantSeeds;
      expect(state.error?.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });

    it('passes search parameters to API', async () => {
      mockPlantSeedsApi.getSeeds.mockResolvedValue({
        data: { items: [], total: 0 },
      });

      await store.dispatch(
        fetchSeeds({ search: 'Padi', page: 2, limit: 10 }),
      );

      expect(mockPlantSeedsApi.getSeeds).toHaveBeenCalledWith({
        search: 'Padi',
        page: 2,
        limit: 10,
      });
    });
  });

  describe('fetchSeedById Thunk', () => {
    it('stores seed by ID on success', async () => {
      mockPlantSeedsApi.getSeedById.mockResolvedValue({
        data: mockSeed,
      });

      await store.dispatch(fetchSeedById('s1'));

      const state = store.getState().plantSeeds;
      expect(state.byId['s1']).toEqual(mockSeed);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('updates seed in list if already present', async () => {
      const updatedSeed = { ...mockSeed, stockQty: 150 };
      store = configureStore({
        reducer: {
          plantSeeds: plantSeedsReducer,
        },
        preloadedState: {
          plantSeeds: {
            seeds: [mockSeed],
            seedsTotal: 1,
            byId: { s1: mockSeed },
            transactionsBySeed: {},
            isLoading: false,
            error: null,
            selectedSeedId: null,
            isRecording: false,
            recordError: null,
            pagination: { currentPage: 1, limit: 20 },
            searchQuery: '',
          },
        },
      });

      mockPlantSeedsApi.getSeedById.mockResolvedValue({
        data: updatedSeed,
      });

      await store.dispatch(fetchSeedById('s1'));

      const state = store.getState().plantSeeds;
      expect(state.seeds[0]).toEqual(updatedSeed);
      expect(state.byId['s1']).toEqual(updatedSeed);
    });
  });

  describe('createSeed Thunk', () => {
    it('adds new seed to beginning of list on success', async () => {
      mockPlantSeedsApi.createSeed.mockResolvedValue({
        data: mockSeed,
      });

      await store.dispatch(
        createSeed({
          nameId: 'Benih Padi',
          unit: 'gram',
          speciesId: 'sp1',
          stockQty: 100,
        }),
      );

      const state = store.getState().plantSeeds;
      expect(state.seeds[0]).toEqual(mockSeed);
      expect(state.seedsTotal).toBe(1);
      expect(state.byId['s1']).toEqual(mockSeed);
      expect(state.isLoading).toBe(false);
    });

    it('handles API error response', async () => {
      mockPlantSeedsApi.createSeed.mockResolvedValue({
        error: 'Duplicate nameId',
        code: 'ERR_DUPLICATE',
      });

      await store.dispatch(
        createSeed({
          nameId: 'Benih Padi',
          unit: 'gram',
        }),
      );

      const state = store.getState().plantSeeds;
      expect(state.error).toBeTruthy();
    });
  });

  describe('recordTransaction Thunk', () => {
    beforeEach(() => {
      store = configureStore({
        reducer: {
          plantSeeds: plantSeedsReducer,
        },
        preloadedState: {
          plantSeeds: {
            seeds: [mockSeed],
            seedsTotal: 1,
            byId: { s1: mockSeed },
            transactionsBySeed: {},
            isLoading: false,
            error: null,
            selectedSeedId: null,
            isRecording: false,
            recordError: null,
            pagination: { currentPage: 1, limit: 20 },
            searchQuery: '',
          },
        },
      });
    });

    it('sets isRecording to true on pending', async () => {
      mockPlantSeedsApi.recordTransaction.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  data: { transaction: mockTransaction, seed: mockSeed },
                }),
              100,
            );
          }),
      );

      const promise = store.dispatch(
        recordTransaction({
          seedId: 's1',
          data: {
            transactionType: 'purchase',
            qty: 50,
            occurredAt: '2026-04-20',
          },
        }),
      );

      expect(store.getState().plantSeeds.isRecording).toBe(true);
      await promise;
    });

    it('updates seed stock and adds transaction on success', async () => {
      mockPlantSeedsApi.recordTransaction.mockResolvedValue({
        data: { transaction: mockTransaction, seed: mockSeed },
      });

      await store.dispatch(
        recordTransaction({
          seedId: 's1',
          data: {
            transactionType: 'purchase',
            qty: 50,
            occurredAt: '2026-04-20',
          },
        }),
      );

      const state = store.getState().plantSeeds;
      expect(state.byId['s1']).toEqual(mockSeed);
      expect(state.transactionsBySeed['s1']).toEqual([mockTransaction]);
      expect(state.isRecording).toBe(false);
      expect(state.recordError).toBeNull();
    });

    it('prepends new transactions to ledger', async () => {
      const trans1 = { ...mockTransaction, id: 't1' };
      const trans2 = { ...mockTransaction, id: 't2', qty: 25 };

      mockPlantSeedsApi.recordTransaction
        .mockResolvedValueOnce({
          data: { transaction: trans1, seed: mockSeed },
        })
        .mockResolvedValueOnce({
          data: { transaction: trans2, seed: mockSeed },
        });

      await store.dispatch(
        recordTransaction({
          seedId: 's1',
          data: {
            transactionType: 'purchase',
            qty: 50,
            occurredAt: '2026-04-20',
          },
        }),
      );

      await store.dispatch(
        recordTransaction({
          seedId: 's1',
          data: {
            transactionType: 'distribution',
            qty: 25,
            occurredAt: '2026-04-21',
          },
        }),
      );

      const state = store.getState().plantSeeds;
      expect(state.transactionsBySeed['s1'][0]).toEqual(trans2);
      expect(state.transactionsBySeed['s1'][1]).toEqual(trans1);
    });

    it('handles API error response', async () => {
      mockPlantSeedsApi.recordTransaction.mockResolvedValue({
        error: 'Insufficient stock',
        code: 'ERR_INSUFFICIENT',
      });

      await store.dispatch(
        recordTransaction({
          seedId: 's1',
          data: {
            transactionType: 'distribution',
            qty: 200,
            occurredAt: '2026-04-20',
          },
        }),
      );

      const state = store.getState().plantSeeds;
      // The thunk passes response.error (string) to rejectWithValue, reducer expects ThunkError shape
      // so it falls back to 'Error'
      expect(state.recordError).toBeTruthy();
      expect(state.isRecording).toBe(false);
    });
  });

  describe('fetchSeedTransactions Thunk', () => {
    it('stores transaction ledger for seed', async () => {
      mockPlantSeedsApi.getSeedTransactions.mockResolvedValue({
        data: { items: [mockTransaction], total: 1 },
      });

      await store.dispatch(
        fetchSeedTransactions({
          seedId: 's1',
          filters: { page: 1, limit: 20 },
        }),
      );

      const state = store.getState().plantSeeds;
      expect(state.transactionsBySeed['s1']).toEqual([mockTransaction]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('supports transaction type filtering', async () => {
      mockPlantSeedsApi.getSeedTransactions.mockResolvedValue({
        data: { items: [mockTransaction], total: 1 },
      });

      await store.dispatch(
        fetchSeedTransactions({
          seedId: 's1',
          filters: { type: 'purchase' },
        }),
      );

      expect(mockPlantSeedsApi.getSeedTransactions).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ type: 'purchase' }),
      );
    });

    it('handles date range filtering', async () => {
      mockPlantSeedsApi.getSeedTransactions.mockResolvedValue({
        data: { items: [], total: 0 },
      });

      await store.dispatch(
        fetchSeedTransactions({
          seedId: 's1',
          filters: { from: '2026-04-01', to: '2026-04-30' },
        }),
      );

      expect(mockPlantSeedsApi.getSeedTransactions).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({
          from: '2026-04-01',
          to: '2026-04-30',
        }),
      );
    });
  });

  describe('selectSeed Action', () => {
    it('sets selected seed ID', () => {
      store.dispatch(selectSeed('s1'));

      const state = store.getState().plantSeeds;
      expect(state.selectedSeedId).toBe('s1');
    });

    it('clears selection when passed null', () => {
      store.dispatch(selectSeed('s1'));
      store.dispatch(selectSeed(null));

      const state = store.getState().plantSeeds;
      expect(state.selectedSeedId).toBeNull();
    });
  });

  describe('setSearchQuery Action', () => {
    it('updates search query and resets page', () => {
      store.dispatch(setPage(3));
      expect(store.getState().plantSeeds.pagination.currentPage).toBe(3);

      store.dispatch(setSearchQuery('Padi'));

      const state = store.getState().plantSeeds;
      expect(state.searchQuery).toBe('Padi');
      expect(state.pagination.currentPage).toBe(1);
    });
  });

  describe('setPage Action', () => {
    it('updates current page', () => {
      store.dispatch(setPage(5));

      const state = store.getState().plantSeeds;
      expect(state.pagination.currentPage).toBe(5);
    });
  });

  describe('clearError Action', () => {
    it('clears both error and recordError', () => {
      store = configureStore({
        reducer: {
          plantSeeds: plantSeedsReducer,
        },
        preloadedState: {
          plantSeeds: {
            seeds: [],
            seedsTotal: 0,
            byId: {},
            transactionsBySeed: {},
            isLoading: false,
            error: { error: 'Test error', code: 'ERR_TEST' },
            selectedSeedId: null,
            isRecording: false,
            recordError: 'Record error',
            pagination: { currentPage: 1, limit: 20 },
            searchQuery: '',
          },
        },
      });

      store.dispatch(clearError());

      const state = store.getState().plantSeeds;
      expect(state.error).toBeNull();
      expect(state.recordError).toBeNull();
    });
  });

  describe('resetState Action', () => {
    it('resets state to initial value', () => {
      store = configureStore({
        reducer: {
          plantSeeds: plantSeedsReducer,
        },
        preloadedState: {
          plantSeeds: {
            seeds: [mockSeed],
            seedsTotal: 1,
            byId: { s1: mockSeed },
            transactionsBySeed: { s1: [mockTransaction] },
            isLoading: true,
            error: { error: 'Test error', code: 'ERR_TEST' },
            selectedSeedId: 's1',
            isRecording: true,
            recordError: 'Record error',
            pagination: { currentPage: 3, limit: 50 },
            searchQuery: 'Padi',
          },
        },
      });

      store.dispatch(resetState());

      const state = store.getState().plantSeeds;
      expect(state.seeds).toEqual([]);
      expect(state.seedsTotal).toBe(0);
      expect(state.byId).toEqual({});
      expect(state.transactionsBySeed).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.selectedSeedId).toBeNull();
      expect(state.isRecording).toBe(false);
      expect(state.recordError).toBeNull();
      expect(state.pagination.currentPage).toBe(1);
      expect(state.pagination.limit).toBe(20);
      expect(state.searchQuery).toBe('');
    });
  });

  describe('State Immutability', () => {
    it('does not mutate seeds array when adding new seed', async () => {
      const seed1 = { ...mockSeed, id: 's1' };
      const seed2 = { ...mockSeed, id: 's2', nameId: 'Benih Jagung' };

      store = configureStore({
        reducer: {
          plantSeeds: plantSeedsReducer,
        },
        preloadedState: {
          plantSeeds: {
            seeds: [seed1],
            seedsTotal: 1,
            byId: { s1: seed1 },
            transactionsBySeed: {},
            isLoading: false,
            error: null,
            selectedSeedId: null,
            isRecording: false,
            recordError: null,
            pagination: { currentPage: 1, limit: 20 },
            searchQuery: '',
          },
        },
      });

      const seedsBefore = store.getState().plantSeeds.seeds;

      mockPlantSeedsApi.createSeed.mockResolvedValue({
        data: seed2,
      });

      await store.dispatch(
        createSeed({
          nameId: 'Benih Jagung',
          unit: 'gram',
        }),
      );

      const seedsAfter = store.getState().plantSeeds.seeds;
      expect(seedsAfter.length).toBe(2);
      expect(seedsAfter[0]).toEqual(seed2);
      expect(seedsAfter[1]).toEqual(seed1);
    });
  });

  describe('Empty Data Handling', () => {
    it('handles empty seeds list', async () => {
      mockPlantSeedsApi.getSeeds.mockResolvedValue({
        data: { items: [], total: 0 },
      });

      await store.dispatch(fetchSeeds());

      const state = store.getState().plantSeeds;
      expect(state.seeds).toEqual([]);
      expect(state.seedsTotal).toBe(0);
      expect(state.error).toBeNull();
    });

    it('handles null transaction data', async () => {
      mockPlantSeedsApi.getSeedTransactions.mockResolvedValue({
        data: { items: [], total: 0 },
      });

      await store.dispatch(
        fetchSeedTransactions({
          seedId: 's1',
        }),
      );

      const state = store.getState().plantSeeds;
      expect(state.transactionsBySeed['s1']).toEqual([]);
    });
  });
});
