/**
 * SyncStatusCard Component Tests
 * Tests sync status display, button interactions, and conditional rendering
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SyncStatusCard } from '../SyncStatusCard';
import type { SyncStatus } from '../SyncStatusCard';

describe('SyncStatusCard', () => {
  const mockOnSyncNow = jest.fn();
  const mockOnRetryFailed = jest.fn();
  const mockOnClearFailed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with pending items', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 5,
        failedCount: 0,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('Sinkronisasi Data')).toBeTruthy();
      expect(getByText('Tertunda:')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
    });

    it('should render with failed items', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 3,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('Gagal:')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('should render with both pending and failed items', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 5,
        failedCount: 3,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('5')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('should render with default testID', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByTestId('sync-status-card')).toBeTruthy();
    });

    it('should render with custom testID', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
          testID="custom-sync-card"
        />
      );

      expect(getByTestId('custom-sync-card')).toBeTruthy();
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render when no pending or failed items', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 0,
      };

      const { queryByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(queryByText('Sinkronisasi Data')).toBeNull();
    });

    it('should render when only pending items exist', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('Sinkronisasi Data')).toBeTruthy();
    });

    it('should render when only failed items exist', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 1,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('Sinkronisasi Data')).toBeTruthy();
    });
  });

  describe('Pending Count Display', () => {
    it('should display pending count', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 10,
        failedCount: 0,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('10')).toBeTruthy();
    });

    it('should display zero pending count', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 1,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('0')).toBeTruthy();
    });

    it('should display large pending count', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 999,
        failedCount: 0,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('999')).toBeTruthy();
    });
  });

  describe('Failed Count Display', () => {
    it('should display failed count', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 7,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('7')).toBeTruthy();
    });

    it('should display zero failed count', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('0')).toBeTruthy();
    });

    it('should display large failed count', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 999,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('999')).toBeTruthy();
    });
  });

  describe('Sync Now Button', () => {
    it('should render Sync Now button', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByTestId('sync-now-button')).toBeTruthy();
    });

    it('should call onSyncNow when pressed', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      fireEvent.press(getByTestId('sync-now-button'));
      expect(mockOnSyncNow).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when syncing', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={true}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      const button = getByTestId('sync-now-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('should show loading state when syncing', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={true}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByTestId('sync-now-button')).toBeTruthy();
    });

    it('should be enabled when not syncing', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      const button = getByTestId('sync-now-button');
      expect(button.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('Retry Failed Button', () => {
    it('should render when failed items exist', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 1,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByTestId('retry-failed-button')).toBeTruthy();
    });

    it('should not render when no failed items', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { queryByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(queryByTestId('retry-failed-button')).toBeNull();
    });

    it('should call onRetryFailed when pressed', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 1,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      fireEvent.press(getByTestId('retry-failed-button'));
      expect(mockOnRetryFailed).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clear Failed Button', () => {
    it('should render when failed items exist', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 1,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByTestId('clear-failed-button')).toBeTruthy();
    });

    it('should not render when no failed items', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { queryByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(queryByTestId('clear-failed-button')).toBeNull();
    });

    it('should call onClearFailed when pressed', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 1,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      fireEvent.press(getByTestId('clear-failed-button'));
      expect(mockOnClearFailed).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button Combinations', () => {
    it('should show only Sync button when no failed items', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 5,
        failedCount: 0,
      };

      const { getByTestId, queryByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByTestId('sync-now-button')).toBeTruthy();
      expect(queryByTestId('retry-failed-button')).toBeNull();
      expect(queryByTestId('clear-failed-button')).toBeNull();
    });

    it('should show all three buttons when failed items exist', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 5,
        failedCount: 3,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByTestId('sync-now-button')).toBeTruthy();
      expect(getByTestId('retry-failed-button')).toBeTruthy();
      expect(getByTestId('clear-failed-button')).toBeTruthy();
    });
  });

  describe('Multiple Button Presses', () => {
    it('should handle multiple presses on Sync button', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 1,
        failedCount: 0,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      const button = getByTestId('sync-now-button');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockOnSyncNow).toHaveBeenCalledTimes(3);
    });

    it('should handle presses on different buttons', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 5,
        failedCount: 3,
      };

      const { getByTestId } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      fireEvent.press(getByTestId('sync-now-button'));
      fireEvent.press(getByTestId('retry-failed-button'));
      fireEvent.press(getByTestId('clear-failed-button'));

      expect(mockOnSyncNow).toHaveBeenCalledTimes(1);
      expect(mockOnRetryFailed).toHaveBeenCalledTimes(1);
      expect(mockOnClearFailed).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status Text Styling', () => {
    it('should apply warning style to pending count when > 0', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 5,
        failedCount: 0,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      const pendingValue = getByText('5');
      expect(pendingValue.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#E3A018' }), // nbColors.warning
        ])
      );
    });

    it('should apply error style to failed count when > 0', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 3,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      const failedValue = getByText('3');
      expect(failedValue.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FF6B6B' }), // nbColors.danger
        ])
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large pending count', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 9999,
        failedCount: 0,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('9999')).toBeTruthy();
    });

    it('should handle very large failed count', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 0,
        failedCount: 9999,
      };

      const { getByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('9999')).toBeTruthy();
    });

    it('should handle negative counts gracefully', () => {
      const syncStatus: SyncStatus = {
        pendingCount: -5,
        failedCount: -3,
      };

      const { queryByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      // Should not render with negative counts (treated as 0)
      expect(queryByText('Sinkronisasi Data')).toBeNull();
    });
  });

  describe('Re-rendering', () => {
    it('should update when syncStatus changes', () => {
      const syncStatus1: SyncStatus = {
        pendingCount: 5,
        failedCount: 0,
      };

      const { getByText, rerender } = render(
        <SyncStatusCard
          syncStatus={syncStatus1}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('5')).toBeTruthy();

      const syncStatus2: SyncStatus = {
        pendingCount: 10,
        failedCount: 0,
      };

      rerender(
        <SyncStatusCard
          syncStatus={syncStatus2}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('10')).toBeTruthy();
    });

    it('should show/hide retry buttons when failed count changes', () => {
      const syncStatus1: SyncStatus = {
        pendingCount: 5,
        failedCount: 0,
      };

      const { queryByTestId, rerender } = render(
        <SyncStatusCard
          syncStatus={syncStatus1}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(queryByTestId('retry-failed-button')).toBeNull();

      const syncStatus2: SyncStatus = {
        pendingCount: 5,
        failedCount: 3,
      };

      rerender(
        <SyncStatusCard
          syncStatus={syncStatus2}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(queryByTestId('retry-failed-button')).toBeTruthy();
      expect(queryByTestId('clear-failed-button')).toBeTruthy();
    });

    it('should update disabled state when isSyncing changes', () => {
      const syncStatus: SyncStatus = {
        pendingCount: 5,
        failedCount: 0,
      };

      const { getByTestId, rerender } = render(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      let button = getByTestId('sync-now-button');
      expect(button.props.accessibilityState?.disabled).toBe(false);

      rerender(
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={true}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      button = getByTestId('sync-now-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('should unmount when counts become zero', () => {
      const syncStatus1: SyncStatus = {
        pendingCount: 5,
        failedCount: 3,
      };

      const { getByText, rerender, queryByText } = render(
        <SyncStatusCard
          syncStatus={syncStatus1}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(getByText('Sinkronisasi Data')).toBeTruthy();

      const syncStatus2: SyncStatus = {
        pendingCount: 0,
        failedCount: 0,
      };

      rerender(
        <SyncStatusCard
          syncStatus={syncStatus2}
          isSyncing={false}
          onSyncNow={mockOnSyncNow}
          onRetryFailed={mockOnRetryFailed}
          onClearFailed={mockOnClearFailed}
        />
      );

      expect(queryByText('Sinkronisasi Data')).toBeNull();
    });
  });
});
