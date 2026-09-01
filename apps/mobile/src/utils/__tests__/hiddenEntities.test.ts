/**
 * Per-device hide list.
 *
 * Three rules make it safe to hide things on a monitoring map, and the tests
 * that matter are the ones defending them: hiding is presentation and never
 * accounting; it is always visible that something is hidden; and a hidden node
 * hides its own row only, never its children.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseHidden, useHiddenEntities, EMPTY_HIDDEN } from '../hiddenEntities';

describe('parseHidden', () => {
  it('survives anything AsyncStorage hands back', () => {
    // The list outlives downgrades and can be hand-edited on a rooted device.
    expect(parseHidden(null)).toEqual(EMPTY_HIDDEN);
    expect(parseHidden('not json')).toEqual(EMPTY_HIDDEN);
    expect(parseHidden('{"nodes":"nope"}')).toEqual(EMPTY_HIDDEN);
    expect(parseHidden('{"nodes":["a",5,"b"]}')).toEqual({ nodes: ['a', 'b'], workers: [] });
  });
});

describe('useHiddenEntities', () => {
  beforeEach(() => AsyncStorage.clear());

  it('hides nothing by default — the safe direction to fail in', () => {
    const { result } = renderHook(() => useHiddenEntities());
    expect(result.current.isHidden('nodes', 'anything')).toBe(false);
  });

  it('toggles a node on and back off', () => {
    const { result } = renderHook(() => useHiddenEntities());
    act(() => result.current.toggle('nodes', 'k1'));
    expect(result.current.isHidden('nodes', 'k1')).toBe(true);
    act(() => result.current.toggle('nodes', 'k1'));
    expect(result.current.isHidden('nodes', 'k1')).toBe(false);
  });

  it('keeps both hides when two rows are hidden in quick succession', () => {
    // The stale-closure trap: a toggle fired from a row callback must read the
    // CURRENT list, not the one captured when that callback was created, or the
    // first hide is lost.
    const { result } = renderHook(() => useHiddenEntities());
    act(() => {
      result.current.toggle('nodes', 'k1');
      result.current.toggle('nodes', 'k2');
    });
    expect(result.current.isHidden('nodes', 'k1')).toBe(true);
    expect(result.current.isHidden('nodes', 'k2')).toBe(true);
  });

  it('keeps nodes and workers as separate lists', () => {
    // Hiding an area must not hide a person who happens to share an id space.
    const { result } = renderHook(() => useHiddenEntities());
    act(() => result.current.toggle('nodes', 'x'));
    expect(result.current.isHidden('workers', 'x')).toBe(false);
  });

  it('restores everything of one kind without touching the other', () => {
    const { result } = renderHook(() => useHiddenEntities());
    act(() => {
      result.current.toggle('nodes', 'k1');
      result.current.toggle('workers', 'w1');
    });
    act(() => result.current.clear('nodes'));
    expect(result.current.isHidden('nodes', 'k1')).toBe(false);
    expect(result.current.isHidden('workers', 'w1')).toBe(true);
  });

  it('counts what is hidden, for the restore banner', () => {
    // Rule 2: it must always be VISIBLE that something is hidden, with one tap
    // back. A banner cannot say so without a number.
    const { result } = renderHook(() => useHiddenEntities());
    act(() => {
      result.current.toggle('nodes', 'k1');
      result.current.toggle('nodes', 'k2');
    });
    expect(result.current.count('nodes')).toBe(2);
    expect(result.current.count('workers')).toBe(0);
  });

  it('persists across a remount', async () => {
    const first = renderHook(() => useHiddenEntities());
    act(() => first.result.current.toggle('nodes', 'k1'));
    // The write is fire-and-forget, so wait for it to land before remounting.
    await waitFor(async () =>
      expect(await AsyncStorage.getItem('monitoring.hidden.v1')).toContain('k1'),
    );

    const second = renderHook(() => useHiddenEntities());
    await waitFor(() => expect(second.result.current.isHidden('nodes', 'k1')).toBe(true));
  });
});
