import { render, screen, fireEvent, act } from '@testing-library/react';
import { InstallBanner } from '../InstallBanner';

const DISMISS_KEY = 'sekar_install_dismissed';

// Helper to simulate beforeinstallprompt
function fireInstallPrompt(promptMock = jest.fn()) {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: jest.Mock;
    userChoice: Promise<{ outcome: 'accepted' }>;
  };
  event.prompt = promptMock;
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
  window.dispatchEvent(event);
  return { promptMock };
}

describe('InstallBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    // Default: browser mode (not standalone)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false, // not standalone
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('does not render initially before beforeinstallprompt fires', () => {
    render(<InstallBanner />);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('does not render when already in standalone mode', async () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: true, // standalone
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<InstallBanner />);

    await act(async () => {
      fireInstallPrompt();
    });

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('does not render within the 14-day suppression window', async () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 1000)); // 1s ago

    render(<InstallBanner />);

    await act(async () => {
      fireInstallPrompt();
    });

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('renders "Pasang Aplikasi" when beforeinstallprompt fires', async () => {
    render(<InstallBanner />);

    await act(async () => {
      fireInstallPrompt();
    });

    expect(screen.getByRole('banner', { name: /pasang aplikasi/i })).toBeInTheDocument();
    expect(screen.getByText(/pasang aplikasi/i)).toBeInTheDocument();
  });

  it('dismisses and sets localStorage on "Nanti saja"', async () => {
    render(<InstallBanner />);

    await act(async () => {
      fireInstallPrompt();
    });

    const dismissButton = screen.getByRole('button', { name: /tutup/i });
    fireEvent.click(dismissButton);

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISS_KEY)).toBeTruthy();
  });

  it('calls prompt.prompt() when "Pasang" is clicked', async () => {
    const promptMock = jest.fn().mockResolvedValue(undefined);
    render(<InstallBanner />);

    await act(async () => {
      fireInstallPrompt(promptMock);
    });

    const installButton = screen.getByRole('button', { name: /pasang aplikasi sekar/i });

    await act(async () => {
      fireEvent.click(installButton);
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('shows banner again after suppression window has expired', async () => {
    // 15 days ago
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 15 * 24 * 60 * 60 * 1000));

    render(<InstallBanner />);

    await act(async () => {
      fireInstallPrompt();
    });

    expect(screen.getByRole('banner', { name: /pasang aplikasi/i })).toBeInTheDocument();
  });
});
