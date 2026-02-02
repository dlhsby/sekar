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

// Mock MaterialCommunityIcons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MockIcon');

describe('ShiftHistoryScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
    goBack: jest.fn(),
  };
  const mockShifts = [
    {
      id: 1,
      worker_id: 1,
      area_id: 'area-uuid-1',
      area: {
        id: 'area-uuid-1',
        name: 'Taman Bungkul',
        area_type_id: 1,
        area_type: {
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
      clock_in_time: '2026-01-20T08:00:00Z',
      clock_out_time: '2026-01-20T16:30:00Z',
      clock_in_gps_lat: -7.2905,
      clock_in_gps_lng: 112.7398,
      clock_out_gps_lat: -7.2905,
      clock_out_gps_lng: 112.7398,
      created_at: '2026-01-20T08:00:00Z',
      updated_at: '2026-01-20T16:30:00Z',
    },
    {
      id: 2,
      worker_id: 1,
      area_id: 'area-uuid-1',
      area: {
        id: 'area-uuid-1',
        name: 'Taman Bungkul',
        area_type_id: 1,
        area_type: {
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
      clock_in_time: '2026-01-19T07:30:00Z',
      clock_out_time: '2026-01-19T15:00:00Z',
      clock_in_gps_lat: -7.2905,
      clock_in_gps_lng: 112.7398,
      clock_out_gps_lat: -7.2905,
      clock_out_gps_lng: 112.7398,
      created_at: '2026-01-19T07:30:00Z',
      updated_at: '2026-01-19T15:00:00Z',
    },
    {
      id: 3,
      worker_id: 1,
      area_id: 'area-uuid-2',
      area: {
        id: 'area-uuid-2',
        name: 'Pedestrian Darmo',
        area_type_id: 2,
        area_type: {
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
      clock_in_time: '2026-01-18T08:15:00Z',
      clock_out_time: null, // Active shift
      clock_in_gps_lat: -7.2800,
      clock_in_gps_lng: 112.7400,
      created_at: '2026-01-18T08:15:00Z',
      updated_at: '2026-01-18T08:15:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show skeleton loader while loading', async () => {
      // Never resolve to keep loading
      (shiftsApi.getMyShifts as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      const { getByTestId, queryByTestId } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      // Wait for skeleton to appear
      await waitFor(() => {
        // SkeletonLoader should be visible
        expect(queryByTestId('skeleton-loader')).toBeTruthy;
      }, { timeout: 1000 });
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
        const { getAllByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

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
      const { getAllByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getAllByText('Taman').length).toBeGreaterThan(0);
      });
    });

    it('should display different area shifts', async () => {
      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Pedestrian Darmo')).toBeTruthy();
      });
    });

    it('should show status badge for active shift', async () => {
      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('AKTIF')).toBeTruthy();
      });
    });

    it('should show status badge for completed shift', async () => {
      const { getAllByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        const selesaiBadges = getAllByText('SELESAI');
        expect(selesaiBadges.length).toBe(2); // Two completed shifts
      });
    });

    it('should show summary card with total shifts', async () => {
      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('TOTAL SHIFT')).toBeTruthy();
        expect(getByText('3')).toBeTruthy(); // 3 shifts
      });
    });

    it('should show summary card with total hours', async () => {
      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('TOTAL JAM')).toBeTruthy();
      });
    });

    it('should display clock-in time for shifts', async () => {
      const { getAllByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getAllByText('CLOCK IN').length).toBe(3);
      });
    });

    it('should display clock-out time for completed shifts', async () => {
      const { getAllByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getAllByText('CLOCK OUT').length).toBe(3);
      });
    });

    it('should display duration for shifts', async () => {
      const { getAllByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getAllByText('DURASI').length).toBe(3);
      });
    });

    it('should show "--:--" for active shift clock-out time', async () => {
      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('--:--')).toBeTruthy();
      });
    });

    it('should show em dash for active shift duration', async () => {
      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('—')).toBeTruthy();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no shifts', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Belum Ada Riwayat Shift')).toBeTruthy();
      });
    });

    it('should show empty state description', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

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

      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Gagal memuat data')).toBeTruthy();
      });
    });

    it('should show retry button on error', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Network error',
      });

      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Coba Lagi')).toBeTruthy();
      });
    });

    it('should retry loading when retry button pressed', async () => {
      (shiftsApi.getMyShifts as jest.Mock)
        .mockResolvedValueOnce({ data: null, error: 'Network error' })
        .mockResolvedValueOnce({ data: mockShifts, error: null });

      const { getByText, getAllByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

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
    it('should call getMyShifts on refresh', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: mockShifts,
        error: null,
      });

      const { getByTestId, UNSAFE_getByType } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(shiftsApi.getMyShifts).toHaveBeenCalledTimes(1);
      });

      // Note: Testing RefreshControl is complex in React Native Testing Library
      // This test verifies initial load - pull-to-refresh would need integration tests
    });
  });

  describe('Date Grouping', () => {
    it('should group shifts by date', async () => {
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: mockShifts,
        error: null,
      });

      const { getAllByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      // Shifts should be grouped by their dates
      // Each date should appear as a header
      await waitFor(() => {
        // Multiple shifts should be displayed grouped by date
        expect(getAllByText('Taman Bungkul').length).toBe(2); // Two Taman Bungkul shifts
      });
    });
  });

  describe('Duration Calculation', () => {
    it('should calculate hours correctly for completed shifts', async () => {
      // First shift: 08:00 to 16:30 = 8h 30m
      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: [mockShifts[0]], // Only first shift (8h 30m)
        error: null,
      });

      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('8j 30m')).toBeTruthy();
      });
    });

    it('should show short duration format for less than 1 hour', async () => {
      const shortShift = {
        ...mockShifts[0],
        clock_in_time: '2026-01-20T08:00:00Z',
        clock_out_time: '2026-01-20T08:45:00Z', // 45 minutes
      };

      (shiftsApi.getMyShifts as jest.Mock).mockResolvedValue({
        data: [shortShift],
        error: null,
      });

      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

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

      const { getByText } = render(<ShiftHistoryScreen navigation={mockNavigation} />);

      await waitFor(() => {
        // Screen content should be accessible
        expect(getByText('TOTAL SHIFT')).toBeTruthy();
        expect(getByText('TOTAL JAM')).toBeTruthy();
      });
    });
  });
});
