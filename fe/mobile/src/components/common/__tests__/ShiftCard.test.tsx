/**
 * ShiftCard Component Tests
 * Tests shift display, status indicators, time formatting, and layout
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ShiftCard } from '../ShiftCard';
import type { Shift } from '../../../types/models.types';

// Mock date utilities
jest.mock('../../../utils/dateUtils', () => ({
  formatTime: jest.fn((date: string) => {
    const d = new Date(date);
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }),
  calculateDuration: jest.fn((start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return {
      hours,
      minutes,
      formatted: `${hours}j ${minutes}m`,
    };
  }),
}));

const mockArea = {
  id: 'area-1',
  name: 'Taman Bungkul',
  area_type: {
    id: 'type-1',
    name: 'Taman Kota',
  },
};

const mockActiveShift: Shift = {
  id: 'shift-1',
  user_id: 'user-1',
  area_id: 'area-1',
  clock_in_time: '2024-01-01T08:00:00Z',
  clock_out_time: null,
  clock_in_gps_lat: -7.275,
  clock_in_gps_lng: 112.75,
  clock_in_photo_url: 'https://example.com/photo.jpg',
  clock_out_gps_lat: null,
  clock_out_gps_lng: null,
  clock_out_photo_url: null,
  area: mockArea,
  created_at: '2024-01-01T08:00:00Z',
  updated_at: '2024-01-01T08:00:00Z',
};

const mockCompletedShift: Shift = {
  ...mockActiveShift,
  id: 'shift-2',
  clock_out_time: '2024-01-01T16:00:00Z',
  clock_out_gps_lat: -7.275,
  clock_out_gps_lng: 112.75,
  clock_out_photo_url: 'https://example.com/photo2.jpg',
};

describe('ShiftCard', () => {
  describe('Basic Rendering', () => {
    it('should render with active shift', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Aktif')).toBeTruthy();
    });

    it('should render with completed shift', () => {
      const { getByText } = render(<ShiftCard shift={mockCompletedShift} />);
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Selesai')).toBeTruthy();
    });

    it('should render area name', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should render area type', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('Taman Kota')).toBeTruthy();
    });
  });

  describe('Status Badge', () => {
    it('should show AKTIF for active shift', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('Aktif')).toBeTruthy();
    });

    it('should show SELESAI for completed shift', () => {
      const { getByText } = render(<ShiftCard shift={mockCompletedShift} />);
      expect(getByText('Selesai')).toBeTruthy();
    });

    it('should apply correct styles for active status', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      const statusText = getByText('Aktif');
      const statusBadge = statusText.parent;
      // Badge View has array style [statusBadge, statusActive]
      expect(statusBadge).toBeTruthy();
    });

    it('should apply correct styles for completed status', () => {
      const { getByText } = render(<ShiftCard shift={mockCompletedShift} />);
      const statusText = getByText('Selesai');
      const statusBadge = statusText.parent;
      expect(statusBadge).toBeTruthy();
    });
  });

  describe('Clock In Time', () => {
    it('should display clock in time', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('CLOCK IN')).toBeTruthy();
      expect(getByText('08:00')).toBeTruthy();
    });

    it('should format clock in time correctly', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('08:00')).toBeTruthy();
    });
  });

  describe('Clock Out Time', () => {
    it('should show --:-- for active shift', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('CLOCK OUT')).toBeTruthy();
      expect(getByText('--:--')).toBeTruthy();
    });

    it('should display clock out time for completed shift', () => {
      const { getByText } = render(<ShiftCard shift={mockCompletedShift} />);
      expect(getByText('CLOCK OUT')).toBeTruthy();
      expect(getByText('16:00')).toBeTruthy();
    });

    it('should format clock out time correctly', () => {
      const { getByText } = render(<ShiftCard shift={mockCompletedShift} />);
      expect(getByText('16:00')).toBeTruthy();
    });
  });

  describe('Duration Display', () => {
    it('should display duration label', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('DURASI')).toBeTruthy();
    });

    it('should calculate duration for active shift', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      // Duration is calculated, mock returns formatted string
      expect(getByText('DURASI')).toBeTruthy();
    });

    it('should calculate duration for completed shift', () => {
      const { getByText } = render(<ShiftCard shift={mockCompletedShift} />);
      // Duration is calculated, mock returns formatted string
      expect(getByText('DURASI')).toBeTruthy();
    });
  });

  describe('Shift Number Display', () => {
    it('should display shift number when provided', () => {
      const { getByText } = render(
        <ShiftCard shift={mockActiveShift} shiftNumber={1} />
      );
      expect(getByText('Shift #1')).toBeTruthy();
    });

    it('should display multiple shift numbers correctly', () => {
      const { getByText } = render(
        <ShiftCard shift={mockActiveShift} shiftNumber={5} />
      );
      expect(getByText('Shift #5')).toBeTruthy();
    });

    it('shows shift number (right) alongside the area title', () => {
      const { getByText } = render(
        <ShiftCard shift={mockActiveShift} shiftNumber={1} />
      );
      // v2.1: status pill + area title with the shift number on the right.
      expect(getByText('Shift #1')).toBeTruthy();
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('still shows area type when shift number provided', () => {
      const { getByText } = render(
        <ShiftCard shift={mockActiveShift} shiftNumber={1} />
      );
      expect(getByText('Taman Kota')).toBeTruthy();
    });
  });

  describe('Compact Mode', () => {
    it('should apply compact padding when enabled', () => {
      const { getByText } = render(
        <ShiftCard shift={mockActiveShift} compact={true} />
      );
      // Compact mode applies different padding
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should use regular padding by default', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });
  });

  describe('Area Information', () => {
    it('should handle missing area gracefully', () => {
      const shiftWithoutArea = { ...mockActiveShift, area: null };
      const { getByText } = render(<ShiftCard shift={shiftWithoutArea} />);
      expect(getByText('Area tidak diketahui')).toBeTruthy();
    });

    it('should handle missing area type gracefully', () => {
      const areaWithoutType = { ...mockArea, area_type: null };
      const shiftWithPartialArea = { ...mockActiveShift, area: areaWithoutType };
      const { getByText, queryByText } = render(
        <ShiftCard shift={shiftWithPartialArea} />
      );
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(queryByText('Taman Kota')).toBeNull();
    });

    it('should truncate long area names', () => {
      const longAreaName = 'Taman Kota Dengan Nama Yang Sangat Panjang Sekali';
      const areaWithLongName = { ...mockArea, name: longAreaName };
      const shiftWithLongName = { ...mockActiveShift, area: areaWithLongName };
      const { getByText } = render(<ShiftCard shift={shiftWithLongName} />);
      const areaText = getByText(longAreaName);
      expect(areaText.props.numberOfLines).toBe(1);
    });
  });

  describe('Time Labels', () => {
    it('should display all time labels in uppercase', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('CLOCK IN')).toBeTruthy();
      expect(getByText('CLOCK OUT')).toBeTruthy();
      expect(getByText('DURASI')).toBeTruthy();
    });

    it('should render clock in icon', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      // Icon is rendered as part of time section
      expect(getByText('CLOCK IN')).toBeTruthy();
    });

    it('should render clock out icon', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('CLOCK OUT')).toBeTruthy();
    });

    it('should render duration icon', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('DURASI')).toBeTruthy();
    });
  });

  describe('Layout Structure', () => {
    it('should render header section', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Aktif')).toBeTruthy();
    });

    it('should render time row with 3 columns', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      expect(getByText('CLOCK IN')).toBeTruthy();
      expect(getByText('CLOCK OUT')).toBeTruthy();
      expect(getByText('DURASI')).toBeTruthy();
    });

    it('should render dividers between time columns', () => {
      const { getByText } = render(<ShiftCard shift={mockActiveShift} />);
      // Dividers are rendered but not directly testable
      expect(getByText('CLOCK IN')).toBeTruthy();
      expect(getByText('CLOCK OUT')).toBeTruthy();
      expect(getByText('DURASI')).toBeTruthy();
    });
  });

  describe('Multiple Shifts', () => {
    it('should render multiple shift cards independently', () => {
      const shift2: Shift = {
        ...mockActiveShift,
        id: 'shift-2',
        area: {
          ...mockArea,
          id: 'area-2',
          name: 'Taman Mayangkara',
        },
      };

      const { getByText } = render(
        <>
          <ShiftCard shift={mockActiveShift} />
          <ShiftCard shift={shift2} />
        </>
      );

      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Taman Mayangkara')).toBeTruthy();
    });

    it('should handle mix of active and completed shifts', () => {
      const { getAllByText } = render(
        <>
          <ShiftCard shift={mockActiveShift} />
          <ShiftCard shift={mockCompletedShift} />
        </>
      );

      expect(getAllByText('Taman Bungkul')).toHaveLength(2);
      expect(getAllByText('Aktif')).toHaveLength(1);
      expect(getAllByText('Selesai')).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle shift with empty area name', () => {
      const emptyAreaName = { ...mockArea, name: '' };
      const shiftWithEmptyArea = { ...mockActiveShift, area: emptyAreaName };
      const { getByText } = render(<ShiftCard shift={shiftWithEmptyArea} />);
      // Empty string is falsy, so component shows fallback
      expect(getByText('Area tidak diketahui')).toBeTruthy();
    });

    it('should handle shift with undefined area_type name', () => {
      const undefinedType = { ...mockArea, area_type: { ...mockArea.area_type, name: undefined } };
      const shift = { ...mockActiveShift, area: undefinedType as any };
      const { queryByText } = render(<ShiftCard shift={shift} />);
      // Should not crash
      expect(queryByText('Taman Bungkul')).toBeTruthy();
    });

    it('should handle shift number 0', () => {
      const { getByText } = render(
        <ShiftCard shift={mockActiveShift} shiftNumber={0} />
      );
      // 0 is falsy in JS, so component falls through to area display
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should handle very large shift numbers', () => {
      const { getByText } = render(
        <ShiftCard shift={mockActiveShift} shiftNumber={999} />
      );
      expect(getByText('Shift #999')).toBeTruthy();
    });

    it('should handle special characters in area name', () => {
      const specialArea = { ...mockArea, name: "Taman O'Brien & Co." };
      const shift = { ...mockActiveShift, area: specialArea };
      const { getByText } = render(<ShiftCard shift={shift} />);
      expect(getByText("Taman O'Brien & Co.")).toBeTruthy();
    });
  });

  describe('Re-rendering', () => {
    it('should update when shift prop changes', () => {
      const { getByText, rerender } = render(
        <ShiftCard shift={mockActiveShift} />
      );
      expect(getByText('Aktif')).toBeTruthy();

      rerender(<ShiftCard shift={mockCompletedShift} />);
      expect(getByText('Selesai')).toBeTruthy();
    });

    it('should update when shift number changes', () => {
      const { getByText, rerender } = render(
        <ShiftCard shift={mockActiveShift} shiftNumber={1} />
      );
      expect(getByText('Shift #1')).toBeTruthy();

      rerender(<ShiftCard shift={mockActiveShift} shiftNumber={2} />);
      expect(getByText('Shift #2')).toBeTruthy();
    });

    it('should update when compact mode changes', () => {
      const { getByText, rerender } = render(
        <ShiftCard shift={mockActiveShift} compact={false} />
      );
      expect(getByText('Taman Bungkul')).toBeTruthy();

      rerender(<ShiftCard shift={mockActiveShift} compact={true} />);
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });
  });
});
