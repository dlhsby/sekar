import { render } from '@testing-library/react';
import { UpdateToast } from '../UpdateToast';

// Mock sonner before importing it
jest.mock('sonner', () => ({
  toast: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { toast } = require('sonner') as { toast: jest.Mock };

function createMockWorker(): Partial<ServiceWorker> {
  return {
    state: 'installed',
    addEventListener: jest.fn(),
    postMessage: jest.fn(),
  };
}

function createMockRegistration(hasWaiting = false): Partial<ServiceWorkerRegistration> {
  return {
    waiting: hasWaiting ? (createMockWorker() as ServiceWorker) : null,
    installing: null,
    active: null,
    scope: '/',
    updateViaCache: 'none',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

describe('UpdateToast', () => {
  beforeEach(() => {
    toast.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders without visible output (returns null)', () => {
    const mockGetRegistration = jest.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        getRegistration: mockGetRegistration,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        controller: null,
      },
    });

    const { container } = render(<UpdateToast />);
    expect(container.firstChild).toBeNull();
  });

  it('does not show toast when no registration exists', async () => {
    const mockGetRegistration = jest.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        getRegistration: mockGetRegistration,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        controller: null,
      },
    });

    render(<UpdateToast />);

    await new Promise((r) => setTimeout(r, 0));

    expect(toast).not.toHaveBeenCalled();
  });

  it('shows toast when a waiting service worker exists', async () => {
    const registration = createMockRegistration(true);
    const mockGetRegistration = jest.fn().mockResolvedValue(registration);

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        getRegistration: mockGetRegistration,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        controller: { state: 'activated' } as ServiceWorker,
      },
    });

    render(<UpdateToast />);

    await new Promise((r) => setTimeout(r, 0));

    expect(toast).toHaveBeenCalledWith(
      'Versi baru tersedia',
      expect.objectContaining({
        description: expect.stringMatching(/muat ulang/i),
        action: expect.objectContaining({
          label: 'Muat ulang',
        }),
      })
    );
  });
});
