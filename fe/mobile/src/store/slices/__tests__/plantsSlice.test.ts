import plantsReducer, {
  fetchSpecies,
  searchSpecies,
  fetchAreaPlants,
  fetchNotablePlants,
  createNotablePlant,
  selectSpeciesCatalog,
  selectSearchResults,
  selectAreaPlants,
  selectNotablePlants,
  selectIsLoadingSearch,
} from '../plantsSlice';
import { PlantSpecies, AreaPlant, NotablePlant } from '../../../types/models.types';

const mockPlantSpecies: PlantSpecies = {
  id: '1',
  nameId: 'Pohon Kelapa',
  nameLatin: 'Cocos nucifera',
  category: 'tree',
  defaultPruningCycleDays: 90,
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockAreaPlant: AreaPlant = {
  id: '1',
  areaId: 'area-1',
  speciesId: '1',
  count: 150,
  lastPrunedAt: null,
  nextDueAt: '2024-04-01T00:00:00Z',
  status: 'ok',
  overrideCycleDays: null,
  species: mockPlantSpecies,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockNotablePlant: NotablePlant = {
  id: '1',
  areaId: 'area-1',
  speciesId: '1',
  gpsLat: -7.25,
  gpsLng: 112.75,
  label: 'Large specimen tree',
  heritage: true,
  photoUrls: ['https://example.com/photo.jpg'],
  notes: 'Historic tree',
  species: mockPlantSpecies,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('plantsSlice', () => {
  const initialState = plantsReducer(undefined, { type: 'unknown' });

  it('returns the initial state', () => {
    expect(initialState).toEqual({
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
    });
  });

  describe('fetchSpecies thunk', () => {
    it('sets loading state on pending', () => {
      const action = { type: fetchSpecies.pending.type };
      const state = plantsReducer(initialState, action);
      expect(state.isLoadingCatalog).toBe(true);
    });

    it('sets species catalog on fulfilled', () => {
      const payload = {
        data: [mockPlantSpecies],
        total: 1,
      };
      const action = { type: fetchSpecies.fulfilled.type, payload };
      const state = plantsReducer(initialState, action);
      expect(state.speciesCatalog).toEqual([mockPlantSpecies]);
      expect(state.isLoadingCatalog).toBe(false);
    });

    it('sets error on rejected', () => {
      const error = new Error('Failed to fetch');
      const action = { type: fetchSpecies.rejected.type, payload: { error: error.message } };
      const state = plantsReducer(initialState, action);
      expect(state.error).toEqual(error.message);
      expect(state.isLoadingCatalog).toBe(false);
    });
  });

  describe('searchSpecies thunk', () => {
    it('sets loading state on pending', () => {
      const action = { type: searchSpecies.pending.type };
      const state = plantsReducer(initialState, action);
      expect(state.isLoadingSearch).toBe(true);
    });

    it('sets search results on fulfilled', () => {
      const payload = [mockPlantSpecies];
      const action = { type: searchSpecies.fulfilled.type, payload };
      const state = plantsReducer(initialState, action);
      expect(state.searchResults).toEqual([mockPlantSpecies]);
      expect(state.isLoadingSearch).toBe(false);
    });

    it('clears results on empty search', () => {
      const stateWithResults = {
        ...initialState,
        searchResults: [mockPlantSpecies],
      };
      const payload: PlantSpecies[] = [];
      const action = { type: searchSpecies.fulfilled.type, payload };
      const state = plantsReducer(stateWithResults, action);
      expect(state.searchResults).toEqual([]);
    });

    it('sets error on rejected', () => {
      const error = new Error('Search failed');
      const action = { type: searchSpecies.rejected.type, payload: { error: error.message } };
      const state = plantsReducer(initialState, action);
      expect(state.error).toEqual(error.message);
      expect(state.isLoadingSearch).toBe(false);
    });
  });

  describe('fetchAreaPlants thunk', () => {
    it('sets loading state on pending', () => {
      const action = {
        type: fetchAreaPlants.pending.type,
        meta: { arg: 'area-1' },
      };
      const state = plantsReducer(initialState, action as any);
      expect(state.isLoadingAreaPlants['area-1']).toBe(true);
    });

    it('sets area plants on fulfilled', () => {
      const payload = { areaId: 'area-1', plants: [mockAreaPlant] };
      const action = { type: fetchAreaPlants.fulfilled.type, payload };
      const state = plantsReducer(initialState, action);
      expect(state.areaPlantsByArea['area-1']).toEqual([mockAreaPlant]);
      expect(state.isLoadingAreaPlants['area-1']).toBe(false);
      expect(state.speciesById['1']).toEqual(mockPlantSpecies);
    });

    it('sets error on rejected', () => {
      const error = new Error('Failed to fetch area plants');
      const action = {
        type: fetchAreaPlants.rejected.type,
        payload: { error: error.message },
        meta: { arg: 'area-1' },
      };
      const state = plantsReducer(initialState, action as any);
      expect(state.error).toEqual(error.message);
      expect(state.isLoadingAreaPlants['area-1']).toBe(false);
    });
  });

  describe('fetchNotablePlants thunk', () => {
    it('sets loading state on pending', () => {
      const action = {
        type: fetchNotablePlants.pending.type,
        meta: { arg: 'area-1' },
      };
      const state = plantsReducer(initialState, action as any);
      expect(state.isLoadingNotables['area-1']).toBe(true);
    });

    it('sets notable plants on fulfilled', () => {
      const payload = { areaId: 'area-1', plants: [mockNotablePlant] };
      const action = { type: fetchNotablePlants.fulfilled.type, payload };
      const state = plantsReducer(initialState, action);
      expect(state.notableByArea['area-1']).toEqual([mockNotablePlant]);
      expect(state.isLoadingNotables['area-1']).toBe(false);
      expect(state.speciesById['1']).toEqual(mockPlantSpecies);
    });

    it('sets error on rejected', () => {
      const error = new Error('Failed to fetch notable plants');
      const action = {
        type: fetchNotablePlants.rejected.type,
        payload: { error: error.message },
        meta: { arg: 'area-1' },
      };
      const state = plantsReducer(initialState, action as any);
      expect(state.error).toEqual(error.message);
      expect(state.isLoadingNotables['area-1']).toBe(false);
    });
  });

  describe('createNotablePlant thunk', () => {
    it('sets loading state on pending', () => {
      const action = { type: createNotablePlant.pending.type };
      const state = plantsReducer(initialState, action);
      expect(state.isCreating).toBe(true);
    });

    it('adds created notable plant on fulfilled', () => {
      const stateWithExisting = {
        ...initialState,
        notableByArea: {
          'area-1': [],
        },
      };
      const payload = { areaId: 'area-1', plant: mockNotablePlant };
      const action = { type: createNotablePlant.fulfilled.type, payload };
      const state = plantsReducer(stateWithExisting, action);
      expect(state.notableByArea['area-1']).toContain(mockNotablePlant);
      expect(state.isCreating).toBe(false);
      expect(state.speciesById['1']).toEqual(mockPlantSpecies);
    });

    it('sets error on rejected', () => {
      const error = new Error('Failed to create notable plant');
      const action = { type: createNotablePlant.rejected.type, payload: { error: error.message } };
      const state = plantsReducer(initialState, action);
      expect(state.error).toEqual(error.message);
      expect(state.isCreating).toBe(false);
    });
  });

  describe('selectors', () => {
    const mockState = {
      plants: {
        speciesCatalog: [mockPlantSpecies],
        speciesById: { '1': mockPlantSpecies },
        areaPlantsByArea: { 'area-1': [mockAreaPlant] },
        notableByArea: { 'area-1': [mockNotablePlant] },
        searchResults: [mockPlantSpecies],
        isLoadingCatalog: false,
        isLoadingSearch: false,
        isLoadingAreaPlants: {},
        isLoadingNotables: {},
        isCreating: false,
        error: null,
      },
    } as any; // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock state

    it('selectSpeciesCatalog returns catalog array', () => {
      const result = selectSpeciesCatalog(mockState);
      expect(result).toEqual([mockPlantSpecies]);
    });

    it('selectSearchResults returns search results', () => {
      const result = selectSearchResults(mockState);
      expect(result).toEqual([mockPlantSpecies]);
    });

    it('selectAreaPlants returns plants for specific area', () => {
      const result = selectAreaPlants('area-1')(mockState);
      expect(result).toEqual([mockAreaPlant]);
    });

    it('selectAreaPlants returns empty array for unknown area', () => {
      const result = selectAreaPlants('unknown-area')(mockState);
      expect(result).toEqual([]);
    });

    it('selectNotablePlants returns notable plants for specific area', () => {
      const result = selectNotablePlants('area-1')(mockState);
      expect(result).toEqual([mockNotablePlant]);
    });

    it('selectNotablePlants returns empty array for unknown area', () => {
      const result = selectNotablePlants('unknown-area')(mockState);
      expect(result).toEqual([]);
    });

    it('selectIsLoadingSearch returns loading state', () => {
      const result = selectIsLoadingSearch(mockState);
      expect(result).toBe(false);
    });
  });
});
