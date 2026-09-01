import { renderHook } from '@testing-library/react';
import { useGeoIndex } from '../useGeoIndex';

const mockBoundaries = jest.fn();
jest.mock('@/lib/api/monitoring', () => ({
  useBoundaries: (...args: unknown[]) => mockBoundaries(...args),
}));

const payload = {
  districts: [
    {
      id: 'r1',
      name: 'Rayon Pusat',
      center_lat: -7.29,
      center_lng: 112.74,
      area_count: 2,
      regions: [{ id: 'k1', name: 'Kawasan Darmo', center_lat: -7.28, center_lng: 112.73 }],
      areas: [
        {
          id: 'a1',
          name: 'Taman Bungkul',
          center_lat: -7.29,
          center_lng: 112.74,
          district_id: 'r1',
          district_name: 'Rayon Pusat',
          region_id: 'k1',
        },
        // No centre → cannot be focused, so it must not enter the index.
        { id: 'a2', name: 'Taman Tanpa Titik', center_lat: null, center_lng: null },
      ],
    },
  ],
};

describe('useGeoIndex', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks for the FULL hierarchy, not the current drill scope', () => {
    // The bug this hook exists to fix: search read the map's scope-bound query,
    // which returns no areas at city scope. This one always asks level=area with
    // no district id.
    mockBoundaries.mockReturnValue({ data: payload });
    renderHook(() => useGeoIndex(true));
    expect(mockBoundaries).toHaveBeenCalledWith(true, 'area');
  });

  it('flattens all three tiers with their parents', () => {
    mockBoundaries.mockReturnValue({ data: payload });
    const { result } = renderHook(() => useGeoIndex(true));

    expect(result.current.map((e) => [e.tier, e.name])).toEqual([
      ['district', 'Rayon Pusat'],
      ['region', 'Kawasan Darmo'],
      ['location', 'Taman Bungkul'],
    ]);

    const lokasi = result.current.find((e) => e.tier === 'location')!;
    expect(lokasi.parentName).toBe('Rayon Pusat');
    expect(lokasi.districtId).toBe('r1');
    expect(lokasi.regionId).toBe('k1');

    // A rayon has no parent, so it carries its size for the result subtitle.
    expect(result.current[0].childCount).toBe(2);
  });

  it('drops entries with no centre — a result you cannot fly to is not a result', () => {
    mockBoundaries.mockReturnValue({ data: payload });
    const { result } = renderHook(() => useGeoIndex(true));
    expect(result.current.some((e) => e.name === 'Taman Tanpa Titik')).toBe(false);
  });

  it('is empty before the payload arrives', () => {
    mockBoundaries.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useGeoIndex(true));
    expect(result.current).toEqual([]);
  });
});
