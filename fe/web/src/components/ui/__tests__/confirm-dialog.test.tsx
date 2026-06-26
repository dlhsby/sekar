/** Unit Tests: ConfirmDialog */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConfirmDialog } from '../confirm-dialog';

describe('ConfirmDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    title: 'Hapus pengguna?',
    description: 'Tindakan ini permanen.',
    onConfirm: jest.fn(),
  };

  it('renders the title and description when open', () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByText('Hapus pengguna?')).toBeInTheDocument();
    expect(screen.getByText('Tindakan ini permanen.')).toBeInTheDocument();
  });

  it('uses Indonesian default labels', () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Konfirmasi' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<ConfirmDialog {...baseProps} confirmLabel="Hapus" onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('requests close when cancel is clicked', async () => {
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    render(<ConfirmDialog {...baseProps} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables actions and spins the confirm button while loading', () => {
    render(<ConfirmDialog {...baseProps} loading confirmLabel="Hapus" />);
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeDisabled();
  });
});
