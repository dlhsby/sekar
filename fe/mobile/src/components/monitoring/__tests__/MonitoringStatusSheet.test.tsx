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

const user = (id: string, role: string, status: LiveUser['status']): LiveUser => ({
  id,
  full_name: `User ${id}`,
  role,
  phone: null,
  status,
  area_id: 'a1',
  area_name: 'Taman',
  rayon_id: 'r1',
  rayon_name: 'Rayon 1',
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
  user('2', 'satgas', 'inactive'),
  user('3', 'linmas', 'active'),
];

const statusCounts = { active: 2, inactive: 1, outside_area: 0, missing: 0, offline: 0 };

function renderSheet(overrides?: { onUserPress?: jest.Mock }) {
  const sheetRef = React.createRef<any>();
  return render(
    <MonitoringStatusSheet
      sheetRef={sheetRef}
      statusCounts={statusCounts}
      activeFilter={null}
      onFilterChange={jest.fn()}
      liveUsers={liveUsers}
      lastUpdated={new Date().toISOString()}
      totalAreas={12}
      staffedAreas={3}
      onUserPress={overrides?.onUserPress ?? jest.fn()}
    />,
  );
}

describe('MonitoringStatusSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the merged status row chips', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('status-chip-active')).toBeTruthy();
    expect(getByTestId('status-chip-missing')).toBeTruthy();
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
    const sheetRef = React.createRef<any>();
    const { getByText } = render(
      <MonitoringStatusSheet
        sheetRef={sheetRef}
        statusCounts={{ active: 0, inactive: 0, outside_area: 0, missing: 0, offline: 0 }}
        activeFilter={null}
        onFilterChange={jest.fn()}
        liveUsers={[]}
        lastUpdated={null}
        totalAreas={0}
        staffedAreas={0}
        onUserPress={jest.fn()}
      />,
    );
    expect(getByText('Belum ada petugas dipantau')).toBeTruthy();
  });
});
