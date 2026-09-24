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

  /**
   * Kawasan with no stored centre.
   *
   * Every kawasan on staging (131 of 131) comes back from the boundaries
   * endpoint with `center_lat: null` and no polygon. The index skipped them all,
   * so no kawasan was findable from search at any drill level. The fixture above
   * gives its kawasan a centre, which real data does not — that is why this was
   * never caught.
   *
   * A kawasan's lokasi DO carry centres, and each names its kawasan through
   * `region_id` — so the kawasan can be placed at the middle of its own lokasi.
   */
  describe('kawasan without a stored centre', () => {
    const withCentrelessKawasan = {
      districts: [
        {
          id: 'r1',
          name: 'Rayon Pusat',
          center_lat: -7.29,
          center_lng: 112.74,
          regions: [
            { id: 'k1', name: 'Kawasan Darmo', center_lat: null, center_lng: null },
            // No lokasi of its own anywhere on the map.
            { id: 'k2', name: 'Kawasan Kosong', center_lat: null, center_lng: null },
            // Stored centre present — must be used as-is.
            { id: 'k3', name: 'Kawasan Bertitik', center_lat: -7.1, center_lng: 112.1 },
          ],
          areas: [
            { id: 'a1', name: 'Taman A', center_lat: -7.2, center_lng: 112.6, region_id: 'k1' },
            { id: 'a2', name: 'Taman B', center_lat: -7.4, center_lng: 112.8, region_id: 'k1' },
            // Unlocated lokasi must not drag the kawasan's centre.
            { id: 'a3', name: 'Taman C', center_lat: null, center_lng: null, region_id: 'k1' },
            // Belongs to k3; must not influence k3's stored centre.
            { id: 'a4', name: 'Taman D', center_lat: -7.9, center_lng: 112.9, region_id: 'k3' },
          ],
        },
      ],
    };

    const regions = () => {
      mockBoundaries.mockReturnValue({ data: withCentrelessKawasan });
      const { result } = renderHook(() => useGeoIndex(true));
      return result.current.filter((e) => e.tier === 'region');
    };

    it('makes a centreless kawasan findable by placing it at the middle of its lokasi', () => {
      const darmo = regions().find((e) => e.id === 'k1');
      expect(darmo).toBeDefined();
      expect(darmo!.latitude).toBeCloseTo(-7.3); // mean of -7.2 and -7.4
      expect(darmo!.longitude).toBeCloseTo(112.7); // mean of 112.6 and 112.8
    });

    it('still drops a kawasan when none of its lokasi can be placed either', () => {
      expect(regions().some((e) => e.id === 'k2')).toBe(false);
    });

    it('prefers a stored centre over one derived from its lokasi', () => {
      const bertitik = regions().find((e) => e.id === 'k3');
      expect(bertitik!.latitude).toBe(-7.1);
      expect(bertitik!.longitude).toBe(112.1);
    });
  });

  it('is empty before the payload arrives', () => {
    mockBoundaries.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useGeoIndex(true));
    expect(result.current).toEqual([]);
  });
});
