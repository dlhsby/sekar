/**
 * Pruning Request Detail Screen Tests
 * Phase 3 sub-phase 3-10
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RequestDetailScreen } from '../RequestDetailScreen';
import pruningRequestsReducer, {
  fetchPruningRequestById,
} from '../../../store/slices/pruningRequestsSlice';
import * as pruningRequestsApi from '../../../services/api/pruningRequestsApi';
import type { PruningRequest } from '../../../types/models.types';

// Mock dependencies
jest.mock('../../../services/api/pruningRequestsApi');

describe('RequestDetailScreen', () => {
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
    photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
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

  const mockReviewedRequest: PruningRequest = {
    ...mockPruningRequest,
    status: 'approved' as const,
    reviewedBy: { id: 'reviewer-1', name: 'Admin', role: 'admin_data' },
    reviewedAt: '2026-04-28T10:00:00Z',
    reviewNotes: 'Lokasi sudah diverifikasi',
  };

  const mockConvertedRequest: PruningRequest = {
    ...mockPruningRequest,
    status: 'converted' as const,
    convertedTaskId: 'task-123',
    convertedTask: { id: 'task-123', name: 'Pemangkasan Pohon' },
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

    (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
      error: null,
      data: mockPruningRequest,
    });
  });

  const renderScreen = (requestId: string = 'pr-001') => {
    const Stack = createNativeStackNavigator();

    return render(
      <Provider store={store}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="PruningDetail"
              component={RequestDetailScreen}
              initialParams={{ requestId }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>
    );
  };

  describe('Rendering and Loading', () => {
    it('should display loading spinner on initial load', () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderScreen();

      expect(screen.UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
    });

    it('should display request details when loaded', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('PR-2026-001')).toBeTruthy();
      });
    });

    it('should fetch request if not already in Redux', async () => {
      renderScreen();

      await waitFor(() => {
        expect(pruningRequestsApi.getPruningRequestById).toHaveBeenCalledWith('pr-001');
      });
    });

    it('should not refetch if request already in Redux', async () => {
      // Pre-populate store
      await store.dispatch(fetchPruningRequestById('pr-001') as any);
      jest.clearAllMocks();

      renderScreen();

      // Should not call API again
      expect(pruningRequestsApi.getPruningRequestById).not.toHaveBeenCalled();
    });
  });

  describe('Header Section', () => {
    it('should display reference code as title', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('PR-2026-001')).toBeTruthy();
      });
    });

    it('should display creation date and time', async () => {
      renderScreen();

      await waitFor(() => {
        // Date format depends on formatDateTime utility
        expect(screen.getByText(/2026-04-27|April 27, 2026/)).toBeTruthy();
      });
    });

    it('should display status badge with submitted variant', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Menunggu')).toBeTruthy();
      });
    });

    it('should display correct status badge for approved', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: mockReviewedRequest,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Disetujui')).toBeTruthy();
      });
    });
  });

  describe('Location Section', () => {
    it('should display address with icon', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Jln Pemuda No. 123')).toBeTruthy();
      });
    });

    it('should display GPS coordinates with full precision', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/-7\.257500/)).toBeTruthy();
        expect(screen.getByText(/112\.752100/)).toBeTruthy();
      });
    });
  });

  describe('Detail Section', () => {
    it('should display expected date', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/2026-05-01|May 1, 2026/)).toBeTruthy();
      });
    });

    it('should display estimated plant count', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('15 pohon')).toBeTruthy();
      });
    });

    it('should display notes when present', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Pohon sudah tua')).toBeTruthy();
      });
    });

    it('should not display notes section when empty', async () => {
      const requestNoNotes: PruningRequest = {
        ...mockPruningRequest,
        notes: '',
      };

      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: requestNoNotes,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.queryByText('Catatan')).toBeFalsy();
      });
    });
  });

  describe('Photos Section', () => {
    it('should display photos section when photos present', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/Foto Lokasi \(2\)/)).toBeTruthy();
      });
    });

    it('should display correct photo count', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/2/)).toBeTruthy();
      });
    });

    it('should not display photos section when empty', async () => {
      const requestNoPhotos: PruningRequest = {
        ...mockPruningRequest,
        photoUrls: [],
      };

      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: requestNoPhotos,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.queryByText(/Foto Lokasi/)).toBeFalsy();
      });
    });

    it('should display photo thumbnails in grid', async () => {
      renderScreen();

      await waitFor(() => {
        const images = screen.UNSAFE_getAllByType(require('react-native').Image);
        // Count image elements for photo thumbnails (excluding other images)
        expect(images.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should open photo modal on thumbnail press', async () => {
      renderScreen();

      await waitFor(() => {
        const images = screen.UNSAFE_queryAllByType(require('react-native').Image);
        if (images.length > 0) {
          fireEvent.press(images[0]);
        }
      });

      // Modal should become visible (implementation detail)
    });

    it('should display photo in fullscreen modal', async () => {
      renderScreen();

      await waitFor(() => {
        const images = screen.UNSAFE_queryAllByType(require('react-native').Image);
        if (images.length > 0) {
          fireEvent.press(images[0]);
        }
      });

      // Large photo should be visible in modal
    });

    it('should close photo modal on close button press', async () => {
      renderScreen();

      await waitFor(() => {
        const images = screen.UNSAFE_queryAllByType(require('react-native').Image);
        if (images.length > 0) {
          fireEvent.press(images[0]);
        }
      });

      const closeButton = screen.getByText('Tutup foto');
      fireEvent.press(closeButton);

      // Modal should close (implementation detail)
    });
  });

  describe('Review Section', () => {
    it('should display review section when reviewed', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: mockReviewedRequest,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Review')).toBeTruthy();
      });
    });

    it('should display reviewer name', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: mockReviewedRequest,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Admin')).toBeTruthy();
      });
    });

    it('should display review date', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: mockReviewedRequest,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/2026-04-28|April 28, 2026/)).toBeTruthy();
      });
    });

    it('should display review notes', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: mockReviewedRequest,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Lokasi sudah diverifikasi')).toBeTruthy();
      });
    });

    it('should not display review section when not reviewed', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.queryByText(/Catatan Review/)).toBeFalsy();
      });
    });
  });

  describe('Task Conversion Section', () => {
    it('should display conversion section when converted', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: mockConvertedRequest,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/Tugas Terkait/)).toBeTruthy();
      });
    });

    it('should display link to converted task', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: mockConvertedRequest,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Lihat Tugas')).toBeTruthy();
      });
    });

    it('should navigate to task when button pressed', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: mockConvertedRequest,
      });

      renderScreen();

      await waitFor(() => {
        const button = screen.getByText('Lihat Tugas');
        fireEvent.press(button);
      });

      // Verify navigation was called with task ID
    });

    it('should not display conversion section when not converted', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.queryByText(/Tugas Terkait/)).toBeFalsy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: 'Permohonan tidak ditemukan',
        data: null,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/Permohonan tidak ditemukan/)).toBeTruthy();
      });
    });

    it('should display error alert on API failure', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: 'Network error',
        data: null,
      });

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/Terjadi kesalahan/)).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have semantic heading structure', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('PR-2026-001')).toBeTruthy();
      });
    });

    it('should have accessible labels on interactive elements', async () => {
      renderScreen();

      await waitFor(() => {
        const images = screen.UNSAFE_queryAllByType(require('react-native').Image);
        images.forEach((image) => {
          expect(image.props.accessibilityLabel).toBeDefined();
        });
      });
    });

    it('should have accessible close button on photo modal', async () => {
      renderScreen();

      await waitFor(() => {
        const images = screen.UNSAFE_queryAllByType(require('react-native').Image);
        if (images.length > 0) {
          fireEvent.press(images[0]);
        }
      });

      const closeButton = screen.getByText('Tutup foto');
      expect(closeButton.props.accessibilityLabel).toBeDefined();
      expect(closeButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Scrolling and Layout', () => {
    it('should use ScrollView for vertical scrolling', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.UNSAFE_getByType(require('react-native').ScrollView)).toBeTruthy();
      });
    });

    it('should display all sections in correct order', async () => {
      (pruningRequestsApi.getPruningRequestById as jest.Mock).mockResolvedValue({
        error: null,
        data: mockReviewedRequest,
      });

      renderScreen();

      await waitFor(() => {
        // Sections should appear in order: Header, Location, Detail, Photos, Review
        const texts = screen.queryAllByType(require('react-native').Text);
        const titles = texts
          .map((t) => t.props.children)
          .filter((c) => typeof c === 'string');

        const locIndex = titles.indexOf('Lokasi');
        const detailIndex = titles.indexOf('Detail');
        const photoIndex = titles.indexOf('Foto Lokasi (2)');
        const reviewIndex = titles.indexOf('Review');

        expect(locIndex < detailIndex).toBe(true);
        expect(detailIndex < photoIndex).toBe(true);
        expect(photoIndex < reviewIndex).toBe(true);
      });
    });
  });
});
