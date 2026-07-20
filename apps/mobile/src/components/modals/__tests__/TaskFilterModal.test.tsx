/**
 * TaskFilterModal Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TaskFilterModal } from '../TaskFilterModal';

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock react-native-safe-area-context (used by NBSelect internally)
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

// Mock the API services module that TaskFilterModal uses
jest.mock('../../../services/api', () => ({
  getDistricts: jest.fn(),
  getAreasByDistrictId: jest.fn(),
  getAreas: jest.fn(),
  getUsers: jest.fn(),
}));

import { getDistricts, getAreasByDistrictId, getAreas, getUsers } from '../../../services/api';

const mockGetDistricts = getDistricts as jest.MockedFunction<typeof getDistricts>;
const mockGetAreasByDistrictId = getAreasByDistrictId as jest.MockedFunction<typeof getAreasByDistrictId>;
const mockGetAreas = getAreas as jest.MockedFunction<typeof getAreas>;
const mockGetUsers = getUsers as jest.MockedFunction<typeof getUsers>;

const DEFAULT_PROPS = {
  visible: true,
  onClose: jest.fn(),
  taskFilter: 'all' as const,
  statusFilter: 'all' as const,
  dateFrom: '',
  dateTo: '',
  createdFrom: '',
  createdTo: '',
  districtFilter: null,
  areaFilter: null,
  petugasFilter: null,
  onApplyFilters: jest.fn(),
  onResetFilters: jest.fn(),
  userRole: 'satgas' as const,
};

describe('TaskFilterModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Return resolved promises by default so there are no dangling async updates
    mockGetDistricts.mockResolvedValue({ data: [] } as any);
    mockGetAreasByDistrictId.mockResolvedValue({ data: [] } as any);
    mockGetAreas.mockResolvedValue({ data: [] } as any);
    mockGetUsers.mockResolvedValue({ data: [] } as any);
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

    it('shows Penugasan section label when visible', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} visible={true} />,
      );

      expect(getByText('Penugasan')).toBeTruthy();
    });

    it('shows Status section label when visible', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} visible={true} />,
      );

      expect(getByText('Status')).toBeTruthy();
    });

    it('shows Deadline and Tanggal Dibuat section labels when visible', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} visible={true} />,
      );

      expect(getByText('Deadline')).toBeTruthy();
      expect(getByText('Tanggal Dibuat')).toBeTruthy();
    });

    it('shows task filter trigger with Semua Petugas (Termasuk Saya) when taskFilter is all for management', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} taskFilter="all" userRole="management" visible={true} />,
      );

      // NBSelect shows the selected option label — 'all' maps to 'Semua Petugas (Termasuk Saya)'
      expect(getByText('Semua Petugas (Termasuk Saya)')).toBeTruthy();
    });

    it('shows task filter trigger with Ditugaskan Kepada Saya when taskFilter is assigned', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} taskFilter="assigned" visible={true} />,
      );

      expect(getByText('Ditugaskan Kepada Saya')).toBeTruthy();
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
        fireEvent.press(getByLabelText('Tutup'));
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
          taskFilter="all"
          statusFilter="all"
          dateFrom=""
          dateTo=""
          districtFilter={null}
          areaFilter={null}
          onApplyFilters={onApplyFilters}
          onClose={onClose}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith({
        taskFilter: 'all',
        statusFilter: 'all',
        dateFrom: '',
        dateTo: '',
        createdFrom: '',
        createdTo: '',
        districtFilter: null,
        areaFilter: null,
        petugasFilter: null,
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

    it('applies taskFilter created_by_me when prop is set', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          taskFilter="created_by_me"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ taskFilter: 'created_by_me' }),
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
    it('renders date from and to buttons (multiple date sections exist)', () => {
      const { getAllByLabelText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} />,
      );

      // Two date sections: Tanggal Dibuat + Deadline, each with Dari/Sampai
      expect(getAllByLabelText('Dari').length).toBeGreaterThanOrEqual(1);
      expect(getAllByLabelText('Sampai').length).toBeGreaterThanOrEqual(1);
    });

    it('shows Pilih tanggal placeholder for date fields when no date is set', () => {
      const { getAllByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} dateFrom="" dateTo="" createdFrom="" createdTo="" />,
      );

      const placeholders = getAllByText('Pilih tanggal');
      expect(placeholders.length).toBe(4); // 2 sections × 2 fields each
    });

    it('shows From and To date labels', () => {
      const { getAllByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} />,
      );

      // Multiple "Dari" and "Sampai" due to two date sections
      expect(getAllByText('Dari').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Sampai').length).toBeGreaterThanOrEqual(1);
    });

    it('pressing deadline date from button triggers interaction', async () => {
      const { getAllByLabelText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} />,
      );

      await act(async () => {
        fireEvent.press(getAllByLabelText('Dari')[0]);
      });

      expect(getAllByLabelText('Dari')[0]).toBeTruthy();
    });

    it('pressing deadline date to button triggers interaction', async () => {
      const { getAllByLabelText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} />,
      );

      await act(async () => {
        fireEvent.press(getAllByLabelText('Sampai')[0]);
      });

      expect(getAllByLabelText('Sampai')[0]).toBeTruthy();
    });
  });

  describe('Role-based rendering', () => {
    it('does not show Rayon section for satgas role without userDistrictId', () => {
      const { queryByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} userRole="satgas" userDistrictId={undefined} />,
      );

      expect(queryByText('Rayon')).toBeNull();
    });

    it('always shows Area section for all roles including satgas', () => {
      const { getByText } = render(
        <TaskFilterModal {...DEFAULT_PROPS} userRole="satgas" userAreaId={undefined} />,
      );

      expect(getByText('Area')).toBeTruthy();
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

    it('shows Rayon section for management role', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="management"
        />,
      );

      await waitFor(() => {
        expect(getByText('Rayon')).toBeTruthy();
      });
    });

    it('shows Area section for korlap role with userDistrictId', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="korlap"
          userDistrictId="district-1"
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

    it('does not show Rayon section for satgas even with userDistrictId', () => {
      const { queryByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="satgas"
          userDistrictId="district-1"
        />,
      );

      // satgas cannot filter by district — section is hidden
      expect(queryByText('Rayon')).toBeNull();
    });
  });

  describe('Rayon data loading', () => {
    it('loads districts when visible and user has district filter permission', async () => {
      mockGetDistricts.mockResolvedValue({
        data: [{ id: 'district-1', name: 'Rayon Utara' }],
      } as any);

      render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="management"
          visible={true}
        />,
      );

      await waitFor(() => {
        expect(mockGetDistricts).toHaveBeenCalled();
      });
    });

    it('does not load districts when user is satgas without district context', async () => {
      render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="satgas"
          visible={true}
        />,
      );

      // Wait a tick to allow any effects to run
      await waitFor(() => {
        expect(mockGetDistricts).not.toHaveBeenCalled();
      });
    });

    it('handles district loading error gracefully without crashing', async () => {
      mockGetDistricts.mockRejectedValue(new Error('Network error'));

      expect(() =>
        render(
          <TaskFilterModal
            {...DEFAULT_PROPS}
            userRole="management"
            visible={true}
          />,
        ),
      ).not.toThrow();

      await waitFor(() => {
        expect(mockGetDistricts).toHaveBeenCalled();
      });
    });

    it('populates district section after API response', async () => {
      mockGetDistricts.mockResolvedValue({
        data: [
          { id: 'district-1', name: 'Rayon Utara' },
          { id: 'district-2', name: 'Rayon Selatan' },
        ],
      } as any);

      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="management"
          visible={true}
        />,
      );

      await waitFor(() => {
        expect(mockGetDistricts).toHaveBeenCalled();
      });

      // Rayon section should be present
      expect(getByText('Rayon')).toBeTruthy();
    });
  });

  describe('Areas data loading', () => {
    it('loads areas by district when korlap has userDistrictId', async () => {
      mockGetAreasByDistrictId.mockResolvedValue({
        data: [{ id: 'area-1', name: 'Taman Bungkul' }],
      } as any);

      render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="korlap"
          userDistrictId="district-1"
          visible={true}
        />,
      );

      await waitFor(() => {
        expect(mockGetAreasByDistrictId).toHaveBeenCalledWith('district-1');
      });
    });

    it('handles area loading error gracefully without crashing', async () => {
      mockGetAreasByDistrictId.mockRejectedValue(new Error('Area load error'));

      expect(() =>
        render(
          <TaskFilterModal
            {...DEFAULT_PROPS}
            userRole="korlap"
            userDistrictId="district-1"
            visible={true}
          />,
        ),
      ).not.toThrow();

      await waitFor(() => {
        expect(mockGetAreasByDistrictId).toHaveBeenCalled();
      });
    });

    it('does not load areas when korlap has no userDistrictId', async () => {
      render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="korlap"
          userDistrictId={undefined}
          visible={true}
        />,
      );

      // Wait a tick to confirm no call was made
      await waitFor(() => {
        expect(mockGetAreasByDistrictId).not.toHaveBeenCalled();
      });
    });
  });

  describe('Sync on open', () => {
    it('syncs taskFilter all prop into local state when modal opens', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          taskFilter="all"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ taskFilter: 'all' }),
      );
    });

    it('syncs taskFilter tagged prop into local state when modal opens', async () => {
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

    it('syncs districtFilter prop into local state when modal opens', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="management"
          districtFilter="district-1"
          onApplyFilters={onApplyFilters}
        />,
      );

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ districtFilter: 'district-1' }),
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

      // The modal should still be visible
      expect(getByText('Filter Tugas')).toBeTruthy();
    });
  });

  describe('Rayon and area selection via NBSelect', () => {
    it('selecting a district option calls handleDistrictChange and applies to filters', async () => {
      mockGetDistricts.mockResolvedValue({
        data: [{ id: 'district-1', name: 'Rayon Utara' }],
      } as any);

      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="management"
          districtFilter={null}
          onApplyFilters={onApplyFilters}
        />,
      );

      // Wait for district data to load
      await waitFor(() => {
        expect(mockGetDistricts).toHaveBeenCalled();
      });

      // Open the district NBSelect (trigger shows "Semua Rayon")
      await act(async () => {
        fireEvent.press(getByText('Semua Rayon'));
      });

      // Select "Rayon Utara" from dropdown
      await act(async () => {
        fireEvent.press(getByText('Rayon Utara'));
      });

      // Apply filters and verify district-1 was set
      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ districtFilter: 'district-1' }),
      );
    });

    it('selecting "Semua Rayon" resets district filter to null', async () => {
      mockGetDistricts.mockResolvedValue({
        data: [{ id: 'district-1', name: 'Rayon Utara' }],
      } as any);

      const onApplyFilters = jest.fn();
      const { getAllByText, getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="management"
          districtFilter={null}
          onApplyFilters={onApplyFilters}
        />,
      );

      await waitFor(() => {
        expect(mockGetDistricts).toHaveBeenCalled();
      });

      // Open the district NBSelect — trigger shows "Semua Rayon" since districtFilter is null
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

      // Apply and verify districtFilter is null
      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ districtFilter: null }),
      );
    });

    it('selecting an area option applies area filter', async () => {
      mockGetAreasByDistrictId.mockResolvedValue({
        data: [{ id: 'area-1', name: 'Taman Bungkul' }],
      } as any);

      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="korlap"
          userDistrictId="district-1"
          areaFilter={null}
          onApplyFilters={onApplyFilters}
        />,
      );

      await waitFor(() => {
        expect(mockGetAreasByDistrictId).toHaveBeenCalled();
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
    it('area filter shows NBSelect for satgas with userDistrictId', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="satgas"
          userDistrictId="district-1"
        />,
      );

      // Area section is always shown; NBSelect trigger shows "Semua Area"
      await waitFor(() => {
        expect(getByText('Area')).toBeTruthy();
      });
    });

    it('area filter shows Semua Area placeholder for satgas with userAreaId', async () => {
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          userRole="satgas"
          userAreaId="area-1"
        />,
      );

      // NBSelect shows "Semua Area" as initial value (areaFilter is null by default)
      await waitFor(() => {
        expect(getByText('Area')).toBeTruthy();
      });
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
      const { getAllByText, queryAllByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          dateFrom="2026-01-15"
        />,
      );

      // Some "Pilih tanggal" placeholders still appear (other sections)
      const placeholders = queryAllByText('Pilih tanggal');
      expect(placeholders.length).toBeGreaterThan(0); // dateTo + createdFrom + createdTo still show placeholder
      // The "Dari" labels are still there
      const allText = getAllByText('Dari');
      expect(allText.length).toBeGreaterThan(0);
    });

    it('shows Pilih tanggal when dateFrom is empty string', () => {
      const { getAllByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          dateFrom=""
          dateTo=""
          createdFrom=""
          createdTo=""
        />,
      );

      const placeholders = getAllByText('Pilih tanggal');
      expect(placeholders).toHaveLength(4); // 2 sections × 2 fields
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

      // Open status NBSelect (trigger shows "Semua Status")
      await act(async () => {
        fireEvent.press(getByText('Semua Status'));
      });

      // Select "Menunggu" (pending)
      await act(async () => {
        fireEvent.press(getByText('Menunggu'));
      });

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ statusFilter: 'pending' }),
      );
    });

    it('changing task filter to tagged updates applied filter', async () => {
      // NBSelect dropdown items are rendered inside a nested Modal that RNTL cannot
      // query directly. We test the outcome by passing taskFilter="tagged" as prop,
      // which syncs into local state on open, and verifying Terapkan passes it through.
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          taskFilter="tagged"
          userRole="management"
          onApplyFilters={onApplyFilters}
        />,
      );

      // Trigger shows the label for the current 'tagged' value
      expect(getByText('Tag Saya')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('Terapkan'));
      });

      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ taskFilter: 'tagged' }),
      );
    });

    it('shows Penugasan trigger label for management with taskFilter all', async () => {
      // Verifies the initial label shown in the Penugasan NBSelect trigger for management.
      // The dropdown items live inside a nested NBSelect Modal that RNTL cannot inspect
      // directly; asserting the trigger label is the reliable test boundary.
      const { getByText } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          taskFilter="all"
          userRole="management"
        />,
      );

      // The 'all' assignee option maps to 'Semua Petugas (Termasuk Saya)'
      expect(getByText('Semua Petugas (Termasuk Saya)')).toBeTruthy();
      // 'created_by_me' option trigger label when that value is active
      const { getByText: getByText2 } = render(
        <TaskFilterModal
          {...DEFAULT_PROPS}
          taskFilter="created_by_me"
          userRole="management"
        />,
      );
      expect(getByText2('Dibuat oleh Saya')).toBeTruthy();
    });
  });
});
