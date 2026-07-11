/**
 * Plant Seeds Inventory Screen Tests (Phase 3 3-12)
 * Tests: list renders, low-stock badge, refresh, error handling
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlantSeedsInventoryScreen } from '../PlantSeedsInventoryScreen';
import type { PlantSeed } from '../../../types/models.types';

const Tab = createBottomTabNavigator();

const mockSeeds: PlantSeed[] = [
  {
    id: 'seed-1',
    nameId: 'Benih Bayam Hijau',
    unit: 'gram',
    stockQty: 5,
    lastCountedAt: '2026-06-01T00:00:00.000Z',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'seed-2',
    nameId: 'Benih Tomat Cherry',
    speciesId: 'species-1',
    unit: 'packet',
    stockQty: 150,
    lastCountedAt: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-06-08T00:00:00.000Z',
  },
];

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
    useFocusEffect: (callback: any) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const LazyReact = require('react');
      LazyReact.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

const makeStore = (seeds: PlantSeed[] = mockSeeds, isLoading = false, error: any = null) =>
  configureStore({
    reducer: {
      plantSeeds: (state = {
        seeds,
        seedsTotal: seeds.length,
        byId: seeds.reduce((acc, seed) => ({ ...acc, [seed.id]: seed }), {}),
        transactionsBySeed: {},
        isLoading,
        error,
        selectedSeedId: null,
        isRecording: false,
        recordError: null,
        pagination: { currentPage: 1, limit: 20 },
        searchQuery: '',
      }) => state,
      auth: (state = { user: { id: 'u1', role: 'admin_rayon' } }) => state,
    },
  });

const renderScreen = (store = makeStore()) => ({
  store,
  ...render(
    <Provider store={store}>
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen
            name="PlantSeeds"
            component={PlantSeedsInventoryScreen}
            options={{ headerShown: false }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </Provider>
  ),
});

describe('PlantSeedsInventoryScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders seeds list with names and stock', () => {
    const { getByText } = renderScreen();

    expect(getByText('Benih Bayam Hijau')).toBeTruthy();
    expect(getByText('Benih Tomat Cherry')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    expect(getByText('150')).toBeTruthy();
  });

  it('shows low-stock badge for seeds below threshold (10)', () => {
    const { getByText, queryByText } = renderScreen();

    // Bayam has 5 qty → low stock badge visible
    const bayamText = getByText('Benih Bayam Hijau');
    expect(bayamText).toBeTruthy();

    // NBBadge uppercases its text — the badge renders as "RENDAH"
    const badgeElement = queryByText('RENDAH');
    expect(badgeElement).toBeTruthy();
  });

  it('navigates to detail on seed press', async () => {
    const { getByText } = renderScreen();

    const seedName = getByText('Benih Bayam Hijau');
    fireEvent.press(seedName);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('SeedDetail', { seedId: 'seed-1' });
    });
  });

  it('renders loading state when isLoading is true', () => {
    const store = makeStore([], true, null);
    const { queryByText } = renderScreen(store);

    // Loading should show skeleton states
    // The exact text depends on how skeletons are rendered
    expect(queryByText('Benih Bayam Hijau')).toBeFalsy();
  });

  it('renders error state when error is set', () => {
    const store = makeStore([], false, { error: 'Koneksi terputus' });
    const { getByText } = renderScreen(store);

    // Heading + the slice's error detail rendered underneath
    expect(getByText('Gagal memuat data bibit')).toBeTruthy();
    expect(getByText('Koneksi terputus')).toBeTruthy();
  });

  it('renders empty state when no seeds and not loading', () => {
    const store = makeStore([], false, null);
    const { getByText } = renderScreen(store);

    expect(getByText('Tidak ada bibit tersedia')).toBeTruthy();
  });
});
