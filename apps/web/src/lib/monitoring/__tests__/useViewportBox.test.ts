import { renderHook } from '@testing-library/react';
import { padToBox, boundsWithinBox, useViewportBox } from '../useViewportBox';
import type { MapBounds } from '@/components/monitoring/WorkerClusterLayer';

const bounds = (south: number, west: number, north: number, east: number): MapBounds => ({
  south,
  west,
  north,
  east,
});

/** One degree square around central Surabaya, for arithmetic that reads easily. */
const SQUARE = bounds(-7.3, 112.7, -7.2, 112.8);

describe('padToBox', () => {
  it('grows the camera bounds by half a screen on every side', () => {
    // Margin is what stops an ordinary pan from refetching.
    expect(padToBox(SQUARE)).toBe('112.65,-7.35,112.85,-7.15');
  });

  it('quantises, so an unchanged view produces a byte-identical key', () => {
    const jittered = bounds(-7.30000001, 112.69999998, -7.2, 112.8);
    expect(padToBox(jittered)).toBe(padToBox(SQUARE));
  });
});

describe('boundsWithinBox', () => {
  const box = padToBox(SQUARE);

  it('accepts a camera still inside the fetched region', () => {
    expect(boundsWithinBox(bounds(-7.28, 112.72, -7.22, 112.78), box)).toBe(true);
  });

  it('rejects a camera that has panned past the edge', () => {
    expect(boundsWithinBox(bounds(-7.3, 112.9, -7.2, 113.0), box)).toBe(false);
  });

  it('rejects a camera that zoomed OUT past the region, not just one that moved', () => {
    expect(boundsWithinBox(bounds(-7.9, 112.0, -6.5, 113.5), box)).toBe(false);
  });

  it('treats an unparseable box as "not inside", so it refetches rather than blanks', () => {
    expect(boundsWithinBox(SQUARE, 'nonsense')).toBe(false);
  });
});

describe('useViewportBox', () => {
  it('stays null while inactive, so drill and zoom send no bbox at all', () => {
    const { result } = renderHook(() => useViewportBox(SQUARE, false));
    expect(result.current).toBeNull();
  });

  it('produces a padded box on the first bounds', () => {
    const { result } = renderHook(() => useViewportBox(SQUARE, true));
    expect(result.current).toBe(padToBox(SQUARE));
  });

  it('keeps the SAME box while the camera pans inside it', () => {
    // The reason for the padding: a drag across the city would otherwise be a
    // dozen requests for overlapping regions.
    const { result, rerender } = renderHook(
      ({ b }: { b: MapBounds }) => useViewportBox(b, true),
      { initialProps: { b: SQUARE } }
    );
    const first = result.current;
    rerender({ b: bounds(-7.29, 112.71, -7.21, 112.79) });
    expect(result.current).toBe(first);
  });

  it('issues a new box once the camera leaves the fetched region', () => {
    const { result, rerender } = renderHook(
      ({ b }: { b: MapBounds }) => useViewportBox(b, true),
      { initialProps: { b: SQUARE } }
    );
    const first = result.current;
    rerender({ b: bounds(-7.3, 113.0, -7.2, 113.1) });
    expect(result.current).not.toBe(first);
  });

  it('clears when the mode is switched away, so re-entering fetches for NOW', () => {
    const { result, rerender } = renderHook(
      ({ on }: { on: boolean }) => useViewportBox(SQUARE, on),
      { initialProps: { on: true } }
    );
    expect(result.current).not.toBeNull();
    rerender({ on: false });
    expect(result.current).toBeNull();
  });
});
