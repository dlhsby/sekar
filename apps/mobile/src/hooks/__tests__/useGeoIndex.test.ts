/**
 * The search index. Its job is to be COMPLETE and scope-independent — the map's
 * boundaries are neither, which is the defect this exists to fix.
 */
import { buildGeoIndex } from '../useGeoIndex';

const boundaries = {
  generated_at: '2026-01-01T00:00:00Z',
  districts: [
    {
      id: 'r1',
      name: 'Rayon Pusat',
      center_lat: -7.25,
      center_lng: 112.75,
      regions: [{ id: 'k1', name: 'Kawasan Darmo', center_lat: -7.26, center_lng: 112.74 }],
      areas: [
        {
          id: 'a1',
          name: 'Taman Bungkul',
          center_lat: -7.29,
          center_lng: 112.73,
          district_name: 'Rayon Pusat',
        },
      ],
    },
  ],
} as never;

describe('buildGeoIndex', () => {
  it('indexes all three tiers, not just the two search could reach before', () => {
    // Kawasan had no result type at all: the search loop read districts and
    // their areas and never touched `regions`, so a whole tier was unfindable
    // in every mode.
    const idx = buildGeoIndex(boundaries);
    expect(idx.map(e => e.type).sort()).toEqual(['district', 'location', 'region']);
  });

  it('carries a parent name, so two similar lokasi are distinguishable', () => {
    const idx = buildGeoIndex(boundaries);
    expect(idx.find(e => e.id === 'a1')!.parentName).toBe('Rayon Pusat');
    expect(idx.find(e => e.id === 'k1')!.parentName).toBe('Rayon Pusat');
    expect(idx.find(e => e.id === 'r1')!.parentName).toBeNull();
  });

  it('drops nodes with no centre, which could never be focused', () => {
    // A result row that cannot move the map is a dead end.
    const broken = {
      districts: [
        { id: 'r1', name: 'R', center_lat: null, center_lng: null, regions: [], areas: [] },
      ],
    } as never;
    expect(buildGeoIndex(broken)).toEqual([]);
  });

  it('survives a payload with the optional arrays absent', () => {
    const sparse = {
      districts: [{ id: 'r1', name: 'R', center_lat: -7.2, center_lng: 112.7 }],
    } as never;
    expect(buildGeoIndex(sparse).map(e => e.id)).toEqual(['r1']);
  });

  it('returns nothing for no payload', () => {
    expect(buildGeoIndex(null)).toEqual([]);
  });
});
