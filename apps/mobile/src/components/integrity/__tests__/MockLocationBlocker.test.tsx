/**
 * Tests for the mock-location blocker.
 *
 * The properties that matter: it stays out of the way when nothing is wrong,
 * it appears on a violation, and it only clears on a genuinely clean re-read —
 * never on a stale value and never on an unrelated GPS failure.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import { MockLocationBlocker } from '../MockLocationBlocker';
import { locationTracker } from '../../../services/location/locationTracker';
import { readPosition, MockedLocationError } from '../../../services/location/verifiedPosition';
import i18n from '../../../i18n/config';

jest.mock('../../../services/location/verifiedPosition', () => {
  class MockedLocationErrorStub extends Error {
    readonly code = 'GPS_MOCKED';
  }
  return {
    readPosition: jest.fn(),
    MockedLocationError: MockedLocationErrorStub,
  };
});

const mockedRead = readPosition as jest.MockedFunction<typeof readPosition>;

/** Fire the tracker's violation event the way a spoofed capture would. */
const emitViolation = () =>
  act(() => {
    locationTracker.emit('integrityViolation', 'mocked');
  });

const cleanFix = {
  latitude: -7.2905,
  longitude: 112.7398,
  accuracy: 10,
  mocked: false,
  capturedAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  locationTracker.removeAllListeners('integrityViolation');
});

describe('MockLocationBlocker', () => {
  it('renders nothing until a violation is reported', () => {
    render(<MockLocationBlocker />);

    expect(screen.queryByText(i18n.t('location:mockBlocker.title'))).toBeNull();
  });

  it('takes over the screen when the tracker reports a mocked fix', async () => {
    render(<MockLocationBlocker />);

    emitViolation();

    await waitFor(() =>
      expect(screen.getByText(i18n.t('location:mockBlocker.title'))).toBeTruthy(),
    );
  });

  it('tells the worker they are recorded as inactive, not just that it failed', async () => {
    // The consequence is the deterrent — hiding it would make this look like a
    // transient GPS glitch.
    render(<MockLocationBlocker />);
    emitViolation();

    await waitFor(() => expect(screen.getByText(i18n.t('location:mockBlocker.body'))).toBeTruthy());
  });

  it('clears only after a genuinely clean re-read', async () => {
    mockedRead.mockResolvedValue(cleanFix as never);
    render(<MockLocationBlocker />);
    emitViolation();
    await waitFor(() => expect(screen.getByText(i18n.t('location:mockBlocker.title'))).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText(i18n.t('location:mockBlocker.recheck')));
    });

    expect(screen.queryByText(i18n.t('location:mockBlocker.title'))).toBeNull();
  });

  it('stays up when the re-read still reports a mock', async () => {
    mockedRead.mockRejectedValue(new MockedLocationError());
    render(<MockLocationBlocker />);
    emitViolation();
    await waitFor(() => expect(screen.getByText(i18n.t('location:mockBlocker.title'))).toBeTruthy());

    fireEvent.press(screen.getByText(i18n.t('location:mockBlocker.recheck')));

    await waitFor(() =>
      expect(screen.getByText(i18n.t('location:mockBlocker.stillDetected'))).toBeTruthy(),
    );
    expect(screen.getByText(i18n.t('location:mockBlocker.title'))).toBeTruthy();
  });

  it('does not trap the worker when the re-read fails for an unrelated reason', async () => {
    // A timeout or a permission problem is a different failure. Keeping the
    // overlay up for those would strand someone who is not cheating at all.
    mockedRead.mockRejectedValue({ code: 3, message: 'timeout' });
    render(<MockLocationBlocker />);
    emitViolation();
    await waitFor(() => expect(screen.getByText(i18n.t('location:mockBlocker.title'))).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText(i18n.t('location:mockBlocker.recheck')));
    });

    expect(screen.queryByText(i18n.t('location:mockBlocker.title'))).toBeNull();
  });

  it('re-reads rather than trusting a cached position', async () => {
    // readPosition applies the mock policy itself and defaults to a fresh fix,
    // so the block cannot be cleared with a value captured before the spoof.
    mockedRead.mockResolvedValue(cleanFix as never);
    render(<MockLocationBlocker />);
    emitViolation();
    await waitFor(() => expect(screen.getByText(i18n.t('location:mockBlocker.recheck'))).toBeTruthy());

    fireEvent.press(screen.getByText(i18n.t('location:mockBlocker.recheck')));

    await waitFor(() => expect(mockedRead).toHaveBeenCalled());
    // Called with no allowMocked escape — enforcement is on for this read.
    expect(mockedRead.mock.calls[0][0]?.allowMocked).toBeUndefined();
  });

  it('stops listening once unmounted', () => {
    const { unmount } = render(<MockLocationBlocker />);

    expect(locationTracker.listenerCount('integrityViolation')).toBe(1);
    unmount();
    expect(locationTracker.listenerCount('integrityViolation')).toBe(0);
  });
});
