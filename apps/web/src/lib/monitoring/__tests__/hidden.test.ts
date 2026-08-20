import { renderHook, act } from '@testing-library/react';
import { useHiddenEntities } from '../hidden';

describe('useHiddenEntities', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts empty', () => {
    const { result } = renderHook(() => useHiddenEntities());
    expect(result.current.hidden).toEqual({ nodes: [], workers: [] });
  });

  it('hides and un-hides the same id', () => {
    const { result } = renderHook(() => useHiddenEntities());
    act(() => result.current.toggle('nodes', 'rayon-1'));
    expect(result.current.isHidden('nodes', 'rayon-1')).toBe(true);
    act(() => result.current.toggle('nodes', 'rayon-1'));
    expect(result.current.isHidden('nodes', 'rayon-1')).toBe(false);
  });

  it('keeps the two kinds independent — an id can be both a node and a user', () => {
    const { result } = renderHook(() => useHiddenEntities());
    act(() => result.current.toggle('nodes', 'shared-id'));
    expect(result.current.isHidden('workers', 'shared-id')).toBe(false);
  });

  it('persists, so a reload does not un-hide what the operator put away', () => {
    const { result } = renderHook(() => useHiddenEntities());
    act(() => result.current.toggle('workers', 'user-9'));
    expect(JSON.parse(window.localStorage.getItem('monitoring.hidden.v1')!).workers).toEqual([
      'user-9',
    ]);
    const second = renderHook(() => useHiddenEntities());
    expect(second.result.current.isHidden('workers', 'user-9')).toBe(true);
  });

  it('clear restores one kind and leaves the other alone', () => {
    const { result } = renderHook(() => useHiddenEntities());
    act(() => result.current.toggle('nodes', 'rayon-1'));
    act(() => result.current.toggle('workers', 'user-9'));
    act(() => result.current.clear('nodes'));
    expect(result.current.count('nodes')).toBe(0);
    expect(result.current.count('workers')).toBe(1);
  });

  it('survives a malformed stored value rather than breaking the map', () => {
    // The list is UI-written but survives downgrades and hand-edits.
    window.localStorage.setItem(
      'monitoring.hidden.v1',
      JSON.stringify({ nodes: 'rayon-1', workers: [1, 'user-9', null] })
    );
    const { result } = renderHook(() => useHiddenEntities());
    expect(result.current.hidden).toEqual({ nodes: [], workers: ['user-9'] });
  });
});
