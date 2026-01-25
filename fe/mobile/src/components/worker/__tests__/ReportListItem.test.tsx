/**
 * ReportListItem Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReportListItem } from '../ReportListItem';

describe('ReportListItem', () => {
  const mockOnRetry = jest.fn();
  const mockOnPress = jest.fn();

  const defaultProps = {
    id: 'test-1',
    reportType: 'task_completion',
    description: 'Completed cleaning work at park',
    areaName: 'Taman Bungkul',
    createdAt: '2026-01-18T10:30:00Z',
    syncStatus: 'synced' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with all props', () => {
      const { getByText } = render(
        <ReportListItem {...defaultProps} />
      );

      expect(getByText('Penyelesaian Tugas')).toBeTruthy();
      expect(getByText('Completed cleaning work at park')).toBeTruthy();
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Terkirim')).toBeTruthy();
    });

    it('renders without optional fields', () => {
      const { queryByText } = render(
        <ReportListItem
          id="test-2"
          reportType="incident"
          createdAt="2026-01-18T10:30:00Z"
          syncStatus="pending"
        />
      );

      expect(queryByText('Insiden')).toBeTruthy();
      expect(queryByText('Menunggu sinkron')).toBeTruthy();
    });

    it('renders photo thumbnail when photoUrl provided', () => {
      const { getByTestId } = render(
        <ReportListItem
          {...defaultProps}
          photoUrl="https://example.com/photo.jpg"
        />
      );

      const image = getByTestId('report-thumbnail');
      expect(image).toBeTruthy();
      expect(image.props.source.uri).toBe('https://example.com/photo.jpg');
    });
  });

  describe('Sync Status', () => {
    it('displays synced status correctly', () => {
      const { getByText } = render(
        <ReportListItem {...defaultProps} syncStatus="synced" />
      );

      expect(getByText('✅')).toBeTruthy();
      expect(getByText('Terkirim')).toBeTruthy();
    });

    it('displays pending status correctly', () => {
      const { getByText } = render(
        <ReportListItem {...defaultProps} syncStatus="pending" />
      );

      expect(getByText('🔄')).toBeTruthy();
      expect(getByText('Menunggu sinkron')).toBeTruthy();
    });

    it('displays failed status correctly', () => {
      const { getByText } = render(
        <ReportListItem
          {...defaultProps}
          syncStatus="failed"
          queueId="queue-123"
          onRetry={mockOnRetry}
        />
      );

      expect(getByText('❌')).toBeTruthy();
      expect(getByText('Gagal kirim')).toBeTruthy();
      expect(getByText('Coba Lagi')).toBeTruthy();
    });
  });

  describe('Report Types', () => {
    it('displays task_completion type correctly', () => {
      const { getByText } = render(
        <ReportListItem {...defaultProps} reportType="task_completion" />
      );

      expect(getByText('Penyelesaian Tugas')).toBeTruthy();
    });

    it('displays incident type correctly', () => {
      const { getByText } = render(
        <ReportListItem {...defaultProps} reportType="incident" />
      );

      expect(getByText('Insiden')).toBeTruthy();
    });

    it('displays maintenance_request type correctly', () => {
      const { getByText } = render(
        <ReportListItem {...defaultProps} reportType="maintenance_request" />
      );

      expect(getByText('Permintaan Pemeliharaan')).toBeTruthy();
    });

    it('displays unknown type as-is', () => {
      const { getByText } = render(
        <ReportListItem {...defaultProps} reportType="unknown_type" />
      );

      expect(getByText('unknown_type')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls onRetry when retry button pressed for failed report', () => {
      const { getByText } = render(
        <ReportListItem
          {...defaultProps}
          syncStatus="failed"
          queueId="queue-456"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = getByText('Coba Lagi');
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledWith('queue-456');
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when syncStatus is not failed', () => {
      const { queryByText } = render(
        <ReportListItem
          {...defaultProps}
          syncStatus="pending"
          queueId="queue-789"
          onRetry={mockOnRetry}
        />
      );

      expect(queryByText('Coba Lagi')).toBeNull();
    });

    it('does not render retry button when queueId is missing', () => {
      const { queryByText } = render(
        <ReportListItem
          {...defaultProps}
          syncStatus="failed"
          onRetry={mockOnRetry}
        />
      );

      expect(queryByText('Coba Lagi')).toBeNull();
    });

    it('calls onPress when item pressed with valid UUID', () => {
      const testUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const { getByTestId } = render(
        <ReportListItem {...defaultProps} id="synced-123" reportId={testUuid} onPress={mockOnPress} />
      );

      const item = getByTestId('report-item');
      fireEvent.press(item);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(testUuid);
    });

    it('does not wrap in TouchableOpacity when onPress not provided', () => {
      const { queryByTestId } = render(
        <ReportListItem {...defaultProps} />
      );

      const touchable = queryByTestId('report-item');
      expect(touchable).toBeNull();
    });

    it('does not call onPress with invalid UUID format', () => {
      const invalidId = '12345'; // Not a valid UUID
      const { getByTestId } = render(
        <ReportListItem {...defaultProps} id="test-456" reportId={invalidId} onPress={mockOnPress} />
      );

      const item = getByTestId('report-item');
      fireEvent.press(item);

      // Should not call onPress because UUID validation fails
      expect(mockOnPress).toHaveBeenCalledTimes(0);
    });
  });

  describe('Date Formatting', () => {
    it('formats date correctly using formatDateTime', () => {
      const { getByText } = render(
        <ReportListItem
          {...defaultProps}
          createdAt="2026-01-18T14:30:00Z"
        />
      );

      // formatDateTime uses Indonesian locale (id-ID)
      // The exact format depends on the locale, so we just check it's rendered
      expect(getByText(/18/)).toBeTruthy(); // Day should be present
    });
  });

  describe('Accessibility', () => {
    it('truncates long descriptions to 2 lines', () => {
      const longDescription = 'This is a very long description that should be truncated to prevent the UI from breaking and taking too much vertical space in the list view';

      const { getByText } = render(
        <ReportListItem
          {...defaultProps}
          description={longDescription}
        />
      );

      const descText = getByText(longDescription);
      expect(descText.props.numberOfLines).toBe(2);
    });

    it('truncates long area names to 1 line', () => {
      const longAreaName = 'Taman Bungkul Raya Timur Laut dengan nama yang sangat panjang sekali';

      const { getByText } = render(
        <ReportListItem
          {...defaultProps}
          areaName={longAreaName}
        />
      );

      const areaText = getByText(longAreaName);
      expect(areaText.props.numberOfLines).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles numeric id', () => {
      render(
        <ReportListItem {...defaultProps} id={123} />
      );

      // Should render normally with numeric id - if render doesn't throw, test passes
    });

    it('handles empty description', () => {
      const { queryByText } = render(
        <ReportListItem
          {...defaultProps}
          description=""
        />
      );

      // Empty description should not render
      expect(queryByText('')).toBeNull();
    });

    it('handles missing onRetry callback for failed report', () => {
      const { queryByText } = render(
        <ReportListItem
          {...defaultProps}
          syncStatus="failed"
          queueId="queue-999"
        />
      );

      // Should not render retry button if onRetry is missing
      expect(queryByText('Coba Lagi')).toBeNull();
    });
  });
});
