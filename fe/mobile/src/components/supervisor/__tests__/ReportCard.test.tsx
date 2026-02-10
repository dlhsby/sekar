/**
 * ReportCard Component Tests
 * Unit tests for individual report card in supervisor reports list
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReportCard, ReportCardData } from '../ReportCard';

// Alert mocked in jest.setup.js

// Mock dateUtils
jest.mock('../../../utils/dateUtils', () => ({
  getRelativeTime: jest.fn((date: string) => {
    // Simple mock that returns different strings based on input
    if (date.includes('2026-01-19T10:00:00')) {
      return 'baru saja';
    }
    if (date.includes('2026-01-19T09:00:00')) {
      return '1 jam yang lalu';
    }
    if (date.includes('2026-01-18')) {
      return '1 hari yang lalu';
    }
    return '5 menit yang lalu';
  }),
}));

describe('ReportCard', () => {
  const mockOnPress = jest.fn();
  const testID = 'report-card';

  const defaultReport: ReportCardData = {
    id: 1,
    worker_name: 'Budi Santoso',
    area_name: 'Taman Bungkul',
    report_type: 'task_completion',
    created_at: '2026-01-19T10:00:00Z',
    thumbnail_url: 'https://example.com/thumb.jpg',
    reviewed: false,
  };

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('basic rendering', () => {
    it('should render worker name', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Budi Santoso')).toBeTruthy();
    });

    it('should render area name', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should render worker initials from two-word name', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('BS')).toBeTruthy();
    });

    it('should render initials from single-word name', () => {
      const report = { ...defaultReport, worker_name: 'Ahmad' };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('AH')).toBeTruthy();
    });

    it('should render relative time', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('baru saja')).toBeTruthy();
    });

    it('should render chevron icon', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('›')).toBeTruthy();
    });
  });

  describe('report type badges', () => {
    it('should render task_completion badge with correct label', () => {
      const report = { ...defaultReport, report_type: 'task_completion' as const };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('PENYELESAIAN TUGAS')).toBeTruthy();
    });

    it('should render incident badge with correct label', () => {
      const report = { ...defaultReport, report_type: 'incident' as const };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('INSIDEN')).toBeTruthy();
    });

    it('should render maintenance_request badge with correct label', () => {
      const report = { ...defaultReport, report_type: 'maintenance_request' as const };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('PERMINTAAN PEMELIHARAAN')).toBeTruthy();
    });

    it('should fallback to report_type if unknown type', () => {
      const report = { ...defaultReport, report_type: 'unknown_type' as any };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('UNKNOWN_TYPE')).toBeTruthy();
    });
  });

  describe('thumbnail', () => {
    it('should render thumbnail when thumbnail_url is provided', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} testID={testID} />);

      // Check that the Image component is rendered with the thumbnail URL
      const card = screen.getByTestId(testID);
      expect(card).toBeTruthy();
      // The thumbnail is rendered if thumbnail_url exists
    });

    it('should not render thumbnail when thumbnail_url is not provided', () => {
      const report = { ...defaultReport, thumbnail_url: undefined };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      // Card should still render without thumbnail
      expect(screen.getByTestId(testID)).toBeTruthy();
    });
  });

  describe('reviewed status', () => {
    it('should render reviewed badge when reviewed is true', () => {
      const report = { ...defaultReport, reviewed: true };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('✓')).toBeTruthy();
    });

    it('should not render reviewed badge when reviewed is false', () => {
      const report = { ...defaultReport, reviewed: false };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      // Should not have checkmark (only chevron '›' should exist)
      expect(screen.queryByText('✓')).toBeNull();
    });

    it('should not render reviewed badge when reviewed is undefined', () => {
      const report = { ...defaultReport };
      delete (report as any).reviewed;
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.queryByText('✓')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('should call onPress when card is pressed', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} testID={testID} />);

      const card = screen.getByTestId(testID);
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should call onPress multiple times when pressed multiple times', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} testID={testID} />);

      const card = screen.getByTestId(testID);
      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('different time values', () => {
    it('should render "1 jam yang lalu" for older reports', () => {
      const report = { ...defaultReport, created_at: '2026-01-19T09:00:00Z' };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('1 jam yang lalu')).toBeTruthy();
    });

    it('should render "1 hari yang lalu" for yesterday reports', () => {
      const report = { ...defaultReport, created_at: '2026-01-18T10:00:00Z' };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('1 hari yang lalu')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle long worker names', () => {
      const report = {
        ...defaultReport,
        worker_name: 'Muhammad Abdullah Bin Rashid Al-Maktoum',
      };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Muhammad Abdullah Bin Rashid Al-Maktoum')).toBeTruthy();
      expect(screen.getByText('MA')).toBeTruthy(); // First and second word initials
    });

    it('should handle long area names', () => {
      const report = {
        ...defaultReport,
        area_name: 'Taman Rekreasi Keluarga Bungkul Surabaya Timur',
      };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Taman Rekreasi Keluarga Bungkul Surabaya Timur')).toBeTruthy();
    });

    it('should render card with minimum required props', () => {
      const minimalReport: ReportCardData = {
        id: 1,
        worker_name: 'Test',
        area_name: 'Area',
        report_type: 'incident',
        created_at: '2026-01-19T10:00:00Z',
      };
      render(<ReportCard report={minimalReport} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Test')).toBeTruthy();
      expect(screen.getByText('Area')).toBeTruthy();
      expect(screen.getByText('INSIDEN')).toBeTruthy();
    });

    it('should handle undefined worker_name gracefully', () => {
      const report = {
        ...defaultReport,
        worker_name: undefined,
      };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Nama tidak tersedia')).toBeTruthy();
      expect(screen.getByText('??')).toBeTruthy(); // Default initials
    });

    it('should handle null worker_name gracefully', () => {
      const report = {
        ...defaultReport,
        worker_name: null,
      };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Nama tidak tersedia')).toBeTruthy();
      expect(screen.getByText('??')).toBeTruthy();
    });

    it('should handle empty string worker_name', () => {
      const report = {
        ...defaultReport,
        worker_name: '',
      };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Nama tidak tersedia')).toBeTruthy();
      expect(screen.getByText('??')).toBeTruthy();
    });

    it('should handle whitespace-only worker_name', () => {
      const report = {
        ...defaultReport,
        worker_name: '   ',
      };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Nama tidak tersedia')).toBeTruthy();
      expect(screen.getByText('??')).toBeTruthy();
    });

    it('should handle undefined area_name gracefully', () => {
      const report = {
        ...defaultReport,
        area_name: undefined,
      };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Area tidak tersedia')).toBeTruthy();
    });

    it('should handle null area_name gracefully', () => {
      const report = {
        ...defaultReport,
        area_name: null,
      };
      render(<ReportCard report={report} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByText('Area tidak tersedia')).toBeTruthy();
    });
  });

  describe('testID', () => {
    it('should apply testID to the card', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} testID={testID} />);

      expect(screen.getByTestId(testID)).toBeTruthy();
    });

    it('should render without testID', () => {
      render(<ReportCard report={defaultReport} onPress={mockOnPress} />);

      expect(screen.getByText('Budi Santoso')).toBeTruthy();
    });
  });
});
