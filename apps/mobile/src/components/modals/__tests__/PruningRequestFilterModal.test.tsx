/**
 * PruningRequestFilterModal Tests
 *
 * CP2 design-system v2.1 sweep (June 2026): raw <Text> → NBText (labels
 * mono-sm/uppercase, footer buttons body-sm), flat tokens. Uses the real NB
 * primitives (mirrors TaskFilterModal.test) so the swept markup is exercised
 * end-to-end; only icons / safe-area / the rayons API are mocked.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PruningRequestFilterModal } from '../PruningRequestFilterModal';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

jest.mock('../../../services/api', () => ({
  getRayons: jest.fn(),
}));

import { getRayons } from '../../../services/api';
const mockGetRayons = getRayons as jest.MockedFunction<typeof getRayons>;

const DEFAULT_PROPS = {
  visible: true,
  onClose: jest.fn(),
  filters: {},
  onApplyFilters: jest.fn(),
  onResetFilters: jest.fn(),
  userRole: 'staff_kecamatan' as const,
  userRayonId: undefined,
};

describe('PruningRequestFilterModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRayons.mockResolvedValue({ data: [] } as any);
  });

  describe('Visibility', () => {
    it('does not show modal content when visible is false', () => {
      const { queryByText } = render(
        <PruningRequestFilterModal {...DEFAULT_PROPS} visible={false} />,
      );
      expect(queryByText('Filter Permohonan')).toBeNull();
    });

    it('shows the modal title when visible', () => {
      const { getByText } = render(<PruningRequestFilterModal {...DEFAULT_PROPS} />);
      expect(getByText('Filter Permohonan')).toBeTruthy();
    });

    it('renders all section labels (NBText, uppercase-styled)', () => {
      const { getByText } = render(<PruningRequestFilterModal {...DEFAULT_PROPS} />);
      expect(getByText('Nomor Permohonan')).toBeTruthy();
      expect(getByText('Nama Pemohon')).toBeTruthy();
      expect(getByText('Status')).toBeTruthy();
      expect(getByText('Rentang Tanggal')).toBeTruthy();
    });

    it('renders the date range Dari / Sampai labels', () => {
      const { getByLabelText } = render(<PruningRequestFilterModal {...DEFAULT_PROPS} />);
      expect(getByLabelText('Dari')).toBeTruthy();
      expect(getByLabelText('Sampai')).toBeTruthy();
    });
  });

  describe('Action buttons', () => {
    it('renders Reset and Terapkan buttons', () => {
      const { getByText } = render(<PruningRequestFilterModal {...DEFAULT_PROPS} />);
      expect(getByText('Reset')).toBeTruthy();
      expect(getByText('Terapkan')).toBeTruthy();
    });

    it('calls onResetFilters and onClose when Reset is pressed', async () => {
      const onResetFilters = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <PruningRequestFilterModal
          {...DEFAULT_PROPS}
          onResetFilters={onResetFilters}
          onClose={onClose}
        />,
      );
      await act(async () => { fireEvent.press(getByText('Reset')); });
      expect(onResetFilters).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onApplyFilters with an empty object and closes when nothing is set', async () => {
      const onApplyFilters = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <PruningRequestFilterModal
          {...DEFAULT_PROPS}
          onApplyFilters={onApplyFilters}
          onClose={onClose}
        />,
      );
      await act(async () => { fireEvent.press(getByText('Terapkan')); });
      expect(onApplyFilters).toHaveBeenCalledWith({});
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Search fields', () => {
    it('applies a trimmed reference code', async () => {
      const onApplyFilters = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <PruningRequestFilterModal {...DEFAULT_PROPS} onApplyFilters={onApplyFilters} />,
      );
      fireEvent.changeText(getByPlaceholderText('Contoh: PR-2026-...'), '  PR-2026-0007  ');
      await act(async () => { fireEvent.press(getByText('Terapkan')); });
      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ referenceCode: 'PR-2026-0007' }),
      );
    });

    it('applies a trimmed requester name', async () => {
      const onApplyFilters = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <PruningRequestFilterModal {...DEFAULT_PROPS} onApplyFilters={onApplyFilters} />,
      );
      fireEvent.changeText(getByPlaceholderText('Contoh: Budi'), ' Budi ');
      await act(async () => { fireEvent.press(getByText('Terapkan')); });
      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ requesterName: 'Budi' }),
      );
    });
  });

  describe('Sync on open', () => {
    it('seeds local state from the filters prop and re-applies it', async () => {
      const onApplyFilters = jest.fn();
      const { getByText } = render(
        <PruningRequestFilterModal
          {...DEFAULT_PROPS}
          filters={{ status: 'submitted', referenceCode: 'PR-9' }}
          onApplyFilters={onApplyFilters}
        />,
      );
      await act(async () => { fireEvent.press(getByText('Terapkan')); });
      expect(onApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'submitted', referenceCode: 'PR-9' }),
      );
    });
  });

  describe('Rayon visibility (role-gated)', () => {
    it('hides the Rayon section for staff_kecamatan', () => {
      const { queryByText } = render(
        <PruningRequestFilterModal {...DEFAULT_PROPS} userRole="staff_kecamatan" />,
      );
      expect(queryByText('Rayon')).toBeNull();
    });

    it('shows a fixed Rayon for admin_rayon and does not load the rayon list', async () => {
      const { getByText } = render(
        <PruningRequestFilterModal
          {...DEFAULT_PROPS}
          userRole="admin_rayon"
          userRayonId="rayon-pusat"
        />,
      );
      expect(getByText('Rayon')).toBeTruthy();
      // admin_rayon is rayon-locked, so the selectable rayon list is never fetched.
      await waitFor(() => expect(mockGetRayons).not.toHaveBeenCalled());
    });

    it('shows a selectable Rayon for management and loads the rayon list', async () => {
      mockGetRayons.mockResolvedValue({
        data: [{ id: 'rayon-1', name: 'Rayon Utara' }],
      } as any);
      const { getByText } = render(
        <PruningRequestFilterModal {...DEFAULT_PROPS} userRole="management" />,
      );
      expect(getByText('Rayon')).toBeTruthy();
      await waitFor(() => expect(mockGetRayons).toHaveBeenCalled());
    });

    it('does not crash when the rayon list fails to load', async () => {
      mockGetRayons.mockRejectedValue(new Error('Network error'));
      expect(() =>
        render(
          <PruningRequestFilterModal {...DEFAULT_PROPS} userRole="management" />,
        ),
      ).not.toThrow();
      await waitFor(() => expect(mockGetRayons).toHaveBeenCalled());
    });
  });
});
