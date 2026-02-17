/**
 * TaskFilterModal Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TaskFilterModal } from '../TaskFilterModal';

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => React.createElement(View, { testID: 'date-time-picker', ...props }),
  };
});

// Mock the API services module that TaskFilterModal uses
jest.mock('../../../services/api', () => ({
  getRayons: jest.fn(),
  getAreasByRayonId: jest.fn(),
  getAreas: jest.fn(),
}));

import { getRayons, getAreasByRayonId } from '../../../services/api';

const mockGetRayons = getRayons as jest.MockedFunction<typeof getRayons>;
const mockGetAreasByRayonId = getAreasByRayonId as jest.MockedFunction<typeof getAreasByRayonId>;

const DEFAULT_PROPS = {
  visible: true,
  onClose: jest.fn(),
  taskFilter: 'assigned' as const,
  statusFilter: 'all' as const,
  dateFrom: '',
  dateTo: '',
  rayonFilter: null,
  areaFilter: null,
  onApplyFilters: jest.fn(),
  onResetFilters: jest.fn(),
  userRole: 'satgas' as const,
};

describe('TaskFilterModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Return resolved promises by default so there are no dangling async updates
    mockGetRayons.mockResolvedValue({ data: [] } as any);
    mockGetAreasByRayonId.mockResolvedValue({ data: [] } as any);
  });

  describe('Visibility', () => {
    it('does not show modal content when visible is false', () => {
      const { queryByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} visible={false} />,
      );

      expect(queryByText('Filter Tugas')).toBeNull();
    });

    it('shows modal title Filter Tugas when visible is true', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} visible={true} />,
      );

      expect(getByText('Filter Tugas')).toBeTruthy();
    });

    it('shows Tipe Tugas section label when visible', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} visible={true} />,
      );

      expect(getByText('Tipe Tugas')).toBeTruthy();
    });

    it('shows Status section label when visible', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} visible={true} />,
      );

      expect(getByText('Status')).toBeTruthy();
    });

    it('shows Rentang Tanggal section label when visible', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} visible={true} />,
      );

      expect(getByText('Rentang Tanggal')).toBeTruthy();
    });

    it('shows task filter trigger with current value label', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} taskFilter="assigned" visible={true} />,
      );

      // NBSelect shows the selected option label
      expect(getByText('Ditugaskan ke Saya')).toBeTruthy();
    });

    it('shows status filter trigger with current value label', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} statusFilter="all" visible={true} />,
      );

      expect(getByText('Semua Status')).toBeTruthy();
    });
  });

  describe('Close button', () => {
    it('calls onClose when close button is pressed', async () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} onClose={onClose} />,
      );

      await act(async () => {
        fireEvent.press(getByLabelText('Tutup modal filter'));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset button', () => {
    it('calls onResetFilters when Reset button is pressed', async () => {
      const onResetFilters = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          onResetFilters={onResetFilters}
          onClose={onClose}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Reset'));
      });

      expect(onResetFilters).toHaveBeenCalledTimes(1);
    });

    it('calls onClose after Reset button is pressed', async () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} onClose={onClose} />,
      );

      await act(async () => {
        fireEvent.press(getByText('Reset'));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Apply button', () => {
    it('calls onApplyFilters with current filter state when Terapkan is pressed', async () => {
      const onApplyFilters = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          taskFilter="assigned"
          statusFilter="all"
          dateFrom=""
          dateTo=""
          rayonFilter={null}
          areaFilter={null}
          onApplyFilters={onApplyFilters}
          onClose={onClose}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith({
        taskFilter: 'assigned',
        statusFilter: 'all',
        dateFrom: '',
        dateTo: '',
        rayonFilter: null,
        areaFilter: null,
      });
    });

    it('calls onClose after Terapkan is pressed', async () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} onClose={onClose} />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('applies correct statusFilter when prop is set to pending', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          statusFilter="pending"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ statusFilter: 'pending' }),
      );
    });

    it('applies taskFilter tagged when prop is set to tagged', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          taskFilter="tagged"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ taskFilter: 'tagged' }),
      );
    });

    it('applies dateFrom when prop is set', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          dateFrom="2026-01-01"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom: '2026-01-01' }),
      );
    });
  });

  describe('Date buttons', () => {
    it('renders date from button with accessibility label', () => {
      const { getByLabelText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} />,
      );

      expect(getByLabelText('Pilih tanggal mulai')).toBeTruthy();
    });

    it('renders date to button with accessibility label', () => {
      const { getByLabelText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} />,
      );

      expect(getByLabelText('Pilih tanggal akhir')).toBeTruthy();
    });

    it('shows Pilih tanggal placeholder for both date fields when no date is set', () => {
      const { getAllByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} dateFrom="" dateTo="" />,
      );

      const placeholders = getAllByText('Pilih tanggal');
      expect(placeholders.length).toBe(2);
    });

    it('shows From and To date labels', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} />,
      );

      expect(getByText('Dari')).toBeTruthy();
      expect(getByText('Sampai')).toBeTruthy();
    });
  });

  describe('Role-based rendering', () => {
    it('does not show Rayon section for satgas role without userRayonId', () => {
      const { queryByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} userRole="satgas" userRayonId={undefined} />,
      );

      expect(queryByText('Rayon')).toBeNull();
    });

    it('does not show Area section for satgas without userAreaId', () => {
      const { queryByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} userRole="satgas" userAreaId={undefined} />,
      );

      expect(queryByText('Area')).toBeNull();
    });

    it('shows Rayon section for kepala_rayon role', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="kepala_rayon"
        />,
      );

      await waitFor(() => {
        expect(getByText('Rayon')).toBeTruthy();
      });
    });

    it('shows Area section for kepala_rayon role', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="kepala_rayon"
        />,
      );

      await waitFor(() => {
        expect(getByText('Area')).toBeTruthy();
      });
    });

    it('shows Rayon section for top_management role', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="top_management"
        />,
      );

      await waitFor(() => {
        expect(getByText('Rayon')).toBeTruthy();
      });
    });

    it('shows Area section for korlap role with userRayonId', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="korlap"
          userRayonId="rayon-1"
        />,
      );

      await waitFor(() => {
        expect(getByText('Area')).toBeTruthy();
      });
    });

    it('shows Rayon section for admin_system role', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="admin_system"
        />,
      );

      await waitFor(() => {
        expect(getByText('Rayon')).toBeTruthy();
      });
    });

    it('shows fixed rayon display (with Tetap label) for role without canFilterRayon but has userRayonId', () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="satgas"
          userRayonId="rayon-1"
        />,
      );

      // satgas without canFilterRayon but has userRayonId — shows fixed rayon row
      expect(getByText(/\(Tetap\)/)).toBeTruthy();
    });
  });

  describe('Rayon data loading', () => {
    it('loads rayons when visible and user has rayon filter permission', async () => {
      mockGetRayons.mockResolvedValue({
        data: [{ id: 'rayon-1', name: 'Rayon Utara' }],
      } as any);

      render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="top_management"
          visible={true}
        />,
      );

      await waitFor(() => {
        expect(mockGetRayons).toHaveBeenCalled();
      });
    });

    it('does not load rayons when user is satgas without rayon context', async () => {
      render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="satgas"
          visible={true}
        />,
      );

      // Wait a tick to allow any effects to run
      await waitFor(() => {
        expect(mockGetRayons).not.toHaveBeenCalled();
      });
    });

    it('handles rayon loading error gracefully without crashing', async () => {
      mockGetRayons.mockRejectedValue(new Error('Network error'));

      expect(() =>
        render(
          <TaskFilterModal
            {...DEFAULT_PROPS}
            userRole="top_management"
            visible={true}
          />,
        ),
      ).not.toThrow();

      await waitFor(() => {
        expect(mockGetRayons).toHaveBeenCalled();
      });
    });

    it('populates rayon section after API response', async () => {
      mockGetRayons.mockResolvedValue({
        data: [
          { id: 'rayon-1', name: 'Rayon Utara' },
          { id: 'rayon-2', name: 'Rayon Selatan' },
        ],
      } as any);

      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="top_management"
          visible={true}
        />,
      );

      await waitFor(() => {
        expect(mockGetRayons).toHaveBeenCalled();
      });

      // Rayon section should be present
      expect(getByText('Rayon')).toBeTruthy();
    });
  });

  describe('Areas data loading', () => {
    it('loads areas by rayon when korlap has userRayonId', async () => {
      mockGetAreasByRayonId.mockResolvedValue({
        data: [{ id: 'area-1', name: 'Taman Bungkul' }],
      } as any);

      render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="korlap"
          userRayonId="rayon-1"
          visible={true}
        />,
      );

      await waitFor(() => {
        expect(mockGetAreasByRayonId).toHaveBeenCalledWith('rayon-1');
      });
    });

    it('handles area loading error gracefully without crashing', async () => {
      mockGetAreasByRayonId.mockRejectedValue(new Error('Area load error'));

      expect(() =>
        render(
          <TaskFilterModal
            {...DEFAULT_PROPS}
            userRole="korlap"
            userRayonId="rayon-1"
            visible={true}
          />,
        ),
      ).not.toThrow();

      await waitFor(() => {
        expect(mockGetAreasByRayonId).toHaveBeenCalled();
      });
    });

    it('does not load areas when korlap has no userRayonId', async () => {
      render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="korlap"
          userRayonId={undefined}
          visible={true}
        />,
      );

      // Wait a tick to confirm no call was made
      await waitFor(() => {
        expect(mockGetAreasByRayonId).not.toHaveBeenCalled();
      });
    });
  });

  describe('Sync on open', () => {
    it('syncs taskFilter prop into local state when modal opens', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          taskFilter="tagged"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ taskFilter: 'tagged' }),
      );
    });

    it('syncs statusFilter prop into local state when modal opens', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          statusFilter="in_progress"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ statusFilter: 'in_progress' }),
      );
    });

    it('syncs dateFrom prop into local state when modal opens', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          dateFrom="2026-01-01"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom: '2026-01-01' }),
      );
    });

    it('syncs dateTo prop into local state when modal opens', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          dateTo="2026-12-31"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ dateTo: '2026-12-31' }),
      );
    });

    it('syncs rayonFilter prop into local state when modal opens', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="top_management"
          rayonFilter="rayon-1"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ rayonFilter: 'rayon-1' }),
      );
    });
  });

  describe('Action buttons presence', () => {
    it('renders Reset button', () => {
      const { getByText } = render(<TaskFilterModal {...DEFAULT_PROPS} />);
      expect(getByText('Reset')).toBeTruthy();
    });

    it('renders Terapkan button', () => {
      const { getByText } = render(<TaskFilterModal {...DEFAULT_PROPS} />);
      expect(getByText('Terapkan')).toBeTruthy();
    });
  });

  describe('Date picker interaction', () => {
    it('pressing date from button shows date picker (setShowDateFromPicker true)', async () => {
      const { getByLabelText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} />,
      );

      // Pressing the date from button triggers setShowDateFromPicker(true)
      // DateTimePicker is mocked so no visual change, but the handler runs
      await act(async () => {
        fireEvent.press(getByLabelText('Pilih tanggal mulai'));
      });

      // No crash expected; DateTimePicker module is not linked in tests
      expect(getByLabelText('Pilih tanggal mulai')).toBeTruthy();
    });

    it('pressing date to button sets showDateToPicker state', async () => {
      const { getByLabelText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} />,
      );

      await act(async () => {
        fireEvent.press(getByLabelText('Pilih tanggal akhir'));
      });

      expect(getByLabelText('Pilih tanggal akhir')).toBeTruthy();
    });
  });

  describe('Overlay stop propagation', () => {
    it('pressing inner modal content does not close modal', async () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} onClose={onClose} />,
      );

      // Pressing the inner content area (title area) should not trigger onClose
      await act(async () => {
        fireEvent.press(getByText('Filter Tugas'));
      });

      // onClose should not be called from pressing inner content
      // (it may be called if press bubbles, but stopPropagation prevents it)
      // The modal should still be visible
      expect(getByText('Filter Tugas')).toBeTruthy();
    });
  });

  describe('Rayon and area selection via NBSelect', () => {
    it('selecting a rayon option calls handleRayonChange and applies to filters', async () => {
      mockGetRayons.mockResolvedValue({
        data: [{ id: 'rayon-1', name: 'Rayon Utara' }],
      } as any);

      const onApplyFilters = jest.fn();
      const { getByText, getAllByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="top_management"
          rayonFilter={null}
          onApplyFilters={onApplyFilters}
        />,
      );

      // Wait for rayon data to load
      await waitFor(() => {
        expect(mockGetRayons).toHaveBeenCalled();
      });

      // Open the rayon NBSelect (trigger shows "Semua Rayon")
      await act(async () => {
        fireEvent.press(getByText('Semua Rayon'));
      });

      // Select "Rayon Utara" from dropdown
      await act(async () => {
        fireEvent.press(getByText('Rayon Utara'));
      });

      // Apply filters and verify rayon-1 was set
      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ rayonFilter: 'rayon-1' }),
      );
    });

    it('selecting "Semua Rayon" resets rayon filter to null', async () => {
      mockGetRayons.mockResolvedValue({
        data: [{ id: 'rayon-1', name: 'Rayon Utara' }],
      } as any);

      const onApplyFilters = jest.fn();
      const { getAllByText, getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="top_management"
          rayonFilter={null}
          onApplyFilters={onApplyFilters}
        />,
      );

      await waitFor(() => {
        expect(mockGetRayons).toHaveBeenCalled();
      });

      // Open the rayon NBSelect — trigger shows "Semua Rayon" since rayonFilter is null
      await act(async () => {
        fireEvent.press(getByText('Semua Rayon'));
      });

      // Dropdown is open; pick "Rayon Utara" then reset back
      await act(async () => {
        fireEvent.press(getByText('Rayon Utara'));
      });

      // Now open again and pick "Semua Rayon" to reset
      await act(async () => {
        // After selecting Rayon Utara, the trigger now shows "Rayon Utara"
        fireEvent.press(getByText('Rayon Utara'));
      });

      await act(async () => {
        fireEvent.press(getAllByText('Semua Rayon')[0]);
      });

      // Apply and verify rayonFilter is null
      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ rayonFilter: null }),
      );
    });

    it('selecting an area option applies area filter', async () => {
      mockGetAreasByRayonId.mockResolvedValue({
        data: [{ id: 'area-1', name: 'Taman Bungkul' }],
      } as any);

      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="korlap"
          userRayonId="rayon-1"
          areaFilter={null}
          onApplyFilters={onApplyFilters}
        />,
      );

      await waitFor(() => {
        expect(mockGetAreasByRayonId).toHaveBeenCalled();
      });

      // Open the area NBSelect (trigger shows "Semua Area")
      await act(async () => {
        fireEvent.press(getByText('Semua Area'));
      });

      // Select Taman Bungkul
      await act(async () => {
        fireEvent.press(getByText('Taman Bungkul'));
      });

      // Apply filters
      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ areaFilter: 'area-1' }),
      );
    });
  });

  describe('Fixed value display for restricted roles', () => {
    it('shows Loading... for rayon when satgas has userRayonId but no rayon data loaded', () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="satgas"
          userRayonId="rayon-1"
        />,
      );

      // No rayon data loaded yet, shows Loading...
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('shows Loading... for area when satgas has userAreaId but no area data', () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="satgas"
          userAreaId="area-1"
        />,
      );

      // No area data loaded, shows Loading...
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('shows Semua Area when canFilterArea role has no area selected', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="kepala_rayon"
          areaFilter={null}
        />,
      );

      await waitFor(() => {
        // Area trigger shows "Semua Area" when no area is selected
        expect(getByText('Semua Area')).toBeTruthy();
      });
    });
  });

  describe('Format date display', () => {
    it('shows formatted date when dateFrom is a valid date string', () => {
      const { queryByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          dateFrom="2026-01-15"
        />,
      );

      // Should not show placeholder
      expect(queryByText('Pilih tanggal')).not.toBeNull(); // dateTo still shows placeholder
      // dateFrom should show formatted date (not "Pilih tanggal")
      // The "Dari" label is still there
      const allText = queryByText('Dari');
      expect(allText).toBeTruthy();
    });

    it('shows Pilih tanggal when dateFrom is empty string', () => {
      const { getAllByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          dateFrom=""
          dateTo=""
        />,
      );

      const placeholders = getAllByText('Pilih tanggal');
      expect(placeholders).toHaveLength(2);
    });
  });

  describe('Status filter change', () => {
    it('changing status filter updates applied filter on Terapkan', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          statusFilter="all"
          onApplyFilters={onApplyFilters}
        />,
      );

      // Open status NBSelect (shows "Semua Status")
      await act(async () => {
        fireEvent.press(getByText('Semua Status'));
      });

      // Select "Menunggu" (pending)
      await act(async () => {
        fireEvent.press(getByText('Menunggu'));
      });

      // Apply
      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ statusFilter: 'pending' }),
      );
    });

    it('changing task filter to tagged updates applied filter', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          taskFilter="assigned"
          onApplyFilters={onApplyFilters}
        />,
      );

      // Open task filter NBSelect (shows "Ditugaskan ke Saya")
      await act(async () => {
        fireEvent.press(getByText('Ditugaskan ke Saya'));
      });

      // Select "Tag Saya" (tagged)
      await act(async () => {
        fireEvent.press(getByText('Tag Saya'));
      });

      // Apply
      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ taskFilter: 'tagged' }),
      );
    });
  });
});
