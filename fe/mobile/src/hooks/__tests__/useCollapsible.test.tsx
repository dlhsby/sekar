/**
 * useCollapsible tests — toggle behaviour + reset-to-default on screen blur.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import { useCollapsible } from '../useCollapsible';

/**
 * Minimal fake navigation that records `blur` listeners so the test can fire
 * the event and assert the reset, mirroring React Navigation's event emitter.
 */
function makeNavigation() {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    addListener: jest.fn((event: string, cb: () => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
      return () => {
        listeners[event] = (listeners[event] ?? []).filter((fn) => fn !== cb);
      };
    }),
    emit: (event: string) => (listeners[event] ?? []).forEach((fn) => fn()),
    listenerCount: (event: string) => (listeners[event] ?? []).length,
  };
}

function wrapperWith(navigation: ReturnType<typeof makeNavigation> | null) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationContext.Provider value={navigation as never}>
        {children}
      </NavigationContext.Provider>
    );
  };
}

describe('useCollapsible', () => {
  it('defaults to collapsed and toggles', () => {
    const { result } = renderHook(() => useCollapsible());
    expect(result.current.expanded).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(false);
  });

  it('respects defaultExpanded', () => {
    const { result } = renderHook(() => useCollapsible(true));
    expect(result.current.expanded).toBe(true);
  });

  it('resets to default when the screen blurs', () => {
    const navigation = makeNavigation();
    const { result } = renderHook(() => useCollapsible(false), {
      wrapper: wrapperWith(navigation),
    });

    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(true);

    act(() => navigation.emit('blur'));
    expect(result.current.expanded).toBe(false);
  });

  it('resets to defaultExpanded=true on blur', () => {
    const navigation = makeNavigation();
    const { result } = renderHook(() => useCollapsible(true), {
      wrapper: wrapperWith(navigation),
    });

    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(false);

    act(() => navigation.emit('blur'));
    expect(result.current.expanded).toBe(true);
  });

  it('is a no-op without a navigation context', () => {
    // No provider: useContext returns undefined; the hook must not throw.
    const { result } = renderHook(() => useCollapsible(false));
    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(true);
  });

  it('unsubscribes the blur listener on unmount', () => {
    const navigation = makeNavigation();
    const { unmount } = renderHook(() => useCollapsible(false), {
      wrapper: wrapperWith(navigation),
    });
    expect(navigation.listenerCount('blur')).toBe(1);

    unmount();
    expect(navigation.listenerCount('blur')).toBe(0);
  });
});
