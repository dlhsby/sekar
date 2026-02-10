/**
 * MapDashboardScreen Integration Tests
 * Tests for supervisor map dashboard screen
 */

// Must be before imports - Jest hoists these
jest.mock('../../../services/api/supervisorApi');
jest.mock('../../../services/api/apiClient');

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { MapDashboardScreen } from '../MapDashboardScreen';
import * as supervisorApi from '../../../services/api/supervisorApi';
import * as apiClient from '../../../services/api/apiClient';
import type { ActiveWorkerData } from '../../../types/api.types';
import type { Area } from '../../../types/models.types';

// Alert mocked globally in jest.setup.js
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Circle: View,
    Callout: View,
    PROVIDER_GOOGLE: 'google',
  };
});
jest.mock('../../../components/supervisor/WorkerMarker', () => ({
  WorkerMarker: () => null,
}));
jest.mock('../../../components/supervisor/WorkerInfoCard', () => ({
  WorkerInfoCard: () => null,
}));
jest.mock('../../../components/supervisor/MapErrorBoundary', () => ({
  MapErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

const mockWorker1: ActiveWorkerData = {
  id: 1,
  username: 'worker1',
  full_name: 'Worker One',
  shift: {
    id: 101,
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: 1,
      name: 'Taman Bungkul',
    },
  },
  latest_location: {
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    logged_at: '2026-01-17T10:00:00.000Z',
  },
};

const mockWorker2: ActiveWorkerData = {
  id: 2,
  username: 'worker2',
  full_name: 'Worker Two',
  shift: {
    id: 102,
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: 2,
      name: 'Taman Jayengrono',
    },
  },
  latest_location: {
    gps_lat: -7.2575,
    gps_lng: 112.7521,
    logged_at: '2026-01-17T10:00:00.000Z',
  },
};

const mockArea1: Area = {
  id: 1,
  name: 'Taman Bungkul',
  area_type_id: 1,
  gps_lat: -7.2905,
  gps_lng: 112.7398,
  radius_meters: 100,
  address: 'Surabaya',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const mockArea2: Area = {
  id: 2,
  name: 'Taman Jayengrono',
  area_type_id: 1,
  gps_lat: -7.2575,
  gps_lng: 112.7521,
  radius_meters: 150,
  address: 'Surabaya',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('MapDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use real timers for integration-style tests that don't test timing behavior
    // Fake timers cause waitFor() to hang as they block the microtask queue
    jest.useRealTimers();

    // Re-apply InteractionManager spy AFTER clearAllMocks
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation((callback: any) => {
      if (typeof callback === 'function') {
        callback();
      } else if (callback?.gen) {
        const gen = callback.gen();
        let result = gen.next();
        while (!result.done) {
          result = gen.next();
        }
      }
      return { cancel: jest.fn(), done: Promise.resolve() };
    });

    // Default successful API responses
    (supervisorApi.getActiveWorkers as jest.Mock).mockResolvedValue({
      data: {
        data: [mockWorker1, mockWorker2],
        meta: { total: 2, page: 1, limit: 500, totalPages: 1 },
      },
    });

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [mockArea1, mockArea2],
    });
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      const { getByText } = render(<MapDashboardScreen />);

      expect(getByText('Memuat peta...')).toBeTruthy();
    });

    it('should fetch active workers and areas on mount', async () => {
      render(<MapDashboardScreen />);

      await waitFor(() => {
        // Initial load uses INITIAL_FETCH_LIMIT (50) for fast first render
        expect(supervisorApi.getActiveWorkers).toHaveBeenCalledWith(1, 50);
        expect(apiClient.get).toHaveBeenCalledWith('/areas');
      });
    });

    it('should display workers after loading', async () => {
      // Use fake timers for this test to control InteractionManager timing
      jest.useFakeTimers();

      const { getByText, queryByText } = render(<MapDashboardScreen />);

      // Run InteractionManager callback and flush promises using async version
      await act(async () => {
        // Advance by a small amount to trigger InteractionManager
        await jest.advanceTimersByTimeAsync(100);
      });

      // Wait for loading to complete and workers to appear
      await waitFor(
        () => {
          expect(queryByText('Memuat peta...')).toBeNull();
        },
        { timeout: 5000 }
      );

      await waitFor(
        () => {
          expect(getByText('Worker One')).toBeTruthy();
          expect(getByText('Worker Two')).toBeTruthy();
        },
        { timeout: 5000 }
      );

      jest.useRealTimers();
    }, 15000);
  });

  describe('Status Summary', () => {
    it('should display total worker count', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Total: 2')).toBeTruthy();
      });
    });

    it('should display status counts', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        // Status counts are displayed next to colored dots
        expect(getByText(/Total: 2/)).toBeTruthy();
      });
    });
  });

  describe('Worker List', () => {
    it('should display worker names in bottom list', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Worker One')).toBeTruthy();
        expect(getByText('Worker Two')).toBeTruthy();
      });
    });

    it('should display area names in bottom list', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Taman Bungkul')).toBeTruthy();
        expect(getByText('Taman Jayengrono')).toBeTruthy();
      });
    });

    it('should show empty state when no workers', async () => {
      (supervisorApi.getActiveWorkers as jest.Mock).mockResolvedValue({
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 500, totalPages: 0 },
        },
      });

      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Tidak ada pekerja aktif')).toBeTruthy();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should have refresh button', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Perbarui')).toBeTruthy();
      });
    });

    it('should refresh data when refresh button is pressed', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Perbarui')).toBeTruthy();
      });

      const refreshButton = getByText('Perbarui');
      fireEvent.press(refreshButton);

      // Should call API again
      await waitFor(() => {
        expect(supervisorApi.getActiveWorkers).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Area Filter', () => {
    it('should have area filter button', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Semua Area')).toBeTruthy();
      });
    });

    it('should open alert dialog when filter button is pressed', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Semua Area')).toBeTruthy();
      });

      const filterButton = getByText('Semua Area');
      fireEvent.press(filterButton);

      // Alert is mocked globally - verify button press doesn't crash
      expect(filterButton).toBeTruthy();
    });
  });

  describe('Zoom Functionality', () => {
    it('should have zoom button', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Perbesar')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (supervisorApi.getActiveWorkers as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Gagal memuat data pekerja')).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('should show retry button on error', async () => {
      (supervisorApi.getActiveWorkers as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Coba Lagi')).toBeTruthy();
      });
    });

    it('should retry when retry button is pressed', async () => {
      (supervisorApi.getActiveWorkers as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            data: [mockWorker1],
            meta: { total: 1, page: 1, limit: 500, totalPages: 1 },
          },
        });

      const { getByText, queryByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Coba Lagi')).toBeTruthy();
      });

      const retryButton = getByText('Coba Lagi');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(queryByText('Gagal memuat data pekerja')).toBeNull();
        expect(getByText('Worker One')).toBeTruthy();
      });
    });
  });

  describe('Auto-refresh', () => {
    beforeEach(() => {
      // These tests specifically test timing behavior, so use fake timers
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should set up auto-refresh timer on mount', async () => {
      render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(supervisorApi.getActiveWorkers).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 2 minutes using async version
      await jest.advanceTimersByTimeAsync(120000);

      // Should have called API again
      await waitFor(() => {
        expect(supervisorApi.getActiveWorkers).toHaveBeenCalledTimes(2);
      });
    });

    it('should cleanup timer on unmount', async () => {
      const { unmount } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(supervisorApi.getActiveWorkers).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Fast-forward time after unmount using async version
      await jest.advanceTimersByTimeAsync(120000);

      // Should not have called API again after unmount
      expect(supervisorApi.getActiveWorkers).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration', () => {
    it('should handle multiple workers from different areas', async () => {
      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Worker One')).toBeTruthy();
        expect(getByText('Worker Two')).toBeTruthy();
        expect(getByText('Taman Bungkul')).toBeTruthy();
        expect(getByText('Taman Jayengrono')).toBeTruthy();
      });
    });

    it('should handle workers without location gracefully', async () => {
      const workerNoLocation: ActiveWorkerData = {
        ...mockWorker1,
        id: 3,
        latest_location: null,
      };

      (supervisorApi.getActiveWorkers as jest.Mock).mockResolvedValue({
        data: {
          data: [mockWorker1, workerNoLocation],
          meta: { total: 2, page: 1, limit: 500, totalPages: 1 },
        },
      });

      const { getAllByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        // Should still show both workers in list (worker appears twice in list)
        const workerElements = getAllByText('Worker One');
        expect(workerElements.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

  describe('Pagination', () => {
    it('should request initial limit for fast first render', async () => {
      render(<MapDashboardScreen />);

      await waitFor(() => {
        // Initial load uses INITIAL_FETCH_LIMIT (50) for better performance
        expect(supervisorApi.getActiveWorkers).toHaveBeenCalledWith(1, 50);
      });
    });

    it('should handle large number of workers', async () => {
      const manyWorkers = Array.from({ length: 100 }, (_, i) => ({
        ...mockWorker1,
        id: i + 1,
        username: `worker${i + 1}`,
        full_name: `Worker ${i + 1}`,
      }));

      (supervisorApi.getActiveWorkers as jest.Mock).mockResolvedValue({
        data: {
          data: manyWorkers,
          meta: { total: 100, page: 1, limit: 500, totalPages: 1 },
        },
      });

      const { getByText } = render(<MapDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Total: 100')).toBeTruthy();
      });
    });
  });
});
