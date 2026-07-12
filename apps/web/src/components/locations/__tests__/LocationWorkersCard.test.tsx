/**
 * Unit Tests: LocationWorkersCard
 * Roster render + assign-dialog candidate filtering (schedulable, not-yet-assigned).
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationWorkersCard } from '../LocationWorkersCard';
import { useAreaUsers, useAssignLocations, useRemoveAssignment } from '@/lib/api/user-locations';
import { useUsers } from '@/lib/api/users';

jest.mock('@/lib/api/user-locations', () => ({
  useAreaUsers: jest.fn(),
  useAssignLocations: jest.fn(),
  useRemoveAssignment: jest.fn(),
}));
jest.mock('@/lib/api/users', () => ({
  useUsers: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Radix Select uses pointer-capture + scrollIntoView, which jsdom does not implement.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.releasePointerCapture = jest.fn();
});

const mockUseAreaUsers = useAreaUsers as jest.Mock;
const mockUseUsers = useUsers as jest.Mock;
const mockUseAssign = useAssignLocations as jest.Mock;
const mockUseRemove = useRemoveAssignment as jest.Mock;

const AREA_ID = 'area-1';

const assigned = [
  { id: 'u1', full_name: 'Satgas Satu', username: 'satgas1', role: 'satgas' },
];

const allUsers = [
  ...assigned,
  { id: 'u2', full_name: 'Linmas Dua', username: 'linmas2', role: 'linmas' },
  { id: 'u3', full_name: 'Admin Tiga', username: 'admin3', role: 'admin_system' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAreaUsers.mockReturnValue({ data: assigned, isLoading: false });
  mockUseUsers.mockReturnValue({ data: { data: allUsers } });
  mockUseAssign.mockReturnValue({ mutateAsync: jest.fn(), isPending: false, variables: undefined });
  mockUseRemove.mockReturnValue({ mutateAsync: jest.fn(), isPending: false, variables: undefined });
});

describe('LocationWorkersCard', () => {
  it('renders the assigned workers roster', () => {
    render(<LocationWorkersCard areaId={AREA_ID} canManage={false} />);
    expect(screen.getByText('Satgas Satu')).toBeInTheDocument();
    expect(screen.getByText('satgas1')).toBeInTheDocument();
    // Read-only: no assign action.
    expect(screen.queryByRole('button', { name: /tugaskan pekerja/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when no workers are assigned', () => {
    mockUseAreaUsers.mockReturnValue({ data: [], isLoading: false });
    render(<LocationWorkersCard areaId={AREA_ID} canManage />);
    expect(screen.getByText('Belum ada pekerja')).toBeInTheDocument();
  });

  it('assign dialog offers only schedulable, not-yet-assigned workers', async () => {
    render(<LocationWorkersCard areaId={AREA_ID} canManage />);
    fireEvent.click(screen.getByRole('button', { name: /tugaskan pekerja/i }));
    fireEvent.click(screen.getByText('Pilih Pekerja'));
    await waitFor(() => {
      // Linmas Dua is schedulable and not assigned → offered.
      expect(screen.getByRole('option', { name: /Linmas Dua \(linmas2\)/i })).toBeInTheDocument();
    });
    // Already-assigned satgas1 and non-schedulable admin must be excluded.
    expect(screen.queryByRole('option', { name: /Satgas Satu/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Admin Tiga/i })).not.toBeInTheDocument();
  });
});
