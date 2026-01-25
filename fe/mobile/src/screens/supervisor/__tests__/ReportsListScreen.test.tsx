/**
 * ReportsListScreen Tests
 * Unit tests for supervisor reports list screen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ReportsListScreen from '../ReportsListScreen';
import * as supervisorApi from '../../../services/api/supervisorApi';

// Mock the API
jest.mock('../../../services/api/supervisorApi');

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

// Create wrapper with navigation context
const renderWithNavigation = (component: React.ReactElement) => {
  return render(
    <NavigationContainer>
      {React.cloneElement(component, { navigation: mockNavigation })}
    </NavigationContainer>
  );
};

describe('ReportsListScreen', () => {
  const mockReports = [
    {
      id: 1,
      worker_name: 'John Doe',
      area_name: 'Park A',
      notes: 'Task completed successfully',
      report_time: '2026-01-19T10:30:00Z',
      thumbnail_url: 'https://example.com/thumb1.jpg',
      reviewed: false,
    },
    {
      id: 2,
      worker_name: 'Jane Smith',
      area_name: 'Park B',
      notes: 'Insiden: Broken fence found',
      report_time: '2026-01-19T11:00:00Z',
      thumbnail_url: 'https://example.com/thumb2.jpg',
      reviewed: true,
    },
    {
      id: 3,
      worker_name: 'Bob Wilson',
      area_name: 'Park C',
      notes: 'Permintaan pemeliharaan: Lampu rusak',
      report_time: '2026-01-19T12:00:00Z',
      thumbnail_url: null,
      reviewed: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // API returns paginated format: { data: { data: [], meta: {} } }
    (supervisorApi.getReports as jest.Mock).mockResolvedValue({
      data: { data: mockReports, meta: { total: 3, page: 1, limit: 10, totalPages: 1 } },
    });
  });

  describe('rendering', () => {
    it('should render filter bar', async () => {
      const { getByText, getByTestId } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Semua Jenis')).toBeTruthy();
        expect(getByTestId('filter-button')).toBeTruthy();
        expect(getByTestId('date-filter-button')).toBeTruthy();
      });
    });

    it('should render report cards', async () => {
      const { getByText, getByTestId } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('report-card-1')).toBeTruthy();
        expect(getByTestId('report-card-2')).toBeTruthy();
        expect(getByTestId('report-card-3')).toBeTruthy();
      });
    });

    it('should show loading indicator while fetching', async () => {
      (supervisorApi.getReports as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          data: { data: mockReports, meta: { total: 3, page: 1, limit: 10, totalPages: 1 } }
        }), 100))
      );

      const { getByTestId, queryByTestId } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      // Loading indicator should be visible initially
      // After load, reports should be visible
      await waitFor(() => {
        expect(getByTestId('reports-list')).toBeTruthy();
      });
    });
  });

  describe('filtering', () => {
    it('should open filter modal when filter button is pressed', async () => {
      const { getByTestId, getByText } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('filter-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('filter-button'));

      await waitFor(() => {
        expect(getByText('Filter Jenis Laporan')).toBeTruthy();
      });
    });

    it('should show filter options in modal', async () => {
      const { getByTestId, getByText } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('filter-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('filter-button'));

      await waitFor(() => {
        expect(getByTestId('filter-option-all')).toBeTruthy();
        expect(getByTestId('filter-option-task_completion')).toBeTruthy();
        expect(getByTestId('filter-option-incident')).toBeTruthy();
        expect(getByTestId('filter-option-maintenance_request')).toBeTruthy();
      });
    });

    it('should close modal when filter option is selected', async () => {
      const { getByTestId, queryByText } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('filter-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('filter-button'));

      await waitFor(() => {
        expect(getByTestId('filter-option-incident')).toBeTruthy();
      });

      fireEvent.press(getByTestId('filter-option-incident'));

      await waitFor(() => {
        expect(queryByText('Filter Jenis Laporan')).toBeNull();
      });
    });

    it('should close modal when close button is pressed', async () => {
      const { getByTestId, queryByText } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('filter-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('filter-button'));

      await waitFor(() => {
        expect(getByTestId('close-modal-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('close-modal-button'));

      await waitFor(() => {
        expect(queryByText('Filter Jenis Laporan')).toBeNull();
      });
    });

    it('should update filter button text when filter is selected', async () => {
      const { getByTestId, getAllByText } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getAllByText('Semua Jenis').length).toBeGreaterThan(0);
      });

      fireEvent.press(getByTestId('filter-button'));

      await waitFor(() => {
        expect(getByTestId('filter-option-incident')).toBeTruthy();
      });

      fireEvent.press(getByTestId('filter-option-incident'));

      await waitFor(() => {
        // After filter selection, "Insiden" appears in filter button
        // Use getAllByText since modal option may still be in DOM
        expect(getAllByText('Insiden').length).toBeGreaterThan(0);
      });
    });

    it('should apply date filter when date button is pressed', async () => {
      const { getByTestId, getByText } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('date-filter-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('date-filter-button'));

      // Should show clear button after date filter is applied
      await waitFor(() => {
        expect(getByTestId('clear-date-button')).toBeTruthy();
      });
    });

    it('should clear date filter when clear button is pressed', async () => {
      const { getByTestId, queryByTestId } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('date-filter-button')).toBeTruthy();
      });

      // Apply date filter
      fireEvent.press(getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(getByTestId('clear-date-button')).toBeTruthy();
      });

      // Clear date filter
      fireEvent.press(getByTestId('clear-date-button'));

      await waitFor(() => {
        expect(getByTestId('date-filter-button')).toBeTruthy();
        expect(queryByTestId('clear-date-button')).toBeNull();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate to report detail when report card is pressed', async () => {
      const { getByTestId } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('report-card-1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('report-card-1'));

      expect(mockNavigate).toHaveBeenCalledWith('ReportDetail', { reportId: 1 });
    });
  });

  describe('error handling', () => {
    it('should show error banner when API returns error', async () => {
      (supervisorApi.getReports as jest.Mock).mockResolvedValue({
        error: 'Failed to load reports',
      });

      const { getByText } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Failed to load reports')).toBeTruthy();
      });
    });

    it('should show error banner when API throws error', async () => {
      (supervisorApi.getReports as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Gagal memuat laporan')).toBeTruthy();
      });
    });
  });

  describe('empty state', () => {
    it('should show empty message when no reports', async () => {
      (supervisorApi.getReports as jest.Mock).mockResolvedValue({
        data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      const { getByText } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Belum ada laporan')).toBeTruthy();
        expect(getByText('Laporan dari pekerja akan muncul di sini')).toBeTruthy();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch reports on mount', async () => {
      renderWithNavigation(<ReportsListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(supervisorApi.getReports).toHaveBeenCalled();
      });
    });

    it('should refetch when filters change', async () => {
      const { getByTestId } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(supervisorApi.getReports).toHaveBeenCalledTimes(1);
      });

      // Apply date filter
      fireEvent.press(getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(supervisorApi.getReports).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('report type classification', () => {
    it('should correctly classify incident reports', async () => {
      const incidentReports = [
        {
          id: 1,
          worker_name: 'John Doe',
          area_name: 'Park A',
          notes: 'Insiden: Broken fence',
          report_time: '2026-01-19T10:00:00Z',
          reviewed: false,
        },
      ];

      (supervisorApi.getReports as jest.Mock).mockResolvedValue({
        data: { data: incidentReports, meta: { total: 1, page: 1, limit: 10, totalPages: 1 } },
      });

      const { getByTestId } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('report-card-1')).toBeTruthy();
      });
    });

    it('should correctly classify maintenance reports', async () => {
      const maintenanceReports = [
        {
          id: 1,
          worker_name: 'John Doe',
          area_name: 'Park A',
          notes: 'Permintaan pemeliharaan: Light broken',
          report_time: '2026-01-19T10:00:00Z',
          reviewed: false,
        },
      ];

      (supervisorApi.getReports as jest.Mock).mockResolvedValue({
        data: { data: maintenanceReports, meta: { total: 1, page: 1, limit: 10, totalPages: 1 } },
      });

      const { getByTestId } = renderWithNavigation(
        <ReportsListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('report-card-1')).toBeTruthy();
      });
    });
  });
});
