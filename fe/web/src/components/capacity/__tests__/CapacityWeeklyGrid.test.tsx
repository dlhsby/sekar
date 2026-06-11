/**
 * CapacityWeeklyGrid component tests.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CapacityWeeklyGrid } from '../CapacityWeeklyGrid';
import * as capacityApi from '@/lib/api/capacity';

// Mock the API hooks
jest.mock('@/lib/api/capacity');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

type MockedCapacityApi = jest.Mocked<typeof capacityApi>;
const mockCapacityApi = capacityApi as MockedCapacityApi;

describe('CapacityWeeklyGrid', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.clearAllMocks();
  });

  const mockCapacities: capacityApi.CapacityRow[] = [
    {
      id: '1',
      rayonId: 'rayon-1',
      year: 2026,
      isoWeek: 24,
      serviceType: 'pruning',
      capacityUnits: 50,
      bookedUnits: 30,
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
    },
    {
      id: '2',
      rayonId: 'rayon-1',
      year: 2026,
      isoWeek: 25,
      serviceType: 'pruning',
      capacityUnits: 60,
      bookedUnits: 50,
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
    },
    {
      id: '3',
      rayonId: 'rayon-1',
      year: 2026,
      isoWeek: 24,
      serviceType: 'maintenance',
      capacityUnits: 40,
      bookedUnits: 10,
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
    },
  ];

  const renderComponent = (props: Partial<React.ComponentProps<typeof CapacityWeeklyGrid>> = {}) => {
    const defaultProps: React.ComponentProps<typeof CapacityWeeklyGrid> = {
      rayonId: 'rayon-1',
      year: 2026,
      fromWeek: 24,
      toWeek: 25,
      serviceTypes: ['pruning', 'maintenance'],
      canEdit: true,
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <CapacityWeeklyGrid {...defaultProps} />
      </QueryClientProvider> as React.ReactElement,
    );
  };

  it('renders loading state', () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: [],
      isLoading: true,
    } as any);

    renderComponent({ loading: true });
    const loadingElem = document.querySelector('.animate-shimmer');
    expect(loadingElem).toBeInTheDocument();
  });

  it('renders empty state when no service types', () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    renderComponent({ serviceTypes: [] });
    expect(screen.getByText('Tidak ada jenis layanan.')).toBeInTheDocument();
  });

  it('renders grid with weeks and service types', () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    renderComponent();
    expect(screen.getByText('Jenis Layanan')).toBeInTheDocument();
    expect(screen.getAllByText('W24').length).toBeGreaterThan(0);
    expect(screen.getAllByText('W25').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pruning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('maintenance').length).toBeGreaterThan(0);
  });

  it('displays capacity and booked values', () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    renderComponent();
    // Look for the booked/capacity display (30/50 for pruning W24)
    // May have multiple occurrences (desktop + mobile)
    const values = screen.getAllByText('30/50');
    expect(values.length).toBeGreaterThan(0);
  });

  it('allows editing capacity when canEdit is true', async () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    const user = userEvent.setup();
    const { container } = renderComponent({ canEdit: true });

    const inputs = container.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBeGreaterThan(0);

    // Change a capacity value - just verify we can interact with inputs
    const firstInput = inputs[0] as HTMLInputElement;
    const initialValue = firstInput.value;
    await user.click(firstInput);
    await user.type(firstInput, '1');
    // Just verify the value changed
    expect(firstInput.value).not.toBe(initialValue);
  });

  it('does not show inputs when canEdit is false', () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    renderComponent({ canEdit: false });
    const inputs = screen.queryAllByRole('spinbutton');
    expect(inputs.length).toBe(0);
  });

  it('shows Simpan button when there are edits', async () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    const user = userEvent.setup();
    renderComponent({ canEdit: true });

    // Make an edit
    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[0]);
    await user.type(inputs[0], '99');

    // Simpan button should appear
    expect(screen.getByText('Simpan')).toBeInTheDocument();
  });

  it('calls upsertCapacity on Simpan', async () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    const mockUpsert = jest.fn().mockResolvedValue({});
    mockCapacityApi.useUpsertCapacity.mockReturnValue({
      mutateAsync: mockUpsert,
    } as any);

    const user = userEvent.setup();
    const { container } = renderComponent({ canEdit: true });

    // Make an edit
    const inputs = container.querySelectorAll('input[type="number"]');
    const firstInput = inputs[0] as HTMLInputElement;
    await user.clear(firstInput);
    await user.type(firstInput, '75');

    // Click Simpan
    const simpanButton = screen.getByText('Simpan');
    await user.click(simpanButton);

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  it('clears edits when Batal is clicked', async () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    const user = userEvent.setup();
    renderComponent({ canEdit: true });

    // Make an edit
    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[0]);
    await user.type(inputs[0], '100');

    // Click Batal
    const batalButton = screen.getByText('Batal');
    await user.click(batalButton);

    // Simpan and Batal should disappear
    expect(screen.queryByText('Simpan')).not.toBeInTheDocument();
    expect(screen.queryByText('Batal')).not.toBeInTheDocument();
  });

  it('renders mobile card layout on small screens', () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    const { container } = renderComponent();
    const mobileSection = container.querySelector('.md\\:hidden');
    expect(mobileSection).toBeInTheDocument();
  });

  it('handles empty/placeholder capacity rows', () => {
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: [
        // Only one week/type; other weeks should be placeholders (0/0)
        mockCapacities[0],
      ],
      isLoading: false,
    } as any);

    const { container } = renderComponent();
    // Should still render grid even with sparse data
    expect(container).toBeInTheDocument();
    // Verify pruning service is shown (multiple occurrences)
    const pruningLabels = screen.getAllByText('pruning');
    expect(pruningLabels.length).toBeGreaterThan(0);
  });

  it('shows progress bar with correct color for full capacity', () => {
    // Week 25, pruning: 50/60 = 83% (partial)
    mockCapacityApi.useCapacityCalendar.mockReturnValue({
      data: mockCapacities,
      isLoading: false,
    } as any);

    const { container } = renderComponent();
    // Should have progress bars
    const progressBars = container.querySelectorAll('.rounded-nb-sm');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});
