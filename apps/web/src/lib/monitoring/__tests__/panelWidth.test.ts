/**
 * The panel's per-operator width. A workspace preference, so the tests that
 * matter are the ones about surviving bad input rather than the happy path.
 */
import { renderHook, act } from '@testing-library/react';
import {
  clampPanelWidth,
  usePanelWidth,
  PANEL_WIDTH_KEY,
  DEFAULT_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
} from '../panelWidth';

describe('clampPanelWidth', () => {
  it('keeps a sensible width untouched', () => {
    expect(clampPanelWidth(500)).toBe(500);
  });

  it('refuses to collapse the panel or let it swallow the map', () => {
    expect(clampPanelWidth(10)).toBe(MIN_PANEL_WIDTH);
    expect(clampPanelWidth(5000)).toBe(MAX_PANEL_WIDTH);
  });

  it('rounds, so the width never lands on a fractional pixel mid-drag', () => {
    expect(clampPanelWidth(420.6)).toBe(421);
  });

  it('has a default inside its own bounds', () => {
    // A default outside the clamp would move the panel on first load, which is
    // the one moment it must not.
    expect(DEFAULT_PANEL_WIDTH).toBeGreaterThanOrEqual(MIN_PANEL_WIDTH);
    expect(DEFAULT_PANEL_WIDTH).toBeLessThanOrEqual(MAX_PANEL_WIDTH);
    expect(clampPanelWidth(DEFAULT_PANEL_WIDTH)).toBe(DEFAULT_PANEL_WIDTH);
  });
});

describe('usePanelWidth', () => {
  beforeEach(() => window.localStorage.clear());

  it('persists where the drag LANDED, not where it started', () => {
    // The bug this guards: `commit` is called from a pointer handler registered
    // when the drag began, so a commit closing over the render-time width saved
    // the pre-drag value — the panel resized on screen and snapped back on
    // reload. Verified live before the fix: width 600, stored 384.
    const { result } = renderHook(() => usePanelWidth());

    act(() => result.current.setWidth(600));
    act(() => result.current.commit());

    expect(window.localStorage.getItem(PANEL_WIDTH_KEY)).toBe('600');
  });

  it('does not write to storage on every pointer move', () => {
    // A drag is hundreds of events and localStorage is synchronous.
    const spy = jest.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => usePanelWidth());

    act(() => {
      for (let px = 400; px < 520; px += 4) result.current.setWidth(px);
    });
    expect(spy).not.toHaveBeenCalled();

    act(() => result.current.commit());
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('restores the default, so a drag can never strand the operator', () => {
    const { result } = renderHook(() => usePanelWidth());
    act(() => result.current.setWidth(MAX_PANEL_WIDTH));
    act(() => result.current.reset());

    expect(result.current.width).toBe(DEFAULT_PANEL_WIDTH);
    expect(window.localStorage.getItem(PANEL_WIDTH_KEY)).toBe(String(DEFAULT_PANEL_WIDTH));
  });

  it('reads a stored width back on mount, clamped', () => {
    window.localStorage.setItem(PANEL_WIDTH_KEY, '99999');
    const { result } = renderHook(() => usePanelWidth());
    expect(result.current.width).toBe(MAX_PANEL_WIDTH);
  });
});
