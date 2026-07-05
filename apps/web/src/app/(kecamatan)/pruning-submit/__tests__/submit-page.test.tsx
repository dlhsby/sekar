/**
 * Unit Tests: Kecamatan submit form (KEC-1)
 * Focuses on the client-side validation gate — the happy path (geolocation +
 * FileReader photo encoding) is exercised by the E2E suite.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { toast } from 'sonner';
import PruningSubmitPage from '../page';

const mockMutateAsync = jest.fn().mockResolvedValue({ id: 'r1' });
jest.mock('@/lib/api/pruning-requests', () => ({
  useSubmitPruningRequest: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));
jest.mock('@/lib/api/client', () => ({ getErrorMessage: (e: unknown) => String(e) }));

const mockToast = toast as unknown as { warning: jest.Mock };

describe('PruningSubmitPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the key form sections', () => {
    render(<PruningSubmitPage />);
    expect(screen.getByRole('heading', { name: /kirim permintaan/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/alamat/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gunakan lokasi saya/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tambah foto/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/jumlah pohon/i)).toBeInTheDocument();
  });

  it('blocks submission and warns when required fields, photos and GPS are missing', async () => {
    const user = userEvent.setup();
    render(<PruningSubmitPage />);

    await user.click(screen.getByRole('button', { name: /kirim permohonan/i }));

    await waitFor(() => expect(mockToast.warning).toHaveBeenCalled());
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/alamat minimal 5 karakter/i)).toBeInTheDocument();
    expect(screen.getByText(/lampirkan minimal 1 foto/i)).toBeInTheDocument();
    expect(screen.getByText(/ambil lokasi gps/i)).toBeInTheDocument();
  });
});
