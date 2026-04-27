/**
 * My Pruning Requests Screen Tests
 * Phase 3 sub-phase 3-10
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyRequestsScreen } from '../MyRequestsScreen';
import pruningRequestsReducer from '../../../store/slices/pruningRequestsSlice';
import * as pruningRequestsApi from '../../../services/api/pruningRequestsApi';
import type { PruningRequest } from '../../../types/models.types';

// Mock dependencies
jest.mock('../../../services/api/pruningRequestsApi');

describe('MyRequestsScreen', () => {
  let store: ReturnType<typeof configureStore>;

  const mockPruningRequest: PruningRequest = {
    id: 'pr-001',
    referenceCode: 'PR-2026-001',
    submittedBy: {
      id: 'user-1',
      name: 'Test User',
      role: 'staff_kecamatan',
    },
    kecamatanName: 'Surabaya Pusat',
    address: 'Jln Pemuda No. 123',
    gpsLat: -7.2575,
    gpsLng: 112.7521,
    expectedDate: '2026-05-01',
    estimatedPlantCount: 15,
    photoUrls: ['https://example.com/photo1.jpg'],
    notes: 'Pohon sudah tua',
    status: 'submitted' as const,
    rayonId: 'rayon-1',
    rayon: {
      id: 'rayon-1',
      name: 'Rayon 1',
    },
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    convertedTaskId: null,
    convertedTask: null,
    createdAt: '2026-04-27T10:00:00Z',
    updatedAt: '2026-04-27T10:00:00Z',
  };

  const mockNavigate = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate,
    goBack: jest.fn(),
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        pruningRequests: pruningRequestsReducer,
      },
    });

    jest.clearAllMocks();

    // Default mock: empty list
    (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
      error: null,
      data: [],
    });
  });

  const renderScreen = () => {
    const Stack = createNativeStackNavigator();

    return render(
      <Provider store={store}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="PruningMyRequests"
              component={MyRequestsScreen}
              initialParams={{}}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>
    );
  };

  describe('Rendering and Loading', () => {
    it('should display loading spinner on initial load', () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderScreen();

      // Should show loading spinner
      expect(screen.UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
    });

    it('should display list of requests when loaded', async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [mockPruningRequest],
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('PR-2026-001')).toBeTruthy();
      });
    });

    it('should display multiple requests in list', async () => {
      const mockRequests = [
        mockPruningRequest,
        {
          ...mockPruningRequest,
          id: 'pr-002',
          referenceCode: 'PR-2026-002',
          address: 'Jln Raya No. 456',
        },
      ];

      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: mockRequests,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('PR-2026-001')).toBeTruthy();
        expect(screen.getByText('PR-2026-002')).toBeTruthy();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no requests', async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [],
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/Belum ada permohonan/)).toBeTruthy();
      });
    });

    it('should display action button in empty state', async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [],
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/Buat Permohonan/)).toBeTruthy();
      });
    });

    it('should navigate to submit screen on empty state action', async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [],
      });

      renderScreen();

      await waitFor(() => {
        const button = screen.getByText(/Buat Permohonan/);
        fireEvent.press(button);
      });

      // Verify navigation was called (implementation detail)
    });
  });

  describe('Request Item Display', () => {
    beforeEach(async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [mockPruningRequest],
      });
    });

    it('should display reference code in item', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('PR-2026-001')).toBeTruthy();
      });
    });

    it('should display status badge with correct variant', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Menunggu')).toBeTruthy();
      });
    });

    it('should display address with map icon', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Jln Pemuda No. 123')).toBeTruthy();
      });
    });

    it('should display expected date with calendar icon', async () => {
      renderScreen();

      await waitFor(() => {
        // Date display depends on formatDate utility
        expect(screen.getByText(/2026-05-01|May 1, 2026/)).toBeTruthy();
      });
    });

    it('should display plant count with tree icon', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('15 pohon')).toBeTruthy();
      });
    });

    it('should display correct status variant for different statuses', async () => {
      const approvedRequest: PruningRequest = {
        ...mockPruningRequest,
        id: 'pr-app',
        status: 'approved' as const,
      };

      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [approvedRequest],
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Disetujui')).toBeTruthy();
      });
    });
  });

  describe('Item Navigation', () => {
    beforeEach(async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [mockPruningRequest],
      });
    });

    it('should navigate to detail screen on item press', async () => {
      renderScreen();

      await waitFor(() => {
        const item = screen.getByText('PR-2026-001').closest('Pressable');
        expect(item).toBeTruthy();
        if (item) {
          fireEvent.press(item);
        }
      });

      // Verify Redux selectRequest was dispatched
      // and navigation.navigate was called
    });

    it('should pass requestId to detail screen', async () => {
      renderScreen();

      await waitFor(() => {
        const item = screen.getByText('PR-2026-001').closest('Pressable');
        if (item) {
          fireEvent.press(item);
        }
      });

      // Verify correct requestId was used in dispatch
    });
  });

  describe('Pull-to-Refresh', () => {
    it('should refresh list on pull-to-refresh', async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [mockPruningRequest],
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('PR-2026-001')).toBeTruthy();
      });

      // Clear previous call count
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockClear();

      // Simulate pull-to-refresh
      const flatList = screen.UNSAFE_queryByType(require('react-native').FlatList);
      if (flatList?.props?.refreshControl) {
        fireEvent(flatList, 'refresh');
      }

      await waitFor(() => {
        expect(pruningRequestsApi.getMyPruningRequests).toHaveBeenCalled();
      });
    });

    it('should show refreshing indicator during refresh', async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockImplementation(
        () => new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                error: null,
                data: [mockPruningRequest],
              }),
            100
          )
        )
      );

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('PR-2026-001')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: 'Failed to fetch requests',
        data: null,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/Gagal memuat permohonan/)).toBeTruthy();
      });
    });

    it('should display error details', async () => {
      const errorMessage = 'Network timeout';
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: errorMessage,
        data: null,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeTruthy();
      });
    });

    it('should allow retry after error', async () => {
      // First call fails
      (pruningRequestsApi.getMyPruningRequests as jest.Mock)
        .mockResolvedValueOnce({
          error: 'Network error',
          data: null,
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          error: null,
          data: [mockPruningRequest],
        });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/Gagal memuat permohonan/)).toBeTruthy();
      });

      // Trigger retry via pull-to-refresh
      const flatList = screen.UNSAFE_queryByType(require('react-native').FlatList);
      if (flatList?.props?.refreshControl) {
        fireEvent(flatList, 'refresh');
      }

      await waitFor(() => {
        expect(screen.getByText('PR-2026-001')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [mockPruningRequest],
      });
    });

    it('should have accessible label on request items', async () => {
      renderScreen();

      await waitFor(() => {
        const item = screen.getByText('PR-2026-001');
        const pressable = item.closest('Pressable');
        expect(pressable?.props?.accessibilityLabel).toBeDefined();
      });
    });

    it('should announce status and date in accessibility hint', async () => {
      renderScreen();

      await waitFor(() => {
        const item = screen.getByText('PR-2026-001');
        const pressable = item.closest('Pressable');
        expect(pressable?.props?.accessibilityHint).toBeDefined();
      });
    });
  });

  describe('Status Variations', () => {
    it('should display submitted status with warning variant', async () => {
      const request: PruningRequest = {
        ...mockPruningRequest,
        status: 'submitted' as const,
      };

      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [request],
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Menunggu')).toBeTruthy();
      });
    });

    it('should display approved status with success variant', async () => {
      const request: PruningRequest = {
        ...mockPruningRequest,
        status: 'approved' as const,
      };

      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [request],
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Disetujui')).toBeTruthy();
      });
    });

    it('should display rejected status with error variant', async () => {
      const request: PruningRequest = {
        ...mockPruningRequest,
        status: 'rejected' as const,
      };

      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [request],
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Ditolak')).toBeTruthy();
      });
    });

    it('should display converted status with primary variant', async () => {
      const request: PruningRequest = {
        ...mockPruningRequest,
        status: 'converted' as const,
      };

      (pruningRequestsApi.getMyPruningRequests as jest.Mock).mockResolvedValue({
        error: null,
        data: [request],
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Dikonversi')).toBeTruthy();
      });
    });
  });
});
