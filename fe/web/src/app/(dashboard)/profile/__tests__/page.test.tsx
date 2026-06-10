/**
 * Unit Tests: Profile Page (Phase 4-R self-service)
 * Edit own name/phone (PATCH /users/me) + upload avatar (POST /users/:id/photo),
 * each followed by refreshUser().
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePage from '../page';
import '@testing-library/jest-dom';

const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({ useAuth: () => mockUseAuth() }));

const mockUpdate = jest.fn().mockResolvedValue({});
const mockUpload = jest.fn().mockResolvedValue({ profile_picture_url: 'data:image/png;base64,x' });
jest.mock('@/lib/api/profile', () => ({
  useUpdateMyProfile: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useUploadProfilePicture: () => ({ mutateAsync: mockUpload, isPending: false }),
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const user = {
  id: 'u1',
  username: 'satgas1',
  full_name: 'Andi Saputra',
  role: 'satgas',
  phone_number: '081200000001',
};

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user, loading: false, refreshUser: mockRefreshUser });
  });

  it('renders the account identity and pre-fills the form', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { name: 'Andi Saputra' })).toBeInTheDocument();
    expect(screen.getByLabelText(/nama lengkap/i)).toHaveValue('Andi Saputra');
  });

  it('shows username and phone as read-only fields', () => {
    render(<ProfilePage />);
    const username = screen.getByLabelText(/username/i);
    const phone = screen.getByLabelText(/nomor telepon/i);
    expect(username).toHaveValue('satgas1');
    expect(username).toBeDisabled();
    expect(phone).toHaveValue('081200000001');
    expect(phone).toBeDisabled();
  });

  it('disables Save until the name changes, then submits + refreshes', async () => {
    render(<ProfilePage />);
    const save = screen.getByRole('button', { name: /simpan perubahan/i });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/nama lengkap/i), { target: { value: 'Andi S.' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Andi S.' }));
    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
  });

  it('uploads a selected photo and refreshes the user', async () => {
    render(<ProfilePage />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const input = screen.getByLabelText(/ubah foto profil/i).parentElement?.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(file));
    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
  });
});
