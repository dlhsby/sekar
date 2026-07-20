/**
 * ActivityFilterModal Tests
 * Phase 2C: Activity filter bottom sheet modal
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ActivityFilterModal } from '../ActivityFilterModal';

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock react-native-safe-area-context (used by NBSelect internally)
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

// Mock the API services
jest.mock('../../../services/api/activityTypesApi', () => ({
  getMyActivityTypes: jest.fn(),
}));

jest.mock('../../../services/api', () => ({
  getAreas: jest.fn(),
  getAreasByDistrictId: jest.fn(),
  getDistricts: jest.fn(),
  getUsers: jest.fn(),
}));

import { getMyActivityTypes } from '../../../services/api/activityTypesApi';
import { getAreas, getAreasByDistrictId, getDistricts, getUsers } from '../../../services/api';

const mockGetAreasByDistrictId = getAreasByDistrictId as jest.Mock;

const mockOnClose = jest.fn();
const mockOnApply = jest.fn();
const mockOnReset = jest.fn();

const defaultProps = {
  visible: true,
  onClose: mockOnClose,
  filters: {},
  onApplyFilters: mockOnApply,
  onResetFilters: mockOnReset,
};

beforeEach(() => {
  jest.clearAllMocks();
  (getMyActivityTypes as jest.Mock).mockResolvedValue({ data: { data: [] } });
  (getAreas as jest.Mock).mockResolvedValue({ data: [] });
  mockGetAreasByDistrictId.mockResolvedValue({ data: [] });
  (getDistricts as jest.Mock).mockResolvedValue({ data: [] });
  (getUsers as jest.Mock).mockResolvedValue({ data: [] });
});

describe('ActivityFilterModal', () => {
  describe('Rendering', () => {
    it('renders when visible', async () => {
      const { getByText } = render(<ActivityFilterModal {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('Filter Aktivitas')).toBeTruthy();
      });
    });

    it('shows filter sections', async () => {
      const { getByText } = render(<ActivityFilterModal {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('Rentang Tanggal')).toBeTruthy();
        expect(getByText('Area')).toBeTruthy();
        // Phase 2C: Activity model now has status field — status filter is shown
        expect(getByText('Status')).toBeTruthy();
      });
    });

    it('shows date range row with Dari and Sampai labels', async () => {
      const { getAllByText } = render(<ActivityFilterModal {...defaultProps} />);
      await waitFor(() => {
        expect(getAllByText('Dari').length).toBeGreaterThan(0);
        expect(getAllByText('Sampai').length).toBeGreaterThan(0);
      });
    });

    it('shows action buttons', async () => {
      const { getByText } = render(<ActivityFilterModal {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('Reset')).toBeTruthy();
        expect(getByText('Terapkan')).toBeTruthy();
      });
    });

    it('does not render when not visible', () => {
      const { queryByText } = render(
        <ActivityFilterModal {...defaultProps} visible={false} />
      );
      expect(queryByText('Filter Aktivitas')).toBeNull();
    });
  });

  describe('Actions', () => {
    it('calls onClose when close button is pressed', async () => {
      const { getByLabelText } = render(<ActivityFilterModal {...defaultProps} />);
      await waitFor(() => {
        expect(getByLabelText('Tutup')).toBeTruthy();
      });
      fireEvent.press(getByLabelText('Tutup'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onApplyFilters and onClose when Terapkan is pressed', async () => {
      const { getByText } = render(<ActivityFilterModal {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('Terapkan')).toBeTruthy();
      });
      fireEvent.press(getByText('Terapkan'));
      expect(mockOnApply).toHaveBeenCalledWith({});
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onResetFilters and onClose when Reset is pressed', async () => {
      const { getByText } = render(<ActivityFilterModal {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('Reset')).toBeTruthy();
      });
      fireEvent.press(getByText('Reset'));
      expect(mockOnReset).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('loads areas on open', async () => {
      render(<ActivityFilterModal {...defaultProps} />);
      await waitFor(() => {
        expect(getAreas).toHaveBeenCalled();
      });
    });
  });

  describe('Pre-populated filters', () => {
    it('syncs with provided filters on open', async () => {
      const { getByText } = render(
        <ActivityFilterModal
          {...defaultProps}
          filters={{ from_date: '2026-02-18', location_id: 'area1' }}
        />
      );
      await waitFor(() => {
        expect(getByText('Filter Aktivitas')).toBeTruthy();
      });
    });
  });

  describe('Fixed area for field worker roles', () => {
    it('shows disabled area select with "Area Saya" for satgas with userAreaId', async () => {
      const { getByText } = render(
        <ActivityFilterModal
          {...defaultProps}
          userRole="satgas"
          userAreaId="area-1"
        />
      );
      await waitFor(() => {
        expect(getByText('Area Saya')).toBeTruthy();
      });
      // Should NOT load areas (area is fixed)
      expect(getAreas).not.toHaveBeenCalled();
      expect(mockGetAreasByDistrictId).not.toHaveBeenCalled();
    });

    it('shows disabled area select for linmas with userAreaId', async () => {
      const { getByText } = render(
        <ActivityFilterModal
          {...defaultProps}
          userRole="linmas"
          userAreaId="area-2"
        />
      );
      await waitFor(() => {
        expect(getByText('Area Saya')).toBeTruthy();
      });
    });

    it('loads areas by district for satgas with userDistrictId but no userAreaId', async () => {
      mockGetAreasByDistrictId.mockResolvedValue({
        data: [{ id: 'area-1', name: 'Taman Bungkul' }],
      } as any);
      render(
        <ActivityFilterModal
          {...defaultProps}
          userRole="satgas"
          userDistrictId="district-1"
        />
      );
      await waitFor(() => {
        expect(mockGetAreasByDistrictId).toHaveBeenCalledWith('district-1');
      });
    });

    it('loads all areas when no userDistrictId and no userAreaId', async () => {
      render(<ActivityFilterModal {...defaultProps} />);
      await waitFor(() => {
        expect(getAreas).toHaveBeenCalled();
      });
    });
  });
});
