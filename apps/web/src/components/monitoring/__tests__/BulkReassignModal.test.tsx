/**
 * Unit Tests: BulkReassignModal Component (Phase 4-4 B1)
 * Tests multi-select behavior, select-all toggle, sequential bulk submission,
 * partial-failure handling, and toast messaging.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BulkReassignModal } from '../BulkReassignModal';
import type { BoundariesResponse, LiveUser, LiveUsersResponse } from '@/lib/api/monitoring';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutateAsync = jest.fn();

jest.mock('@/lib/api/monitoring', () => ({
  useLiveUsers: jest.fn(),
  useReassignWorker: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { useLiveUsers, useReassignWorker } from '@/lib/api/monitoring';
import { toast } from 'sonner';

const mockUseLiveUsers = useLiveUsers as jest.MockedFunction<typeof useLiveUsers>;
const mockUseReassignWorker = useReassignWorker as jest.MockedFunction<typeof useReassignWorker>;

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const AREA_1_ID = 'area-1';
const AREA_2_ID = 'area-2';
const RAYON_1_ID = 'rayon-1';

const MOCK_BOUNDARIES: BoundariesResponse = {
  generated_at: new Date().toISOString(),
  rayons: [
    {
      id: RAYON_1_ID,
      name: 'Rayon Selatan',
      boundary_polygon: null,
      center_lat: -7.3,
      center_lng: 112.7,
      area_count: 2,
      is_understaffed: false,
      understaffed_area_count: 0,
      areas: [
        {
          id: AREA_1_ID,
          name: 'Taman Bungkul',
          boundary_polygon: null,
          center_lat: -7.289659,
          center_lng: 112.739208,
          rayon_id: RAYON_1_ID,
          rayon_name: 'Rayon Selatan',
          radius_meters: 100,
          assigned_count: 3,
          is_understaffed: true,
          staffing_summary: [],
        },
        {
          id: AREA_2_ID,
          name: 'Taman Flora',
          boundary_polygon: null,
          center_lat: -7.299,
          center_lng: 112.749,
          rayon_id: RAYON_1_ID,
          rayon_name: 'Rayon Selatan',
          radius_meters: 120,
          assigned_count: 2,
          is_understaffed: false,
          staffing_summary: [],
        },
      ],
    },
  ],
};

const MOCK_WORKER_1: LiveUser = {
  id: 'user-1',
  full_name: 'Budi Santoso',
  role: 'satgas',
  phone: '+6281111111111',
  status: 'active',
  location_id: AREA_2_ID,
  area_name: 'Taman Flora',
  rayon_id: RAYON_1_ID,
  rayon_name: 'Rayon Selatan',
  latitude: -7.299,
  longitude: 112.749,
  accuracy: 5,
  battery_level: 85,
  last_update: new Date().toISOString(),
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  clock_in_time: new Date().toISOString(),
  current_task_status: null,
  current_task_title: null,
};

const MOCK_WORKER_2: LiveUser = {
  ...MOCK_WORKER_1,
  id: 'user-2',
  full_name: 'Siti Rahayu',
  role: 'linmas',
  status: 'inactive',
};

const MOCK_WORKER_3: LiveUser = {
  ...MOCK_WORKER_1,
  id: 'user-3',
  full_name: 'Joko Widodo',
  role: 'satgas',
  status: 'active',
};

const MOCK_LIVE_USERS_RESPONSE: LiveUsersResponse = {
  total_active: 2,
  total_inactive: 1,
  total_outside_area: 0,
  total_missing: 0,
  total_offline: 0,
  users: [MOCK_WORKER_1, MOCK_WORKER_2, MOCK_WORKER_3],
  generated_at: new Date().toISOString(),
};

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  targetAreaId: AREA_1_ID,
  targetAreaName: 'Taman Bungkul',
  boundaries: MOCK_BOUNDARIES,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupLiveUsersLoaded(users: LiveUser[] = [MOCK_WORKER_1, MOCK_WORKER_2, MOCK_WORKER_3]) {
  mockUseLiveUsers.mockReturnValue({
    data: { ...MOCK_LIVE_USERS_RESPONSE, users },
    isLoading: false,
  } as ReturnType<typeof useLiveUsers>);
}

/** Select source area then check the given worker names */
async function selectWorkers(user: ReturnType<typeof userEvent.setup>, names: RegExp[]) {
  await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
  await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
  for (const name of names) {
    await user.click(screen.getByRole('checkbox', { name }));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BulkReassignModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupLiveUsersLoaded();
    mockUseReassignWorker.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useReassignWorker>);
  });

  describe('Rendering', () => {
    it('should render the dialog title with target area name', () => {
      render(<BulkReassignModal {...defaultProps} />);
      expect(
        screen.getByRole('heading', { name: /pindah massal ke taman bungkul/i })
      ).toBeInTheDocument();
    });

    it('should not render content when closed', () => {
      render(<BulkReassignModal {...defaultProps} open={false} />);
      expect(screen.queryByRole('heading', { name: /pindah massal/i })).not.toBeInTheDocument();
    });

    it('should render source area selector, reason and effective date inputs', () => {
      render(<BulkReassignModal {...defaultProps} />);
      expect(screen.getByLabelText(/area asal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/alasan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tanggal berlaku/i)).toBeInTheDocument();
    });
  });

  describe('Multi-select', () => {
    it('should render workers as unchecked checkboxes after selecting a source area', async () => {
      const user = userEvent.setup();
      render(<BulkReassignModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());

      const checkbox = screen.getByRole('checkbox', { name: /budi santoso/i });
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    it('should toggle individual worker selection', async () => {
      const user = userEvent.setup();
      render(<BulkReassignModal {...defaultProps} />);

      await selectWorkers(user, [/budi santoso/i]);
      expect(screen.getByRole('checkbox', { name: /budi santoso/i })).toHaveAttribute(
        'aria-checked',
        'true'
      );

      await user.click(screen.getByRole('checkbox', { name: /budi santoso/i }));
      expect(screen.getByRole('checkbox', { name: /budi santoso/i })).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('should select and deselect all workers with the select-all toggle', async () => {
      const user = userEvent.setup();
      render(<BulkReassignModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /pilih semua/i }));
      expect(screen.getByRole('checkbox', { name: /budi santoso/i })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByRole('checkbox', { name: /siti rahayu/i })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByRole('checkbox', { name: /joko widodo/i })).toHaveAttribute(
        'aria-checked',
        'true'
      );

      await user.click(screen.getByRole('button', { name: /batal pilih/i }));
      expect(screen.getByRole('checkbox', { name: /budi santoso/i })).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('should show selected count on the submit button', async () => {
      const user = userEvent.setup();
      render(<BulkReassignModal {...defaultProps} />);

      await selectWorkers(user, [/budi santoso/i, /siti rahayu/i]);
      expect(screen.getByRole('button', { name: /pindahkan 2 petugas/i })).toBeInTheDocument();
    });
  });

  describe('Submit', () => {
    it('should disable submit when no worker is selected', () => {
      render(<BulkReassignModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /pindahkan/i })).toBeDisabled();
    });

    it('should call mutateAsync once per selected worker with the shared payload', async () => {
      mockMutateAsync.mockResolvedValue({});
      const user = userEvent.setup();
      render(<BulkReassignModal {...defaultProps} />);

      await selectWorkers(user, [/budi santoso/i, /siti rahayu/i]);
      await user.type(screen.getByLabelText(/alasan/i), 'Kekurangan staf');
      await user.click(screen.getByRole('button', { name: /pindahkan 2 petugas/i }));

      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(2));
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          target_area_id: AREA_1_ID,
          reason: 'Kekurangan staf',
          end_current_schedule: true,
        })
      );
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-2', target_area_id: AREA_1_ID })
      );
    });

    it('should show success toast with count and close after all succeed', async () => {
      mockMutateAsync.mockResolvedValue({});
      const onOpenChange = jest.fn();
      const user = userEvent.setup();
      render(<BulkReassignModal {...defaultProps} onOpenChange={onOpenChange} />);

      await selectWorkers(user, [/budi santoso/i, /siti rahayu/i]);
      await user.click(screen.getByRole('button', { name: /pindahkan 2 petugas/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('2 petugas berhasil dipindahkan');
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should report partial failure, keep modal open and keep failed workers selected', async () => {
      mockMutateAsync
        .mockResolvedValueOnce({}) // user-1 ok
        .mockRejectedValueOnce(new Error('Server error')); // user-2 fails
      const onOpenChange = jest.fn();
      const user = userEvent.setup();
      render(<BulkReassignModal {...defaultProps} onOpenChange={onOpenChange} />);

      await selectWorkers(user, [/budi santoso/i, /siti rahayu/i]);
      await user.click(screen.getByRole('button', { name: /pindahkan 2 petugas/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('1 petugas berhasil dipindahkan, 1 gagal');
      });
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      // Failed worker stays selected for retry
      expect(screen.getByRole('checkbox', { name: /siti rahayu/i })).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('should show error toast and keep modal open when all fail', async () => {
      mockMutateAsync.mockRejectedValue(new Error('down'));
      const onOpenChange = jest.fn();
      const user = userEvent.setup();
      render(<BulkReassignModal {...defaultProps} onOpenChange={onOpenChange} />);

      await selectWorkers(user, [/budi santoso/i]);
      await user.click(screen.getByRole('button', { name: /pindahkan 1 petugas/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal memindahkan petugas');
      });
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  describe('Cancel', () => {
    it('should call onOpenChange(false) when Batal is clicked', async () => {
      const onOpenChange = jest.fn();
      const user = userEvent.setup();
      render(<BulkReassignModal {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: /^batal$/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
