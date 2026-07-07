import { renderHook, act } from '@testing-library/react';
import { useMonitoringLayers, DEFAULT_LAYERS, LAYER_TOGGLES } from '../layers';

describe('useMonitoringLayers', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts from defaults', () => {
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers).toEqual(DEFAULT_LAYERS);
  });

  it('toggleLayer flips a layer and persists it', () => {
    const { result } = renderHook(() => useMonitoringLayers());
    act(() => result.current.toggleLayer('rayon'));
    expect(result.current.layers.rayon).toBe(false);
    expect(JSON.parse(window.localStorage.getItem('monitoring.layers.v3')!).rayon).toBe(false);
  });

  it('setLayer sets an explicit value', () => {
    const { result } = renderHook(() => useMonitoringLayers());
    act(() => result.current.setLayer('overdue', true));
    expect(result.current.layers.overdue).toBe(true);
  });

  it('hydrates from stored value on mount', () => {
    window.localStorage.setItem('monitoring.layers.v3', JSON.stringify({ petugas: false }));
    const { result } = renderHook(() => useMonitoringLayers());
    expect(result.current.layers.petugas).toBe(false);
    // Missing keys fall back to defaults.
    expect(result.current.layers.rayon).toBe(true);
  });

  it('exposes a toggle for every layer key', () => {
    const keys = LAYER_TOGGLES.map((t) => t.key).sort();
    expect(keys).toEqual(Object.keys(DEFAULT_LAYERS).sort());
  });
});
