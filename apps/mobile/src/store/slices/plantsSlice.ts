/**
 * Plants Slice
 * Plant species catalog, area inventory, and notable plants management
 * Phase 3 3-7
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PlantSpecies, AreaPlant, NotablePlant } from '../../types/models.types';
import type { RootState } from '../store';
import * as plantsApi from '../../services/api/plantsApi';

type ThunkError = { error: string; code?: string };

interface PlantsState {
  // Catalog: all loaded species
  speciesCatalog: PlantSpecies[];
  // By-key maps for quick lookup
  speciesById: Record<string, PlantSpecies>;
  // Area plants: stored by areaId for easy retrieval
  areaPlantsByArea: Record<string, AreaPlant[]>;
  // Notable plants: stored by areaId
  notableByArea: Record<string, NotablePlant[]>;
  // Search results: separate from catalog so listing page is not clobbered
  searchResults: PlantSpecies[];
  // Loading states
  isLoadingCatalog: boolean;
  isLoadingSearch: boolean;
  isLoadingAreaPlants: Record<string, boolean>;
  isLoadingNotables: Record<string, boolean>;
  isCreating: boolean;
  // Error handling
  error: string | null;
}

const initialState: PlantsState = {
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

/**
 * Fetch paginated species catalog
 */
export const fetchSpecies = createAsyncThunk(
  'plants/fetchSpecies',
  async (
    { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await plantsApi.listSpecies(limit, offset);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

/**
 * Search species by name
 */
export const searchSpecies = createAsyncThunk(
  'plants/searchSpecies',
  async ({ q, limit = 20 }: { q: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await plantsApi.searchSpecies(q, limit);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

/**
 * Fetch all plants in an area
 */
export const fetchAreaPlants = createAsyncThunk(
  'plants/fetchAreaPlants',
  async (areaId: string, { rejectWithValue }) => {
    try {
      const response = await plantsApi.listLocationPlants(areaId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { areaId, plants: response.data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

/**
 * Fetch notable plants in an area
 */
export const fetchNotablePlants = createAsyncThunk(
  'plants/fetchNotablePlants',
  async (areaId: string, { rejectWithValue }) => {
    try {
      const response = await plantsApi.listNotablePlants(areaId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { areaId, plants: response.data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

/**
 * Create a notable plant
 */
export const createNotablePlant = createAsyncThunk(
  'plants/createNotablePlant',
  async (
    {
      areaId,
      dto,
    }: {
      areaId: string;
      dto: {
        species_id: string;
        label?: string;
        last_pruned_at?: string;
        notes?: string;
      };
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await plantsApi.createNotablePlant(areaId, dto);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { areaId, plant: response.data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

const plantsSlice = createSlice({
  name: 'plants',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Fetch species catalog
    builder.addCase(fetchSpecies.pending, state => {
      state.isLoadingCatalog = true;
      state.error = null;
    });
    builder.addCase(fetchSpecies.fulfilled, (state, action) => {
      state.isLoadingCatalog = false;
      const payload = action.payload;
      if (!payload) return;
      state.speciesCatalog = payload.data;
      // Populate by-key map
      state.speciesById = { ...state.speciesById, ...Object.fromEntries(payload.data.map(s => [s.id, s])) };
    });
    builder.addCase(fetchSpecies.rejected, (state, action) => {
      state.isLoadingCatalog = false;
      state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
    });

    // Search species
    builder.addCase(searchSpecies.pending, state => {
      state.isLoadingSearch = true;
      state.error = null;
    });
    builder.addCase(searchSpecies.fulfilled, (state, action) => {
      state.isLoadingSearch = false;
      const payload = action.payload ?? [];
      state.searchResults = payload;
      // Also add to by-key map if not present
      const newEntries = Object.fromEntries(
        payload
          .filter(species => !state.speciesById[species.id])
          .map(s => [s.id, s])
      );
      state.speciesById = { ...state.speciesById, ...newEntries };
    });
    builder.addCase(searchSpecies.rejected, (state, action) => {
      state.isLoadingSearch = false;
      state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
    });

    // Fetch area plants
    builder.addCase(fetchAreaPlants.pending, (state, action) => {
      const areaId = action.meta.arg;
      state.isLoadingAreaPlants[areaId] = true;
      state.error = null;
    });
    builder.addCase(fetchAreaPlants.fulfilled, (state, action) => {
      const payload = action.payload;
      if (!payload) return;
      const { areaId, plants } = payload;
      state.isLoadingAreaPlants[areaId] = false;
      state.areaPlantsByArea[areaId] = plants ?? [];
      // Populate species by-key map
      if (plants) {
        plants.forEach(plant => {
          state.speciesById[plant.species.id] = plant.species;
        });
      }
    });
    builder.addCase(fetchAreaPlants.rejected, (state, action) => {
      const areaId = action.meta.arg;
      state.isLoadingAreaPlants[areaId] = false;
      state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
    });

    // Fetch notable plants
    builder.addCase(fetchNotablePlants.pending, (state, action) => {
      const areaId = action.meta.arg;
      state.isLoadingNotables[areaId] = true;
      state.error = null;
    });
    builder.addCase(fetchNotablePlants.fulfilled, (state, action) => {
      const payload = action.payload;
      if (!payload) return;
      const { areaId, plants } = payload;
      state.isLoadingNotables[areaId] = false;
      state.notableByArea[areaId] = plants ?? [];
      // Populate species by-key map
      if (plants) {
        plants.forEach(plant => {
          state.speciesById[plant.species.id] = plant.species;
        });
      }
    });
    builder.addCase(fetchNotablePlants.rejected, (state, action) => {
      const areaId = action.meta.arg;
      state.isLoadingNotables[areaId] = false;
      state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
    });

    // Create notable plant
    builder.addCase(createNotablePlant.pending, state => {
      state.isCreating = true;
      state.error = null;
    });
    builder.addCase(createNotablePlant.fulfilled, (state, action) => {
      state.isCreating = false;
      const payload = action.payload;
      if (!payload) return;
      const { areaId, plant } = payload;
      if (!plant) return;
      // Add to notableByArea if it exists
      if (!state.notableByArea[areaId]) {
        state.notableByArea[areaId] = [];
      }
      state.notableByArea[areaId].push(plant);
      // Add species to by-key map
      state.speciesById[plant.species.id] = plant.species;
    });
    builder.addCase(createNotablePlant.rejected, (state, action) => {
      state.isCreating = false;
      state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
    });
  },
});

export const { clearError } = plantsSlice.actions;
export default plantsSlice.reducer;

// Selectors
export const selectSpeciesCatalog = (state: RootState) => state.plants.speciesCatalog;
export const selectSpeciesById = (state: RootState) => state.plants.speciesById;
export const selectSearchResults = (state: RootState) => state.plants.searchResults;
export const selectAreaPlants = (areaId: string) => (state: RootState) =>
  state.plants.areaPlantsByArea[areaId] ?? [];
export const selectNotablePlants = (areaId: string) => (state: RootState) =>
  state.plants.notableByArea[areaId] ?? [];
export const selectIsLoadingCatalog = (state: RootState) => state.plants.isLoadingCatalog;
export const selectIsLoadingSearch = (state: RootState) => state.plants.isLoadingSearch;
export const selectIsLoadingAreaPlants = (areaId: string) => (state: RootState) =>
  state.plants.isLoadingAreaPlants[areaId] ?? false;
export const selectIsLoadingNotables = (areaId: string) => (state: RootState) =>
  state.plants.isLoadingNotables[areaId] ?? false;
export const selectIsCreating = (state: RootState) => state.plants.isCreating;
export const selectError = (state: RootState) => state.plants.error;
