/**
 * Plants Slice Tests
 * Unit tests for plant species catalog and area inventory state
 * Phase 3 3-7
 */

import plantsReducer, {
  fetchSpecies,
  searchSpecies,
  fetchAreaPlants,
  fetchNotablePlants,
  createNotablePlant,
  clearError,
  selectSpeciesCatalog,
  selectSearchResults,
  selectAreaPlants,
  selectNotablePlants,
  selectIsLoadingCatalog,
  selectError,
} from '../plantsSlice';
import type { PlantSpecies, AreaPlant, NotablePlant } from '../../../types/models.types';

describe('plantsSlice', () => {
  const initialState = {
    speciesCatalog: [],
    speciesById: {},
    areaPlantsByArea: {},
    notableByArea: {},
    searchResults: [],
    isLoadingCatalog: false,
    isLoadingSearch: false,
    isLoadingAreaPlants: {},
    isLoadingNotables: {},
    isCreating: false,
    error: null,
  };

  const mockPlantSpecies: PlantSpecies = {
    id: 'species-001',
    nameId: 'Pohon Trembesi',
    nameLatin: 'Albizia saman',
    category: 'tree',
    defaultPruningCycleDays: 365,
    notes: 'Pohon besar dengan tajuk lebar',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockAreaPlant: AreaPlant = {
    id: 'area-plant-001',
    areaId: 'area-001',
    speciesId: 'species-001',
    count: 5,
    lastPrunedAt: '2026-01-15T10:00:00Z',
    nextDueAt: '2027-01-15T10:00:00Z',
    status: 'ok',
    overrideCycleDays: null,
    species: mockPlantSpecies,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockNotablePlant: NotablePlant = {
    id: 'notable-001',
    areaId: 'area-001',
    speciesId: 'species-001',
    gpsLat: -7.2575,
    gpsLng: 112.7521,
    label: 'Heritage Trembesi - Est. 1950',
    heritage: true,
    photoUrls: ['https://example.com/photo1.jpg'],
    notes: 'Pohon bersejarah, pantang tebang',
    species: mockPlantSpecies,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  describe('initial state', () => {
    it('should return initial state', () => {
      expect(plantsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      const stateWithError = { ...initialState, error: 'Some error' };
      const result = plantsReducer(stateWithError, clearError());
      expect(result.error).toBeNull();
    });
  });

  describe('fetchSpecies thunk', () => {
    it('should set isLoadingCatalog on pending', () => {
      const action = { type: fetchSpecies.pending.type };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingCatalog).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should populate catalog and speciesById on fulfilled', () => {
      const payload = { data: [mockPlantSpecies], total: 1 };
      const action = {
        type: fetchSpecies.fulfilled.type,
        payload,
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingCatalog).toBe(false);
      expect(result.speciesCatalog).toEqual([mockPlantSpecies]);
      expect(result.speciesById[mockPlantSpecies.id]).toEqual(mockPlantSpecies);
    });

    it('should set error on rejected', () => {
      const action = {
        type: fetchSpecies.rejected.type,
        payload: 'Failed to fetch species',
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingCatalog).toBe(false);
      expect(result.error).toBe('Failed to fetch species');
    });
  });

  describe('searchSpecies thunk', () => {
    it('should set isLoadingSearch on pending', () => {
      const action = { type: searchSpecies.pending.type };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingSearch).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should populate searchResults on fulfilled', () => {
      const payload = [mockPlantSpecies];
      const action = {
        type: searchSpecies.fulfilled.type,
        payload,
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingSearch).toBe(false);
      expect(result.searchResults).toEqual([mockPlantSpecies]);
      expect(result.speciesById[mockPlantSpecies.id]).toEqual(mockPlantSpecies);
    });

    it('should not clear previous speciesById entries on search', () => {
      const otherSpecies: PlantSpecies = {
        ...mockPlantSpecies,
        id: 'species-002',
        nameId: 'Pohon Beringin',
      };
      const stateWithSpecies = {
        ...initialState,
        speciesById: { 'species-002': otherSpecies },
      };
      const action = {
        type: searchSpecies.fulfilled.type,
        payload: [mockPlantSpecies],
      };
      const result = plantsReducer(stateWithSpecies, action);
      expect(result.speciesById['species-002']).toEqual(otherSpecies);
      expect(result.speciesById['species-001']).toEqual(mockPlantSpecies);
    });

    it('should set error on rejected', () => {
      const action = {
        type: searchSpecies.rejected.type,
        payload: 'Search failed',
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingSearch).toBe(false);
      expect(result.error).toBe('Search failed');
    });
  });

  describe('fetchAreaPlants thunk', () => {
    it('should set loading state for area on pending', () => {
      const action = {
        type: fetchAreaPlants.pending.type,
        meta: { arg: 'area-001' },
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingAreaPlants['area-001']).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should populate areaPlantsByArea on fulfilled', () => {
      const payload = { areaId: 'area-001', plants: [mockAreaPlant] };
      const action = {
        type: fetchAreaPlants.fulfilled.type,
        payload,
        meta: { arg: 'area-001' },
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingAreaPlants['area-001']).toBe(false);
      expect(result.areaPlantsByArea['area-001']).toEqual([mockAreaPlant]);
      expect(result.speciesById[mockPlantSpecies.id]).toEqual(mockPlantSpecies);
    });

    it('should set error on rejected', () => {
      const action = {
        type: fetchAreaPlants.rejected.type,
        payload: 'Failed to fetch area plants',
        meta: { arg: 'area-001' },
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingAreaPlants['area-001']).toBe(false);
      expect(result.error).toBe('Failed to fetch area plants');
    });
  });

  describe('fetchNotablePlants thunk', () => {
    it('should set loading state for area on pending', () => {
      const action = {
        type: fetchNotablePlants.pending.type,
        meta: { arg: 'area-001' },
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingNotables['area-001']).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should populate notableByArea on fulfilled', () => {
      const payload = { areaId: 'area-001', plants: [mockNotablePlant] };
      const action = {
        type: fetchNotablePlants.fulfilled.type,
        payload,
        meta: { arg: 'area-001' },
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingNotables['area-001']).toBe(false);
      expect(result.notableByArea['area-001']).toEqual([mockNotablePlant]);
      expect(result.speciesById[mockPlantSpecies.id]).toEqual(mockPlantSpecies);
    });

    it('should set error on rejected', () => {
      const action = {
        type: fetchNotablePlants.rejected.type,
        payload: 'Failed to fetch notable plants',
        meta: { arg: 'area-001' },
      };
      const result = plantsReducer(initialState, action);
      expect(result.isLoadingNotables['area-001']).toBe(false);
      expect(result.error).toBe('Failed to fetch notable plants');
    });
  });

  describe('createNotablePlant thunk', () => {
    it('should set isCreating on pending', () => {
      const action = { type: createNotablePlant.pending.type };
      const result = plantsReducer(initialState, action);
      expect(result.isCreating).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should add plant to notableByArea on fulfilled', () => {
      const stateWithArea = {
        ...initialState,
        notableByArea: { 'area-001': [] },
      };
      const payload = { areaId: 'area-001', plant: mockNotablePlant };
      const action = {
        type: createNotablePlant.fulfilled.type,
        payload,
      };
      const result = plantsReducer(stateWithArea, action);
      expect(result.isCreating).toBe(false);
      expect(result.notableByArea['area-001']).toContain(mockNotablePlant);
      expect(result.speciesById[mockPlantSpecies.id]).toEqual(mockPlantSpecies);
    });

    it('should create area in notableByArea if not exists on fulfilled', () => {
      const payload = { areaId: 'area-002', plant: mockNotablePlant };
      const action = {
        type: createNotablePlant.fulfilled.type,
        payload,
      };
      const result = plantsReducer(initialState, action);
      expect(result.notableByArea['area-002']).toBeDefined();
      expect(result.notableByArea['area-002']).toContain(mockNotablePlant);
    });

    it('should set error on rejected', () => {
      const action = {
        type: createNotablePlant.rejected.type,
        payload: 'Failed to create notable plant',
      };
      const result = plantsReducer(initialState, action);
      expect(result.isCreating).toBe(false);
      expect(result.error).toBe('Failed to create notable plant');
    });
  });

  describe('selectors', () => {
    const stateWithData = {
      plants: {
        ...initialState,
        speciesCatalog: [mockPlantSpecies],
        speciesById: { 'species-001': mockPlantSpecies },
        searchResults: [mockPlantSpecies],
        areaPlantsByArea: { 'area-001': [mockAreaPlant] },
        notableByArea: { 'area-001': [mockNotablePlant] },
        isLoadingCatalog: true,
        error: 'Test error',
      },
    };

    it('selectSpeciesCatalog should return catalog', () => {
      const result = selectSpeciesCatalog(stateWithData);
      expect(result).toEqual([mockPlantSpecies]);
    });

    it('selectSearchResults should return search results', () => {
      const result = selectSearchResults(stateWithData);
      expect(result).toEqual([mockPlantSpecies]);
    });

    it('selectAreaPlants should return plants for area', () => {
      const selector = selectAreaPlants('area-001');
      const result = selector(stateWithData);
      expect(result).toEqual([mockAreaPlant]);
    });

    it('selectAreaPlants should return empty array for unknown area', () => {
      const selector = selectAreaPlants('unknown-area');
      const result = selector(stateWithData);
      expect(result).toEqual([]);
    });

    it('selectNotablePlants should return notable plants for area', () => {
      const selector = selectNotablePlants('area-001');
      const result = selector(stateWithData);
      expect(result).toEqual([mockNotablePlant]);
    });

    it('selectIsLoadingCatalog should return loading state', () => {
      const result = selectIsLoadingCatalog(stateWithData);
      expect(result).toBe(true);
    });

    it('selectError should return error message', () => {
      const result = selectError(stateWithData);
      expect(result).toBe('Test error');
    });
  });
});
