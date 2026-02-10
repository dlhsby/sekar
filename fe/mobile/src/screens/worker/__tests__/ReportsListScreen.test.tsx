/**
 * ReportsListScreen Tests
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { ReportsListScreen } from '../ReportsListScreen';
import * as reportsApi from '../../../services/api/reportsApi';
import * as offlineQueue from '../../../services/sync/offlineQueue';
import * as syncManager from '../../../services/sync/syncManager';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
} as any;

// Mock route
const mockRoute = {
  params: undefined,
  key: 'ReportsList',
  name: 'ReportsList' as const,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
}));

// Mock API and services
jest.mock('../../../services/api/reportsApi');
jest.mock('../../../services/sync/offlineQueue');
jest.mock('../../../services/sync/syncManager');
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)), // Default: no cache
  removeItem: jest.fn(() => Promise.resolve()),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('ReportsListScreen', () => {
  const mockedReportsApi = reportsApi as jest.Mocked<typeof reportsApi>;
  const mockedOfflineQueue = offlineQueue as jest.Mocked<typeof offlineQueue>;
  const mockedSyncManager = syncManager.syncManager as jest.Mocked<typeof syncManager.syncManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockedSyncManager.forceSyncNow = jest.fn();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null); // Reset cache mock
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Loading State', () => {
    it('shows loading indicator initially', () => {
      mockedReportsApi.getMyReports.mockReturnValue(
        new Promise(() => {}) // Never resolves
      );
      mockedOfflineQueue.getQueueByType.mockResolvedValue([]);

      const { getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Memuat laporan...')).toBeTruthy();
    });

    it('hides loading indicator after data loads', async () => {
      mockedReportsApi.getMyReports.mockResolvedValue({ data: [] });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([]);

      const { queryByText, getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      // Wait for empty state to appear (confirms loading finished)
      await waitFor(() => {
        expect(getByText('Belum Ada Laporan')).toBeTruthy();
      });

      // Now verify loading indicator is gone
      expect(queryByText('Memuat laporan...')).toBeNull();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no reports', async () => {
      mockedReportsApi.getMyReports.mockResolvedValue({ data: [] });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([]);

      const { getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Belum Ada Laporan')).toBeTruthy();
        // Empty state now has multi-line text with instruction
        expect(getByText(/Anda belum membuat laporan hari ini/)).toBeTruthy();
        // Fixed button at bottom should always be visible
        expect(getByText('+ Buat Laporan Baru')).toBeTruthy();
      });
    });

    it('navigates to Report screen when create button pressed', async () => {
      mockedReportsApi.getMyReports.mockResolvedValue({ data: [] });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([]);

      const { getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('+ Buat Laporan Baru')).toBeTruthy();
      });

      fireEvent.press(getByText('+ Buat Laporan Baru'));
      expect(mockNavigate).toHaveBeenCalledWith('Report');
    });
  });

  describe('Error State', () => {
    it('shows error message when API fails', async () => {
      mockedReportsApi.getMyReports.mockResolvedValue({
        error: 'Network error',
      });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([]);

      const { getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Network error')).toBeTruthy();
        expect(getByText('Coba Lagi')).toBeTruthy();
      });
    });

    it('retries loading when retry button pressed', async () => {
      mockedReportsApi.getMyReports
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ data: [] });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([]);

      const { getByText, queryByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Network error')).toBeTruthy();
      });

      fireEvent.press(getByText('Coba Lagi'));

      await waitFor(() => {
        expect(queryByText('Network error')).toBeNull();
      });
    });
  });

  describe('Reports List', () => {
    it(
      'displays synced reports from API',
      async () => {
        const mockReports = [
          {
            id: 1,
            created_at: '2026-01-18T10:30:00Z',
            notes: 'Completed cleaning',
            area: { id: 1, name: 'Taman Bungkul' },
            media_urls: ['https://example.com/photo.jpg'],
          },
        ];

        mockedReportsApi.getMyReports.mockResolvedValue({ data: mockReports });
        mockedOfflineQueue.getQueueByType.mockResolvedValue([]);

        const { getByText, getAllByText } = render(
          <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
        );

        await waitFor(
          () => {
            expect(getByText('Completed cleaning')).toBeTruthy();
            expect(getByText('Taman Bungkul')).toBeTruthy();
            // Use getAllByText since 'Terkirim' appears in both the filter tabs and the report items
            expect(getAllByText('Terkirim').length).toBeGreaterThan(0);
          },
          { timeout: 10000 }
        );
      },
      15000
    );

    it('displays pending reports from queue', async () => {
      mockedReportsApi.getMyReports.mockResolvedValue({ data: [] });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([
        {
          id: 'queue-1',
          type: 'report',
          status: 'pending',
          timestamp: Date.now(),
          retryCount: 0,
          data: {
            notes: 'Pending report',
            area_name: 'Park Area',
          },
        },
      ]);

      const { getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Pending report')).toBeTruthy();
        expect(getByText('Park Area')).toBeTruthy();
        expect(getByText('Menunggu sinkron')).toBeTruthy();
      });
    });

    it('displays failed reports from queue', async () => {
      mockedReportsApi.getMyReports.mockResolvedValue({ data: [] });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([
        {
          id: 'queue-2',
          type: 'report',
          status: 'failed',
          timestamp: Date.now(),
          retryCount: 3,
          data: {
            notes: 'Failed report',
            area_name: 'Street Area',
          },
        },
      ]);

      const { getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Failed report')).toBeTruthy();
        expect(getByText('Gagal kirim')).toBeTruthy();
        expect(getByText('Coba Lagi')).toBeTruthy();
      });
    });

    it('combines and sorts synced and queued reports by date', async () => {
      const mockApiReports = [
        {
          id: 1,
          created_at: '2026-01-18T09:00:00Z', // Older
          notes: 'Old synced report',
          area: { id: 1, name: 'Park 1' },
          media_urls: [],
        },
      ];

      const mockQueuedReports = [
        {
          id: 'queue-1',
          type: 'report',
          status: 'pending',
          timestamp: new Date('2026-01-18T11:00:00Z').getTime(), // Newer
          retryCount: 0,
          data: {
            notes: 'New pending report',
            area_name: 'Park 2',
          },
        },
      ];

      mockedReportsApi.getMyReports.mockResolvedValue({ data: mockApiReports });
      mockedOfflineQueue.getQueueByType.mockResolvedValue(mockQueuedReports);

      const { getAllByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const descriptions = getAllByText(/report/i);
        // Should be sorted with newer first
        expect(descriptions[0]).toHaveTextContent('New pending report');
        expect(descriptions[1]).toHaveTextContent('Old synced report');
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      const mockApiReports = [
        {
          id: 1,
          created_at: '2026-01-18T10:00:00Z',
          notes: 'Synced report',
          area: { id: 1, name: 'Park' },
          media_urls: [],
        },
      ];

      const mockQueuedReports = [
        {
          id: 'queue-1',
          type: 'report',
          status: 'pending',
          timestamp: Date.now(),
          retryCount: 0,
          data: { notes: 'Pending report' },
        },
        {
          id: 'queue-2',
          type: 'report',
          status: 'failed',
          timestamp: Date.now(),
          retryCount: 3,
          data: { notes: 'Failed report' },
        },
      ];

      mockedReportsApi.getMyReports.mockResolvedValue({ data: mockApiReports });
      mockedOfflineQueue.getQueueByType.mockResolvedValue(mockQueuedReports);
    });

    it('shows all reports by default', async () => {
      const { getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Synced report')).toBeTruthy();
        expect(getByText('Pending report')).toBeTruthy();
        expect(getByText('Failed report')).toBeTruthy();
      });
    });

    it('filters to synced reports only', async () => {
      const { getByText, queryByText, getAllByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Synced report')).toBeTruthy();
      });

      // Get the filter button (first occurrence of 'Terkirim')
      const filterButtons = getAllByText('Terkirim');
      fireEvent.press(filterButtons[0]); // Press the filter tab button

      await waitFor(() => {
        expect(getByText('Synced report')).toBeTruthy();
        expect(queryByText('Pending report')).toBeNull();
        expect(queryByText('Failed report')).toBeNull();
      });
    });

    it('filters to pending reports only', async () => {
      const { getByText, queryByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Pending report')).toBeTruthy();
      });

      fireEvent.press(getByText('Menunggu'));

      await waitFor(() => {
        expect(getByText('Pending report')).toBeTruthy();
        expect(queryByText('Synced report')).toBeNull();
        expect(queryByText('Failed report')).toBeNull();
      });
    });

    it('filters to failed reports only', async () => {
      const { getByText, queryByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Failed report')).toBeTruthy();
      });

      fireEvent.press(getByText('Gagal'));

      await waitFor(() => {
        expect(getByText('Failed report')).toBeTruthy();
        expect(queryByText('Synced report')).toBeNull();
        expect(queryByText('Pending report')).toBeNull();
      });
    });

    it('shows empty state for filtered view with no results', async () => {
      mockedReportsApi.getMyReports.mockResolvedValue({ data: [] });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([
        {
          id: 'queue-1',
          type: 'report',
          status: 'pending',
          timestamp: Date.now(),
          retryCount: 0,
          data: { notes: 'Pending only' },
        },
      ]);

      const { getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Pending only')).toBeTruthy();
      });

      fireEvent.press(getByText('Terkirim'));

      await waitFor(() => {
        expect(getByText('Belum Ada Laporan')).toBeTruthy();
        expect(getByText(/Tidak ada laporan dengan status "Terkirim"/)).toBeTruthy();
      });
    });
  });

  describe('Pull-to-Refresh', () => {
    it('triggers sync and reloads on pull-to-refresh', async () => {
      mockedReportsApi.getMyReports.mockResolvedValue({ data: [] });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([]);

      const { getByTestId, UNSAFE_root } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByTestId('reports-list')).toBeTruthy();
      });

      // Find the RefreshControl and trigger its onRefresh callback
      const flatList = getByTestId('reports-list');
      const refreshControl = flatList.props.refreshControl;

      // Call onRefresh directly
      await refreshControl.props.onRefresh();

      // Wait a bit for the async operation
      await waitFor(() => {
        expect(mockedSyncManager.forceSyncNow).toHaveBeenCalled();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('resets queue item and triggers sync on retry', async () => {
      mockedReportsApi.getMyReports.mockResolvedValue({ data: [] });
      mockedOfflineQueue.getQueueByType.mockResolvedValue([
        {
          id: 'queue-failed',
          type: 'report',
          status: 'failed',
          timestamp: Date.now(),
          retryCount: 3,
          data: { notes: 'Failed to sync' },
        },
      ]);
      mockedOfflineQueue.updateQueueItem.mockResolvedValue(undefined);

      const { getByText } = render(
        <ReportsListScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Coba Lagi')).toBeTruthy();
      });

      fireEvent.press(getByText('Coba Lagi'));

      await waitFor(() => {
        expect(mockedOfflineQueue.updateQueueItem).toHaveBeenCalledWith(
          'queue-failed',
          expect.objectContaining({
            status: 'pending',
            retryCount: 0,
          })
        );
        expect(mockedSyncManager.forceSyncNow).toHaveBeenCalled();
      });
    });
  });
});
