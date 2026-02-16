/**
 * ShiftDetailModal Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShiftDetailModal } from '../ShiftDetailModal';
import type { Shift } from '../../../types/models.types';

// Mock gpsUtils
jest.mock('../../../utils/gpsUtils', () => ({
  calculateDistance: jest.fn((lat1, lng1, lat2, lng2) => {
    // Mock distance: return 50m for valid coords, 150m for outside
    if (lat1 === -7.250445 && lng1 === 112.768845) {
      return 50; // Inside radius
    }
    return 150; // Outside radius
  }),
}));

describe('ShiftDetailModal', () => {
  const mockOnClose = jest.fn();

  const mockShift: Shift = {
    id: 'shift1',
    user_id: 'user1',
    area_id: 'area1',
    clock_in_time: new Date('2026-02-15T08:00:00Z'),
    clock_in_gps_lat: -7.250445,
    clock_in_gps_lng: 112.768845,
    clock_in_photo_url: 'https://example.com/clock-in.jpg',
    clock_out_time: new Date('2026-02-15T17:00:00Z'),
    clock_out_gps_lat: -7.250445,
    clock_out_gps_lng: 112.768845,
    clock_out_photo_url: 'https://example.com/clock-out.jpg',
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
      address: 'Jl. Raya Darmo, Surabaya',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
      area_type: {
        id: 'type1',
        name: 'Taman Kota',
        description: 'Taman untuk rekreasi warga',
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      },
    },
  };

  const mockShiftOutsideRadius: Shift = {
    ...mockShift,
    clock_in_gps_lat: -7.260000,
    clock_in_gps_lng: 112.780000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when visible is true', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Detail Shift')).toBeTruthy();
    });

    it('should not render content when visible is false', () => {
      const { queryByText } = render(
        <ShiftDetailModal
          visible={false}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(queryByText('Detail Shift')).toBeNull();
    });

    it('should render close button', () => {
      const { getByLabelText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByLabelText('Tutup modal')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when shift is null', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={null}
        />
      );

      expect(getByText('Tidak ada shift aktif')).toBeTruthy();
      expect(getByText('📋')).toBeTruthy();
    });
  });

  describe('Shift Information', () => {
    it('should display area name', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('should display area address when available', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Jl. Raya Darmo, Surabaya')).toBeTruthy();
    });

    it('should display area type when available', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Taman Kota')).toBeTruthy();
    });

    it('should display clock in time', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Clock In')).toBeTruthy();
      // Time display depends on formatDateTime utility
    });

    it('should display clock in GPS coordinates', () => {
      const { getByText, getAllByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('GPS Clock In')).toBeTruthy();
      const gpsTexts = getAllByText(/-7\.250445, 112\.768845/);
      expect(gpsTexts.length).toBeGreaterThan(0);
    });

    it('should display area center GPS coordinates', () => {
      const { getByText, getAllByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Pusat Area')).toBeTruthy();
      const gpsTexts = getAllByText(/-7\.250445, 112\.768845/);
      expect(gpsTexts.length).toBe(2); // Clock in GPS and Area center GPS
    });

    it('should handle missing area gracefully', () => {
      const shiftWithoutArea: Shift = {
        ...mockShift,
        area: undefined,
      };

      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={shiftWithoutArea}
        />
      );

      expect(getByText('Tidak diketahui')).toBeTruthy();
    });

    it('should display N/A for missing GPS coordinates', () => {
      const shiftWithoutGPS: Shift = {
        ...mockShift,
        clock_in_gps_lat: null as any,
        clock_in_gps_lng: null as any,
      };

      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={shiftWithoutGPS}
        />
      );

      expect(getByText('N/A')).toBeTruthy();
    });
  });

  describe('Location Validation', () => {
    it('should show VALID status when inside radius', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('VALID')).toBeTruthy();
      expect(getByText('Validasi Lokasi')).toBeTruthy();
    });

    it('should show TIDAK VALID status when outside radius', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShiftOutsideRadius}
        />
      );

      expect(getByText('TIDAK VALID')).toBeTruthy();
    });

    it('should display distance and radius', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Jarak')).toBeTruthy();
      expect(getByText('50m')).toBeTruthy();
      expect(getByText('Radius')).toBeTruthy();
      expect(getByText('100m')).toBeTruthy();
    });

    it('should handle missing area GPS coordinates', () => {
      const shiftWithoutAreaGPS: Shift = {
        ...mockShift,
        area: {
          ...mockShift.area!,
          gps_lat: null as any,
          gps_lng: null as any,
        },
      };

      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={shiftWithoutAreaGPS}
        />
      );

      expect(getByText('0m')).toBeTruthy(); // Distance is 0 when coordinates missing
    });

    it('should use default radius when not specified', () => {
      const shiftWithoutRadius: Shift = {
        ...mockShift,
        area: {
          ...mockShift.area!,
          radius_meters: undefined,
        },
      };

      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={shiftWithoutRadius}
        />
      );

      expect(getByText('100m')).toBeTruthy(); // Default radius
    });
  });

  describe('Modal Close', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByLabelText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      const closeButton = getByLabelText('Tutup modal');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay is pressed', () => {
      const { getByLabelText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      fireEvent(getByLabelText('Tutup modal').parent?.parent?.parent, 'press');

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByLabelText('Tutup modal')).toBeTruthy();
    });
  });

  describe('Table Style Layout', () => {
    it('should display all table row labels', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Area')).toBeTruthy();
      expect(getByText('Tipe Area')).toBeTruthy();
      expect(getByText('Clock In')).toBeTruthy();
      expect(getByText('GPS Clock In')).toBeTruthy();
      expect(getByText('Pusat Area')).toBeTruthy();
    });

    it('should not display area type row when not available', () => {
      const shiftWithoutAreaType: Shift = {
        ...mockShift,
        area: {
          ...mockShift.area!,
          area_type: undefined,
        },
      };

      const { queryByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={shiftWithoutAreaType}
        />
      );

      expect(queryByText('Tipe Area')).toBeNull();
    });

    it('should not display area center when GPS not available', () => {
      const shiftWithoutAreaGPS: Shift = {
        ...mockShift,
        area: {
          ...mockShift.area!,
          gps_lat: undefined,
          gps_lng: undefined,
        },
      };

      const { queryByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={shiftWithoutAreaGPS}
        />
      );

      expect(queryByText('Pusat Area')).toBeNull();
    });
  });

  describe('Platform Specific', () => {
    it('should prevent event propagation on modal content press', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      const modalContent = getByText('Detail Shift');
      fireEvent.press(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
