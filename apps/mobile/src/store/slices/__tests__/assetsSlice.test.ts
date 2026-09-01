/**
 * Assets Slice Tests
 * Test reducer, async thunks, and selectors
 */

import assetsReducer, {
  setSelectedAsset,
  clearError,
  resetState,
  fetchAssets,
  fetchCategories,
  fetchAsset,
  scanAsset,
  fetchMyAssets,
  checkoutAsset,
  returnAsset,
  selectAssets,
  selectMyAssets,
  selectCategories,
  selectSelectedAsset,
  selectAssetsLoading,
  selectAssetsSubmitting,
  selectAssetsError,
} from '../assetsSlice';
import type { Asset, AssetCategory, AssetAssignment } from '../../../types/assets.types';
import type { RootState } from '../../store';

describe('assetsSlice', () => {
  // Mock data
  const mockCategory: AssetCategory = {
    id: 'cat-1',
    name: 'Peralatan Taman',
    slug: 'peralatan-taman',
    code_prefix: 'PT',
    description: 'Peralatan untuk taman',
    sort_order: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const mockAsset: Asset = {
    id: 'asset-1',
    category_id: 'cat-1',
    category: mockCategory,
    location_id: 'area-1',
    name: 'Sapu Lidi',
    asset_code: 'PT-RU-001',
    status: 'available',
    condition: 'good',
    qr_code_url: 'https://example.com/qr.png',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const mockAssignment: AssetAssignment = {
    id: 'assign-1',
    asset_id: 'asset-1',
    asset: mockAsset,
    assigned_to: 'user-1',
    assigned_by: 'user-2',
    checked_out_at: '2026-01-01T10:00:00Z',
    condition_at_checkout: 'good',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  describe('reducers', () => {
    it('should handle setSelectedAsset', () => {
      const state = assetsReducer(undefined, setSelectedAsset(mockAsset));
      expect(state.selectedAsset).toEqual(mockAsset);
    });

    it('should handle clearError', () => {
      const initialState = {
        assets: [],
        myAssets: [],
        categories: [],
        selectedAsset: null,
        currentPage: 1,
        totalPages: 1,
        totalAssets: 0,
        loading: false,
        submitting: false,
        error: 'Some error',
      };
      const state = assetsReducer(initialState, clearError());
      expect(state.error).toBeNull();
    });

    it('should handle resetState', () => {
      const state = assetsReducer(undefined, resetState());
      expect(state.assets).toEqual([]);
      expect(state.myAssets).toEqual([]);
      expect(state.selectedAsset).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('async thunks', () => {
    it('fetchAssets.pending should set loading true', () => {
      const state = assetsReducer(undefined, fetchAssets.pending('', undefined));
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('fetchAssets.fulfilled should update assets list', () => {
      const payload = {
        data: [mockAsset],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };
      const state = assetsReducer(undefined, fetchAssets.fulfilled(payload, '', undefined));
      expect(state.assets).toEqual([mockAsset]);
      expect(state.currentPage).toBe(1);
      expect(state.totalAssets).toBe(1);
      expect(state.loading).toBe(false);
    });

    it('fetchAssets.rejected should set error', () => {
      const state = assetsReducer(undefined, fetchAssets.rejected(null, '', undefined, 'Network error'));
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
    });

    it('fetchCategories.fulfilled should update categories', () => {
      const state = assetsReducer(undefined, fetchCategories.fulfilled([mockCategory], ''));
      expect(state.categories).toEqual([mockCategory]);
      expect(state.loading).toBe(false);
    });

    it('fetchAsset.fulfilled should set selectedAsset', () => {
      const state = assetsReducer(undefined, fetchAsset.fulfilled(mockAsset, '', 'asset-1'));
      expect(state.selectedAsset).toEqual(mockAsset);
      expect(state.loading).toBe(false);
    });

    it('scanAsset.fulfilled should set selectedAsset', () => {
      const state = assetsReducer(undefined, scanAsset.fulfilled(mockAsset, '', 'code'));
      expect(state.selectedAsset).toEqual(mockAsset);
      expect(state.loading).toBe(false);
    });

    it('fetchMyAssets.fulfilled should set myAssets', () => {
      const state = assetsReducer(undefined, fetchMyAssets.fulfilled([mockAssignment], ''));
      expect(state.myAssets).toEqual([mockAssignment]);
      expect(state.loading).toBe(false);
    });

    it('checkoutAsset.pending should set submitting true', () => {
      const state = assetsReducer(
        undefined,
        checkoutAsset.pending('', { assetId: 'asset-1', payload: { condition_at_checkout: 'good' } }),
      );
      expect(state.submitting).toBe(true);
      expect(state.error).toBeNull();
    });

    it('checkoutAsset.fulfilled should add to myAssets and update status', () => {
      const initialState = {
        assets: [{ ...mockAsset, status: 'available' as const }],
        myAssets: [],
        categories: [],
        selectedAsset: null,
        currentPage: 1,
        totalPages: 1,
        totalAssets: 0,
        loading: false,
        submitting: false,
        error: null,
      };

      const state = assetsReducer(
        initialState,
        checkoutAsset.fulfilled(mockAssignment, '', {
          assetId: 'asset-1',
          payload: { condition_at_checkout: 'good' },
        }),
      );

      expect(state.myAssets).toContain(mockAssignment);
      expect(state.assets[0].status).toBe('in_use');
      expect(state.submitting).toBe(false);
    });

    it('returnAsset.fulfilled should remove from myAssets and update status', () => {
      const initialState = {
        assets: [{ ...mockAsset, status: 'in_use' as const }],
        myAssets: [mockAssignment],
        categories: [],
        selectedAsset: null,
        currentPage: 1,
        totalPages: 1,
        totalAssets: 0,
        loading: false,
        submitting: false,
        error: null,
      };

      const state = assetsReducer(
        initialState,
        returnAsset.fulfilled(mockAssignment, '', {
          assetId: 'asset-1',
          payload: { condition_at_return: 'good' },
        }),
      );

      expect(state.myAssets).toHaveLength(0);
      expect(state.assets[0].status).toBe('available');
      expect(state.submitting).toBe(false);
    });
  });

  describe('selectors', () => {
    const mockState = {
      assets: {
        assets: [mockAsset],
        myAssets: [mockAssignment],
        categories: [mockCategory],
        selectedAsset: mockAsset,
        currentPage: 1,
        totalPages: 1,
        totalAssets: 1,
        loading: false,
        submitting: false,
        error: null,
      },
    } as unknown as RootState;

    it('selectAssets should return assets array', () => {
      const result = selectAssets(mockState);
      expect(result).toEqual([mockAsset]);
    });

    it('selectMyAssets should return myAssets array', () => {
      const result = selectMyAssets(mockState);
      expect(result).toEqual([mockAssignment]);
    });

    it('selectCategories should return categories array', () => {
      const result = selectCategories(mockState);
      expect(result).toEqual([mockCategory]);
    });

    it('selectSelectedAsset should return selected asset', () => {
      const result = selectSelectedAsset(mockState);
      expect(result).toEqual(mockAsset);
    });

    it('selectAssetsLoading should return loading state', () => {
      const result = selectAssetsLoading(mockState);
      expect(result).toBe(false);
    });

    it('selectAssetsSubmitting should return submitting state', () => {
      const result = selectAssetsSubmitting(mockState);
      expect(result).toBe(false);
    });

    it('selectAssetsError should return error state', () => {
      const result = selectAssetsError(mockState);
      expect(result).toBeNull();
    });
  });
});
