import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { SpeciesAutocomplete } from '../SpeciesAutocomplete';
import { configureStore } from '@reduxjs/toolkit';
import plantsReducer from '../../../store/slices/plantsSlice';
import { PlantSpecies } from '../../../types/models.types';

const mockPlantSpecies: PlantSpecies[] = [
  {
    id: '1',
    nameId: 'Pohon Kelapa',
    nameLatin: 'Cocos nucifera',
    category: 'tree',
    defaultPruningCycleDays: 90,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    nameId: 'Pohon Mangga',
    nameLatin: 'Mangifera indica',
    category: 'tree',
    defaultPruningCycleDays: 120,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const createTestStore = () => {
  return configureStore({
    reducer: {
      plants: plantsReducer,
    },
  });
};

const renderWithStore = (component: React.ReactElement, store = createTestStore()) => {
  return render(<Provider store={store}>{component}</Provider>);
};

describe('SpeciesAutocomplete', () => {
  it('renders with placeholder text', () => {
    const onChange = jest.fn();
    renderWithStore(
      <SpeciesAutocomplete
        value={[]}
        onChange={onChange}
        placeholder="Search species..."
        testID="species-search"
      />
    );

    expect(screen.getByPlaceholderText('Search species...')).toBeTruthy();
  });

  it('displays default placeholder when not provided', () => {
    const onChange = jest.fn();
    renderWithStore(
      <SpeciesAutocomplete value={[]} onChange={onChange} testID="species-search" />
    );

    expect(screen.getByPlaceholderText('Cari spesies tanaman...')).toBeTruthy();
  });

  it('shows multi-select chips when species are selected', async () => {
    const onChange = jest.fn();
    renderWithStore(
      <SpeciesAutocomplete
        multi={true}
        value={mockPlantSpecies}
        onChange={onChange}
        testID="species-multi"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pohon Kelapa')).toBeTruthy();
      expect(screen.getByText('Pohon Mangga')).toBeTruthy();
    });
  });

  it('allows removing chips in multi-select mode', async () => {
    const onChange = jest.fn();
    const store = createTestStore();

    renderWithStore(
      <SpeciesAutocomplete
        multi={true}
        value={mockPlantSpecies}
        onChange={onChange}
        testID="species-multi"
      />,
      store
    );

    await waitFor(() => {
      const removeButton = screen.getByTestId('chip-remove-1');
      expect(removeButton).toBeTruthy();
      fireEvent.press(removeButton);
    });

    expect(onChange).toHaveBeenCalledWith([mockPlantSpecies[1]]);
  });

  it('clears search input when clear button is pressed', async () => {
    const onChange = jest.fn();
    renderWithStore(
      <SpeciesAutocomplete
        value={[]}
        onChange={onChange}
        testID="species-search"
      />
    );

    const input = screen.getByTestId('species-search-input');
    fireEvent.changeText(input, 'Pohon');

    await waitFor(() => {
      const clearButton = screen.getByTestId('species-search-clear');
      expect(clearButton).toBeTruthy();
      fireEvent.press(clearButton);
    });

    expect(input.props.value).toBe('');
  });

  it('has proper accessibility attributes', () => {
    const onChange = jest.fn();
    renderWithStore(
      <SpeciesAutocomplete
        value={[]}
        onChange={onChange}
        testID="species-search"
      />
    );

    const input = screen.getByTestId('species-search-input');
    expect(input.props.accessibilityLabel).toBe('Pencarian spesies tanaman');
    expect(input.props.accessibilityHint).toBe('Ketik nama spesies untuk mencari');
    expect(input.props.accessibilityRole).toBe('search');
  });
});
