/**
 * BoundaryDetailModal Component Tests — Phase 4 M3 (CP7 rebuild on NBModal).
 *
 * The modal was rebuilt onto the UserDetailSheet design language: NBModal sheet
 * + hero header (icon chip · name · sub-line · StatusPill), HomeStatTile KPI row,
 * tokenised staffing rows, and a nested "Tanaman" sub-sheet (plant status +
 * heritage). Covers: visibility gating, hero, KPI tiles, rayon area list, area
 * per-role staffing rows + delta pills, Reassign button, and the plant sub-sheet.
 *
 * gorhom bottom-sheet is stubbed globally (__mocks__): BottomSheetModal presents
 * on NBModal's `visible` effect. plantsApi is mocked so no real fetch occurs.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { BoundaryDetailModal } from '../BoundaryDetailModal';
import type { RayonBoundary, AreaBoundary, AreaPlant, NotablePlant } from '../../../types/models.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) =>
    React.createElement(Text, { testID: `icon-${props.name}`, ...props }, props.name);
});

jest.mock('../../../services/api/plantsApi', () => ({
  listLocationPlants: jest.fn().mockResolvedValue({ data: [] }),
  listNotablePlants: jest.fn().mockResolvedValue({ data: [] }),
}));

import { listLocationPlants, listNotablePlants } from '../../../services/api/plantsApi';

const mockListAreaPlants = listLocationPlants as jest.Mock;
const mockListNotablePlants = listNotablePlants as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const understaffedArea: AreaBoundary = {
  id: 'area-1',
  name: 'Taman Bungkul',
  center_lat: -7.2936,
  center_lng: 112.7395,
  boundary_polygon: null,
  radius_meters: 150,
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon Selatan',
  assigned_count: 5,
  total_active: 2,
  total_required: 5,
  is_understaffed: true,
  staffing: [
    { role: 'satgas', required: 3, active: 1 },
    { role: 'linmas', required: 2, active: 1 },
  ],
};

const adequateArea: AreaBoundary = {
  id: 'area-2',
  name: 'Taman Flora',
  center_lat: -7.3012,
  center_lng: 112.748,
  boundary_polygon: null,
  radius_meters: 100,
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon Selatan',
  assigned_count: 3,
  total_active: 4,
  total_required: 3,
  is_understaffed: false,
  staffing: [
    { role: 'satgas', required: 2, active: 3 },
    { role: 'linmas', required: 1, active: 1 },
  ],
};

const mockRayon: RayonBoundary = {
  id: 'rayon-1',
  name: 'Rayon Selatan',
  center_lat: -7.297,
  center_lng: 112.744,
  boundary_polygon: null,
  area_count: 2,
  is_understaffed: true,
  understaffed_area_count: 1,
  areas: [understaffedArea, adequateArea],
};

const baseProps = {
  visible: true,
  onClose: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BoundaryDetailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAreaPlants.mockResolvedValue({ data: [] });
    mockListNotablePlants.mockResolvedValue({ data: [] });
  });

  // Area mode kicks off the plant-fetch effect. Call this at the END of a
  // synchronous area-mode test so the trailing setState (settled at jest's await
  // boundary) lands wrapped in act() instead of warning. No-op for rayon tests.
  const flushPlants = async () => {
    await act(async () => {
      for (let i = 0; i < 5; i++) { await Promise.resolve(); }
    });
  };

  // ── Visibility / null guard ───────────────────────────────────────────────────

  describe('visibility', () => {
    it('renders nothing when data is null', () => {
      const { queryByText, queryByTestId } = render(
        <BoundaryDetailModal type="rayon" data={null} {...baseProps} />,
      );
      expect(queryByText('Rayon Selatan')).toBeNull();
      expect(queryByTestId('boundary-detail-sheet')).toBeNull();
    });

    it('does not render content when visible is false', () => {
      const { queryByText } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} visible={false} onClose={jest.fn()} />,
      );
      expect(queryByText('Rayon Selatan')).toBeNull();
    });

    it('calls onClose when the sheet is dismissed (visible → false)', () => {
      const onClose = jest.fn();
      const { rerender } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} visible onClose={onClose} />,
      );
      rerender(
        <BoundaryDetailModal type="rayon" data={mockRayon} visible={false} onClose={onClose} />,
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Rayon mode ────────────────────────────────────────────────────────────────

  describe('rayon mode', () => {
    it('renders the hero (name + area-count sub-line + office-building icon)', () => {
      const { getByText, getByTestId } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByText('Rayon Selatan')).toBeTruthy();
      expect(getByText('2 area')).toBeTruthy();
      expect(getByTestId('icon-office-building')).toBeTruthy();
    });

    it('shows the Understaffed pill when the rayon is understaffed', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByText('Understaffed')).toBeTruthy();
    });

    it('renders the Area + Kurang Staf KPI tiles', () => {
      const { getByTestId, getByText } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByTestId('boundary-stat-area-count')).toBeTruthy();
      expect(getByTestId('boundary-stat-understaffed')).toBeTruthy();
      expect(getByText('Kurang Staf')).toBeTruthy();
    });

    it('lists each area with its active/required line', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByText('Daftar Area (2)')).toBeTruthy();
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Taman Flora')).toBeTruthy();
      expect(getByText('2/5 aktif')).toBeTruthy();
      expect(getByText('4/3 aktif')).toBeTruthy();
    });

    it('tags each area with a Kurang / Cukup pill', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByText('Kurang')).toBeTruthy(); // understaffedArea
      expect(getByText('Cukup')).toBeTruthy();  // adequateArea
    });

    it('shows the Cukup hero pill when the rayon is adequately staffed', () => {
      const okRayon: RayonBoundary = { ...mockRayon, is_understaffed: false, understaffed_area_count: 0 };
      const { getAllByText } = render(
        <BoundaryDetailModal type="rayon" data={okRayon} {...baseProps} />,
      );
      // hero pill + the adequate area row pill
      expect(getAllByText('Cukup').length).toBeGreaterThanOrEqual(1);
    });

    it('renders a zero-area rayon without crashing', () => {
      const emptyRayon: RayonBoundary = { ...mockRayon, areas: [], understaffed_area_count: 0, area_count: 0 };
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={emptyRayon} {...baseProps} />,
      );
      expect(getByText('Daftar Area (0)')).toBeTruthy();
      expect(getByText('Belum ada area di rayon ini')).toBeTruthy();
    });

    it('does not fetch plants in rayon mode', () => {
      render(<BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />);
      expect(mockListAreaPlants).not.toHaveBeenCalled();
    });
  });

  // ── Area mode ─────────────────────────────────────────────────────────────────

  describe('area mode', () => {
    it('renders the hero (name + parent rayon sub-line + map-marker icon)', async () => {
      const { getByText, getByTestId } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} />,
      );
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Rayon Selatan')).toBeTruthy(); // rayon_name sub-line
      expect(getByTestId('icon-map-marker')).toBeTruthy();
      await flushPlants();
    });

    it('renders the Aktif + Petugas KPI tiles', async () => {
      const { getByTestId, getByText } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} />,
      );
      expect(getByTestId('boundary-stat-active')).toBeTruthy();
      expect(getByTestId('boundary-stat-assigned')).toBeTruthy();
      expect(getByText('2/5')).toBeTruthy();  // total_active / total_required
      expect(getByText('5')).toBeTruthy();    // assigned_count
      await flushPlants();
    });

    it('renders a per-role staffing row with translated labels', async () => {
      const { getByText } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} />,
      );
      expect(getByText('Kebutuhan per Jabatan')).toBeTruthy();
      expect(getByText('Satgas')).toBeTruthy();
      expect(getByText('Linmas')).toBeTruthy();
      expect(getByText('1/3')).toBeTruthy(); // satgas active/required
      expect(getByText('1/2')).toBeTruthy(); // linmas active/required
      await flushPlants();
    });

    it('shows a negative delta pill for understaffed roles', async () => {
      const { getByText } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} />,
      );
      expect(getByText('-2')).toBeTruthy(); // satgas: 1-3
      expect(getByText('-1')).toBeTruthy(); // linmas: 1-2
      await flushPlants();
    });

    it('shows positive / zero delta pills for adequately staffed roles', async () => {
      const { getByText } = render(
        <BoundaryDetailModal type="location" data={adequateArea} {...baseProps} />,
      );
      expect(getByText('+1')).toBeTruthy(); // satgas: 3-2
      expect(getByText('+0')).toBeTruthy(); // linmas: 1-1
      await flushPlants();
    });

    it('falls back to the raw role key when not in ROLE_LABELS', async () => {
      const unknownRoleArea: AreaBoundary = {
        ...understaffedArea,
        staffing: [{ role: 'unknown_role' as any, required: 1, active: 0 }],
      };
      const { getByText } = render(
        <BoundaryDetailModal type="location" data={unknownRoleArea} {...baseProps} />,
      );
      expect(getByText('unknown_role')).toBeTruthy();
      await flushPlants();
    });

    it('renders an empty-staffing area gracefully', async () => {
      const emptyStaffingArea: AreaBoundary = {
        ...understaffedArea,
        staffing: [],
        is_understaffed: false,
      };
      const { getByText } = render(
        <BoundaryDetailModal type="location" data={emptyStaffingArea} {...baseProps} />,
      );
      expect(getByText('Belum ada kebutuhan jabatan')).toBeTruthy();
      await flushPlants();
    });
  });

  // ── Reassign ──────────────────────────────────────────────────────────────────

  describe('reassign button', () => {
    it('shows Reassign for an understaffed area when onReassign is provided', async () => {
      const { getByText } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} onReassign={jest.fn()} />,
      );
      expect(getByText('Reassign Petugas')).toBeTruthy();
      await flushPlants();
    });

    it('calls onReassign with the full area object when pressed', async () => {
      const onReassign = jest.fn();
      const { getByText } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} onReassign={onReassign} />,
      );
      fireEvent.press(getByText('Reassign Petugas'));
      expect(onReassign).toHaveBeenCalledTimes(1);
      expect(onReassign).toHaveBeenCalledWith(understaffedArea);
      await flushPlants();
    });

    it('hides Reassign when the area is adequately staffed', async () => {
      const { queryByText } = render(
        <BoundaryDetailModal type="location" data={adequateArea} {...baseProps} onReassign={jest.fn()} />,
      );
      expect(queryByText('Reassign Petugas')).toBeNull();
      await flushPlants();
    });

    it('hides Reassign when no onReassign is provided', async () => {
      const { queryByText } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} />,
      );
      expect(queryByText('Reassign Petugas')).toBeNull();
      await flushPlants();
    });
  });

  // ── Tanaman sub-sheet ─────────────────────────────────────────────────────────

  describe('tanaman sub-sheet', () => {
    it('renders the trigger and fetches plants on open (area mode)', async () => {
      const { getByTestId } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} />,
      );
      expect(getByTestId('boundary-tanaman-trigger')).toBeTruthy();
      await waitFor(() => expect(mockListAreaPlants).toHaveBeenCalledWith('area-1'));
      expect(mockListNotablePlants).toHaveBeenCalledWith('area-1');
    });

    it('shows the jenis · heritage count once plants resolve', async () => {
      const plants: AreaPlant[] = [
        { id: 'p1', status: 'ok', count: 4, species: { nameId: 'KETAPANG_KENCANA' } } as any,
        { id: 'p2', status: 'overdue', count: 2, species: { nameId: 'TREMBESI' } } as any,
      ];
      const notable: NotablePlant[] = [{ id: 'n1', label: 'Pohon A', species: { nameId: 'TREMBESI' } } as any];
      mockListAreaPlants.mockResolvedValue({ data: plants });
      mockListNotablePlants.mockResolvedValue({ data: notable });

      const { getByText } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} />,
      );
      await waitFor(() => expect(getByText('2 jenis · 1 heritage')).toBeTruthy());
    });

    it('opens the sub-sheet with the plant summary when the trigger is pressed', async () => {
      const plants: AreaPlant[] = [
        { id: 'p1', status: 'ok', count: 4, species: { nameId: 'KETAPANG_KENCANA' }, lastPrunedAt: null } as any,
      ];
      mockListAreaPlants.mockResolvedValue({ data: plants });

      const { getByTestId, getByText } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} />,
      );
      await waitFor(() => expect(mockListAreaPlants).toHaveBeenCalled());

      fireEvent.press(getByTestId('boundary-tanaman-trigger'));

      await waitFor(() => expect(getByTestId('boundary-tanaman-sheet')).toBeTruthy());
      expect(getByText('Ketapang Kencana')).toBeTruthy();
      expect(getByText('1 jenis pohon · 4 pohon terdata')).toBeTruthy();
    });

    it('shows the empty plant message when an area has no plants', async () => {
      const { getByTestId, getByText } = render(
        <BoundaryDetailModal type="location" data={understaffedArea} {...baseProps} />,
      );
      await waitFor(() => expect(mockListAreaPlants).toHaveBeenCalled());

      fireEvent.press(getByTestId('boundary-tanaman-trigger'));

      await waitFor(() =>
        expect(getByText('Belum ada data tanaman terdaftar untuk area ini.')).toBeTruthy(),
      );
    });

    it('does not render the Tanaman trigger in rayon mode', () => {
      const { queryByTestId } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(queryByTestId('boundary-tanaman-trigger')).toBeNull();
    });
  });
});
