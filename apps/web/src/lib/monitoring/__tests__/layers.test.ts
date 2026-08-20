import { renderHook, act } from '@testing-library/react';
import {
  useMonitoringLayers,
  DEFAULT_LAYERS,
  LAYER_ROWS,
  allFacets,
  toggleFacet,
  migrateV4,
  migrateV5,
  showsBoundary,
  showsFill,
  showsPolygon,
  showsNodeMarker,
  showsNodeLabel,
  showsWorkerPins,
  showsTeamBubbles,
  teamMembersOnly,
} from '../layers';

describe('useMonitoringLayers', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts from defaults', () => {
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers).toEqual(DEFAULT_LAYERS);
  });

  it('setLayer writes the facet set and persists it', () => {
    const { result } = renderHook(() => useMonitoringLayers());
    act(() => result.current.setLayer('district', ['boundary']));
    expect(result.current.layers.district).toEqual(['boundary']);
    expect(JSON.parse(window.localStorage.getItem('monitoring.layers.v6')!).district).toEqual([
      'boundary',
    ]);
  });

  it('hydrates from the stored set on mount', () => {
    window.localStorage.setItem('monitoring.layers.v6', JSON.stringify({ personnel: [] }));
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers.personnel).toEqual([]);
    // Missing keys fall back to defaults.
    expect(result.current.layers.district).toEqual(['boundary', 'fill', 'marker', 'label']);
  });

  it('reads the label facet independently of the marker', () => {
    // Splitting the two is what lets a dense tier keep its pins while dropping
    // the names — at city zoom every lokasi name at once is unreadable.
    expect(showsNodeMarker(['marker'])).toBe(true);
    expect(showsNodeLabel(['marker'])).toBe(false);
    expect(showsNodeLabel(['marker', 'label'])).toBe(true);
  });

  it('drops facets it does not recognise and keeps canonical order', () => {
    // Stored JSON survives downgrades and is user-writable, so a row can arrive
    // with a facet from a future version — or out of order.
    window.localStorage.setItem(
      'monitoring.layers.v6',
      JSON.stringify({ lokasi: ['marker', 'plants', 'boundary'] })
    );
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers.lokasi).toEqual(['boundary', 'marker']);
  });

  it('falls back to the row default when the stored value is not an array', () => {
    // Exactly what a v5 payload written under the v6 key would look like.
    window.localStorage.setItem('monitoring.layers.v6', JSON.stringify({ district: 'all' }));
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers.district).toEqual(DEFAULT_LAYERS.district);
  });

  it('exposes a row for every layer key', () => {
    const keys = LAYER_ROWS.map((r) => r.key).sort();
    expect(keys).toEqual(Object.keys(DEFAULT_LAYERS).sort());
  });

  it('every row can be emptied, so any layer can be hidden', () => {
    const { result } = renderHook(() => useMonitoringLayers());
    for (const row of LAYER_ROWS) {
      act(() => result.current.setLayer(row.key, []));
      expect(result.current.layers[row.key]).toEqual([]);
    }
  });
});

describe('facet helpers', () => {
  it('toggleFacet adds, removes, and re-sorts into canonical order', () => {
    expect(toggleFacet('district', ['boundary'], 'marker')).toEqual(['boundary', 'marker']);
    // Ticked out of order, stored in order — so two equal sets are also equal arrays.
    expect(toggleFacet('district', ['marker'], 'boundary')).toEqual(['boundary', 'marker']);
    expect(toggleFacet('district', ['boundary', 'marker'], 'boundary')).toEqual(['marker']);
  });

  it('allFacets matches the row it belongs to', () => {
    expect(allFacets('lokasi')).toEqual(['boundary', 'fill', 'marker', 'label']);
    expect(allFacets('personnel')).toEqual(['petugas', 'tim']);
  });
});

describe('migrateV5 (four-way select → facet set)', () => {
  it('maps "Batas saja" to outline AND fill', () => {
    // Under v5 the two were one thing: "boundary" drew the stroke and the wash.
    // Mapping it to ['boundary'] alone would strip the fill off an existing map.
    expect(migrateV5({ district: 'boundary' }).district).toEqual(['boundary', 'fill']);
  });

  it('maps the remaining options', () => {
    expect(migrateV5({ kawasan: 'all' }).kawasan).toEqual(['boundary', 'fill', 'marker', 'label']);
    // v5's marker drew its name too, so the label rides along.
    expect(migrateV5({ kawasan: 'marker' }).kawasan).toEqual(['marker', 'label']);
    expect(migrateV5({ kawasan: 'none' }).kawasan).toEqual([]);
  });

  it('splits the single personnel value back into facets', () => {
    expect(migrateV5({ personnel: 'all' }).personnel).toEqual(['petugas', 'tim']);
    expect(migrateV5({ personnel: 'petugas' }).personnel).toEqual(['petugas']);
    expect(migrateV5({ personnel: 'tim' }).personnel).toEqual(['tim']);
    expect(migrateV5({ personnel: 'none' }).personnel).toEqual([]);
  });

  it('hydrates from the v5 key when no v6 value exists', () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'monitoring.layers.v5',
      JSON.stringify({ district: 'marker', personnel: 'none' })
    );
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers.district).toEqual(['marker', 'label']);
    expect(result.current.layers.personnel).toEqual([]);
  });
});

describe('migrateV4 (booleans → facet set)', () => {
  it('maps a v4 "off" geo toggle to marker-only, NOT hidden', () => {
    // The v4 toggle governed the BOUNDARY only — node markers were always drawn
    // and could not be hidden. Blanking the tier would silently remove pins that
    // were on screen before the upgrade.
    const migrated = migrateV4({ district: false, kawasan: true, lokasi: false });
    expect(migrated.district).toEqual(['marker', 'label']);
    expect(migrated.lokasi).toEqual(['marker', 'label']);
    expect(migrated.kawasan).toEqual(['boundary', 'fill', 'marker', 'label']);
  });

  it('collapses the two personnel booleans', () => {
    expect(migrateV4({ petugas: true, teamBubbles: true }).personnel).toEqual(['petugas', 'tim']);
    expect(migrateV4({ petugas: true, teamBubbles: false }).personnel).toEqual(['petugas']);
    // Petugas off made the Tim toggle meaningless — that pair drew nothing.
    expect(migrateV4({ petugas: false, teamBubbles: true }).personnel).toEqual([]);
  });

  it('hydrates from the v4 key when neither newer key exists', () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'monitoring.layers.v4',
      JSON.stringify({ district: false, petugas: false })
    );
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers.district).toEqual(['marker', 'label']);
    expect(result.current.layers.personnel).toEqual([]);
  });
});

describe('layer predicates', () => {
  it('reads each geo facet independently', () => {
    expect(showsBoundary(['boundary'])).toBe(true);
    expect(showsFill(['boundary'])).toBe(false);
    expect(showsNodeMarker(['boundary'])).toBe(false);
    // The combination v5 could not express at all.
    expect([showsBoundary(['boundary', 'marker']), showsFill(['boundary', 'marker'])]).toEqual([
      true,
      false,
    ]);
    expect(showsNodeMarker([])).toBe(false);
  });

  it('mounts the polygon for EITHER outline or fill', () => {
    // Fill without an outline is a legitimate ask (a soft wash under the pins),
    // so gating the Polygon on showsBoundary alone would drop it.
    expect(showsPolygon(['fill'])).toBe(true);
    expect(showsPolygon(['boundary'])).toBe(true);
    expect(showsPolygon(['marker'])).toBe(false);
    expect(showsPolygon([])).toBe(false);
  });

  it('"tim" alone still draws pins — collapsed, and only for team members', () => {
    expect(showsWorkerPins(['tim'])).toBe(true);
    expect(showsTeamBubbles(['tim'])).toBe(true);
    expect(teamMembersOnly(['tim'])).toBe(true);
    // Ticking Petugas back on brings the non-team workers back.
    expect(teamMembersOnly(['petugas', 'tim'])).toBe(false);
    expect(showsTeamBubbles(['petugas'])).toBe(false);
    expect(showsWorkerPins([])).toBe(false);
  });
});
