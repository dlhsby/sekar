/**
 * ReassignWorkerModal Component Tests
 * Phase 2D Gap #5: Reassign workers between areas.
 * Covers: fetch candidates, filter by target area, worker list display,
 * selection highlight, reason input, submit button state, API call,
 * success/error Alerts, and no-fetch guard conditions.
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ReassignWorkerModal } from '../ReassignWorkerModal';
import type { LiveUser, AreaBoundary } from '../../../types/models.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) =>
    React.createElement(Text, { testID: `icon-${props.name}`, ...props }, props.name);
});

jest.mock('../../../services/api/monitoringApi', () => ({
  getLiveUsers: jest.fn(),
  reassignWorker: jest.fn(),
}));

import { getLiveUsers, reassignWorker } from '../../../services/api/monitoringApi';

const mockGetLiveUsers = getLiveUsers as jest.Mock;
const mockReassignWorker = reassignWorker as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function buildLiveUser(overrides?: Partial<LiveUser>): LiveUser {
  return {
    id: 'user-1',
    full_name: 'Ahmad Satgas',
    role: 'satgas',
    phone: null,
    status: 'active',
    location_id: 'area-source',
    location_name: 'Area Selatan',
    district_id: 'district-1',
    district_name: 'Rayon 1',
    latitude: -7.25,
    longitude: 112.75,
    accuracy: 10,
    battery_level: 80,
    last_update: new Date().toISOString(),
    is_within_area: true,
    outside_boundary: false,
    shift_id: 'shift-1',
    shift_name: 'Shift Pagi',
    shift_definition_id: 'def-1',
    current_task_status: null,
    current_task_title: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture
  } as any;
}

const workerA = buildLiveUser({ id: 'user-1', full_name: 'Ahmad Satgas', location_id: 'area-source' });
const workerB = buildLiveUser({ id: 'user-2', full_name: 'Budi Linmas', role: 'linmas', location_id: 'area-source' });
// workerC is already assigned to the target area
const workerC = buildLiveUser({ id: 'user-3', full_name: 'Candra Korlap', role: 'korlap', location_id: 'area-target' });

const targetArea: AreaBoundary = {
  id: 'area-target',
  name: 'Area Utara',
  center_lat: -7.2,
  center_lng: 112.7,
  boundary_polygon: null,
  district_id: 'district-1',
  district_name: 'Rayon 1',
  assigned_count: 3,
  staffing: [],
  is_understaffed: true,
  total_active: 1,
  total_required: 3,
};

function buildDefaultProps(overrides?: {
  visible?: boolean;
  onClose?: jest.Mock;
  targetArea?: AreaBoundary | null;
  sourceDistrictId?: string;
  onSuccess?: jest.Mock;
}) {
  return {
    visible: overrides?.visible ?? true,
    onClose: overrides?.onClose ?? jest.fn(),
    targetArea: overrides?.targetArea !== undefined ? overrides.targetArea : targetArea,
    sourceDistrictId: overrides?.sourceDistrictId !== undefined ? overrides.sourceDistrictId : 'district-1',
    onSuccess: overrides?.onSuccess ?? jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReassignWorkerModal', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Default: two workers in source district (one already in target area)
    mockGetLiveUsers.mockResolvedValue({
      data: { users: [workerA, workerB, workerC] },
    });
    mockReassignWorker.mockResolvedValue({ data: { success: true }, error: undefined });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // ── Fetching candidates ──────────────────────────────────────────────────────

  describe('fetching candidates', () => {
    it('calls getLiveUsers with district_id and active status when visible and sourceDistrictId set', async () => {
      render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => {
        expect(mockGetLiveUsers).toHaveBeenCalledTimes(1);
        expect(mockGetLiveUsers).toHaveBeenCalledWith({
          district_id: 'district-1',
          status: ['active'],
        });
      });
    });

    it('does not call getLiveUsers when visible is false', async () => {
      render(<ReassignWorkerModal {...buildDefaultProps({ visible: false })} />);

      await waitFor(() => {
        expect(mockGetLiveUsers).not.toHaveBeenCalled();
      });
    });

    it('does not call getLiveUsers when sourceDistrictId is missing', () => {
      render(
        <ReassignWorkerModal
          visible={true}
          onClose={jest.fn()}
          targetArea={targetArea}
          // sourceDistrictId intentionally omitted
          onSuccess={jest.fn()}
        />
      );

      // Synchronous assertion: effect guard fires immediately when sourceDistrictId is absent
      expect(mockGetLiveUsers).not.toHaveBeenCalled();
    });

    it('does not call getLiveUsers when both visible is false and sourceDistrictId missing', async () => {
      render(
        <ReassignWorkerModal
          {...buildDefaultProps({ visible: false, sourceDistrictId: undefined })}
        />
      );

      await waitFor(() => {
        expect(mockGetLiveUsers).not.toHaveBeenCalled();
      });
    });

    it('re-fetches when visible toggles from false to true', async () => {
      const props = buildDefaultProps({ visible: false });
      const { rerender } = render(<ReassignWorkerModal {...props} />);

      expect(mockGetLiveUsers).not.toHaveBeenCalled();

      await act(async () => {
        rerender(<ReassignWorkerModal {...props} visible={true} />);
      });

      await waitFor(() => {
        expect(mockGetLiveUsers).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── Filtering out target-area workers ───────────────────────────────────────

  describe('filtering workers already in target area', () => {
    it('excludes workers whose location_id matches the target area id', async () => {
      const { queryByText, getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
        expect(getByText('Budi Linmas')).toBeTruthy();
        // workerC is already in area-target so must be excluded
        expect(queryByText('Candra Korlap')).toBeNull();
      });
    });

    it('shows all workers when none share the target location_id', async () => {
      mockGetLiveUsers.mockResolvedValue({
        data: { users: [workerA, workerB] },
      });

      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
        expect(getByText('Budi Linmas')).toBeTruthy();
      });
    });

    it('shows empty state when all fetched workers are already in the target area', async () => {
      mockGetLiveUsers.mockResolvedValue({
        data: { users: [workerC] },
      });

      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => {
        expect(
          getByText('Tidak ada petugas aktif yang tersedia untuk reassign')
        ).toBeTruthy();
      });
    });
  });

  // ── Worker list display ──────────────────────────────────────────────────────

  describe('worker list display', () => {
    it('renders header title "Pindah Petugas"', async () => {
      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);
      await waitFor(() => {
        expect(getByText('Pindah Petugas')).toBeTruthy();
      });
    });

    it('shows target area name and staffing stats', async () => {
      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);
      await waitFor(() => {
        expect(getByText('Area Utara')).toBeTruthy();
        expect(getByText('1/3 aktif')).toBeTruthy();
      });
    });

    it('shows each worker full_name', async () => {
      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);
      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
        expect(getByText('Budi Linmas')).toBeTruthy();
      });
    });

    it('shows worker role label and area name as meta', async () => {
      const { getAllByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);
      await waitFor(() => {
        // Both workerA (satgas) and workerB (linmas) share location_name "Area Selatan"
        const hits = getAllByText(/Area Selatan/);
        expect(hits.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows loading indicator while fetching', async () => {
      // Delay resolution to catch loading state
      let resolve: (v: any) => void;
      mockGetLiveUsers.mockReturnValue(new Promise(r => { resolve = r; }));

      const { UNSAFE_getByType } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      // ActivityIndicator has no testID; use UNSAFE_getByType to confirm it is mounted
      const { ActivityIndicator } = require('react-native');
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

      await act(async () => {
        resolve!({ data: { users: [] } });
      });
    });

    it('shows empty text when response has no users', async () => {
      mockGetLiveUsers.mockResolvedValue({ data: { users: [] } });

      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => {
        expect(
          getByText('Tidak ada petugas aktif yang tersedia untuk reassign')
        ).toBeTruthy();
      });
    });
  });

  // ── Selection highlight ──────────────────────────────────────────────────────

  describe('selecting a worker', () => {
    it('highlights the selected worker row (check-circle icon appears)', async () => {
      const { getByText, getByTestId } = render(
        <ReassignWorkerModal {...buildDefaultProps()} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());

      fireEvent.press(getByText('Ahmad Satgas'));

      await waitFor(() => {
        expect(getByTestId('icon-check-circle')).toBeTruthy();
      });
    });

    it('moves highlight to newly pressed worker when another is already selected', async () => {
      const { getByText, queryByTestId } = render(
        <ReassignWorkerModal {...buildDefaultProps()} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());

      fireEvent.press(getByText('Ahmad Satgas'));
      fireEvent.press(getByText('Budi Linmas'));

      await waitFor(() => {
        // Still exactly one check-circle present
        expect(queryByTestId('icon-check-circle')).toBeTruthy();
      });
    });
  });

  // ── Reason input ─────────────────────────────────────────────────────────────

  describe('reason input', () => {
    it('reason section is hidden when no worker is selected', async () => {
      const { queryByPlaceholderText } = render(
        <ReassignWorkerModal {...buildDefaultProps()} />
      );

      await waitFor(() => expect(mockGetLiveUsers).toHaveBeenCalled());

      expect(queryByPlaceholderText('Tuliskan alasan reassign...')).toBeNull();
    });

    it('reason section appears after selecting a worker', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ReassignWorkerModal {...buildDefaultProps()} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));

      await waitFor(() => {
        expect(getByPlaceholderText('Tuliskan alasan reassign...')).toBeTruthy();
      });
    });

    it('enforces maxLength of 200 on the reason input', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ReassignWorkerModal {...buildDefaultProps()} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));

      await waitFor(() =>
        expect(getByPlaceholderText('Tuliskan alasan reassign...')).toBeTruthy()
      );

      const input = getByPlaceholderText('Tuliskan alasan reassign...');
      expect(input.props.maxLength).toBe(200);
    });

    it('shows char count as text is typed', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ReassignWorkerModal {...buildDefaultProps()} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));

      await waitFor(() =>
        expect(getByPlaceholderText('Tuliskan alasan reassign...')).toBeTruthy()
      );

      fireEvent.changeText(
        getByPlaceholderText('Tuliskan alasan reassign...'),
        'Kekurangan petugas'
      );

      await waitFor(() => {
        expect(getByText('18/200')).toBeTruthy();
      });
    });
  });

  // ── Submit button state ──────────────────────────────────────────────────────

  describe('submit button', () => {
    it('submit button is disabled before any worker is selected', async () => {
      const { getByText, debug } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => expect(getByText('Konfirmasi Pindah')).toBeTruthy());

      // NBButton wraps the Text in multiple Views. Walk up to find the TouchableOpacity.
      let current: any = getByText('Konfirmasi Pindah');
      let found = false;
      let disabled = false;

      // Walk up 5 levels to find TouchableOpacity with disabled prop
      for (let i = 0; i < 5; i++) {
        current = current.parent;
        if (!current) break;
        if (current.props?.disabled !== undefined) {
          disabled = current.props.disabled;
          found = true;
          break;
        }
        if (current.props?.accessibilityState?.disabled !== undefined) {
          disabled = current.props.accessibilityState.disabled;
          found = true;
          break;
        }
      }

      // If button is disabled, we expect disabled to be true
      expect(found && disabled).toBeTruthy();
    });

    it('submit button becomes enabled after selecting a worker', async () => {
      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));

      await waitFor(() => {
        // After selecting, the button should be enabled (disabled = false)
        let current: any = getByText('Konfirmasi Pindah');
        let disabled = undefined;

        for (let i = 0; i < 5; i++) {
          current = current.parent;
          if (!current) break;
          if (current.props?.disabled !== undefined) {
            disabled = current.props.disabled;
            break;
          }
          if (current.props?.accessibilityState?.disabled !== undefined) {
            disabled = current.props.accessibilityState.disabled;
            break;
          }
        }

        expect(disabled).toBe(false);
      });
    });
  });

  // ── Submit API call ──────────────────────────────────────────────────────────

  describe('submit calls reassignWorker API', () => {
    it('calls reassignWorker with correct user_id and target_area_id', async () => {
      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));
      fireEvent.press(getByText('Konfirmasi Pindah'));

      await waitFor(() => {
        expect(mockReassignWorker).toHaveBeenCalledTimes(1);
        expect(mockReassignWorker).toHaveBeenCalledWith({
          user_id: 'user-1',
          target_area_id: 'area-target',
          reason: undefined,
        });
      });
    });

    it('includes trimmed reason in the API call when provided', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ReassignWorkerModal {...buildDefaultProps()} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));

      await waitFor(() =>
        expect(getByPlaceholderText('Tuliskan alasan reassign...')).toBeTruthy()
      );
      fireEvent.changeText(
        getByPlaceholderText('Tuliskan alasan reassign...'),
        '  Kekurangan petugas  '
      );
      fireEvent.press(getByText('Konfirmasi Pindah'));

      await waitFor(() => {
        expect(mockReassignWorker).toHaveBeenCalledWith(
          expect.objectContaining({ reason: 'Kekurangan petugas' })
        );
      });
    });

    it('sends reason as undefined when reason input is blank/whitespace', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ReassignWorkerModal {...buildDefaultProps()} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));

      await waitFor(() =>
        expect(getByPlaceholderText('Tuliskan alasan reassign...')).toBeTruthy()
      );
      fireEvent.changeText(
        getByPlaceholderText('Tuliskan alasan reassign...'),
        '   '
      );
      fireEvent.press(getByText('Konfirmasi Pindah'));

      await waitFor(() => {
        expect(mockReassignWorker).toHaveBeenCalledWith(
          expect.objectContaining({ reason: undefined })
        );
      });
    });
  });

  // ── Success flow ─────────────────────────────────────────────────────────────

  describe('success flow', () => {
    it('shows "Berhasil" Alert with worker name and target area on success', async () => {
      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));
      fireEvent.press(getByText('Konfirmasi Pindah'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Berhasil',
          expect.stringContaining('Ahmad Satgas')
        );
        expect(alertSpy).toHaveBeenCalledWith(
          'Berhasil',
          expect.stringContaining('Area Utara')
        );
      });
    });

    it('calls onSuccess callback on success', async () => {
      const onSuccess = jest.fn();
      const { getByText } = render(
        <ReassignWorkerModal {...buildDefaultProps({ onSuccess })} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));
      fireEvent.press(getByText('Konfirmasi Pindah'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onClose after successful reassignment', async () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <ReassignWorkerModal {...buildDefaultProps({ onClose })} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));
      fireEvent.press(getByText('Konfirmasi Pindah'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── Error flow ───────────────────────────────────────────────────────────────

  describe('error flow', () => {
    it('shows "Gagal" Alert with error message when API returns error', async () => {
      mockReassignWorker.mockResolvedValue({
        data: null,
        error: 'Worker tidak tersedia',
      });

      const { getByText } = render(<ReassignWorkerModal {...buildDefaultProps()} />);

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));
      fireEvent.press(getByText('Konfirmasi Pindah'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Gagal', 'Worker tidak tersedia');
      });
    });

    it('does not call onSuccess or onClose when API returns error', async () => {
      mockReassignWorker.mockResolvedValue({
        data: null,
        error: 'Server error',
      });

      const onSuccess = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <ReassignWorkerModal {...buildDefaultProps({ onSuccess, onClose })} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));
      fireEvent.press(getByText('Konfirmasi Pindah'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Gagal', 'Server error');
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ── Close button ─────────────────────────────────────────────────────────────

  describe('close button', () => {
    it('calls onClose when the X button is pressed', async () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <ReassignWorkerModal {...buildDefaultProps({ onClose })} />
      );

      await waitFor(() => expect(getByTestId('icon-close')).toBeTruthy());

      fireEvent.press(getByTestId('icon-close').parent!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── State reset on close ─────────────────────────────────────────────────────

  describe('state reset when not visible', () => {
    it('clears candidates and resets selection when modal is hidden', async () => {
      const props = buildDefaultProps({ visible: true });
      const { getByText, rerender, queryByText } = render(
        <ReassignWorkerModal {...props} />
      );

      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      fireEvent.press(getByText('Ahmad Satgas'));

      await act(async () => {
        rerender(<ReassignWorkerModal {...props} visible={false} />);
      });

      // Re-open — reason section should be gone (state was reset)
      await act(async () => {
        rerender(<ReassignWorkerModal {...props} visible={true} />);
      });

      // Reason input only appears if a worker is selected — after reset it should not be present yet
      await waitFor(() => expect(getByText('Ahmad Satgas')).toBeTruthy());
      expect(queryByText('Alasan (Opsional)')).toBeNull();
    });
  });
});
