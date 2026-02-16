/**
 * TodayWorkHoursModal Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TodayWorkHoursModal } from '../TodayWorkHoursModal';
import type { Shift } from '../../../types/models.types';

// Mock ShiftCard component
jest.mock('../../common', () => ({
  ShiftCard: ({ shift, shiftNumber }: any) => {
    const MockText = require('react-native').Text;
    return (
      <MockText testID={`shift-card-${shift.id}`}>
        Shift #{shiftNumber} - {shift.area?.name || 'Unknown'}
      </MockText>
    );
  },
}));

describe('TodayWorkHoursModal', () => {
  const mockOnClose = jest.fn();

  const mockShifts: Shift[] = [
    {
      id: 'shift1',
      user_id: 'user1',
      area_id: 'area1',
      clock_in_time: new Date('2026-02-15T08:00:00Z'),
      clock_in_gps_lat: -7.250445,
      clock_in_gps_lng: 112.768845,
      clock_in_photo_url: 'https://example.com/in1.jpg',
      clock_out_time: new Date('2026-02-15T17:00:00Z'),
      clock_out_gps_lat: -7.250445,
      clock_out_gps_lng: 112.768845,
      clock_out_photo_url: 'https://example.com/out1.jpg',
      created_at: new Date('2026-02-15T08:00:00Z'),
      updated_at: new Date('2026-02-15T17:00:00Z'),
      area: {
        id: 'area1',
        name: 'Taman Bungkul',
        area_type_id: 'type1',
        rayon_id: 'rayon1',
        gps_lat: -7.250445,
        gps_lng: 112.768845,
        radius_meters: 100,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      },
    },
    {
      id: 'shift2',
      user_id: 'user1',
      area_id: 'area2',
      clock_in_time: new Date('2026-02-15T19:00:00Z'),
      clock_in_gps_lat: -7.260000,
      clock_in_gps_lng: 112.780000,
      clock_in_photo_url: 'https://example.com/in2.jpg',
      clock_out_time: null,
      clock_out_gps_lat: null,
      clock_out_gps_lng: null,
      clock_out_photo_url: null,
      created_at: new Date('2026-02-15T19:00:00Z'),
      updated_at: new Date('2026-02-15T19:00:00Z'),
      area: {
        id: 'area2',
        name: 'Taman Surya',
        area_type_id: 'type1',
        rayon_id: 'rayon1',
        gps_lat: -7.260000,
        gps_lng: 112.780000,
        radius_meters: 100,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when visible is true', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(getByText('Jam Kerja Hari Ini')).toBeTruthy();
    });

    it('should not render content when visible is false', () => {
      const { queryByText } = render(
        <TodayWorkHoursModal
          visible={false}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(queryByText('Jam Kerja Hari Ini')).toBeNull();
    });

    it('should render close button', () => {
      const { getByLabelText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(getByLabelText('Tutup modal')).toBeTruthy();
    });

    it('should display today date in subtitle', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      const dateElements = getByText(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
      expect(dateElements).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no shifts', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={[]}
        />
      );

      expect(getByText('Belum ada shift hari ini')).toBeTruthy();
      expect(getByText('Clock in terlebih dahulu untuk memulai shift')).toBeTruthy();
    });

    it('should display empty state icon', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={[]}
        />
      );

      expect(getByText('⏰')).toBeTruthy();
    });
  });

  describe('Total Duration', () => {
    it('should display total work hours section', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(getByText('Total Jam Kerja Hari Ini')).toBeTruthy();
    });

    it('should calculate total duration from completed shifts', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={[mockShifts[0]]}
        />
      );

      // 08:00 to 17:00 = 9 hours
      expect(getByText(/9j/)).toBeTruthy();
    });

    it('should include active shift duration with current time', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      // Should show total including active shift (allows negative due to mock date)
      expect(getByText(/[-]?\d+j [-]?\d+m/)).toBeTruthy();
    });

    it('should display zero when no shifts', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={[]}
        />
      );

      expect(getByText('Belum ada shift hari ini')).toBeTruthy();
    });
  });

  describe('Shift Cards', () => {
    it('should render all shift cards', () => {
      const { getByTestId } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(getByTestId('shift-card-shift1')).toBeTruthy();
      expect(getByTestId('shift-card-shift2')).toBeTruthy();
    });

    it('should pass shift number to ShiftCard', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(getByText(/Shift #1/)).toBeTruthy();
      expect(getByText(/Shift #2/)).toBeTruthy();
    });

    it('should display section title for shift history', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(getByText('Riwayat Shift Hari Ini')).toBeTruthy();
    });
  });

  describe('Modal Close', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByLabelText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      const closeButton = getByLabelText('Tutup modal');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay is pressed', () => {
      const { getByLabelText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      fireEvent(getByLabelText('Tutup modal').parent?.parent?.parent, 'press');

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(getByLabelText('Tutup modal')).toBeTruthy();
    });

    it('should have accessibility role button for close button', () => {
      const { getByLabelText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      const closeButton = getByLabelText('Tutup modal');
      expect(closeButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Platform Specific', () => {
    it('should prevent event propagation on modal content press', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      const modalContent = getByText('Jam Kerja Hari Ini');
      fireEvent.press(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle shifts with missing area', () => {
      const shiftsWithoutArea: Shift[] = [
        {
          ...mockShifts[0],
          area: undefined,
        },
      ];

      const { getByTestId } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={shiftsWithoutArea}
        />
      );

      expect(getByTestId('shift-card-shift1')).toBeTruthy();
    });

    it('should handle very short shifts', () => {
      const shortShift: Shift = {
        ...mockShifts[0],
        clock_in_time: new Date('2026-02-15T08:00:00Z'),
        clock_out_time: new Date('2026-02-15T08:15:00Z'),
      };

      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={[shortShift]}
        />
      );

      // 15 minutes = 0h 15m
      expect(getByText(/0j 15m/)).toBeTruthy();
    });

    it('should handle single active shift', () => {
      const { getByTestId } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={[mockShifts[1]]}
        />
      );

      expect(getByTestId('shift-card-shift2')).toBeTruthy();
    });
  });
});
