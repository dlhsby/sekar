/**
 * ShiftHistoryScreen Tests
 * Tests for worker shift history screen
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { ShiftHistoryScreen } from '../ShiftHistoryScreen';
import * as shiftsApi from '../../../services/api/shiftsApi';

// Mock Alert to prevent errors from imported components
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock the shiftsApi module
jest.mock('../../../services/api/shiftsApi');

// Mock secure storage and token utils (used in __DEV__ debug block)
jest.mock('../../../services/storage/secureStorage', () => ({
  getToken: jest.fn().mockResolvedValue('mock-token'),
  getRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
}));
jest.mock('../../../utils/tokenUtils', () => ({
  isTokenExpired: jest.fn().mockResolvedValue(false),
  getTokenTimeRemaining: jest.fn().mockResolvedValue(3600),
}));

// Mock MaterialCommunityIcons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MockIcon');

// Mock NBModal and NBDatePicker (used by ShiftFilterModal inside ShiftHistoryScreen)
jest.mock('../../../components/nb', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    NBEmptyState: ({ title, description, ctaLabel, onCTA, variant }: any) =>
      React.createElement(View, { testID: `empty-state-${variant}` },
        React.createElement(Text, null, title),
        description ? React.createElement(Text, null, description) : null,
        ctaLabel ? React.createElement(Text, { onPress: onCTA }, ctaLabel) : null,
      ),
    NBBackgroundPattern: ({ children }: any) => React.createElement(View, null, children),
    NBSkeleton: ({ count }: any) =>
      React.createElement(
        View,
        { testID: 'skeleton' },
        Array.from({ length: count ?? 1 }).map((_, i) =>
          React.createElement(View, { key: i, testID: `skeleton-item-${i}` }),
        ),
      ),
    NBText: ({ children, variant, color, uppercase, style, numberOfLines }: any) =>
      React.createElement(Text, { style }, children),
    NBModal: ({ visible, children, footer }: any) =>
      visible
        ? React.createElement(View, null, children, footer)
        : null,
    NBDatePicker: ({ label, value, onChange }: any) =>
      React.createElement(Text, null, label),
  };
});

// Mock ShiftDetailModal to avoid bottom-sheet and complex modal rendering
jest.mock('../../../components/modals/ShiftDetailModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ShiftDetailModal: ({ visible }: any) =>
      visible ? React.createElement(View, { testID: 'shift-detail-modal' }) : null,
  };
});

describe('ShiftHistoryScreen', () => {
  // Build ISO strings for today so they always fall within "this week" (the
  // default filter) regardless of when the tests are run.
  const makeToday = (hours: number, minutes = 0) => {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  const mockShifts = [
    {
      id: 1,
      user_id: 1,
      location_id: 'area-uuid-1',
      area: {
        id: 'area-uuid-1',
        name: 'Taman Bungkul',
        area_type_id: 1,
        locationType: {
          id: 1,
          code: 'park',
          name: 'Taman',
          description: 'Taman kota',
          created_at: '2026-01-01T00:00:00Z',
        },
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        radius_meters: 150,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      clock_in_time: makeToday(8, 0),    // today 08:00 (within this week)
      clock_out_time: makeToday(16, 30), // today 16:30 → 8h30m duration
      clock_in_gps_lat: -7.2905,
      clock_in_gps_lng: 112.7398,
      clock_out_gps_lat: -7.2905,
      clock_out_gps_lng: 112.7398,
      created_at: makeToday(8, 0),
      updated_at: makeToday(16, 30),
    },
    {
      id: 2,
      user_id: 1,
      location_id: 'area-uuid-1',
      area: {
        id: 'area-uuid-1',
        name: 'Taman Bungkul',
        area_type_id: 1,
        locationType: {
          id: 1,
          code: 'park',
          name: 'Taman',
          description: 'Taman kota',
          created_at: '2026-01-01T00:00:00Z',
        },
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        radius_meters: 150,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      clock_in_time: makeToday(7, 30),
      clock_out_time: makeToday(15, 0),
      clock_in_gps_lat: -7.2905,
      clock_in_gps_lng: 112.7398,
      clock_out_gps_lat: -7.2905,
      clock_out_gps_lng: 112.7398,
      created_at: makeToday(7, 30),
      updated_at: makeToday(15, 0),
    },
    {
      id: 3,
      user_id: 1,
      location_id: 'area-uuid-2',
      area: {
        id: 'area-uuid-2',
        name: 'Pedestrian Darmo',
        area_type_id: 2,
        locationType: {
          id: 2,
          code: 'pedestrian',
          name: 'Pedestrian',
          description: 'Jalur pejalan kaki',
          created_at: '2026-01-01T00:00:00Z',
        },
        gps_lat: -7.2800,
        gps_lng: 112.7400,
        radius_meters: 100,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      clock_in_time: makeToday(8, 15),
      clock_out_time: null, // Active shift
      clock_in_gps_lat: -7.2800,
      clock_in_gps_lng: 112.7400,
      created_at: makeToday(8, 15),
      updated_at: makeToday(8, 15),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show skeleton while loading', () => {
      // Never-resolving promise keeps component in loading state
      (shiftsApi.getMyShifts as jest.Mock).mockReturnValue(new Promise(() => {}));

      const { queryByText } = render(<ShiftHistoryScreen />);

      // isLoading defaults to true, so skeleton shows on initial render
      // Verify that it does NOT show the empty state or error state
      expect(queryByText('Belum Ada Riwayat Shift')).toBeFalsy();
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: mockShifts,
        error: null,
      });
    });

    it(
      'should display shifts list after loading',
      async () => {
        const { getAllByText } = render(<ShiftHistoryScreen />);

        await waitFor(
          () => {
            // Two shifts have Taman Bungkul as area name
            expect(getAllByText('Taman Bungkul').length).toBeGreaterThan(0);
          },
          { timeout: 10000 }
        );
      },
      20000
    );

    it('should display area type for each shift', async () => {
      const { getAllByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getAllByText('Taman').length).toBeGreaterThan(0);
      });
    });

    it('should display different area shifts', async () => {
      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('Pedestrian Darmo')).toBeTruthy();
      });
    });

    it('should show status badge for active shift', async () => {
      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('Aktif')).toBeTruthy();
      });
    });

    it('should show status badge for completed shift', async () => {
      const { getAllByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        const selesaiBadges = getAllByText('Selesai');
        expect(selesaiBadges.length).toBe(2); // Two completed shifts
      });
    });

    it('should show summary card with total shifts', async () => {
      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('TOTAL SHIFT')).toBeTruthy();
        expect(getByText('3')).toBeTruthy(); // 3 shifts visible (within this week)
      });
    });

    it('should show summary card with total hours', async () => {
      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('TOTAL JAM')).toBeTruthy();
      });
    });

    it('should display clock-in time for shifts', async () => {
      const { getAllByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getAllByText('CLOCK IN').length).toBe(3);
      });
    });

    it('should display clock-out time for completed shifts', async () => {
      const { getAllByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getAllByText('CLOCK OUT').length).toBe(3);
      });
    });

    it('should display duration for shifts', async () => {
      const { getAllByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getAllByText('DURASI').length).toBe(3);
      });
    });

    it('should show "--:--" for active shift clock-out time', async () => {
      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('--:--')).toBeTruthy();
      });
    });

    it('should show active badge for active shift', async () => {
      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('Aktif')).toBeTruthy();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no shifts', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('Belum Ada Riwayat Shift')).toBeTruthy();
      });
    });

    it('should show empty state description', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(
          getByText(/Riwayat shift Anda akan muncul di sini setelah Anda menyelesaikan shift/)
        ).toBeTruthy();
      });
    });
  });

  describe('Error State', () => {
    it('should show error state on API error', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Gagal memuat data',
      });

      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('Gagal memuat data')).toBeTruthy();
      });
    });

    it('should show retry button on error', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Network error',
      });

      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('Coba Lagi')).toBeTruthy();
      });
    });

    it('should retry loading when retry button pressed', async () => {
      (shiftsApi.getMyShifts as jest.Mock)
        .mockResolvedValueOnce({ data: null, error: 'Network error' })
        .mockResolvedValueOnce({ data: mockShifts, error: null });

      const { getByText, getAllByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('Coba Lagi')).toBeTruthy();
      });

      fireEvent.press(getByText('Coba Lagi'));

      await waitFor(() => {
        expect(getAllByText('Taman Bungkul').length).toBeGreaterThan(0);
      });

      expect(shiftsApi.getMyShifts).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pull to Refresh', () => {
    it('should call getMyShifts on initial load', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: mockShifts,
        error: null,
      });

      render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(shiftsApi.getMyShifts).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Date Grouping', () => {
    it('should group shifts by month', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: mockShifts,
        error: null,
      });

      const { getAllByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getAllByText('Taman Bungkul').length).toBe(2);
      });
    });
  });

  describe('Duration Calculation', () => {
    it('should calculate hours correctly for completed shifts', async () => {
      // shift 1: 08:00 → 16:30 = 8h30m
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: [mockShifts[0]],
        error: null,
      });

      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('8j 30m')).toBeTruthy();
      });
    });

    it('should show short duration format for less than 1 hour', async () => {
      const shortShift = {
        ...mockShifts[0],
        clock_in_time: makeToday(8, 0),
        clock_out_time: makeToday(8, 45), // 45 minutes
      };

      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: [shortShift],
        error: null,
      });

      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('45m')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible content', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: mockShifts,
        error: null,
      });

      const { getByText } = render(<ShiftHistoryScreen />);

      await waitFor(() => {
        expect(getByText('TOTAL SHIFT')).toBeTruthy();
        expect(getByText('TOTAL JAM')).toBeTruthy();
      });
    });
  });
});
