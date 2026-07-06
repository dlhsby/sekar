import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from '../OfflineBanner';

const LAST_SYNC_KEY = 'sekar_last_sync';

function setOnlineStatus(online: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value: online,
  });
}

describe('OfflineBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    setOnlineStatus(true);
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('is hidden when browser is online', () => {
    setOnlineStatus(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('is visible when browser is offline with role="status"', () => {
    setOnlineStatus(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows "Mode offline" text when offline', () => {
    setOnlineStatus(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/mode offline/i)).toBeInTheDocument();
  });

  it('hides banner after going online', async () => {
    setOnlineStatus(false);
    render(<OfflineBanner />);

    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => {
      setOnlineStatus(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows banner after going offline', async () => {
    setOnlineStatus(true);
    render(<OfflineBanner />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      setOnlineStatus(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows last sync time from localStorage when offline', () => {
    const syncTime = Date.now() - 5000;
    localStorage.setItem(LAST_SYNC_KEY, String(syncTime));
    setOnlineStatus(false);

    render(<OfflineBanner />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    // Should show time info — text includes "Data terakhir:"
    const statusEl = screen.getByRole('status');
    expect(statusEl.textContent).toMatch(/data terakhir/i);
  });

  it('does not show last sync time when key is not in localStorage', () => {
    setOnlineStatus(false);
    render(<OfflineBanner />);

    const statusEl = screen.getByRole('status');
    expect(statusEl.textContent).not.toMatch(/data terakhir/i);
  });
});
