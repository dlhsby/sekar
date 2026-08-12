import { renderHook, act } from '@testing-library/react';
import { useMonitoringMode, DEFAULT_MODE, MODE_OPTIONS } from '../mapMode';

describe('useMonitoringMode', () => {
  beforeEach(() => window.localStorage.clear());

  it('defaults to drill so nobody’s map gets heavier without asking', () => {
    const { result } = renderHook(() => useMonitoringMode());
    expect(result.current.mode).toBe('drill');
    expect(DEFAULT_MODE).toBe('drill');
  });

  it('persists the chosen mode', () => {
    const { result } = renderHook(() => useMonitoringMode());
    act(() => result.current.setMode('zoom'));
    expect(result.current.mode).toBe('zoom');
    expect(window.localStorage.getItem('monitoring.mode.v1')).toBe('zoom');
  });

  it('hydrates a stored mode on mount', () => {
    window.localStorage.setItem('monitoring.mode.v1', 'zoom');
    const { result } = renderHook(() => useMonitoringMode());
    expect(result.current.mode).toBe('zoom');
  });

  it('falls back to the default on a junk stored value', () => {
    window.localStorage.setItem('monitoring.mode.v1', 'satellite');
    const { result } = renderHook(() => useMonitoringMode());
    expect(result.current.mode).toBe('drill');
  });

  it('offers exactly the two modes', () => {
    expect(MODE_OPTIONS.map((o) => o.value)).toEqual(['drill', 'zoom']);
  });
});
