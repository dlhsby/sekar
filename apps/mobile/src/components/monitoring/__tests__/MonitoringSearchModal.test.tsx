/**
 * MonitoringSearchModal tests — Phase 4 M3 (CP-S2).
 *
 * Covers: recents on open (+ "Hapus semua"), typing → grouped results in the
 * Semua tab, and selecting a result. recentSearches is mocked; the modal is a
 * fullscreen RN Modal (renders children) and useMonitoringSearch runs for real.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MonitoringSearchModal } from '../MonitoringSearchModal';
import type { LiveUser, RayonBoundary } from '../../../types/models.types';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

jest.mock('../../../services/storage/recentSearches', () => ({
  getRecentSearches: jest.fn(() => Promise.resolve([])),
  addRecentSearch: jest.fn(),
  clearRecentSearches: jest.fn(() => Promise.resolve()),
}));
import { getRecentSearches, clearRecentSearches } from '../../../services/storage/recentSearches';
const mockGetRecents = getRecentSearches as jest.MockedFunction<typeof getRecentSearches>;
const mockClear = clearRecentSearches as jest.MockedFunction<typeof clearRecentSearches>;

const user = (id: string, name: string): LiveUser =>
  ({ id, full_name: name, role: 'satgas', location_name: 'Taman A', latitude: 1, longitude: 2 } as unknown as LiveUser);
const rayons: RayonBoundary[] = [
  ({
    id: 'r1',
    name: 'Rayon Pusat',
    center_lat: 3,
    center_lng: 4,
    area_count: 1,
    areas: [{ id: 'a1', name: 'Taman Bungkul', center_lat: 5, center_lng: 6, rayon_name: 'Rayon Pusat' }],
  } as unknown as RayonBoundary),
];
const liveUsers = [user('u1', 'Budi Santoso')];

function renderModal(overrides?: { onSelect?: jest.Mock }) {
  return render(
    <MonitoringSearchModal
      visible
      onClose={jest.fn()}
      liveUsers={liveUsers}
      rayons={rayons}
      onSelect={overrides?.onSelect ?? jest.fn()}
    />,
  );
}

describe('MonitoringSearchModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRecents.mockResolvedValue([]);
  });

  it('shows recents with "Hapus semua" and clears them', async () => {
    mockGetRecents.mockResolvedValue([
      { id: 'p9', type: 'petugas', name: 'Recent Guy', latitude: 0, longitude: 0 },
    ]);
    const { getByTestId, getByText } = renderModal();
    await waitFor(() => expect(getByText('Recent Guy')).toBeTruthy());
    expect(getByText('Terakhir dilihat')).toBeTruthy();

    fireEvent.press(getByTestId('recents-clear-all'));
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('shows the onboarding hint when there are no recents', async () => {
    const { getByText } = renderModal();
    await waitFor(() => expect(getByText('Mulai Mencari')).toBeTruthy());
  });

  it('shows grouped results when typing (Semua tab)', async () => {
    const { getByTestId, getByText } = renderModal();
    await waitFor(() => expect(getByText('Mulai Mencari')).toBeTruthy());

    fireEvent.changeText(getByTestId('monitoring-search-input'), 'taman');
    // Location section + the matching location row.
    expect(getByTestId('search-result-location-a1')).toBeTruthy();
    expect(getByText('Taman Bungkul')).toBeTruthy();
  });

  it('calls onSelect when a result is tapped', async () => {
    const onSelect = jest.fn();
    const { getByTestId } = renderModal({ onSelect });
    await waitFor(() => expect(getByTestId('monitoring-search-input')).toBeTruthy());

    fireEvent.changeText(getByTestId('monitoring-search-input'), 'budi');
    fireEvent.press(getByTestId('search-result-petugas-u1'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1', type: 'petugas' }));
  });
});
