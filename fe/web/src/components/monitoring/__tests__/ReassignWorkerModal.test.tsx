/**
 * Unit Tests: ReassignWorkerModal Component
 * Tests modal open/close behavior, source area selector, worker list rendering,
 * submit button state, successful submission, error handling, and reason input.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReassignWorkerModal } from '../ReassignWorkerModal';
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

// Import after mocking so we can spy on individual functions
import { useLiveUsers, useReassignWorker } from '@/lib/api/monitoring';
import { toast } from 'sonner';

const mockUseLiveUsers = useLiveUsers as jest.MockedFunction<typeof useLiveUsers>;
const mockUseReassignWorker = useReassignWorker as jest.MockedFunction<typeof useReassignWorker>;

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const AREA_1_ID = 'area-1';
const AREA_2_ID = 'area-2';
const AREA_3_ID = 'area-3';
const RAYON_1_ID = 'rayon-1';
const RAYON_2_ID = 'rayon-2';

const MOCK_BOUNDARIES: BoundariesResponse = {
  generated_at: new Date().toISOString(),
  rayons: [
    {
      id: RAYON_1_ID,
      name: 'Rayon Selatan',
      code: 'RS',
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
          is_understaffed: false,
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
          is_understaffed: true,
          staffing_summary: [],
        },
      ],
    },
    {
      id: RAYON_2_ID,
      name: 'Rayon Utara',
      code: 'RU',
      boundary_polygon: null,
      center_lat: -7.1,
      center_lng: 112.6,
      area_count: 1,
      is_understaffed: false,
      understaffed_area_count: 0,
      areas: [
        {
          id: AREA_3_ID,
          name: 'Taman Apsari',
          boundary_polygon: null,
          center_lat: -7.2,
          center_lng: 112.74,
          rayon_id: RAYON_2_ID,
          rayon_name: 'Rayon Utara',
          radius_meters: 80,
          assigned_count: 1,
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
  area_id: AREA_2_ID,
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
  role: 'korlap',
  status: 'inactive',
};

const MOCK_LIVE_USERS_RESPONSE: LiveUsersResponse = {
  total_active: 1,
  total_inactive: 1,
  total_outside_area: 0,
  total_missing: 0,
  total_offline: 0,
  users: [MOCK_WORKER_1, MOCK_WORKER_2],
  generated_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Default props
// ---------------------------------------------------------------------------

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  targetAreaId: AREA_1_ID,
  targetAreaName: 'Taman Bungkul',
  boundaries: MOCK_BOUNDARIES,
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function setupLiveUsersIdle() {
  mockUseLiveUsers.mockReturnValue({
    data: undefined,
    isLoading: false,
  } as ReturnType<typeof useLiveUsers>);
}

function setupLiveUsersLoading() {
  mockUseLiveUsers.mockReturnValue({
    data: undefined,
    isLoading: true,
  } as ReturnType<typeof useLiveUsers>);
}

function setupLiveUsersLoaded(users: LiveUser[] = [MOCK_WORKER_1, MOCK_WORKER_2]) {
  mockUseLiveUsers.mockReturnValue({
    data: { ...MOCK_LIVE_USERS_RESPONSE, users },
    isLoading: false,
  } as ReturnType<typeof useLiveUsers>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReassignWorkerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupLiveUsersIdle();
    mockUseReassignWorker.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useReassignWorker>);
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  describe('Rendering when open', () => {
    it('should render the dialog title when open is true', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(
        screen.getByRole('heading', { name: /pindah petugas ke taman bungkul/i })
      ).toBeInTheDocument();
    });

    it('should render the dialog description', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(
        screen.getByText(/pilih petugas dari area lain untuk dipindahkan/i)
      ).toBeInTheDocument();
    });

    it('should render the source area selector', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(screen.getByLabelText(/area asal/i)).toBeInTheDocument();
    });

    it('should render the reason textarea', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(screen.getByLabelText(/alasan/i)).toBeInTheDocument();
    });

    it('should render the effective date input', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(screen.getByLabelText(/tanggal berlaku/i)).toBeInTheDocument();
    });

    it('should render the Batal and Pindahkan buttons', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /batal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pindahkan/i })).toBeInTheDocument();
    });
  });

  describe('Rendering when closed', () => {
    it('should not render modal content when open is false', () => {
      render(<ReassignWorkerModal {...defaultProps} open={false} />);
      expect(
        screen.queryByRole('heading', { name: /pindah petugas/i })
      ).not.toBeInTheDocument();
    });

    it('should not render the reason textarea when open is false', () => {
      render(<ReassignWorkerModal {...defaultProps} open={false} />);
      expect(screen.queryByLabelText(/alasan/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Source area selector
  // -------------------------------------------------------------------------

  describe('Source area selector', () => {
    it('should show sibling areas from the same rayon as options', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      const select = screen.getByLabelText(/area asal/i);
      // Taman Flora is the sibling area in Rayon Selatan (target is Taman Bungkul)
      expect(select).toContainElement(screen.getByRole('option', { name: /taman flora/i }));
    });

    it('should not show the target area as a source option', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(
        screen.queryByRole('option', { name: /taman bungkul/i })
      ).not.toBeInTheDocument();
    });

    it('should not show areas from a different rayon', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(
        screen.queryByRole('option', { name: /taman apsari/i })
      ).not.toBeInTheDocument();
    });

    it('should show a "no sibling areas" message when boundaries are undefined', () => {
      render(<ReassignWorkerModal {...defaultProps} boundaries={undefined} />);
      expect(
        screen.getByText(/tidak ada area lain dalam rayon yang sama/i)
      ).toBeInTheDocument();
    });

    it('should show a "no sibling areas" message when target area is the only area in its rayon', () => {
      const singleAreaBoundaries: BoundariesResponse = {
        generated_at: new Date().toISOString(),
        rayons: [
          {
            ...MOCK_BOUNDARIES.rayons[0],
            areas: [MOCK_BOUNDARIES.rayons[0].areas[0]], // only target area
          },
        ],
      };
      render(
        <ReassignWorkerModal
          {...defaultProps}
          boundaries={singleAreaBoundaries}
        />
      );
      expect(
        screen.getByText(/tidak ada area lain dalam rayon yang sama/i)
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Worker list
  // -------------------------------------------------------------------------

  describe('Worker list', () => {
    it('should not show the worker list section before a source area is selected', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      // The "Pilih Petugas" heading inside the worker list section (with Users icon)
      // should not appear until a source area is chosen.
      // We use a more targeted check: the <ul> list of workers should be absent.
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('should show loading skeletons while workers are being fetched', async () => {
      setupLiveUsersLoading();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      // Select a source area first — skeletons only appear after a selection
      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);

      // Radix Dialog renders into a portal outside the test container, so query
      // the full document body for the skeleton elements.
      await waitFor(() => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it('should render worker names after a source area is selected', async () => {
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);

      await waitFor(() => {
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
        expect(screen.getByText('Siti Rahayu')).toBeInTheDocument();
      });
    });

    it('should show an empty message when source area has no workers', async () => {
      setupLiveUsersLoaded([]);
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);

      await waitFor(() => {
        expect(
          screen.getByText(/tidak ada petugas aktif di area ini/i)
        ).toBeInTheDocument();
      });
    });

    it('should mark a worker button as pressed when selected', async () => {
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());

      const workerButton = screen.getByRole('button', { name: /budi santoso/i });
      expect(workerButton).toHaveAttribute('aria-pressed', 'false');

      await user.click(workerButton);
      expect(workerButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should reset worker selection when source area is changed', async () => {
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /budi santoso/i }));
      expect(
        screen.getByRole('button', { name: /budi santoso/i })
      ).toHaveAttribute('aria-pressed', 'true');

      // Change source area
      await user.selectOptions(screen.getByLabelText(/area asal/i), '');

      // Worker list should disappear (no source area selected)
      await waitFor(() =>
        expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument()
      );
    });
  });

  // -------------------------------------------------------------------------
  // Submit button state
  // -------------------------------------------------------------------------

  describe('Submit button disabled state', () => {
    it('should disable the Pindahkan button when no worker is selected', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /pindahkan/i })).toBeDisabled();
    });

    it('should enable the Pindahkan button after a worker is selected', async () => {
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /budi santoso/i }));

      expect(screen.getByRole('button', { name: /pindahkan/i })).toBeEnabled();
    });

    it('should disable the Pindahkan button while mutation is pending', () => {
      mockUseReassignWorker.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      } as unknown as ReturnType<typeof useReassignWorker>);

      render(<ReassignWorkerModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /pindahkan/i })).toBeDisabled();
    });

    it('should disable the Batal button while mutation is pending', () => {
      mockUseReassignWorker.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      } as unknown as ReturnType<typeof useReassignWorker>);

      render(<ReassignWorkerModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /batal/i })).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful submission
  // -------------------------------------------------------------------------

  describe('Successful submission', () => {
    it('should call mutateAsync with correct payload on submit', async () => {
      mockMutateAsync.mockResolvedValue({});
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /budi santoso/i }));
      await user.click(screen.getByRole('button', { name: /pindahkan/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-1',
            target_area_id: AREA_1_ID,
            end_current_schedule: true,
          })
        );
      });
    });

    it('should include the reason in the payload when entered', async () => {
      mockMutateAsync.mockResolvedValue({});
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /budi santoso/i }));
      await user.type(screen.getByLabelText(/alasan/i), 'Kebutuhan mendesak');
      await user.click(screen.getByRole('button', { name: /pindahkan/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ reason: 'Kebutuhan mendesak' })
        );
      });
    });

    it('should show success toast after successful submission', async () => {
      mockMutateAsync.mockResolvedValue({});
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /budi santoso/i }));
      await user.click(screen.getByRole('button', { name: /pindahkan/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Petugas berhasil dipindahkan');
      });
    });

    it('should call onOpenChange(false) to close the modal after successful submission', async () => {
      mockMutateAsync.mockResolvedValue({});
      setupLiveUsersLoaded();
      const onOpenChange = jest.fn();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} onOpenChange={onOpenChange} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /budi santoso/i }));
      await user.click(screen.getByRole('button', { name: /pindahkan/i }));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('Error handling', () => {
    it('should show error toast with the error message when submission fails', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Server error'));
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /budi santoso/i }));
      await user.click(screen.getByRole('button', { name: /pindahkan/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server error');
      });
    });

    it('should show a fallback error message when the thrown value is not an Error instance', async () => {
      mockMutateAsync.mockRejectedValue('unknown error');
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /budi santoso/i }));
      await user.click(screen.getByRole('button', { name: /pindahkan/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal memindahkan petugas');
      });
    });

    it('should not call onOpenChange when submission fails', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Network failure'));
      setupLiveUsersLoaded();
      const onOpenChange = jest.fn();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} onOpenChange={onOpenChange} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /budi santoso/i }));
      await user.click(screen.getByRole('button', { name: /pindahkan/i }));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  // -------------------------------------------------------------------------
  // Reason text input
  // -------------------------------------------------------------------------

  describe('Reason text input', () => {
    it('should update the reason textarea value as the user types', async () => {
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      const textarea = screen.getByLabelText(/alasan/i);
      await user.type(textarea, 'Kekurangan petugas');

      expect(textarea).toHaveValue('Kekurangan petugas');
    });

    it('should render the placeholder text in the reason textarea', () => {
      render(<ReassignWorkerModal {...defaultProps} />);
      expect(
        screen.getByPlaceholderText(/tuliskan alasan pemindahan/i)
      ).toBeInTheDocument();
    });

    it('should omit reason from payload when textarea is left empty', async () => {
      mockMutateAsync.mockResolvedValue({});
      setupLiveUsersLoaded();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/area asal/i), AREA_2_ID);
      await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /budi santoso/i }));
      await user.click(screen.getByRole('button', { name: /pindahkan/i }));

      await waitFor(() => {
        const call = mockMutateAsync.mock.calls[0][0];
        expect(call.reason).toBeUndefined();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Cancel button
  // -------------------------------------------------------------------------

  describe('Cancel (Batal) button', () => {
    it('should call onOpenChange(false) when Batal is clicked', async () => {
      const onOpenChange = jest.fn();
      const user = userEvent.setup();
      render(<ReassignWorkerModal {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: /batal/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
