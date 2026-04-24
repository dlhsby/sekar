/**
 * Tests for useMapAutoFocus hook
 * Phase 2D Gap #3: Auto-focus map when filters change
 */

import { renderHook } from '@testing-library/react-native';
import { useMapAutoFocus } from '../useMapAutoFocus';
import { SURABAYA_CITY_REGION } from '../../utils/mapUtils';
import type { MonitoringFilters } from '../../types/api.types';
import type { BoundariesResponse, LiveUser } from '../../types/models.types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeArea = (id: string, lat: number, lng: number) => ({
  id,
  name: `Area ${id}`,
  center_lat: lat,
  center_lng: lng,
  boundary_polygon: null,
  radius_meters: 200,
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon rayon-1',
  assigned_count: 2,
  staffing: [],
  is_understaffed: false,
  total_active: 0,
  total_required: 2,
});

const makeRayon = (
  id: string,
  areas: ReturnType<typeof makeArea>[],
) => ({
  id,
  name: `Rayon ${id}`,
  code: `R${id}`,
  center_lat: -7.25,
  center_lng: 112.75,
  boundary_polygon: null,
  areas,
  area_count: areas.length,
  is_understaffed: false,
  understaffed_area_count: 0,
});

const boundaries: BoundariesResponse = {
  rayons: [
    makeRayon('rayon-1', [
      makeArea('area-1', -7.2500, 112.7400),
      makeArea('area-2', -7.2600, 112.7500),
    ]),
    makeRayon('rayon-2', [
      makeArea('area-3', -7.2700, 112.7600),
    ]),
  ],
  generated_at: '2026-03-08T00:00:00Z',
};

const makeLiveUser = (
  id: string,
  full_name: string,
  lat: number,
  lng: number,
): LiveUser => ({
  id,
  full_name,
  role: 'satgas',
  phone: null,
  status: 'active',
  area_id: 'area-1',
  area_name: 'Area area-1',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon rayon-1',
  latitude: lat,
  longitude: lng,
  accuracy: null,
  battery_level: null,
  last_update: '2026-03-08T00:00:00Z',
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  shift_definition_id: null,
  clock_in_time: '2026-03-08T06:00:00Z',
  current_task_status: null,
  current_task_title: null,
});

const liveUsers: LiveUser[] = [
  makeLiveUser('u1', 'Budi Santoso', -7.2510, 112.7410),
  makeLiveUser('u2', 'Siti Rahayu', -7.2620, 112.7520),
];

// ---------------------------------------------------------------------------
// Mock map ref helpers
// ---------------------------------------------------------------------------

function makeMapRef(methods?: Partial<{ animateToRegion: jest.Mock; fitToCoordinates: jest.Mock }>) {
  const animateToRegion = methods?.animateToRegion ?? jest.fn();
  const fitToCoordinates = methods?.fitToCoordinates ?? jest.fn();
  return {
    current: { animateToRegion, fitToCoordinates } as unknown as import('react-native-maps').default,
    _animateToRegion: animateToRegion,
    _fitToCoordinates: fitToCoordinates,
  };
}

const emptyFilters: MonitoringFilters = {};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMapAutoFocus', () => {
  describe('area selected', () => {
    it('animates to area center with 0.004 delta and 1000ms duration', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { area_id: 'area-1' };

      renderHook(() =>
        useMapAutoFocus(ref, filters, boundaries, liveUsers),
      );

      expect(ref._animateToRegion).toHaveBeenCalledTimes(1);
      expect(ref._animateToRegion).toHaveBeenCalledWith(
        {
          latitude: -7.25,
          longitude: 112.74,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        },
        1000,
      );
    });

    it('does not animate again when area_id remains the same', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { area_id: 'area-1' };

      const { rerender } = renderHook(
        (props: MonitoringFilters) =>
          useMapAutoFocus(ref, props, boundaries, liveUsers),
        { initialProps: filters },
      );

      // Re-render with same area_id — should not trigger a second call
      rerender(filters);

      expect(ref._animateToRegion).toHaveBeenCalledTimes(1);
    });

    it('animates again when area_id changes to a different area', () => {
      const ref = makeMapRef();

      const { rerender } = renderHook(
        (props: MonitoringFilters) =>
          useMapAutoFocus(ref, props, boundaries, liveUsers),
        { initialProps: { area_id: 'area-1' } as MonitoringFilters },
      );

      rerender({ area_id: 'area-2' });

      expect(ref._animateToRegion).toHaveBeenCalledTimes(2);
      expect(ref._animateToRegion).toHaveBeenLastCalledWith(
        {
          latitude: -7.26,
          longitude: 112.75,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        },
        1000,
      );
    });

    it('does nothing when area_id is set but boundaries is null', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { area_id: 'area-1' };

      renderHook(() =>
        useMapAutoFocus(ref, filters, null, liveUsers),
      );

      expect(ref._animateToRegion).not.toHaveBeenCalled();
    });
  });

  describe('rayon selected (no area)', () => {
    it('calls fitToCoordinates with all area centers and edge padding', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { rayon_id: 'rayon-1' };

      renderHook(() =>
        useMapAutoFocus(ref, filters, boundaries, liveUsers),
      );

      expect(ref._fitToCoordinates).toHaveBeenCalledTimes(1);
      expect(ref._fitToCoordinates).toHaveBeenCalledWith(
        [
          { latitude: -7.25, longitude: 112.74 },
          { latitude: -7.26, longitude: 112.75 },
        ],
        { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true },
      );
    });

    it('does not fitToCoordinates when area_id is also set (area takes priority)', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { rayon_id: 'rayon-1', area_id: 'area-1' };

      renderHook(() =>
        useMapAutoFocus(ref, filters, boundaries, liveUsers),
      );

      expect(ref._fitToCoordinates).not.toHaveBeenCalled();
      // animateToRegion is called instead (area takes priority)
      expect(ref._animateToRegion).toHaveBeenCalledTimes(1);
    });

    it('does not animate when rayon_id is set but boundaries is null', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { rayon_id: 'rayon-1' };

      renderHook(() =>
        useMapAutoFocus(ref, filters, null, liveUsers),
      );

      expect(ref._fitToCoordinates).not.toHaveBeenCalled();
    });

    it('does not animate when rayon has no areas', () => {
      const ref = makeMapRef();
      const emptyRayonBoundaries: BoundariesResponse = {
        rayons: [makeRayon('rayon-empty', [])],
        generated_at: '2026-03-08T00:00:00Z',
      };
      const filters: MonitoringFilters = { rayon_id: 'rayon-empty' };

      renderHook(() =>
        useMapAutoFocus(ref, filters, emptyRayonBoundaries, liveUsers),
      );

      expect(ref._fitToCoordinates).not.toHaveBeenCalled();
    });
  });

  describe('search match', () => {
    it('animates to matching user location with 0.003 delta', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { search: 'Budi' };

      renderHook(() =>
        useMapAutoFocus(ref, filters, boundaries, liveUsers),
      );

      expect(ref._animateToRegion).toHaveBeenCalledTimes(1);
      expect(ref._animateToRegion).toHaveBeenCalledWith(
        {
          latitude: -7.251,
          longitude: 112.741,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        },
        1000,
      );
    });

    it('is case-insensitive when matching search term', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { search: 'SITI' };

      renderHook(() =>
        useMapAutoFocus(ref, filters, boundaries, liveUsers),
      );

      expect(ref._animateToRegion).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: -7.262,
          longitude: 112.752,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        }),
        1000,
      );
    });

    it('does not animate when search term matches no user', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { search: 'Zzz_NoMatch' };

      renderHook(() =>
        useMapAutoFocus(ref, filters, boundaries, liveUsers),
      );

      expect(ref._animateToRegion).not.toHaveBeenCalled();
    });

    it('does not animate again when search term is unchanged', () => {
      const ref = makeMapRef();

      const { rerender } = renderHook(
        (props: MonitoringFilters) =>
          useMapAutoFocus(ref, props, boundaries, liveUsers),
        { initialProps: { search: 'Budi' } as MonitoringFilters },
      );

      rerender({ search: 'Budi' });

      expect(ref._animateToRegion).toHaveBeenCalledTimes(1);
    });
  });

  describe('all filters cleared', () => {
    it('resets to city view when filters are cleared after being set', () => {
      const ref = makeMapRef();

      const { rerender } = renderHook(
        (props: MonitoringFilters) =>
          useMapAutoFocus(ref, props, boundaries, liveUsers),
        { initialProps: { rayon_id: 'rayon-1' } as MonitoringFilters },
      );

      ref._animateToRegion.mockClear();
      ref._fitToCoordinates.mockClear();

      rerender(emptyFilters);

      expect(ref._animateToRegion).toHaveBeenCalledTimes(1);
      expect(ref._animateToRegion).toHaveBeenCalledWith(SURABAYA_CITY_REGION, 1000);
    });

    it('does not animate when filters were already empty on first render', () => {
      const ref = makeMapRef();

      renderHook(() =>
        useMapAutoFocus(ref, emptyFilters, boundaries, liveUsers),
      );

      expect(ref._animateToRegion).not.toHaveBeenCalled();
      expect(ref._fitToCoordinates).not.toHaveBeenCalled();
    });
  });

  describe('no map ref', () => {
    it('does not crash when mapRef.current is null and area filter is set', () => {
      const nullRef = { current: null } as React.RefObject<import('react-native-maps').default | null>;
      const filters: MonitoringFilters = { area_id: 'area-1' };

      expect(() =>
        renderHook(() =>
          useMapAutoFocus(nullRef, filters, boundaries, liveUsers),
        ),
      ).not.toThrow();
    });

    it('does not crash when mapRef.current is null and rayon filter is set', () => {
      const nullRef = { current: null } as React.RefObject<import('react-native-maps').default | null>;
      const filters: MonitoringFilters = { rayon_id: 'rayon-1' };

      expect(() =>
        renderHook(() =>
          useMapAutoFocus(nullRef, filters, boundaries, liveUsers),
        ),
      ).not.toThrow();
    });

    it('does not crash when mapRef.current is null and filters are cleared', () => {
      const nullRef = { current: null } as React.RefObject<import('react-native-maps').default | null>;

      const { rerender } = renderHook(
        (props: MonitoringFilters) =>
          useMapAutoFocus(nullRef, props, boundaries, liveUsers),
        { initialProps: { search: 'Budi' } as MonitoringFilters },
      );

      expect(() => rerender(emptyFilters)).not.toThrow();
    });
  });

  describe('empty boundaries', () => {
    it('does not crash when boundaries has no rayons', () => {
      const ref = makeMapRef();
      const emptyBoundaries: BoundariesResponse = {
        rayons: [],
        generated_at: '2026-03-08T00:00:00Z',
      };
      const filters: MonitoringFilters = { area_id: 'area-1', rayon_id: 'rayon-1' };

      expect(() =>
        renderHook(() =>
          useMapAutoFocus(ref, filters, emptyBoundaries, liveUsers),
        ),
      ).not.toThrow();

      expect(ref._animateToRegion).not.toHaveBeenCalled();
      expect(ref._fitToCoordinates).not.toHaveBeenCalled();
    });

    it('does not crash when liveUsers is empty and search is set', () => {
      const ref = makeMapRef();
      const filters: MonitoringFilters = { search: 'Budi' };

      expect(() =>
        renderHook(() =>
          useMapAutoFocus(ref, filters, boundaries, []),
        ),
      ).not.toThrow();

      expect(ref._animateToRegion).not.toHaveBeenCalled();
    });
  });
});
