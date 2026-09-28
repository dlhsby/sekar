/**
 * Unit Tests: ForceDeleteDialog (ADR-062)
 * The dialog is the only thing between an operator and an irreversible
 * cascade, so its gates are pinned: impact is shown, submit stays disabled
 * until the exact name + a reason (+ a replacement when required) are given.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForceDeleteDialog } from '../ForceDeleteDialog';
import { useDeletionImpact, useForceDelete } from '@/lib/api/deletions';

jest.mock('@/lib/api/deletions', () => ({
  useDeletionImpact: jest.fn(),
  useForceDelete: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe('ForceDeleteDialog', () => {
  const mutateAsync = jest.fn();

  const withImpact = (impact: Record<string, number>, replacement_required = 0) =>
    (useDeletionImpact as jest.Mock).mockReturnValue({
      data: { type: 'location', id: 'l-1', confirm_label: 'Taman Bungkul', impact, replacement_required },
      isLoading: false,
      isError: false,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    (useForceDelete as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });
  });

  const renderDialog = (extra = {}) =>
    render(
      <ForceDeleteDialog
        open
        onOpenChange={jest.fn()}
        type="location"
        id="l-1"
        name="Taman Bungkul"
        {...extra}
      />,
    );

  const submit = () => screen.getByRole('button', { name: 'Hapus permanen' });

  it('lists only the non-zero impact and warns it is irreversible', () => {
    withImpact({ future_schedules: 4, users_home: 0 });
    renderDialog();
    expect(screen.getByText('Jadwal mulai besok dibatalkan: 4')).toBeInTheDocument();
    expect(screen.queryByText(/Pengguna dilepas/)).not.toBeInTheDocument();
    expect(screen.getByText(/tidak dapat dibatalkan/)).toBeInTheDocument();
  });

  it('stays disabled until the exact name and a reason are given', async () => {
    const user = userEvent.setup();
    withImpact({ future_schedules: 1 });
    renderDialog();

    expect(submit()).toBeDisabled();
    await user.type(screen.getByPlaceholderText('Taman Bungkul'), 'Taman Lain');
    await user.type(screen.getByLabelText(/Alasan penghapusan/), 'Ditutup permanen');
    expect(submit()).toBeDisabled();

    await user.clear(screen.getByPlaceholderText('Taman Bungkul'));
    await user.type(screen.getByPlaceholderText('Taman Bungkul'), '  taman bungkul ');
    expect(submit()).toBeEnabled();
  });

  it('rejects a too-short reason', async () => {
    const user = userEvent.setup();
    withImpact({});
    renderDialog();
    await user.type(screen.getByPlaceholderText('Taman Bungkul'), 'Taman Bungkul');
    await user.type(screen.getByLabelText(/Alasan penghapusan/), 'ok');
    expect(submit()).toBeDisabled();
    expect(screen.getByText('Minimal 5 karakter')).toBeInTheDocument();
  });

  it('requires a replacement when dependants exist, and sends it', async () => {
    const user = userEvent.setup();
    mutateAsync.mockResolvedValue({});
    withImpact({ users_moved: 3 }, 3);
    const onDeleted = jest.fn();
    renderDialog({
      type: 'role',
      replacementOptions: [
        { value: 'l-1', label: 'Self (filtered out)' },
        { value: 'r-2', label: 'Satgas' },
      ],
      onDeleted,
    });

    await user.type(screen.getByPlaceholderText('Taman Bungkul'), 'Taman Bungkul');
    await user.type(screen.getByLabelText(/Alasan penghapusan/), 'Peran dilebur');
    expect(submit()).toBeDisabled();

    await user.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('option', { name: 'Self (filtered out)' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Satgas' }));
    await user.click(submit());

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 'l-1',
        payload: { confirm_name: 'Taman Bungkul', reason: 'Peran dilebur', replacement_id: 'r-2' },
      }),
    );
    expect(onDeleted).toHaveBeenCalled();
  });
});
