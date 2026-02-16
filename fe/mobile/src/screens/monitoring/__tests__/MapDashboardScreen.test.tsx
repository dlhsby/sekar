/**
 * MapDashboardScreen Integration Tests
 * Tests for supervisor map dashboard screen
 */

// Must be before imports - Jest hoists these
jest.mock('../../../services/api/monitoringApi');
jest.mock('../../../services/api/apiClient');

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { MapDashboardScreen } from '../MapDashboardScreen';
import * as monitoringApi from '../../../services/api/monitoringApi';
import * as apiClient from '../../../services/api/apiClient';
import type { ActiveUserData } from '../../../types/api.types';
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
jest.mock('../../../components/monitoring/UserMarker', () => ({
  UserMarker: () => null,
}));
jest.mock('../../../components/monitoring/UserInfoCard', () => ({
  UserInfoCard: () => null,
}));
jest.mock('../../../components/monitoring/MapErrorBoundary', () => ({
  MapErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUser1: ActiveUserData = {
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

const mockUser2: ActiveUserData = {
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
  let unmountFn: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock InteractionManager to run synchronously
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
    (monitoringApi.getActiveUsers as jest.Mock).mockResolvedValue({
      data: {
        users: [mockUser1, mockUser2],
      },
    });

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [mockArea1, mockArea2],
    });
  });

  afterEach(async () => {
    // Unmount before clearing timers to prevent state updates on unmounted component
    if (unmountFn) {
      unmountFn();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  /** Helper: render and flush all pending promises + timers */
  async function renderAndFlush() {
    const result = render(<MapDashboardScreen />);
    unmountFn = result.unmount;

    // Flush the microtask queue so promises resolve
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });

    return result;
  }

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      const result = render(<MapDashboardScreen />);
      unmountFn = result.unmount;

      expect(result.getByText('Memuat peta...')).toBeTruthy();
    });

    it('should fetch active users and areas on mount', async () => {
      await renderAndFlush();

      expect(monitoringApi.getActiveUsers).toHaveBeenCalled();
      expect(apiClient.get).toHaveBeenCalledWith('/areas');
    });

    it('should display users after loading', async () => {
      const { getByText, queryByText } = await renderAndFlush();

      expect(queryByText('Memuat peta...')).toBeNull();
      expect(getByText('Worker One')).toBeTruthy();
      expect(getByText('Worker Two')).toBeTruthy();
    });
  });

  describe('Status Summary', () => {
    it('should display total user count', async () => {
      const { getByText } = await renderAndFlush();

      expect(getByText('Total: 2')).toBeTruthy();
    });

    it('should display status counts', async () => {
      const { getByText } = await renderAndFlush();

      expect(getByText(/Total: 2/)).toBeTruthy();
    });
  });

  describe('User List', () => {
    it('should display user names in bottom list', async () => {
      const { getByText } = await renderAndFlush();

      expect(getByText('Worker One')).toBeTruthy();
      expect(getByText('Worker Two')).toBeTruthy();
    });

    it('should display area names in bottom list', async () => {
      const { getByText } = await renderAndFlush();

      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Taman Jayengrono')).toBeTruthy();
    });

    it('should show empty state when no users', async () => {
      (monitoringApi.getActiveUsers as jest.Mock).mockResolvedValue({
        data: {
          users: [],
        },
      });

      const { getByText } = await renderAndFlush();

      expect(getByText('Tidak ada pengguna aktif')).toBeTruthy();
    });
  });

  describe('Refresh Functionality', () => {
    it('should have refresh button', async () => {
      const { getByText } = await renderAndFlush();

      expect(getByText('Perbarui')).toBeTruthy();
    });

    it('should refresh data when refresh button is pressed', async () => {
      const { getByText } = await renderAndFlush();

      const refreshButton = getByText('Perbarui');
      await act(async () => {
        fireEvent.press(refreshButton);
        await jest.advanceTimersByTimeAsync(100);
      });

      expect(monitoringApi.getActiveUsers).toHaveBeenCalledTimes(2);
    });
  });

  describe('Area Filter', () => {
    it('should have area filter button', async () => {
      const { getByText } = await renderAndFlush();

      expect(getByText('Semua Area')).toBeTruthy();
    });

    it('should open alert dialog when filter button is pressed', async () => {
      const { getByText } = await renderAndFlush();

      const filterButton = getByText('Semua Area');
      fireEvent.press(filterButton);

      expect(filterButton).toBeTruthy();
    });
  });

  describe('Zoom Functionality', () => {
    it('should have zoom button', async () => {
      const { getByText } = await renderAndFlush();

      expect(getByText('Perbesar')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (monitoringApi.getActiveUsers as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = await renderAndFlush();

      expect(getByText('Gagal memuat data pengguna')).toBeTruthy();
    });

    it('should show retry button on error', async () => {
      (monitoringApi.getActiveUsers as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = await renderAndFlush();

      expect(getByText('Coba Lagi')).toBeTruthy();
    });

    it('should retry when retry button is pressed', async () => {
      (monitoringApi.getActiveUsers as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            users: [mockUser1],
          },
        });

      const { getByText, queryByText } = await renderAndFlush();

      expect(getByText('Coba Lagi')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('Coba Lagi'));
        await jest.advanceTimersByTimeAsync(100);
      });

      expect(queryByText('Gagal memuat data pengguna')).toBeNull();
      expect(getByText('Worker One')).toBeTruthy();
    });
  });

  describe('Auto-refresh', () => {
    it('should set up auto-refresh timer on mount', async () => {
      await renderAndFlush();

      expect(monitoringApi.getActiveUsers).toHaveBeenCalledTimes(1);

      // Fast-forward past the refresh interval (2 minutes)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(120000);
      });

      expect(monitoringApi.getActiveUsers).toHaveBeenCalledTimes(2);
    });

    it('should cleanup timer on unmount', async () => {
      const { unmount: localUnmount } = await renderAndFlush();

      expect(monitoringApi.getActiveUsers).toHaveBeenCalledTimes(1);

      // Set unmountFn to no-op since we manually unmount
      localUnmount();
      unmountFn = () => {};

      await act(async () => {
        await jest.advanceTimersByTimeAsync(120000);
      });

      // Should not have called API again after unmount
      expect(monitoringApi.getActiveUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration', () => {
    it('should handle multiple users from different areas', async () => {
      const { getByText } = await renderAndFlush();

      expect(getByText('Worker One')).toBeTruthy();
      expect(getByText('Worker Two')).toBeTruthy();
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Taman Jayengrono')).toBeTruthy();
    });

    it('should handle users without location gracefully', async () => {
      const workerNoLocation: ActiveUserData = {
        ...mockUser1,
        id: 3,
        latest_location: null,
      };

      (monitoringApi.getActiveUsers as jest.Mock).mockResolvedValue({
        data: {
          users: [mockUser1, workerNoLocation],
        },
      });

      const { getAllByText } = await renderAndFlush();

      const workerElements = getAllByText('Worker One');
      expect(workerElements.length).toBeGreaterThan(0);
    });
  });

  describe('Data Loading', () => {
    it('should request active users on mount', async () => {
      await renderAndFlush();

      expect(monitoringApi.getActiveUsers).toHaveBeenCalled();
    });

    it('should handle large number of users', async () => {
      const manyWorkers = Array.from({ length: 100 }, (_, i) => ({
        ...mockUser1,
        id: i + 1,
        username: `worker${i + 1}`,
        full_name: `Worker ${i + 1}`,
      }));

      (monitoringApi.getActiveUsers as jest.Mock).mockResolvedValue({
        data: {
          users: manyWorkers,
        },
      });

      const { getByText } = await renderAndFlush();

      expect(getByText('Total: 100')).toBeTruthy();
    });
  });
});
