import { renderHook, act } from '@testing-library/react';
import {
  useMonitoringLayers,
  DEFAULT_LAYERS,
  LAYER_ROWS,
  migrateLegacy,
  showsBoundary,
  showsNodeMarker,
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

  it('setLayer sets an explicit value and persists it', () => {
    const { result } = renderHook(() => useMonitoringLayers());
    act(() => result.current.setLayer('district', 'boundary'));
    expect(result.current.layers.district).toBe('boundary');
    expect(JSON.parse(window.localStorage.getItem('monitoring.layers.v5')!).district).toBe(
      'boundary'
    );
  });

  it('hydrates from stored value on mount', () => {
    window.localStorage.setItem('monitoring.layers.v5', JSON.stringify({ personnel: 'none' }));
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers.personnel).toBe('none');
    // Missing keys fall back to defaults.
    expect(result.current.layers.district).toBe('all');
  });

  it('exposes a row for every layer key', () => {
    const keys = LAYER_ROWS.map((r) => r.key).sort();
    expect(keys).toEqual(Object.keys(DEFAULT_LAYERS).sort());
  });

  it('every row offers a "none" option so any layer can be hidden', () => {
    for (const row of LAYER_ROWS) {
      expect(row.options.map((o) => o.value)).toContain('none');
    }
  });
});

describe('migrateLegacy (v4 booleans → v5 selects)', () => {
  it('maps a v4 "off" geo toggle to marker-only, NOT hidden', () => {
    // The v4 toggle governed the BOUNDARY only — node markers were always drawn
    // and could not be hidden. Mapping false → 'none' would silently remove pins
    // that were on screen before the upgrade.
    const migrated = migrateLegacy({ district: false, kawasan: true, lokasi: false });
    expect(migrated.district).toBe('marker');
    expect(migrated.lokasi).toBe('marker');
    expect(migrated.kawasan).toBe('all');
  });

  it('collapses the two personnel booleans onto one value', () => {
    expect(migrateLegacy({ petugas: true, teamBubbles: true }).personnel).toBe('all');
    expect(migrateLegacy({ petugas: true, teamBubbles: false }).personnel).toBe('petugas');
    // Petugas off made the Tim toggle meaningless — that pair collapses to "none".
    expect(migrateLegacy({ petugas: false, teamBubbles: true }).personnel).toBe('none');
  });

  it('hydrates from the v4 key when no v5 value exists', () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'monitoring.layers.v4',
      JSON.stringify({ district: false, petugas: false })
    );
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers.district).toBe('marker');
    expect(result.current.layers.personnel).toBe('none');
  });
});

describe('layer predicates', () => {
  it('splits boundary from marker per tier', () => {
    expect([showsBoundary('all'), showsNodeMarker('all')]).toEqual([true, true]);
    expect([showsBoundary('boundary'), showsNodeMarker('boundary')]).toEqual([true, false]);
    expect([showsBoundary('marker'), showsNodeMarker('marker')]).toEqual([false, true]);
    expect([showsBoundary('none'), showsNodeMarker('none')]).toEqual([false, false]);
  });

  it('"tim" still draws pins — collapsed, and only for team members', () => {
    expect(showsWorkerPins('tim')).toBe(true);
    expect(showsTeamBubbles('tim')).toBe(true);
    expect(teamMembersOnly('tim')).toBe(true);
    // "petugas" shows everyone as individuals; no team collapse.
    expect(showsTeamBubbles('petugas')).toBe(false);
    expect(teamMembersOnly('petugas')).toBe(false);
    expect(showsWorkerPins('none')).toBe(false);
  });
});
