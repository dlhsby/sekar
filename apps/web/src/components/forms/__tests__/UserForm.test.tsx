/**
 * Unit Tests: UserForm — User creation/editing form with role-gated field assignments.
 * Submit/Cancel live in the modal's DialogFooter (outside this form), so tests
 * submit via a sibling button wired to the same `formId`, matching how
 * UserFormModal renders it.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserForm } from '../UserForm';
import { useRayons } from '@/lib/api/rayons';
import { useLocations } from '@/lib/api/locations';
import type { User } from '@/types/models';
import { ReactNode } from 'react';

// Mock the API hooks
jest.mock('@/lib/api/rayons', () => ({
  useRayons: jest.fn(),
}));
jest.mock('@/lib/api/locations', () => ({
  useLocations: jest.fn(),
}));
jest.mock('@/lib/api/shift-definitions', () => ({
  useShiftDefinitions: jest.fn(() => ({ data: [], isLoading: false })),
}));
jest.mock('@/lib/api/user-locations', () => ({
  // Stable `undefined` ref so the prefill effect doesn't loop in tests.
  useUserAreas: jest.fn(() => ({ data: undefined })),
}));
// Roles are data-driven (ADR-044): the form derives its options + scope inputs
// from the /roles catalog, so provide it (with monitoring_scope) to the tests.
jest.mock('@/lib/api/roles', () => ({
  useRoles: jest.fn(() => ({
    data: [
      { code: 'satgas', name: 'Satgas', monitoring_scope: 'none' },
      { code: 'linmas', name: 'Linmas', monitoring_scope: 'none' },
      { code: 'korlap', name: 'Korlap', monitoring_scope: 'region' },
      { code: 'kepala_rayon', name: 'Kepala Rayon', monitoring_scope: 'district' },
      { code: 'admin_rayon', name: 'Admin Rayon', monitoring_scope: 'district' },
      { code: 'management', name: 'Management', monitoring_scope: 'city' },
      { code: 'admin_system', name: 'Admin Sistem', monitoring_scope: 'city' },
      { code: 'superadmin', name: 'Superadmin', monitoring_scope: 'city' },
      { code: 'staff_kecamatan', name: 'Staff Kecamatan', monitoring_scope: 'none' },
    ],
  })),
}));

const FORM_ID = 'user-form-test';

/** Mirrors UserFormModal: a submit button outside the form, wired via `form`. */
function ExternalSubmitButton() {
  return (
    <button type="submit" form={FORM_ID}>
      Simpan
    </button>
  );
}

describe('UserForm', () => {
  const mockRayons = [
    { id: 'rayon-1', name: 'Rayon Utara', code: 'RU' },
    { id: 'rayon-2', name: 'Rayon Selatan', code: 'RS' },
  ];

  const defaultProps = {
    formId: FORM_ID,
    onSubmit: jest.fn(),
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
    (useLocations as jest.Mock).mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
    });
  });

  describe('Form Rendering', () => {
    it('should render all form fields in create mode', () => {
      render(
        <>
          <UserForm {...defaultProps} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/nama lengkap/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nomor hp/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
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
      render(
        <>
          <UserForm {...defaultProps} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/nama minimal 2 karakter/i)).toBeInTheDocument();
      });
    });

    it.skip('should display error for short name', async () => {
      const user = userEvent.setup();
      render(
        <>
          <UserForm {...defaultProps} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/nama lengkap/i), 'A');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/nama minimal 2 karakter/i)).toBeInTheDocument();
      });
    });

    it.skip('should display error for invalid email format', async () => {
      const user = userEvent.setup();
      render(
        <>
          <UserForm {...defaultProps} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/format email tidak valid/i)).toBeInTheDocument();
      });
    });

    it.skip('should display error for short password', async () => {
      const user = userEvent.setup();
      render(
        <>
          <UserForm {...defaultProps} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/password/i), '12345');
      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(screen.getByText(/password minimal 6 karakter/i)).toBeInTheDocument();
      });
    });

    it('should not display username error for valid username', async () => {
      const user = userEvent.setup();
      render(
        <>
          <UserForm {...defaultProps} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

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
      await user.type(screen.getByLabelText(/password/i), '12345678');

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
      expect(screen.getByText('Management')).toBeInTheDocument();
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

      render(
        <>
          <UserForm {...defaultProps} onSubmit={onSubmit} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/nama lengkap/i), 'New User');
      await user.type(screen.getByLabelText(/email/i), 'new@example.com');
      await user.type(screen.getByLabelText(/password/i), '12345678');
      await user.click(screen.getByLabelText(/role/i));
      await user.click(screen.getByText('Worker'));

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'New User',
          email: 'new@example.com',
          password: '12345678',
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
        phone_number: '081200000000',
        role: 'satgas',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      render(
        <>
          <UserForm {...defaultProps} initialData={initialData} onSubmit={onSubmit} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

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

    it('clears rayon/shift/area (explicit null / []) for a role without that scope', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      const initialData: User = {
        id: '1',
        username: 'boss',
        full_name: 'Boss',
        phone_number: '081200000000',
        role: 'admin_system', // scope: no rayon / area / shift
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      render(
        <>
          <UserForm {...defaultProps} initialData={initialData} onSubmit={onSubmit} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'admin_system',
            rayon_id: null,
            shift_definition_id: null,
            location_ids: [],
          }),
        );
      });
    });

    it('keeps rayon but clears shift for a rayon+area role (korlap)', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      const rayonId = '11111111-1111-4111-8111-111111111111';
      const initialData: User = {
        id: '1',
        username: 'koord',
        full_name: 'Koordinator',
        phone_number: '081200000000',
        role: 'korlap', // scope: rayon + area, no shift
        rayon_id: rayonId,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      render(
        <>
          <UserForm {...defaultProps} initialData={initialData} onSubmit={onSubmit} />
          <ExternalSubmitButton />
        </>,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /simpan/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'korlap',
            rayon_id: rayonId,
            shift_definition_id: null,
          }),
        );
      });
    });

    it.skip('should include rayon_id when kepala_rayon is selected', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<UserForm {...defaultProps} onSubmit={onSubmit} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/nama lengkap/i), 'Kepala User');
      await user.type(screen.getByLabelText(/email/i), 'kepala@example.com');
      await user.type(screen.getByLabelText(/password/i), '12345678');

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
          password: '12345678',
          role: 'kepala_rayon',
          rayon_id: 'rayon-1',
        });
      });
    });
  });

  describe('Loading States', () => {
    it('should disable all fields in read-only mode', () => {
      render(<UserForm {...defaultProps} readOnly={true} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/nama lengkap/i)).toBeDisabled();
      expect(screen.getByLabelText(/username/i)).toBeDisabled();
      expect(screen.getByLabelText(/nomor hp/i)).toBeDisabled();
      expect(screen.getByLabelText(/role/i)).toBeDisabled();
    });

    it('should show placeholder when rayons are loading', () => {
      (useRayons as jest.Mock).mockReturnValue({
        data: [],
        isLoading: true,
      });

      // Rayon is shown only for roles with a rayon scope — render a kepala_rayon
      // user (district scope) so the rayon field is present. (satgas has no scope
      // inputs now; its work area comes from schedules.)
      const initialData: User = {
        id: '1',
        username: 'testuser',
        full_name: 'Test User',
        role: 'kepala_rayon',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      render(<UserForm {...defaultProps} initialData={initialData} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/rayon/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rayon/i)).toBeDisabled();
      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    it('should render form without internal cancel button (handled by modal)', () => {
      render(<UserForm {...defaultProps} />, { wrapper: createWrapper() });

      // The cancel button is now in the modal's DialogFooter, not in the form
      expect(screen.queryByRole('button', { name: /batal/i })).not.toBeInTheDocument();
    });
  });

});
