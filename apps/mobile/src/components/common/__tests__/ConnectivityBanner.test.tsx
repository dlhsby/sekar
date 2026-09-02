/**
 * Unit tests: ConnectivityBanner retry affordance.
 *
 * The banner already auto-retries on a poll ("Server tidak terjangkau, mencoba
 * lagi…"), but the user has no way to ask for a check NOW. During the
 * 2026-09-02 staging incident the database came back well before the next poll
 * and the app still showed as disconnected, with nothing to tap.
 *
 * ConnectivityMonitor.refresh() already existed for exactly this — its own
 * docstring reads "Useful when the user taps 'Try again'" — it simply had no
 * caller in the UI.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ConnectivityBanner } from '../ConnectivityBanner';
import type { ConnectivityStatusSnapshot } from '../../../services/sync/connectivityStatus';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

const makeMonitor = (status: ConnectivityStatusSnapshot['status'], refresh = jest.fn()) => {
  const snap: ConnectivityStatusSnapshot = {
    status,
    lastHealthCheckAt: null,
    lastHealthError: undefined,
  };
  return {
    snapshot: () => snap,
    subscribe: jest.fn().mockReturnValue(() => undefined),
    refresh,
  } as never;
};

describe('ConnectivityBanner — retry', () => {
  it('renders nothing when online', () => {
    const { queryByTestId } = render(<ConnectivityBanner monitor={makeMonitor('ONLINE')} />);
    expect(queryByTestId('connectivity-retry')).toBeNull();
  });

  it('offers a retry control when the server is unreachable', () => {
    const { getByTestId } = render(<ConnectivityBanner monitor={makeMonitor('SERVER_UNREACHABLE')} />);
    expect(getByTestId('connectivity-retry')).toBeTruthy();
  });

  it('offers a retry control when there is no internet', () => {
    // Worth offering here too: the radio may be back before the next poll.
    const { getByTestId } = render(<ConnectivityBanner monitor={makeMonitor('NO_INTERNET')} />);
    expect(getByTestId('connectivity-retry')).toBeTruthy();
  });

  it('asks the monitor to re-check when tapped', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <ConnectivityBanner monitor={makeMonitor('SERVER_UNREACHABLE', refresh)} />,
    );
    fireEvent.press(getByTestId('connectivity-retry'));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('ignores repeat taps while a check is already in flight', async () => {
    // Without this a frustrated user queues a burst of health checks at a
    // server that is already struggling - the same shape as the retry storm
    // that deepened the 2026-09-02 outage.
    let release: () => void = () => undefined;
    const refresh = jest.fn().mockImplementation(() => new Promise<void>((r) => { release = r; }));
    const { getByTestId } = render(
      <ConnectivityBanner monitor={makeMonitor('SERVER_UNREACHABLE', refresh)} />,
    );
    const btn = getByTestId('connectivity-retry');
    fireEvent.press(btn);
    fireEvent.press(btn);
    fireEvent.press(btn);
    expect(refresh).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('recovers if the check rejects, so the control does not wedge', async () => {
    const refresh = jest.fn().mockRejectedValue(new Error('still down'));
    const { getByTestId } = render(
      <ConnectivityBanner monitor={makeMonitor('SERVER_UNREACHABLE', refresh)} />,
    );
    fireEvent.press(getByTestId('connectivity-retry'));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('connectivity-retry'));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  });

  it('labels the control for screen readers', () => {
    const { getByTestId } = render(<ConnectivityBanner monitor={makeMonitor('SERVER_UNREACHABLE')} />);
    const btn = getByTestId('connectivity-retry');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toBeTruthy();
    // Never a raw i18n key leaking into the UI.
    expect(String(btn.props.accessibilityLabel)).not.toContain('connectivity.');
  });
});
