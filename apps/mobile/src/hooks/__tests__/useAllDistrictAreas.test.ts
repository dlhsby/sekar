import { districtsToAreas } from '../useAllDistrictAreas';
import type { District } from '../../types/models.types';

const POLY = {
  type: 'Polygon' as const,
  coordinates: [[[-1, -1], [-1, 1], [1, 1], [1, -1], [-1, -1]]] as [number, number][][],
};

const district = (over: Partial<District>): District =>
  ({
    id: 'd',
    name: 'Rayon X',
    created_at: '',
    updated_at: '',
    ...over,
  }) as District;

describe('districtsToAreas', () => {
  it('maps districts with a polygon to geofence areas (center → gps_lat/lng)', () => {
    const areas = districtsToAreas([
      district({ id: 'a', name: 'Rayon Barat 1', boundary_polygon: POLY, center_lat: -7.2, center_lng: 112.7 }),
    ]);
    expect(areas).toEqual([
      { name: 'Rayon Barat 1', boundary_polygon: POLY, gps_lat: -7.2, gps_lng: 112.7 },
    ]);
  });

  it('drops districts without a boundary polygon (can not geofence them)', () => {
    const areas = districtsToAreas([
      district({ id: 'a', name: 'With', boundary_polygon: POLY }),
      district({ id: 'b', name: 'Without' }),
    ]);
    expect(areas).toHaveLength(1);
    expect(areas[0].name).toBe('With');
  });

  it('returns [] for null/undefined/non-array input', () => {
    expect(districtsToAreas(null)).toEqual([]);
    expect(districtsToAreas(undefined)).toEqual([]);
    expect(districtsToAreas([])).toEqual([]);
  });

  it('defaults missing centers to null', () => {
    const areas = districtsToAreas([district({ boundary_polygon: POLY })]);
    expect(areas[0].gps_lat).toBeNull();
    expect(areas[0].gps_lng).toBeNull();
  });
});
