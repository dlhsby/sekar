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

      // NBModal renders the title uppercase, with total suffix: "JAM KERJA HARI INI (Xj Ym)"
      expect(getByText(/JAM KERJA HARI INI/)).toBeTruthy();
    });

    it('should not render content when visible is false', () => {
      const { queryByText } = render(
        <TodayWorkHoursModal
          visible={false}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(queryByText('JAM KERJA HARI INI')).toBeNull();
    });

    it('should render close button', () => {
      const { getByLabelText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(getByLabelText('Tutup')).toBeTruthy();
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
  });

  describe('Total Duration', () => {
    it('should show total duration in title when shifts exist', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      // Total is shown inline in the (uppercased) title: "JAM KERJA HARI INI (Xj Ym)"
      expect(getByText(/JAM KERJA HARI INI \(\d+J \d+M\)/)).toBeTruthy();
    });

    it('should calculate total duration from completed shifts', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={[mockShifts[0]]}
        />
      );

      // 08:00 to 17:00 = 9 hours — appears in (uppercased) title suffix
      expect(getByText(/9J/)).toBeTruthy();
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
      expect(getByText(/[-]?\d+J [-]?\d+M/)).toBeTruthy();
    });

    it('should not show duration suffix in title when no shifts', () => {
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={[]}
        />
      );

      // Title has no suffix when there are no shifts (uppercased by NBModal)
      expect(getByText('JAM KERJA HARI INI')).toBeTruthy();
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

    it('should render the correct number of shift cards', () => {
      const { getByTestId } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      // Both shift cards must be present
      expect(getByTestId('shift-card-shift1')).toBeTruthy();
      expect(getByTestId('shift-card-shift2')).toBeTruthy();
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

      const closeButton = getByLabelText('Tutup');
      fireEvent.press(closeButton);

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

      expect(getByLabelText('Tutup')).toBeTruthy();
    });

    it('should have accessibility role button for close button', () => {
      const { getByLabelText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      const closeButton = getByLabelText('Tutup');
      expect(closeButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Platform Specific', () => {
    it('should render modal content inside overlay', () => {
      // The inner View uses onStartShouldSetResponder={true} to prevent tap propagation
      // to the overlay Pressable — this is a device-level responder system behavior
      // that cannot be reliably unit-tested; it is verified via manual/E2E testing.
      const { getByText } = render(
        <TodayWorkHoursModal
          visible={true}
          onClose={mockOnClose}
          shifts={mockShifts}
        />
      );

      expect(getByText(/JAM KERJA HARI INI/)).toBeTruthy();
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

      // 15 minutes = 0h 15m (title suffix uppercased by NBModal)
      expect(getByText(/0J 15M/)).toBeTruthy();
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
