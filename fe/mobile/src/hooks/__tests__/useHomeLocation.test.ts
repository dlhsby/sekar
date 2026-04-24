/**
 * useHomeLocation Hook Tests
 * Phase 2D: Tests for GPS location state management on HomeScreen.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useHomeLocation } from '../useHomeLocation';
import Geolocation from 'react-native-geolocation-service';
import { locationTracker } from '../../services/location/locationTracker';
import { isWithinAreaBoundary } from '../../utils/gpsUtils';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
}));

const locationTrackerListeners: Record<string, ((...args: any[]) => void)[]> = {};

jest.mock('../../services/location/locationTracker', () => ({
  locationTracker: {
    captureNow: jest.fn(),
    forceUpload: jest.fn(),
    on: jest.fn((event: string, handler: (...args: any[]) => void) => {
      if (!locationTrackerListeners[event]) locationTrackerListeners[event] = [];
      locationTrackerListeners[event].push(handler);
    }),
    off: jest.fn((event: string, handler: (...args: any[]) => void) => {
      if (locationTrackerListeners[event]) {
        locationTrackerListeners[event] = locationTrackerListeners[event].filter(
          (h) => h !== handler,
        );
      }
    }),
  },
}));

function emitLocationUpdate(ping: { latitude: number; longitude: number; accuracy: number }) {
  locationTrackerListeners['locationUpdate']?.forEach((h) => h(ping));
}

jest.mock('../../utils/gpsUtils', () => ({
  isWithinAreaBoundary: jest.fn(() => true),
}));

let mockAuthState: { assignedArea: any } = { assignedArea: null };
let mockShiftState: { currentShift: any } = { currentShift: null };

jest.mock('../../store/hooks', () => ({
  useAppSelector: (selector: any) =>
    selector({
      auth: mockAuthState,
      shift: mockShiftState,
    }),
}));

const mockGeolocation = Geolocation.getCurrentPosition as jest.MockedFunction<
  typeof Geolocation.getCurrentPosition
>;
const mockIsWithinArea = isWithinAreaBoundary as jest.MockedFunction<typeof isWithinAreaBoundary>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function simulateSuccess(lat = -7.2905, lng = 112.7398, accuracy = 10) {
  mockGeolocation.mockImplementation((success) => {
    success({
      coords: { latitude: lat, longitude: lng, accuracy, altitude: 0, heading: 0, speed: 0 },
      timestamp: Date.now(),
    } as any);
  });
}

function simulateError(message = 'Location unavailable') {
  mockGeolocation.mockImplementation((_success, error) => {
    error?.({ code: 1, message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as any);
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useHomeLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear listener registry between tests
    Object.keys(locationTrackerListeners).forEach((k) => delete locationTrackerListeners[k]);
    mockAuthState = { assignedArea: null };
    mockShiftState = { currentShift: null };
    mockIsWithinArea.mockReturnValue(true);
  });

  describe('initial state', () => {
    it('returns null coordinates when no active shift', () => {
      const { result } = renderHook(() => useHomeLocation());

      expect(result.current.location.latitude).toBeNull();
      expect(result.current.location.longitude).toBeNull();
      expect(result.current.location.accuracy).toBeNull();
      expect(result.current.location.loading).toBe(false);
      expect(result.current.location.error).toBeNull();
      expect(result.current.location.updatedAt).toBeNull();
      expect(result.current.hasActiveShift).toBe(false);
    });
  });

  describe('with active shift', () => {
    beforeEach(() => {
      mockShiftState = { currentShift: { id: 'shift-1' } };
    });

    it('auto-fetches location on mount', () => {
      simulateSuccess();
      renderHook(() => useHomeLocation());

      expect(mockGeolocation).toHaveBeenCalledTimes(1);
    });

    it('sets coordinates on successful fetch', () => {
      simulateSuccess(-7.2905, 112.7398, 15);
      const { result } = renderHook(() => useHomeLocation());

      expect(result.current.location.latitude).toBe(-7.2905);
      expect(result.current.location.longitude).toBe(112.7398);
      expect(result.current.location.accuracy).toBe(15);
      expect(result.current.location.loading).toBe(false);
      expect(result.current.location.error).toBeNull();
      expect(result.current.location.updatedAt).toBeInstanceOf(Date);
    });

    it('sets error on failed fetch', () => {
      simulateError('Gagal mendapatkan lokasi');
      const { result } = renderHook(() => useHomeLocation());

      expect(result.current.location.error).toBe('Gagal mendapatkan lokasi');
      expect(result.current.location.loading).toBe(false);
      expect(result.current.location.latitude).toBeNull();
    });

    it('checks isWithinArea with assignedArea', () => {
      const area = { gps_lat: -7.29, gps_lng: 112.74, radius_meters: 200 };
      mockAuthState = { assignedArea: area };
      simulateSuccess();

      const { result } = renderHook(() => useHomeLocation());

      expect(mockIsWithinArea).toHaveBeenCalledWith(-7.2905, 112.7398, area);
      expect(result.current.location.isWithinArea).toBe(true);
    });

    it('sets isWithinArea false when no assignedArea', () => {
      mockAuthState = { assignedArea: null };
      simulateSuccess();

      const { result } = renderHook(() => useHomeLocation());

      expect(result.current.location.isWithinArea).toBe(false);
    });

    it('reports hasActiveShift as true', () => {
      simulateSuccess();
      const { result } = renderHook(() => useHomeLocation());

      expect(result.current.hasActiveShift).toBe(true);
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      mockShiftState = { currentShift: { id: 'shift-1' } };
    });

    it('triggers new location fetch', () => {
      simulateSuccess();
      const { result } = renderHook(() => useHomeLocation());

      mockGeolocation.mockClear();
      simulateSuccess(-7.30, 112.75, 5);

      act(() => {
        result.current.refresh();
      });

      expect(mockGeolocation).toHaveBeenCalledTimes(1);
    });

    it('calls locationTracker.captureNow and forceUpload', () => {
      simulateSuccess();
      const { result } = renderHook(() => useHomeLocation());

      act(() => {
        result.current.refresh();
      });

      expect(locationTracker.captureNow).toHaveBeenCalledTimes(1);
      expect(locationTracker.forceUpload).toHaveBeenCalledTimes(1);
    });
  });

  describe('shift becomes inactive', () => {
    it('resets location state when shift ends', () => {
      mockShiftState = { currentShift: { id: 'shift-1' } };
      simulateSuccess();

      const { result, rerender } = renderHook(() => useHomeLocation());

      expect(result.current.location.latitude).toBe(-7.2905);

      mockShiftState = { currentShift: null };
      rerender({});

      expect(result.current.location.latitude).toBeNull();
      expect(result.current.location.loading).toBe(false);
      expect(result.current.hasActiveShift).toBe(false);
    });
  });

  describe('auto-update from locationTracker events', () => {
    beforeEach(() => {
      mockShiftState = { currentShift: { id: 'shift-1' } };
      simulateSuccess();
    });

    it('subscribes to locationUpdate when shift is active', () => {
      renderHook(() => useHomeLocation());

      expect(locationTracker.on).toHaveBeenCalledWith('locationUpdate', expect.any(Function));
    });

    it('updates location state when tracker emits locationUpdate', () => {
      const { result } = renderHook(() => useHomeLocation());

      act(() => {
        emitLocationUpdate({ latitude: -7.31, longitude: 112.76, accuracy: 8 });
      });

      expect(result.current.location.latitude).toBe(-7.31);
      expect(result.current.location.longitude).toBe(112.76);
      expect(result.current.location.accuracy).toBe(8);
      expect(result.current.location.loading).toBe(false);
      expect(result.current.location.error).toBeNull();
      expect(result.current.location.updatedAt).toBeInstanceOf(Date);
    });

    it('checks isWithinArea with assignedArea on tracker event', () => {
      const area = { gps_lat: -7.29, gps_lng: 112.74, radius_meters: 200 };
      mockAuthState = { assignedArea: area };
      mockIsWithinArea.mockReturnValue(false);

      const { result } = renderHook(() => useHomeLocation());

      act(() => {
        emitLocationUpdate({ latitude: -7.40, longitude: 112.80, accuracy: 12 });
      });

      expect(mockIsWithinArea).toHaveBeenCalledWith(-7.40, 112.80, area);
      expect(result.current.location.isWithinArea).toBe(false);
    });

    it('unsubscribes from locationUpdate on unmount', () => {
      const { unmount } = renderHook(() => useHomeLocation());
      unmount();

      expect(locationTracker.off).toHaveBeenCalledWith('locationUpdate', expect.any(Function));
    });

    it('does not subscribe when no active shift', () => {
      mockShiftState = { currentShift: null };
      renderHook(() => useHomeLocation());

      expect(locationTracker.on).not.toHaveBeenCalled();
    });
  });
});
