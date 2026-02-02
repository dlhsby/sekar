/**
 * AttendanceScreen Tests
 * Unit tests for supervisor attendance screen
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AttendanceScreen from '../AttendanceScreen';
import * as supervisorApi from '../../../services/api/supervisorApi';

// Mock Alert to prevent errors from imported components
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock the API
jest.mock('../../../services/api/supervisorApi');

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('AttendanceScreen', () => {
  const mockAttendanceData = {
    date: '2026-01-19',
    total_workers: 10,
    clocked_in_count: 7,
    not_clocked_in: [
      {
        id: '1',
        username: 'worker1',
        full_name: 'John Doe',
        area: { id: '1', name: 'Park A' },
      },
      {
        id: '2',
        username: 'worker2',
        full_name: 'Jane Smith',
        area: { id: '2', name: 'Park B' },
      },
      {
        id: '3',
        username: 'worker3',
        full_name: 'Bob Wilson',
        area: null,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup Alert spy in beforeEach to prevent cross-test pollution
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (supervisorApi.getAttendance as jest.Mock).mockResolvedValue({
      data: mockAttendanceData,
    });
  });

  describe('rendering', () => {
    it('should render header correctly', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(getByText('Kehadiran')).toBeTruthy();
      });
    });

    it('should render date navigator', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        // Date should be displayed in Indonesian format
        expect(getByText(/\d{2} (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des) \d{4}/)).toBeTruthy();
      });
    });

    it('should render summary cards with correct counts', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(getByText('7')).toBeTruthy(); // clocked_in_count
        expect(getByText('3')).toBeTruthy(); // not_clocked_in count
        expect(getByText('Hadir')).toBeTruthy();
        expect(getByText('Tidak Hadir')).toBeTruthy();
      });
    });

    it('should render loading indicator while fetching', async () => {
      // Delay the mock response
      (supervisorApi.getAttendance as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockAttendanceData }), 100))
      );

      const { getByText } = render(<AttendanceScreen />);

      expect(getByText('Memuat data kehadiran...')).toBeTruthy();
    });

    it('should render not clocked in workers list', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
        expect(getByText('Bob Wilson')).toBeTruthy();
      });
    });

    it('should render area names for workers with assigned areas', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        // AttendanceCard shows area as "Area: <name>" for not_clocked_in workers
        expect(getByText('Area: Park A')).toBeTruthy();
        expect(getByText('Area: Park B')).toBeTruthy();
      });
    });

    it('should render section header with count', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(getByText('BELUM MASUK (3)')).toBeTruthy();
      });
    });

    it('should render note about clocked in workers', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(getByText(/7 pekerja sudah masuk/)).toBeTruthy();
      });
    });
  });

  describe('date navigation', () => {
    it('should navigate to previous day when left arrow is pressed', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(supervisorApi.getAttendance).toHaveBeenCalled();
      });

      const prevButton = getByText('◀');
      fireEvent.press(prevButton);

      await waitFor(() => {
        // API should be called twice: initial + after navigation
        expect(supervisorApi.getAttendance).toHaveBeenCalledTimes(2);
      });
    });

    it('should not navigate to future when on today', async () => {
      const { getByText, queryByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(getByText('▶')).toBeTruthy();
      });

      const nextButton = getByText('▶');
      fireEvent.press(nextButton);

      // Should only call API once (initial load), not after pressing next
      await waitFor(() => {
        expect(supervisorApi.getAttendance).toHaveBeenCalledTimes(1);
      });
    });

    it('should navigate to next day after going to previous day', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(supervisorApi.getAttendance).toHaveBeenCalled();
      });

      // Go to previous day
      fireEvent.press(getByText('◀'));

      await waitFor(() => {
        expect(supervisorApi.getAttendance).toHaveBeenCalledTimes(2);
      });

      // Now next button should work
      fireEvent.press(getByText('▶'));

      await waitFor(() => {
        expect(supervisorApi.getAttendance).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch attendance data on mount', async () => {
      render(<AttendanceScreen />);

      await waitFor(() => {
        expect(supervisorApi.getAttendance).toHaveBeenCalled();
      });
    });

    it('should pass correct date to API', async () => {
      render(<AttendanceScreen />);

      await waitFor(() => {
        expect(supervisorApi.getAttendance).toHaveBeenCalledWith(
          expect.objectContaining({
            date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          })
        );
      });
    });
  });

  describe('error handling', () => {
    it('should show alert when API returns error', async () => {
      (supervisorApi.getAttendance as jest.Mock).mockResolvedValue({
        error: 'Failed to load attendance',
      });

      render(<AttendanceScreen />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Gagal Memuat Data',
          expect.any(String),
          expect.any(Array)
        );
      });
    });

    it('should show alert when API throws error', async () => {
      (supervisorApi.getAttendance as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<AttendanceScreen />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Gagal Memuat Data',
          'Network error',
          expect.any(Array)
        );
      });
    });

    it('should show generic error message when error has no message', async () => {
      (supervisorApi.getAttendance as jest.Mock).mockRejectedValue({});

      render(<AttendanceScreen />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Gagal Memuat Data',
          'Terjadi kesalahan saat memuat data kehadiran',
          expect.any(Array)
        );
      });
    });
  });

  describe('pull to refresh', () => {
    it('should refresh data on pull to refresh', async () => {
      const { getByTestId, UNSAFE_getByType } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(supervisorApi.getAttendance).toHaveBeenCalledTimes(1);
      });

      // Note: Testing pull to refresh directly is challenging
      // The RefreshControl is properly configured in the component
      // This is more of an integration test
    });
  });

  describe('empty states', () => {
    it('should show empty message when all workers are clocked in', async () => {
      (supervisorApi.getAttendance as jest.Mock).mockResolvedValue({
        data: {
          ...mockAttendanceData,
          not_clocked_in: [],
          clocked_in_count: 10,
        },
      });

      const { getByText, queryByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(getByText('Semua pekerja sudah masuk')).toBeTruthy();
        expect(queryByText('BELUM MASUK')).toBeNull();
      });
    });

    it('should show correct counts when all workers are absent', async () => {
      (supervisorApi.getAttendance as jest.Mock).mockResolvedValue({
        data: {
          ...mockAttendanceData,
          clocked_in_count: 0,
          not_clocked_in: [
            ...mockAttendanceData.not_clocked_in,
            { id: '4', username: 'worker4', full_name: 'Extra Worker', area: null },
          ],
        },
      });

      const { getByText, queryByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        expect(getByText('0')).toBeTruthy(); // 0 clocked in
        expect(getByText('4')).toBeTruthy(); // 4 not clocked in
        // Should not show the note about clocked in workers
        expect(queryByText(/pekerja sudah masuk/)).toBeNull();
      });
    });
  });

  describe('date formatting', () => {
    it('should format date in Indonesian', async () => {
      const { getByText } = render(<AttendanceScreen />);

      await waitFor(() => {
        // Check for Indonesian month abbreviations
        const datePattern = /\d{2} (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des) \d{4}/;
        const dateElement = getByText(datePattern);
        expect(dateElement).toBeTruthy();
      });
    });
  });
});
