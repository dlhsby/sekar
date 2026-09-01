/**
 * MonitoringStatusSheet tests — Phase 4 M3 (CP2).
 *
 * The peek sheet now hosts: the merged status row (StatusSummaryBar), the
 * Operasional info card, and role-grouped personnel summary cards. Tapping a
 * group card opens a drill-down modal of that role's petugas; tapping a petugas
 * drills into the detail (onUserPress) and closes the group modal.
 *
 * gorhom bottom-sheet is stubbed globally (__mocks__): BottomSheet renders its
 * children at index 0, BottomSheetModal presents on visible. Maps/WS aren't
 * touched by this component.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MonitoringStatusSheet } from '../MonitoringStatusSheet';
import type { LiveUser } from '../../../types/models.types';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

// The Kehadiran card opens AttendanceDetailModal, which pulls in the date picker
// + supervisor API — stub both so this suite stays focused on the sheet.
jest.mock('../../nb/NBDatePicker', () => ({ NBDatePicker: () => null }));
jest.mock('../../../services/api/monitoringApi', () => ({
  getAttendance: jest.fn(() => Promise.resolve({ data: null })),
  getUserAttendanceDetail: jest.fn(() => Promise.resolve({ data: null })),
}));

const user = (id: string, role: string, status: LiveUser['status']): LiveUser => ({
  id,
  full_name: `User ${id}`,
  role,
  phone: null,
  status,
  location_id: 'a1',
  location_name: 'Taman',
  district_id: 'r1',
  district_name: 'Rayon 1',
  latitude: 0,
  longitude: 0,
  accuracy: null,
  battery_level: null,
  last_update: new Date().toISOString(),
  is_within_area: true,
  outside_boundary: false,
  shift_id: 's1',
  shift_name: 'Pagi',
  shift_definition_id: null,
  clock_in_time: '2026-06-04T07:00:00Z',
  current_task_status: null,
  current_task_title: null,
});

const liveUsers: LiveUser[] = [
  user('1', 'satgas', 'active'),
  user('2', 'satgas', 'absent'),
  user('3', 'linmas', 'active'),
];

const attendance = {
  date: '2026-06-04',
  total_workers: 3,
  clocked_in_count: 2,
  clocked_in: { data: [], meta: { total: 2, page: 1, limit: 50, totalPages: 1 } },
  not_clocked_in: { data: [], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } },
} as any;

function renderSheet(overrides?: { onUserPress?: jest.Mock; attendance?: any }) {
  return render(
    <MonitoringStatusSheet
      visible
      onClose={jest.fn()}
      activeActivity={null}
      onActivityChange={jest.fn()}
      liveUsers={liveUsers}
      lastUpdated={new Date().toISOString()}
      totalAreas={12}
      staffedAreas={3}
      onUserPress={overrides?.onUserPress ?? jest.fn()}
      attendance={overrides?.attendance}
    />,
  );
}

describe('MonitoringStatusSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the merged activity chips', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('activity-chip-aktif')).toBeTruthy();
    expect(getByTestId('activity-chip-absent')).toBeTruthy();
  });

  it('renders the Operasional card with total + area coverage', () => {
    const { getByText } = renderSheet();
    expect(getByText('Operasional')).toBeTruthy();
    expect(getByText('Total Petugas')).toBeTruthy();
    expect(getByText('Area Terjaga')).toBeTruthy();
    expect(getByText('3 dari 12 area')).toBeTruthy();
  });

  it('renders one role-group card per role present in the roster', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('personnel-group-satgas')).toBeTruthy();
    expect(getByTestId('personnel-group-linmas')).toBeTruthy();
  });

  it('opens the drill-down modal listing the role group on card tap', () => {
    const { getByTestId, queryByTestId } = renderSheet();
    // Modal closed → no worker tiles yet.
    expect(queryByTestId('worker-tile-1')).toBeNull();

    fireEvent.press(getByTestId('personnel-group-satgas'));

    // Satgas group has users 1 & 2.
    expect(getByTestId('worker-tile-1')).toBeTruthy();
    expect(getByTestId('worker-tile-2')).toBeTruthy();
    // Linmas user is not in this group's modal.
    expect(queryByTestId('worker-tile-3')).toBeNull();
  });

  it('drills into a petugas (onUserPress) when a worker tile is tapped', () => {
    const onUserPress = jest.fn();
    const { getByTestId } = renderSheet({ onUserPress });

    fireEvent.press(getByTestId('personnel-group-satgas'));
    fireEvent.press(getByTestId('worker-tile-1'));

    expect(onUserPress).toHaveBeenCalledWith(liveUsers[0]);
  });

  it('renders the empty state when no petugas are tracked', () => {
    const { getByText } = render(
      <MonitoringStatusSheet
        visible
        onClose={jest.fn()}
        activeActivity={null}
        onActivityChange={jest.fn()}
        liveUsers={[]}
        lastUpdated={null}
        totalAreas={0}
        staffedAreas={0}
        onUserPress={jest.fn()}
      />,
    );
    expect(getByText('Belum ada petugas dipantau')).toBeTruthy();
  });

  describe('Kehadiran section', () => {
    it('hides the Kehadiran section when no attendance is provided', () => {
      const { queryByTestId, queryByText } = renderSheet();
      expect(queryByText('Kehadiran')).toBeNull();
      expect(queryByTestId('kehadiran-card')).toBeNull();
    });

    it('renders the Kehadiran card with the clock-in summary when attendance is provided', () => {
      const { getByTestId, getByText } = renderSheet({ attendance });
      expect(getByTestId('kehadiran-card')).toBeTruthy();
      expect(getByText('Sudah Clock In')).toBeTruthy();
      expect(getByText('Belum Clock In')).toBeTruthy();
    });

    it('opens the attendance detail modal when the Kehadiran card is tapped', () => {
      const { getByTestId } = renderSheet({ attendance });
      expect(() => getByTestId('attendance-modal')).toThrow();
      fireEvent.press(getByTestId('kehadiran-card'));
      expect(getByTestId('attendance-modal')).toBeTruthy();
    });
  });
});
