/**
 * Unit Tests: DeleteAreaModal
 * Tests area deletion confirmation modal
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteAreaModal } from '../DeleteAreaModal';
import { useDeleteArea } from '@/lib/api/areas';

jest.mock('@/lib/api/areas', () => ({
  useDeleteArea: jest.fn(),
}));

describe('DeleteAreaModal', () => {
  let queryClient: QueryClient;

  const mockArea = {
    id: 'area-1',
    name: 'Taman Bungkul',
    address: 'Jl. Taman Bungkul',
    area_type_id: 'type-1',
    rayon_id: 'rayon-1',
    rayon: {
      id: 'rayon-1',
      name: 'Rayon Utara',
      code: 'RU',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    gps_lat: -7.255,
    gps_lng: 112.755,
    boundary_polygon: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [112.75, -7.25],
          [112.76, -7.25],
          [112.76, -7.26],
          [112.75, -7.26],
          [112.75, -7.25],
        ],
      ],
    },
    coverage_area: 15000,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDeleteArea as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
  });

  it('should not render when closed', () => {
    render(<DeleteAreaModal isOpen={false} area={mockArea} onClose={jest.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not render when area is null', () => {
    render(<DeleteAreaModal isOpen={true} area={null} onClose={jest.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render modal when open with area', () => {
    render(<DeleteAreaModal isOpen={true} area={mockArea} onClose={jest.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /hapus lokasi/i })).toBeInTheDocument();
    expect(screen.getAllByText(/taman bungkul/i).length).toBeGreaterThan(0);
  });

  it('should display area details', () => {
    render(<DeleteAreaModal isOpen={true} area={mockArea} onClose={jest.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getAllByText('Taman Bungkul').length).toBeGreaterThan(0);
    expect(screen.getByText('Rayon Utara')).toBeInTheDocument();
  });

  it('should display warning message', () => {
    render(<DeleteAreaModal isOpen={true} area={mockArea} onClose={jest.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/tindakan ini tidak dapat dibatalkan/i)).toBeInTheDocument();
  });

  it('should call onClose when cancel button clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<DeleteAreaModal isOpen={true} area={mockArea} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /batal/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('should call deleteArea when delete button clicked', async () => {
    const mockDeleteArea = jest.fn().mockResolvedValue(undefined);
    (useDeleteArea as jest.Mock).mockReturnValue({
      mutateAsync: mockDeleteArea,
      isPending: false,
    });

    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<DeleteAreaModal isOpen={true} area={mockArea} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /^hapus$/i }));

    await waitFor(() => {
      expect(mockDeleteArea).toHaveBeenCalledWith('area-1');
    });
  });

  it('should call onSuccess after successful deletion', async () => {
    const mockDeleteArea = jest.fn().mockResolvedValue(undefined);
    (useDeleteArea as jest.Mock).mockReturnValue({
      mutateAsync: mockDeleteArea,
      isPending: false,
    });

    const onSuccess = jest.fn();
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(
      <DeleteAreaModal isOpen={true} area={mockArea} onClose={onClose} onSuccess={onSuccess} />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /^hapus$/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should display error message on deletion failure', async () => {
    const mockDeleteArea = jest.fn().mockRejectedValue(new Error('Failed to delete'));
    (useDeleteArea as jest.Mock).mockReturnValue({
      mutateAsync: mockDeleteArea,
      isPending: false,
    });

    const user = userEvent.setup();

    render(<DeleteAreaModal isOpen={true} area={mockArea} onClose={jest.fn()} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /^hapus$/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to delete/i)).toBeInTheDocument();
    });
  });

  it('should disable buttons when deletion is pending', () => {
    (useDeleteArea as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: true,
    });

    render(<DeleteAreaModal isOpen={true} area={mockArea} onClose={jest.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('button', { name: /batal/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^hapus$/i })).toBeDisabled();
  });

  it('should not close when clicking cancel during deletion', async () => {
    (useDeleteArea as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: true,
    });

    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<DeleteAreaModal isOpen={true} area={mockArea} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /batal/i }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should handle non-Error exceptions', async () => {
    const mockDeleteArea = jest.fn().mockRejectedValue('String error');
    (useDeleteArea as jest.Mock).mockReturnValue({
      mutateAsync: mockDeleteArea,
      isPending: false,
    });

    const user = userEvent.setup();

    render(<DeleteAreaModal isOpen={true} area={mockArea} onClose={jest.fn()} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /^hapus$/i }));

    // Non-Error rejections surface the standardized getErrorMessage fallback.
    await waitFor(() => {
      expect(screen.getByText(/terjadi kesalahan/i)).toBeInTheDocument();
    });
  });
});
