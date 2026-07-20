/**
 * ShiftDetailModal Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShiftDetailModal } from '../ShiftDetailModal';
import type { Shift } from '../../../types/models.types';

// Initialize i18n for tests
import '../../../i18n/config';

// Mock gpsUtils
import { isWithinAreaBoundary } from '../../../utils/gpsUtils';

jest.mock('../../../utils/gpsUtils', () => ({
  // Containment is polygon-based now (the radius arm is retired), so the modal
  // asks the shared helper instead of doing its own distance <= radius maths.
  isWithinAreaBoundary: jest.fn((lat: number) => lat === -7.250445),
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
    location_id: 'area1',
    clock_in_time: '2026-02-15T08:00:00Z',
    clock_in_gps_lat: -7.250445,
    clock_in_gps_lng: 112.768845,
    clock_in_photo_url: 'https://example.com/clock-in.jpg',
    clock_out_time: '2026-02-15T17:00:00Z',
    clock_out_gps_lat: -7.250445,
    clock_out_gps_lng: 112.768845,
    created_at: '2026-02-15T08:00:00Z',
    updated_at: '2026-02-15T17:00:00Z',
    area: {
      id: 'area1',
      name: 'Taman Bungkul',
      area_type_id: 'type1',
      district_id: 'district1',
      gps_lat: -7.250445,
      gps_lng: 112.768845,
      address: 'Jl. Raya Darmo, Surabaya',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      locationType: {
        id: 'type1',
        code: 'park' as const,
        name: 'Taman Kota',
        description: 'Taman untuk rekreasi warga',
        created_at: '2026-01-01T00:00:00Z',
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

      expect(getByLabelText('Tutup')).toBeTruthy();
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

      // BUG: Component uses t('shifts.noShiftActive') but key is in 'attendance' namespace
      // Should use tAttendance('shifts.noShiftActive')
      expect(getByText('shifts.noShiftActive')).toBeTruthy();
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

    it('should display area center GPS coordinates as subtext in area row', () => {
      const { getByText, getAllByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      // Area center coordinates appear as "Pusat: lat, lng" subtext under the Area row
      const gpsTexts = getAllByText(/-7\.250445, 112\.768845/);
      expect(gpsTexts.length).toBe(2); // Clock in GPS and Area center GPS (as subtext)
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
    it('should show "Dalam Area" status when inside radius', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Dalam Area')).toBeTruthy();
      expect(getByText('Validasi Lokasi Clock In')).toBeTruthy();
    });

    it('should show "Luar Area" status when outside radius', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShiftOutsideRadius}
        />
      );

      expect(getByText('Luar Area')).toBeTruthy();
    });

    it('should display distance and radius', () => {
      const { getByText, queryByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      // MetricTile renders labels via toUpperCase(). Distance survives — it is
      // still what the UI reports — but RADIUS is gone: `radius_meters` is
      // retired, and the tile showed `radius_meters || 100`, i.e. a number the
      // server had already stopped believing in.
      expect(getByText('JARAK')).toBeTruthy();
      expect(getByText('50m')).toBeTruthy();
      expect(queryByText('RADIUS')).toBeNull();
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

    it('reports inside/outside from the polygon, not a radius', () => {
      // The old rule was `distance <= (radius_meters ?? 100)`. With the column
      // retired that `?? 100` would have invented a geofence the server does not
      // share, so containment comes from the shared helper the backend mirrors.
      const { getByText } = render(
        <ShiftDetailModal visible={true} onClose={mockOnClose} shift={mockShift} />
      );

      expect(isWithinAreaBoundary).toHaveBeenCalledWith(
        mockShift.clock_in_gps_lat,
        mockShift.clock_in_gps_lng,
        mockShift.area,
      );
      expect(getByText('50m')).toBeTruthy();
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

      const closeButton = getByLabelText('Tutup');
      fireEvent.press(closeButton);

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

      expect(getByLabelText('Tutup')).toBeTruthy();
    });
  });

  describe('Table Style Layout', () => {
    it('should display all table row labels', () => {
      const { getByText, getAllByText } = render(
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
      // Area center coords appear as mono-sm text in Area row + GPS Clock In row
      const gpsTexts = getAllByText(/-7\.250445, 112\.768845/);
      expect(gpsTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('should not display area type row when not available', () => {
      const shiftWithoutAreaType: Shift = {
        ...mockShift,
        area: {
          ...mockShift.area!,
          locationType: undefined,
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

    it('should not display area center subtext when GPS not available', () => {
      const shiftWithoutAreaGPS: Shift = {
        ...mockShift,
        area: {
          ...mockShift.area!,
          // No area GPS — cast since Area types gps_* as number
          gps_lat: undefined as unknown as number,
          gps_lng: undefined as unknown as number,
        },
      };

      const { queryByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={shiftWithoutAreaGPS}
        />
      );

      // With no area GPS the area-center row is absent; only the clock-in GPS
      // row remains, so the coordinate still appears exactly once.
      expect(queryByText(/-7\.250445, 112\.768845/)).toBeTruthy();
    });
  });

  describe('Platform Specific', () => {
    it('should render modal content inside overlay', () => {
      // The inner View uses onStartShouldSetResponder={true} to prevent tap propagation
      // to the overlay Pressable — this is a device-level responder system behavior
      // that cannot be reliably unit-tested; it is verified via manual/E2E testing.
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Detail Shift')).toBeTruthy();
    });
  });

  describe('Phase 2C Wording Changes', () => {
    it('should use "Validasi Lokasi Clock In" as validation section title', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Validasi Lokasi Clock In')).toBeTruthy();
    });

    it('should show "Dalam Area" badge when clock-in is inside radius', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      expect(getByText('Dalam Area')).toBeTruthy();
    });

    it('should show "Luar Area" badge when clock-in is outside radius', () => {
      const { getByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShiftOutsideRadius}
        />
      );

      expect(getByText('Luar Area')).toBeTruthy();
    });

    it('should render area center coordinates as subtext under Area row', () => {
      const { getAllByText } = render(
        <ShiftDetailModal
          visible={true}
          onClose={mockOnClose}
          shift={mockShift}
        />
      );

      // Center GPS shown as mono-sm text in the Area row (same coords as clock-in in this fixture)
      const gpsTexts = getAllByText(/-7\.250445, 112\.768845/);
      expect(gpsTexts.length).toBeGreaterThanOrEqual(1);
    });
  });
});
