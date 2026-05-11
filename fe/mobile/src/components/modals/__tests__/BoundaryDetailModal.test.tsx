/**
 * BoundaryDetailModal Component Tests
 * Phase 2D: Rayon/area staffing detail modal triggered from map center markers.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BoundaryDetailModal } from '../BoundaryDetailModal';
import type { RayonBoundary, AreaBoundary } from '../../../types/models.types';

// Mock vector icons to avoid native module resolution
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) =>
    React.createElement(Text, { testID: `icon-${props.name}`, ...props }, props.name);
});

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
  center_lng: 112.7480,
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
  code: 'RS-01',
  center_lat: -7.2970,
  center_lng: 112.7440,
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
  });

  // ─── Null / invisible guard ──────────────────────────────────────────────────

  describe('null data', () => {
    it('renders without crashing when data is null', () => {
      // Component internally renders Modal with visible=false when data is null
      expect(() =>
        render(<BoundaryDetailModal type="rayon" data={null} {...baseProps} />),
      ).not.toThrow();
    });

    it('shows no rayon or area content when data is null', () => {
      const { queryByText } = render(
        <BoundaryDetailModal type="rayon" data={null} {...baseProps} />,
      );
      expect(queryByText('Rayon Selatan')).toBeNull();
    });
  });

  describe('visible=false', () => {
    it('does not render modal content when visible is false', () => {
      const { queryByText } = render(
        <BoundaryDetailModal
          type="rayon"
          data={mockRayon}
          visible={false}
          onClose={jest.fn()}
        />,
      );
      expect(queryByText('Rayon Selatan')).toBeNull();
    });
  });

  // ─── onClose callback ────────────────────────────────────────────────────────

  describe('close button', () => {
    it('calls onClose when close icon is pressed in rayon mode', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} visible={true} onClose={onClose} />,
      );
      fireEvent.press(getByTestId('icon-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close icon is pressed in area mode', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <BoundaryDetailModal
          type="area"
          data={understaffedArea}
          visible={true}
          onClose={onClose}
        />,
      );
      fireEvent.press(getByTestId('icon-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Rayon mode ──────────────────────────────────────────────────────────────

  describe('rayon mode', () => {
    it('renders rayon name in header', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByText('Rayon Selatan')).toBeTruthy();
    });

    it('renders area count with understaffed notice when some are understaffed', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByText('2 Area (1 kurang staf)')).toBeTruthy();
    });

    it('renders area count without understaffed notice when all areas are staffed', () => {
      const fullyStaffedRayon: RayonBoundary = {
        ...mockRayon,
        understaffed_area_count: 0,
        areas: [adequateArea],
      };
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={fullyStaffedRayon} {...baseProps} />,
      );
      expect(getByText('1 Area')).toBeTruthy();
    });

    it('renders each area name in the list', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('Taman Flora')).toBeTruthy();
    });

    it('renders active/required stats for each area row', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByText('2/5 aktif')).toBeTruthy();
      expect(getByText('4/3 aktif')).toBeTruthy();
    });

    it('shows warning (alert) icon for understaffed area', () => {
      const { getAllByTestId } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getAllByTestId('icon-alert')).toHaveLength(1);
    });

    it('shows check icon for adequately staffed area', () => {
      const { getAllByTestId } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getAllByTestId('icon-check')).toHaveLength(1);
    });

    it('uses office-building icon in header for rayon', () => {
      const { getByTestId } = render(
        <BoundaryDetailModal type="rayon" data={mockRayon} {...baseProps} />,
      );
      expect(getByTestId('icon-office-building')).toBeTruthy();
    });

    it('renders zero-area rayon without crashing', () => {
      const emptyRayon: RayonBoundary = { ...mockRayon, areas: [], understaffed_area_count: 0 };
      const { getByText } = render(
        <BoundaryDetailModal type="rayon" data={emptyRayon} {...baseProps} />,
      );
      expect(getByText('0 Area')).toBeTruthy();
    });
  });

  // ─── Area mode ───────────────────────────────────────────────────────────────

  describe('area mode', () => {
    it('renders area name in header', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="area" data={understaffedArea} {...baseProps} />,
      );
      expect(getByText('Taman Bungkul')).toBeTruthy();
    });

    it('renders total active/required summary', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="area" data={understaffedArea} {...baseProps} />,
      );
      expect(getByText('2/5')).toBeTruthy();
    });

    it('renders staffing table header columns', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="area" data={understaffedArea} {...baseProps} />,
      );
      expect(getByText('Jabatan')).toBeTruthy();
      expect(getByText('Dibutuhkan')).toBeTruthy();
      expect(getByText('Aktif')).toBeTruthy();
      expect(getByText('Delta')).toBeTruthy();
    });

    it('renders translated Indonesian role labels', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="area" data={understaffedArea} {...baseProps} />,
      );
      expect(getByText('Satgas')).toBeTruthy();
      expect(getByText('Linmas')).toBeTruthy();
    });

    it('renders required and active numbers from staffing data', () => {
      const { getAllByText } = render(
        <BoundaryDetailModal type="area" data={understaffedArea} {...baseProps} />,
      );
      // satgas: required=3, active=1; linmas: required=2, active=1
      expect(getAllByText('3')).toHaveLength(1);
      expect(getAllByText('2')).toHaveLength(1);
      expect(getAllByText('1')).toHaveLength(2);
    });

    it('uses map-marker icon in header for area', () => {
      const { getByTestId } = render(
        <BoundaryDetailModal type="area" data={understaffedArea} {...baseProps} />,
      );
      expect(getByTestId('icon-map-marker')).toBeTruthy();
    });

    it('renders empty staffing area gracefully', () => {
      const emptyStaffingArea: AreaBoundary = {
        ...understaffedArea,
        staffing: [],
        total_active: 0,
        total_required: 0,
        is_understaffed: false,
      };
      const { getByText } = render(
        <BoundaryDetailModal type="area" data={emptyStaffingArea} {...baseProps} />,
      );
      expect(getByText('0/0')).toBeTruthy();
    });

    it('falls back to raw role key when role is not in ROLE_LABELS', () => {
      const unknownRoleArea: AreaBoundary = {
        ...understaffedArea,
        staffing: [{ role: 'unknown_role' as any, required: 1, active: 0 }],
      };
      const { getByText } = render(
        <BoundaryDetailModal type="area" data={unknownRoleArea} {...baseProps} />,
      );
      expect(getByText('unknown_role')).toBeTruthy();
    });
  });

  // ─── Delta colour ────────────────────────────────────────────────────────────

  describe('delta color', () => {
    it('renders negative delta with dangerDark (#991B1B) color and no plus prefix', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="area" data={understaffedArea} {...baseProps} />,
      );
      const deltaMinus2 = getByText('-2');
      expect([deltaMinus2.props.style].flat(2)).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#991B1B' })]),
      );
    });

    it('renders positive delta with successDark (#15803D) color and plus prefix', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="area" data={adequateArea} {...baseProps} />,
      );
      const deltaPlus1 = getByText('+1');
      expect([deltaPlus1.props.style].flat(2)).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#15803D' })]),
      );
    });

    it('renders zero delta with successDark (#15803D) color and +0 label', () => {
      const { getByText } = render(
        <BoundaryDetailModal type="area" data={adequateArea} {...baseProps} />,
      );
      const deltaZero = getByText('+0');
      expect([deltaZero.props.style].flat(2)).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#15803D' })]),
      );
    });
  });

  // ─── Reassign button ─────────────────────────────────────────────────────────

  describe('reassign button', () => {
    it('shows reassign button for understaffed area when onReassign is provided', () => {
      const { getByText } = render(
        <BoundaryDetailModal
          type="area"
          data={understaffedArea}
          {...baseProps}
          onReassign={jest.fn()}
        />,
      );
      expect(getByText('Reassign Petugas')).toBeTruthy();
    });

    it('calls onReassign with the full area object when pressed', () => {
      const onReassign = jest.fn();
      const { getByText } = render(
        <BoundaryDetailModal
          type="area"
          data={understaffedArea}
          {...baseProps}
          onReassign={onReassign}
        />,
      );
      fireEvent.press(getByText('Reassign Petugas'));
      expect(onReassign).toHaveBeenCalledTimes(1);
      expect(onReassign).toHaveBeenCalledWith(understaffedArea);
    });

    it('hides reassign button when area is adequately staffed', () => {
      const { queryByText } = render(
        <BoundaryDetailModal
          type="area"
          data={adequateArea}
          {...baseProps}
          onReassign={jest.fn()}
        />,
      );
      expect(queryByText('Reassign Petugas')).toBeNull();
    });

    it('hides reassign button when onReassign callback is not provided', () => {
      const { queryByText } = render(
        <BoundaryDetailModal type="area" data={understaffedArea} {...baseProps} />,
      );
      expect(queryByText('Reassign Petugas')).toBeNull();
    });
  });
});
