/**
 * Unit Tests: UserForm
 * Tests user creation and editing form with validation
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserForm } from '../UserForm';
import { useRayons } from '@/lib/api/rayons';
import type { User } from '@/types/models';

// Mock the rayons API hook
jest.mock('@/lib/api/rayons', () => ({
  useRayons: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useRayons as jest.Mock).mockReturnValue({
      data: mockRayons,
      isLoading: false,
    });
  });

  describe('Form Rendering', () => {
    it('should render all form fields in create mode', () => {
      render(<UserForm {...defaultProps} />);

      expect(screen.getByLabelText(/nama lengkap/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /batal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /simpan/i })).toBeInTheDocument();
    });

    it('should show password field as required in create mode', () => {
      render(<UserForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should show password field as optional in edit mode', () => {
      const initialData: User = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'worker',
        status: 'active',
        created_at: '2026-01-01',
      };

      render(<UserForm {...defaultProps} initialData={initialData} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).not.toHaveAttribute('required');
      expect(screen.getByText(/kosongkan jika tidak ingin mengubah/i)).toBeInTheDocument();
    });

    it('should populate form fields with initial data', () => {
      const initialData: User = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        status: 'active',
        created_at: '2026-01-01',
      };

      render(<UserForm {...defaultProps} initialData={initialData} />);

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it.skip('should display error for empty name', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/nama minimal 2 karakter/i)).toBeInTheDocument();
      });
    });

    it.skip('should display error for short name', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/nama lengkap/i), 'A');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/nama minimal 2 karakter/i)).toBeInTheDocument();
      });
    });

    it.skip('should display error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/format email tidak valid/i)).toBeInTheDocument();
      });
    });

    it.skip('should display error for short password', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/password/i), '12345');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/password minimal 6 karakter/i)).toBeInTheDocument();
      });
    });

    it('should not display email error for valid email', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/nama lengkap/i), 'Valid User');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.queryByText(/format email tidak valid/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Role Selection', () => {
    it.skip('should show rayon field when kepala_rayon is selected', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

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
      render(<UserForm {...defaultProps} />);

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
      render(<UserForm {...defaultProps} />);

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
      render(<UserForm {...defaultProps} />);

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

      render(<UserForm {...defaultProps} onSubmit={onSubmit} />);

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
          role: 'worker',
        });
      });
    });

    it('should submit form without password in edit mode when password is empty', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      const initialData: User = {
        id: '1',
        name: 'Existing User',
        email: 'existing@example.com',
        role: 'worker',
        status: 'active',
        created_at: '2026-01-01',
      };

      render(<UserForm {...defaultProps} initialData={initialData} onSubmit={onSubmit} />);

      await user.clear(screen.getByLabelText(/nama lengkap/i));
      await user.type(screen.getByLabelText(/nama lengkap/i), 'Updated User');

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated User',
            email: 'existing@example.com',
            role: 'worker',
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

      render(<UserForm {...defaultProps} onSubmit={onSubmit} />);

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
      render(<UserForm {...defaultProps} loading={true} />);

      expect(screen.getByLabelText(/nama lengkap/i)).toBeDisabled();
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      expect(screen.getByLabelText(/role/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /simpan/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /batal/i })).toBeDisabled();
    });

    it('should show loading indicator on submit button when loading', () => {
      render(<UserForm {...defaultProps} loading={true} />);

      const submitButton = screen.getByRole('button', { name: /simpan/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable fields during form submission', async () => {
      const onSubmit = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      const user = userEvent.setup();

      render(<UserForm {...defaultProps} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/nama lengkap/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      // Fields should be disabled during submission
      expect(screen.getByLabelText(/nama lengkap/i)).toBeDisabled();
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
    });

    it('should show placeholder when rayons are loading', () => {
      (useRayons as jest.Mock).mockReturnValue({
        data: [],
        isLoading: true,
      });

      // Render with kepala_rayon role to show rayon field
      render(
        <UserForm
          {...defaultProps}
          initialData={{
            id: '1',
            name: 'Test User',
            username: 'testuser',
            email: 'test@example.com',
            role: 'kepala_rayon' as const,
            rayon_id: '',
          }}
        />
      );

      // Rayon field should be visible and disabled while loading
      expect(screen.getByLabelText(/rayon/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rayon/i)).toBeDisabled();
      // The placeholder text "Memuat..." should be visible
      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(<UserForm {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /batal/i }));

      expect(onCancel).toHaveBeenCalled();
    });

    it.skip('should not call onCancel when form is submitting', async () => {
      const onCancel = jest.fn();
      const onSubmit = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      const user = userEvent.setup();

      render(<UserForm {...defaultProps} onSubmit={onSubmit} onCancel={onCancel} />);

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
      render(<UserForm {...defaultProps} submitText="Buat User Baru" />);

      expect(screen.getByRole('button', { name: /buat user baru/i })).toBeInTheDocument();
    });

    it('should use default text if not provided', () => {
      render(<UserForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

      expect(screen.getByRole('button', { name: /simpan/i })).toBeInTheDocument();
    });
  });
});
