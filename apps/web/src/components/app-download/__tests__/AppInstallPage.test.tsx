/**
 * Unit Tests: AppInstallPage
 * Public /android · /ios install page — renders live version + download link.
 */

import { render, screen } from '@testing-library/react';
import { AppInstallPage } from '../AppInstallPage';
import type { AppRelease } from '@/lib/api/app-releases';

const mockUseLatestAppRelease = jest.fn();
jest.mock('@/lib/hooks/useLatestAppRelease', () => ({
  useLatestAppRelease: (platform: 'android' | 'ios') => mockUseLatestAppRelease(platform),
}));

// Public page reads auth state for the context-aware "back" link; default logged-out.
const mockUseAuth = jest.fn(() => ({ user: null }));
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

const release: AppRelease = {
  platform: 'android',
  channel: 'staging',
  version: '0.0.1',
  buildNumber: '202606191609',
  versionCode: 1,
  fileSize: 54_000_000,
  notes: 'First UAT build',
  publishedAt: '2026-06-19T16:09:00.000Z',
  downloadUrl: 'http://api/app-releases/latest/download?platform=android',
};

describe('AppInstallPage', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the version + a download link on success (android)', () => {
    mockUseLatestAppRelease.mockReturnValue({ data: release, status: 'success' });
    render(<AppInstallPage platform="android" />);

    expect(screen.getByText('v0.0.1')).toBeInTheDocument();
    expect(screen.getByText(/Unduh APK/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Unduh APK/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('platform=android'));
  });

  it('shows a loading state', () => {
    mockUseLatestAppRelease.mockReturnValue({ data: null, status: 'loading' });
    render(<AppInstallPage platform="android" />);
    expect(screen.getByText(/Memuat…/i)).toBeInTheDocument();
  });

  it('shows an iOS "coming soon" message when nothing is published', () => {
    mockUseLatestAppRelease.mockReturnValue({ data: null, status: 'notFound' });
    render(<AppInstallPage platform="ios" />);
    expect(screen.getByText(/belum tersedia/i)).toBeInTheDocument();
  });
});
