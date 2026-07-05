/**
 * useCollapsible — expand/collapse state that resets to `defaultExpanded`
 * whenever the host screen loses focus.
 *
 * React Navigation keeps screens mounted across navigation, so a plain
 * `useState` toggle "remembers" the last open/closed state when the user
 * leaves and returns. This hook subscribes to the screen's `blur` event and
 * restores the default, giving every collapsible a uniform "back to default
 * on navigate away" behaviour.
 *
 * Safe outside a navigator (e.g. isolated component tests): when no navigation
 * context is present the reset listener is simply not attached.
 */
import { useCallback, useContext, useEffect, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';

export interface CollapsibleState {
  expanded: boolean;
  toggle: () => void;
  setExpanded: (value: boolean) => void;
}

export function useCollapsible(defaultExpanded = false): CollapsibleState {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const navigation = useContext(NavigationContext);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  useEffect(() => {
    if (!navigation) {
      return undefined;
    }
    const unsubscribe = navigation.addListener('blur', () => {
      setExpanded(defaultExpanded);
    });
    return unsubscribe;
  }, [navigation, defaultExpanded]);

  return { expanded, toggle, setExpanded };
}
