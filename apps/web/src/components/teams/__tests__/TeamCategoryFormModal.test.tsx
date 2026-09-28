/**
 * Unit Tests: TeamCategoryFormModal
 * Guards the "cannot add/edit Kategori Tim" regression: the form must only
 * submit payloads the backend DTO accepts (name ≥ 2 chars, full #RRGGBB hex,
 * empty colour sent as null) and say why Save is disabled.
 */
/* eslint-disable sekar-design/no-inline-hex-colors -- hex literals are the data under test (marker_color payloads) */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamCategoryFormModal } from '../TeamCategoryFormModal';
import { useCreateTeamCategory, useUpdateTeamCategory } from '@/lib/api/teams';

jest.mock('@/lib/api/teams', () => ({
  useCreateTeamCategory: jest.fn(),
  useUpdateTeamCategory: jest.fn(),
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe('TeamCategoryFormModal', () => {
  const createMutate = jest.fn();
  const updateMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCreateTeamCategory as jest.Mock).mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
    });
    (useUpdateTeamCategory as jest.Mock).mockReturnValue({
      mutateAsync: updateMutate,
      isPending: false,
    });
  });

  const renderCreate = () =>
    render(<TeamCategoryFormModal open onOpenChange={jest.fn()} onSuccess={jest.fn()} />);

  const nameInput = () => screen.getByPlaceholderText('mis. Tim Penyiraman');
  const saveButton = () => screen.getByRole('button', { name: 'Simpan' });

  it('creates with a DTO-compatible payload (empty colour → null)', async () => {
    const user = userEvent.setup();
    createMutate.mockResolvedValue({ id: 'tc-1' });
    renderCreate();

    await user.type(nameInput(), 'Penyiraman');
    await user.click(saveButton());

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Penyiraman', marker_color: null, is_active: true }),
    );
  });

  it('blocks a one-character name and explains why', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(nameInput(), 'P');

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Nama minimal 2 karakter')).toBeInTheDocument();
  });

  it('blocks a partial hex colour and explains why', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(nameInput(), 'Penyiraman');
    const hexInput = screen.getByPlaceholderText('#7FBC8C');
    await user.type(hexInput, '#12');

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(/Format warna harus heksadesimal/)).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('edits without sending is_active', async () => {
    const user = userEvent.setup();
    updateMutate.mockResolvedValue({});
    render(
      <TeamCategoryFormModal
        open
        onOpenChange={jest.fn()}
        teamCategory={{ id: 'tc-1', name: 'Penyiraman', is_active: true, marker_color: '#22C55E' }}
      />,
    );

    await user.clear(nameInput());
    await user.type(nameInput(), 'Penyapuan');
    await user.click(saveButton());

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    const [{ id, data }] = updateMutate.mock.calls[0];
    expect(id).toBe('tc-1');
    expect(data).toMatchObject({ name: 'Penyapuan', marker_color: '#22C55E' });
    expect(data).not.toHaveProperty('is_active');
  });
});
