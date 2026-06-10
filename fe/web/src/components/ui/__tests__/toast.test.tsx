/**
 * Unit Tests: Toast (NB-styled transient notifications)
 */

import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';

import { ToastProvider, useToast, type ToastLevel } from '../toast';

function Trigger({
  level = 'info',
  title = 'Hello',
  body = '',
}: {
  level?: ToastLevel;
  title?: string;
  body?: string;
}) {
  const { toast } = useToast();
  return (
    <button onClick={() => toast({ level, title, body, durationMs: 10_000 })}>fire</button>
  );
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('Toast', () => {
  it('renders a toast with title and body when fired', () => {
    renderWithProvider(<Trigger title="Gagal Masuk" body="Sandi salah" />);
    fireEvent.click(screen.getByText('fire'));

    expect(screen.getByText('Gagal Masuk')).toBeInTheDocument();
    expect(screen.getByText('Sandi salah')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('uses assertive live region for danger level', () => {
    renderWithProvider(<Trigger level="danger" title="Error" />);
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('dismisses a toast when the close button is clicked', async () => {
    renderWithProvider(<Trigger title="Tutup saya" />);
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByText('Tutup saya')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Tutup notifikasi'));
    await waitFor(() => expect(screen.queryByText('Tutup saya')).not.toBeInTheDocument());
  });

  it('auto-dismisses after the configured duration', () => {
    jest.useFakeTimers();
    try {
      function ShortTrigger() {
        const { toast } = useToast();
        return <button onClick={() => toast({ level: 'success', title: 'Bye', durationMs: 1000 })}>fire</button>;
      }
      render(
        <ToastProvider>
          <ShortTrigger />
        </ToastProvider>
      );
      fireEvent.click(screen.getByText('fire'));
      expect(screen.getByText('Bye')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1100);
      });
      expect(screen.queryByText('Bye')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('throws if useToast is used outside a provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function Bare() {
      useToast();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
