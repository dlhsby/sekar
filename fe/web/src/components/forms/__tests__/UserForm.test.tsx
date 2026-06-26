/**
 * Unit Tests: UserForm
 * Tests user creation and editing form with validation
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserForm } from '../UserForm';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import type { User } from '@/types/models';
import { ReactNode } from 'react';

// Mock the API hooks
jest.mock('@/lib/api/rayons', () => ({
  useRayons: jest.fn(),
}));
jest.mock('@/lib/api/areas', () => ({
  useAreas: jest.fn(),
}));
jest.mock('@/lib/api/shift-definitions', () => ({
  useShiftDefinitions: jest.fn(() => ({ data: [], isLoading: false })),
}));
jest.mock('@/lib/api/user-areas', () => ({
  // Stable `undefined` ref so the prefill effect doesn't loop in tests.
  useUserAreas: jest.fn(() => ({ data: undefined })),
}));

describe('UserForm', () => {
  const mockRayons = [
    { id: 'rayon-1', name: 'Rayon Utara', code: 'RU' },
    { id: 'rayon-2', name: 'Rayon Selatan', code: 'RS' },
  ];

  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    loading: false,
    submitText: 'Simpan',
  };

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRayons as jest.Mock).mockReturnValue({
      data: mockRayons,
      isLoading: false,
    });
    (useAreas as jest.Mock).mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
    });
  });

  describe('Form Rendering', () => {
    it('should render all form fields in create mode', () => {
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/nama lengkap/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nomor hp/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /batal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /simpan/i })).toBeInTheDocument();
    });

    it('should NOT show a password field (auto-generated) and explain the temp password', () => {
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.getByText(/password sementara akan dibuat otomatis/i)).toBeInTheDocument();
    });

    it('should not show the temp-password note in edit mode', () => {
      const initialData: User = {
        id: '1',
        username: 'testuser',
        full_name: 'Test User',
        role: 'satgas',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      render(<UserForm {...defaultProps} initialData={initialData} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/password sementara akan dibuat otomatis/i)).not.toBeInTheDocument();
    });

    it('should populate form fields with initial data', () => {
      const initialData: User = {
        id: '1',
        username: 'johndoe',
        full_name: 'John Doe',
        role: 'admin_system',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      render(<UserForm {...defaultProps} initialData={initialData} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('johndoe')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it.skip('should display error for empty name', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/nama minimal 2 karakter/i)).toBeInTheDocument();
      });
    });

    it.skip('should display error for short name', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/nama lengkap/i), 'A');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/nama minimal 2 karakter/i)).toBeInTheDocument();
      });
    });

    it.skip('should display error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/format email tidak valid/i)).toBeInTheDocument();
      });
    });

    it.skip('should display error for short password', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/password/i), '12345');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/password minimal 6 karakter/i)).toBeInTheDocument();
      });
    });

    it('should not display username error for valid username', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/username/i), 'validuser');
      await user.type(screen.getByLabelText(/nama lengkap/i), 'Valid User');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.queryByText(/username minimal/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Role Selection', () => {
    it.skip('should show rayon field when kepala_rayon is selected', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      // Initially rayon field should not be visible
      expect(screen.queryByLabelText(/^rayon$/i)).not.toBeInTheDocument();

      // Change role to kepala_rayon
      const roleSelect = screen.getByLabelText(/role/i);
      await user.click(roleSelect);
      await user.click(screen.getByText('Kepala Rayon'));

      // Now rayon field should be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/^rayon$/i)).toBeInTheDocument();
      });
    });

    it.skip('should hide rayon field when role is not kepala_rayon', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      // Change to kepala_rayon first
      await user.click(screen.getByLabelText(/role/i));
      await user.click(screen.getByText('Kepala Rayon'));

      await waitFor(() => {
        expect(screen.getByLabelText(/^rayon$/i)).toBeInTheDocument();
      });

      // Change to worker
      await user.click(screen.getByLabelText(/role/i));
      await user.click(screen.getByText('Worker'));

      // Rayon field should be hidden
      await waitFor(() => {
        expect(screen.queryByLabelText(/^rayon$/i)).not.toBeInTheDocument();
      });
    });

    it.skip('should require rayon when kepala_rayon is selected', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/nama lengkap/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      await user.click(screen.getByLabelText(/role/i));
      await user.click(screen.getByText('Kepala Rayon'));

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/rayon wajib dipilih untuk role kepala rayon/i)
        ).toBeInTheDocument();
      });
    });

    it.skip('should display all role options', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      await user.click(screen.getByLabelText(/role/i));

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Top Management')).toBeInTheDocument();
      expect(screen.getByText('Kepala Rayon')).toBeInTheDocument();
      expect(screen.getByText('Koordinator Lapangan')).toBeInTheDocument();
      expect(screen.getByText('Worker')).toBeInTheDocument();
      expect(screen.getByText('Linmas')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it.skip('should submit form with valid data in create mode', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<UserForm {...defaultProps} onSubmit={onSubmit} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/nama lengkap/i), 'New User');
      await user.type(screen.getByLabelText(/email/i), 'new@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByLabelText(/role/i));
      await user.click(screen.getByText('Worker'));

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
          role: 'satgas',
        });
      });
    });

    it('should submit form without password in edit mode when password is empty', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      const initialData: User = {
        id: '1',
        username: 'existinguser',
        full_name: 'Existing User',
        role: 'satgas',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      render(<UserForm {...defaultProps} initialData={initialData} onSubmit={onSubmit} />, {
        wrapper: createWrapper(),
      });

      await user.clear(screen.getByLabelText(/nama lengkap/i));
      await user.type(screen.getByLabelText(/nama lengkap/i), 'Updated User');

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: 'Updated User',
            username: 'existinguser',
            role: 'satgas',
          })
        );
        expect(onSubmit).toHaveBeenCalledWith(
          expect.not.objectContaining({
            password: expect.anything(),
          })
        );
      });
    });

    it.skip('should include rayon_id when kepala_rayon is selected', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<UserForm {...defaultProps} onSubmit={onSubmit} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/nama lengkap/i), 'Kepala User');
      await user.type(screen.getByLabelText(/email/i), 'kepala@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      await user.click(screen.getByLabelText(/role/i));
      await user.click(screen.getByText('Kepala Rayon'));

      // Wait for rayon field to appear and select it
      await waitFor(() => {
        expect(screen.getByLabelText(/^rayon$/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/^rayon$/i));
      await user.click(screen.getByText(/rayon utara/i));

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'Kepala User',
          email: 'kepala@example.com',
          password: 'password123',
          role: 'kepala_rayon',
          rayon_id: 'rayon-1',
        });
      });
    });
  });

  describe('Loading States', () => {
    it('should disable all fields when loading', () => {
      render(<UserForm {...defaultProps} loading={true} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/nama lengkap/i)).toBeDisabled();
      expect(screen.getByLabelText(/username/i)).toBeDisabled();
      expect(screen.getByLabelText(/nomor hp/i)).toBeDisabled();
      expect(screen.getByLabelText(/role/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /simpan/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /batal/i })).toBeDisabled();
    });

    it('should show loading indicator on submit button when loading', () => {
      render(<UserForm {...defaultProps} loading={true} />, { wrapper: createWrapper() });

      const submitButton = screen.getByRole('button', { name: /simpan/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable fields during form submission', async () => {
      const onSubmit = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 1000)));
      const user = userEvent.setup();

      render(<UserForm {...defaultProps} onSubmit={onSubmit} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/nama lengkap/i), 'Test User');
      await user.type(screen.getByLabelText(/username/i), 'testuser');

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      // Fields should be disabled during submission
      expect(screen.getByLabelText(/nama lengkap/i)).toBeDisabled();
      expect(screen.getByLabelText(/username/i)).toBeDisabled();
    });

    it('should show placeholder when rayons are loading', () => {
      (useRayons as jest.Mock).mockReturnValue({
        data: [],
        isLoading: true,
      });

      // Rayon field is always shown now (all roles).
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/rayon/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rayon/i)).toBeDisabled();
      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<UserForm {...defaultProps} onCancel={onCancel} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /batal/i }));

      expect(onCancel).toHaveBeenCalled();
    });

    it.skip('should not call onCancel when form is submitting', async () => {
      const onCancel = jest.fn();
      const onSubmit = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 1000)));
      const user = userEvent.setup();

      render(<UserForm {...defaultProps} onSubmit={onSubmit} onCancel={onCancel} />, {
        wrapper: createWrapper(),
      });

      await user.type(screen.getByLabelText(/nama lengkap/i), 'Test');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      // Cancel button should be disabled
      expect(screen.getByRole('button', { name: /batal/i })).toBeDisabled();
    });
  });

  describe('Custom Submit Button Text', () => {
    it('should display custom submit button text', () => {
      render(<UserForm {...defaultProps} submitText="Buat User Baru" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('button', { name: /buat user baru/i })).toBeInTheDocument();
    });

    it('should use default text if not provided', () => {
      render(<UserForm onSubmit={jest.fn()} onCancel={jest.fn()} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /simpan/i })).toBeInTheDocument();
    });
  });
});
