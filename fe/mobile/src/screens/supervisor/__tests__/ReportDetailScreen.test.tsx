/**
 * ReportDetailScreen Tests
 * Unit tests for supervisor report detail screen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import ReportDetailScreen from '../ReportDetailScreen';
import * as supervisorApi from '../../../services/api/supervisorApi';

// Mock the API
jest.mock('../../../services/api/supervisorApi');

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID={props.testID} {...props} />,
    Marker: View,
    PROVIDER_GOOGLE: 'google',
  };
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  return (props: any) => <Text>{props.name}</Text>;
});

// Mock Linking
jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));

// Mock navigation
const mockNavigation = {
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('ReportDetailScreen', () => {
  const mockReport = {
    id: 1,
    shift_id: 1,
    area_id: 1,
    gps_lat: -7.250445,
    gps_lng: 112.768845,
    notes: 'Task completed: Cleaned the park area thoroughly',
    condition: 'task_completion',
    report_time: '2026-01-19T10:30:00Z',
    reviewed: false,
    reviewed_at: null,
    reviewed_by: null,
    worker: {
      id: 1,
      username: 'worker1',
      full_name: 'John Doe',
      role: 'worker',
    },
    area: {
      id: 1,
      name: 'Park A',
      area_type: 'taman',
    },
    media: [
      { id: 1, media_url: 'https://example.com/photo1.jpg', media_type: 'photo' },
      { id: 2, media_url: 'https://example.com/photo2.jpg', media_type: 'photo' },
    ],
  };

  const mockRoute = {
    params: {
      reportId: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
      data: mockReport,
    });
  });

  describe('rendering', () => {
    it('should show loading indicator while fetching', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockReport }), 100))
      );

      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(getByText('Memuat detail laporan...')).toBeTruthy();
    });

    it('should render report details correctly', async () => {
      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Park A')).toBeTruthy();
        expect(getByText('Penyelesaian Tugas')).toBeTruthy();
      }, { timeout: 10000 });
    }, 15000);

    it('should render worker name', async () => {
      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Pekerja:')).toBeTruthy();
        expect(getByText('John Doe')).toBeTruthy();
      });
    });

    it('should render area name', async () => {
      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Area:')).toBeTruthy();
        expect(getByText('Park A')).toBeTruthy();
      });
    });

    it('should render report type', async () => {
      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Jenis:')).toBeTruthy();
        expect(getByText('Penyelesaian Tugas')).toBeTruthy();
      });
    });

    it('should render report time', async () => {
      const { getByText, getAllByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Waktu:')).toBeTruthy();
      });
    });

    it('should render description when notes exist', async () => {
      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Deskripsi')).toBeTruthy();
        expect(getByText('Task completed: Cleaned the park area thoroughly')).toBeTruthy();
      });
    });

    it('should render photo count when photos exist', async () => {
      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Foto (2)')).toBeTruthy();
        expect(getByText('Ketuk foto untuk memperbesar')).toBeTruthy();
      });
    });

    it('should render photo gallery', async () => {
      const { getByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('report-detail-gallery')).toBeTruthy();
      });
    });

    it('should render location section', async () => {
      const { getByText, getByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Lokasi')).toBeTruthy();
        expect(getByText(/📍 -7.250445, 112.768845/)).toBeTruthy();
        expect(getByTestId('open-maps-button')).toBeTruthy();
      });
    });

    it('should render open maps button', async () => {
      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Buka di Peta')).toBeTruthy();
      });
    });
  });

  describe('reviewed status', () => {
    it('should show reviewed badge when report is reviewed', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          reviewed: true,
          reviewed_at: '2026-01-19T12:00:00Z',
        },
      });

      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('✓ Sudah Ditinjau')).toBeTruthy();
      });
    });

    it('should not show reviewed badge when report is not reviewed', async () => {
      const { queryByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(queryByText('✓ Sudah Ditinjau')).toBeNull();
      });
    });
  });

  describe('report types', () => {
    it('should display correct label for incident report', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          condition: 'incident',
        },
      });

      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Insiden')).toBeTruthy();
      });
    });

    it('should display correct label for maintenance report', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          condition: 'maintenance_request',
        },
      });

      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Permintaan Pemeliharaan')).toBeTruthy();
      });
    });
  });

  describe('maps integration', () => {
    it('should open maps when open maps button is pressed', async () => {
      const { getByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('open-maps-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('open-maps-button'));

      expect(Linking.openURL).toHaveBeenCalled();
    });

    it('should show error when maps fails to open', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValue(new Error('Cannot open maps'));

      const { getByTestId, getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('open-maps-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('open-maps-button'));

      await waitFor(() => {
        expect(getByText('Tidak dapat membuka aplikasi peta')).toBeTruthy();
      });
    });

    it('should show message when GPS coordinates are null', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          gps_lat: null,
          gps_lng: null,
        },
      });

      const { getByText, queryByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('📍 Data lokasi GPS tidak tersedia')).toBeTruthy();
        expect(queryByTestId('open-maps-button')).toBeNull();
      });
    });

    it('should show message when gps_lat is null', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          gps_lat: null,
          gps_lng: 112.768845,
        },
      });

      const { getByText, queryByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('📍 Data lokasi GPS tidak tersedia')).toBeTruthy();
        expect(queryByTestId('open-maps-button')).toBeNull();
      });
    });

    it('should show message when gps_lng is null', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          gps_lat: -7.250445,
          gps_lng: null,
        },
      });

      const { getByText, queryByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('📍 Data lokasi GPS tidak tersedia')).toBeTruthy();
        expect(queryByTestId('open-maps-button')).toBeNull();
      });
    });

    it('should show message when gps_lat is undefined', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          gps_lat: undefined,
          gps_lng: 112.768845,
        },
      });

      const { getByText, queryByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('📍 Data lokasi GPS tidak tersedia')).toBeTruthy();
        expect(queryByTestId('open-maps-button')).toBeNull();
      });
    });

    it('should show message when gps_lng is undefined', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          gps_lat: -7.250445,
          gps_lng: undefined,
        },
      });

      const { getByText, queryByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('📍 Data lokasi GPS tidak tersedia')).toBeTruthy();
        expect(queryByTestId('open-maps-button')).toBeNull();
      });
    });

    it('should show message when both GPS coordinates are undefined', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          gps_lat: undefined,
          gps_lng: undefined,
        },
      });

      const { getByText, queryByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('📍 Data lokasi GPS tidak tersedia')).toBeTruthy();
        expect(queryByTestId('open-maps-button')).toBeNull();
      });
    });

    it('should handle GPS coordinates as strings (PostgreSQL decimal type)', async () => {
      // PostgreSQL returns decimal type as strings to preserve precision
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          gps_lat: '-7.290493',
          gps_lng: '112.739797',
        },
      });

      const { getByText, getByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Should display coordinates correctly after converting to number
        expect(getByText('📍 -7.290493, 112.739797')).toBeTruthy();
        expect(getByTestId('open-maps-button')).toBeTruthy();
      });
    });
  });

  describe('error handling', () => {
    it('should show error when API returns error', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        error: 'Failed to load report',
      });

      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Failed to load report')).toBeTruthy();
      });
    });

    it('should show error when API throws error', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Gagal memuat detail laporan')).toBeTruthy();
      });
    });

    it('should show not found message when report is null', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: null,
      });

      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Laporan tidak ditemukan')).toBeTruthy();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch report details on mount', async () => {
      render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(supervisorApi.getReportDetails).toHaveBeenCalledWith(1);
      });
    });

    it('should fetch report details with correct ID from route params', async () => {
      const customRoute = {
        params: {
          reportId: 42,
        },
      };

      render(
        <ReportDetailScreen route={customRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(supervisorApi.getReportDetails).toHaveBeenCalledWith(42);
      });
    });
  });

  describe('worker view (in-app map)', () => {
    it('should show in-app map button when isWorkerView is true', async () => {
      const workerRoute = {
        params: {
          reportId: 1,
          isWorkerView: true,
        },
      };

      const { getByTestId, getByText } = render(
        <ReportDetailScreen route={workerRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Buka di Peta')).toBeTruthy();
        expect(getByTestId('open-maps-button')).toBeTruthy();
      });
    });

    it('should show in-app map when open maps button is pressed in worker view', async () => {
      const workerRoute = {
        params: {
          reportId: 1,
          isWorkerView: true,
        },
      };

      const { getByTestId, getByText } = render(
        <ReportDetailScreen route={workerRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('open-maps-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('open-maps-button'));

      await waitFor(() => {
        expect(getByTestId('report-location-map')).toBeTruthy();
        expect(getByText('Lokasi Laporan')).toBeTruthy();
      });

      // Should NOT open external maps
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('should close in-app map when close button is pressed', async () => {
      const workerRoute = {
        params: {
          reportId: 1,
          isWorkerView: true,
        },
      };

      const { getByTestId, queryByTestId } = render(
        <ReportDetailScreen route={workerRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('open-maps-button')).toBeTruthy();
      });

      // Open map
      fireEvent.press(getByTestId('open-maps-button'));

      await waitFor(() => {
        expect(getByTestId('report-location-map')).toBeTruthy();
      });

      // Close map
      fireEvent.press(getByTestId('close-map-button'));

      await waitFor(() => {
        expect(queryByTestId('report-location-map')).toBeNull();
      });
    });

    it('should open external maps when isWorkerView is false (supervisor view)', async () => {
      const { getByTestId } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('open-maps-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('open-maps-button'));

      // Supervisor view should open external maps
      expect(Linking.openURL).toHaveBeenCalled();
    });
  });

  describe('back button navigation', () => {
    it('should set up header with back button', async () => {
      const mockSetOptions = jest.fn();
      const navWithOptions = {
        ...mockNavigation,
        setOptions: mockSetOptions,
      };

      render(
        <ReportDetailScreen route={mockRoute} navigation={navWithOptions} />
      );

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });
    });
  });

  describe('missing data handling', () => {
    it('should show N/A when worker name is missing', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          worker: null,
        },
      });

      const { getByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('N/A')).toBeTruthy();
      });
    });

    it('should show N/A when area name is missing', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          area: null,
        },
      });

      const { getAllByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const naElements = getAllByText('N/A');
        expect(naElements.length).toBeGreaterThan(0);
      });
    });

    it('should not show description section when notes are empty', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          notes: null,
        },
      });

      const { queryByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(queryByText('Deskripsi')).toBeNull();
      });
    });

    it('should not show photos section when no media', async () => {
      (supervisorApi.getReportDetails as jest.Mock).mockResolvedValue({
        data: {
          ...mockReport,
          media: [],
        },
      });

      const { queryByText } = render(
        <ReportDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(queryByText(/Foto/)).toBeNull();
      });
    });
  });
});
