/**
 * Unit Tests: RoleEditor — home rayon + per-shift assignment limits.
 * These fields decide who must be given a Rayon in the user form and how many
 * places/teams one person may hold in a shift, so their validation is pinned.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleEditor } from '../RoleEditor';
import { useUpdateRole, type Role } from '@/lib/api/roles';

jest.mock('@/lib/api/roles', () => ({
  useUpdateRole: jest.fn(),
}));
jest.mock('@/lib/auth/usePermissions', () => ({
  usePermissions: jest.fn(() => ({ can: jest.fn(() => false) })),
}));
jest.mock('@/components/audit/EntityHistoryDialog', () => ({
  EntityHistoryDialog: jest.fn(() => null),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const baseRole: Role = {
  id: 'r-1',
  code: 'satgas',
  name: 'Satgas',
  is_system: true,
  monitoring_scope: 'none',
  home_scope: 'none',
  max_places_per_shift: 1,
  max_teams_per_shift: 1,
  permissionKeys: [],
  permissionCount: 0,
  userCount: 3,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('RoleEditor — home scope & limits', () => {
  const mutateAsync = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.clearAllMocks();
    (useUpdateRole as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });
  });

  const renderEditor = (role: Partial<Role> = {}) =>
    render(
      <RoleEditor role={{ ...baseRole, ...role }} catalog={[]} canManage onRequestDelete={jest.fn()} />,
    );

  const save = () => screen.getByRole('button', { name: 'Simpan' });

  it('saves limits, turning an emptied field into "unlimited" (null)', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.clear(screen.getByLabelText('Maks. lokasi per shift'));
    await user.clear(screen.getByLabelText('Maks. tim per shift'));
    await user.type(screen.getByLabelText('Maks. tim per shift'), '2');
    await user.click(save());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0].payload).toMatchObject({
      home_scope: 'none',
      max_places_per_shift: null,
      max_teams_per_shift: 2,
    });
  });

  it('rejects 0 places and non-integers', async () => {
    const user = userEvent.setup();
    renderEditor();

    const places = screen.getByLabelText('Maks. lokasi per shift');
    await user.clear(places);
    await user.type(places, '0');
    expect(save()).toBeDisabled();

    await user.clear(places);
    await user.type(places, '1.5');
    expect(save()).toBeDisabled();
    expect(screen.getAllByText(/bilangan bulat/).length).toBeGreaterThan(0);
  });

  it('blocks district monitoring without a home rayon (mirrors the backend rule)', () => {
    renderEditor({ code: 'custom', is_system: false, monitoring_scope: 'district', home_scope: 'none' });
    expect(screen.getByText('Peran dengan monitoring Rayon wajib punya Rayon')).toBeInTheDocument();
  });
});
