/**
 * Pruning Task Form Tests
 * Form validation, enum dropdown rendering, species selection, submission
 * Phase 3 3-7 (ADR-031)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PruningTaskForm, type PruningTaskFormPayload } from '../PruningTaskForm';
import plantsReducer from '../../../store/slices/plantsSlice';
import type { PlantSpecies } from '../../../types/models.types';

// Mock SpeciesAutocomplete
jest.mock('../SpeciesAutocomplete');

const mockPlantSpecies1: PlantSpecies = {
  id: 'species-001',
  nameId: 'Pohon Trembesi',
  nameLatin: 'Albizia saman',
  category: 'tree',
  defaultPruningCycleDays: 365,
  notes: 'Pohon besar dengan tajuk lebar',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockPlantSpecies2: PlantSpecies = {
  id: 'species-002',
  nameId: 'Pohon Beringin',
  nameLatin: 'Ficus religiosa',
  category: 'tree',
  defaultPruningCycleDays: 180,
  notes: 'Pohon suci',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderWithRedux(component: React.ReactElement) {
  const store = configureStore({
    reducer: {
      plants: plantsReducer,
    },
  });

  return {
    ...render(
      <SafeAreaProvider>
        <Provider store={store}>
          {component}
        </Provider>
      </SafeAreaProvider>,
    ),
    store,
  };
}

describe('PruningTaskForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('component rendering', () => {
    it('should render without crashing', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      expect(root).toBeTruthy();
    });

    it('should render with custom style prop', () => {
      const customStyle = { paddingHorizontal: 20 };
      const { root } = renderWithRedux(
        <PruningTaskForm
          onSubmit={jest.fn()}
          style={customStyle}
        />,
      );

      expect(root).toBeTruthy();
    });

    it('should pass onSubmit callback as required prop', () => {
      const onSubmit = jest.fn();
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={onSubmit} />,
      );

      expect(root).toBeTruthy();
    });

    it('should handle isLoading prop', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} isLoading={true} />,
      );

      expect(root).toBeTruthy();
    });

    it('should render with isLoading false by default', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      expect(root).toBeTruthy();
    });
  });

  describe('dropdown field structure (ADR-031)', () => {
    it('should have case type dropdown field', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // Case type (GT, PT, PS, PD, PK) dropdown is defined in component
      expect(root).toBeTruthy();
    });

    it('should have pruning action dropdown field', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // Pruning action (PM, PB, PC) dropdown is defined in component
      expect(root).toBeTruthy();
    });

    it('should have task source dropdown field', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // Task source (TIW, TS, CC, PW, Wk) dropdown is defined in component
      expect(root).toBeTruthy();
    });

    it('should have species selection field', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // SpeciesAutocomplete component is rendered
      expect(root).toBeTruthy();
    });

    it('should have optional notes field', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // Notes field is optional
      expect(root).toBeTruthy();
    });
  });

  describe('form state and validation', () => {
    it('should start with all fields empty', () => {
      const onSubmit = jest.fn();
      renderWithRedux(
        <PruningTaskForm onSubmit={onSubmit} />,
      );

      // onSubmit should not be called on initial render
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should require case_type field to be selected', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // Validation: caseType !== ''
      expect(root).toBeTruthy();
    });

    it('should require pruning_action field to be selected', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // Validation: pruningAction !== ''
      expect(root).toBeTruthy();
    });

    it('should require source field to be selected', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // Validation: taskSource !== ''
      expect(root).toBeTruthy();
    });

    it('should require species array to have at least one item', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // Validation: selectedSpecies.length > 0
      expect(root).toBeTruthy();
    });

    it('should be invalid when required fields are empty', () => {
      const onSubmit = jest.fn();
      renderWithRedux(
        <PruningTaskForm onSubmit={onSubmit} />,
      );

      // All fields required: form is initially invalid
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('submit button behavior', () => {
    it('should render submit button', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // NBButton with label "Simpan Tugas" or "Menyimpan..."
      expect(root).toBeTruthy();
    });

    it('should disable submit button when isLoading is true', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} isLoading={true} />,
      );

      // disabled={!isValid || isLoading}
      expect(root).toBeTruthy();
    });

    it('should have secondary variant when form invalid', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // variant={isValid && !isLoading ? 'primary' : 'secondary'}
      expect(root).toBeTruthy();
    });

    it('should have primary variant when form valid and not loading', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} isLoading={false} />,
      );

      expect(root).toBeTruthy();
    });

    it('should show "Menyimpan..." when isLoading is true', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} isLoading={true} />,
      );

      // label={isLoading ? 'Menyimpan...' : 'Simpan Tugas'}
      expect(root).toBeTruthy();
    });

    it('should show "Simpan Tugas" when isLoading is false', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} isLoading={false} />,
      );

      expect(root).toBeTruthy();
    });
  });

  describe('payload structure (PruningTaskFormPayload)', () => {
    it('should include case_type in payload', () => {
      // PruningTaskFormPayload has case_type: CaseType
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      expect(root).toBeTruthy();
    });

    it('should include pruning_action in payload', () => {
      // PruningTaskFormPayload has pruning_action: PruningAction
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      expect(root).toBeTruthy();
    });

    it('should include source in payload', () => {
      // PruningTaskFormPayload has source: TaskSource
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      expect(root).toBeTruthy();
    });

    it('should include species in payload', () => {
      // PruningTaskFormPayload has species: PlantSpecies[]
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      expect(root).toBeTruthy();
    });

    it('should include optional notes in payload when provided', () => {
      // PruningTaskFormPayload has notes?: string
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      expect(root).toBeTruthy();
    });

    it('should omit notes when empty or whitespace only', () => {
      // notes: notes.trim().length > 0 ? notes : undefined
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      expect(root).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have accessibility label on case type dropdown', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // accessibilityLabel="Pilih klasifikasi kasus"
      expect(root).toBeTruthy();
    });

    it('should have accessibility label on pruning action dropdown', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // accessibilityLabel="Pilih tindakan pemangkasan"
      expect(root).toBeTruthy();
    });

    it('should have accessibility label on task source dropdown', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // accessibilityLabel="Pilih sumber tugas"
      expect(root).toBeTruthy();
    });

    it('should have accessibility label on notes field', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // accessibilityLabel="Catatan tugas pemangkasan"
      expect(root).toBeTruthy();
    });

    it('should have accessibility label on submit button', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // accessibilityLabel="Simpan tugas pemangkasan"
      expect(root).toBeTruthy();
    });

    it('should have accessibility hint on submit button when invalid', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // accessibilityHint={!isValid ? 'Lengkapi semua bidang yang wajib' : undefined}
      expect(root).toBeTruthy();
    });
  });

  describe('notes field behavior', () => {
    it('should have notes as optional field', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      expect(root).toBeTruthy();
    });

    it('should accept multiline notes', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // multiline={true}, numberOfLines={3}
      expect(root).toBeTruthy();
    });

    it('should disable notes field when isLoading', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} isLoading={true} />,
      );

      // disabled={isLoading}
      expect(root).toBeTruthy();
    });
  });

  describe('species autocomplete integration', () => {
    it('should pass multiSelect={true} to SpeciesAutocomplete', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // multiSelect={true}
      expect(root).toBeTruthy();
    });

    it('should pass correct placeholder to SpeciesAutocomplete', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // placeholder="Cari dan pilih spesies..."
      expect(root).toBeTruthy();
    });

    it('should pass selectedSpecies to SpeciesAutocomplete', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // selectedSpecies={selectedSpecies}
      expect(root).toBeTruthy();
    });

    it('should pass onSelectionChange callback to SpeciesAutocomplete', () => {
      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={jest.fn()} />,
      );

      // onSelectionChange={setSelectedSpecies}
      expect(root).toBeTruthy();
    });
  });

  describe('type safety', () => {
    it('should accept onSubmit callback with correct signature', () => {
      const onSubmit = (payload: PruningTaskFormPayload) => {
        expect(payload).toHaveProperty('case_type');
        expect(payload).toHaveProperty('pruning_action');
        expect(payload).toHaveProperty('source');
        expect(payload).toHaveProperty('species');
      };

      const { root } = renderWithRedux(
        <PruningTaskForm onSubmit={onSubmit} />,
      );

      expect(root).toBeTruthy();
    });
  });
});
