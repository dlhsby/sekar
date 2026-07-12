/**
 * Unit Tests: Profile Page (read-only view)
 * Editing moved to Settings → Account & Security (ADR-049); this page only
 * displays the account and links to Settings.
 */
import { render, screen } from '@testing-library/react';
import ProfilePage from '../page';
import '@testing-library/jest-dom';

const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({ useAuth: () => mockUseAuth() }));

const user = {
  id: 'u1',
  username: 'satgas1',
  full_name: 'Andi Saputra',
  role: 'satgas',
  phone_number: '081200000001',
};

describe('ProfilePage (read-only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user, loading: false });
  });

  it('renders the account identity', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { name: 'Andi Saputra' })).toBeInTheDocument();
    expect(screen.getByText('@satgas1')).toBeInTheDocument();
  });

  it('shows account fields as read-only (no editing here)', () => {
    render(<ProfilePage />);
    const username = screen.getByLabelText(/username/i);
    const phone = screen.getByLabelText(/nomor telepon/i);
    expect(username).toHaveValue('satgas1');
    expect(username).toBeDisabled();
    expect(phone).toHaveValue('081200000001');
    expect(phone).toBeDisabled();
    // No save button — editing lives in Settings.
    expect(screen.queryByRole('button', { name: /simpan/i })).not.toBeInTheDocument();
  });

  it('links to Settings for editing', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('link', { name: /ubah di pengaturan/i })).toHaveAttribute(
      'href',
      '/settings?section=account',
    );
  });
});
