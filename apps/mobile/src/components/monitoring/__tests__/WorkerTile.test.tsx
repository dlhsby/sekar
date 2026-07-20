/**
 * WorkerTile tests — Phase 4 M3 (CP2).
 *
 * Clickable personnel tile for the monitoring peek sheet "Daftar Petugas" and
 * the role-group drill-down modal. Covers: name/role·area rendering, presence
 * pill label, last-seen time, GPS-stale chip, press → onPress(user), and the
 * disabled (no onPress) path.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WorkerTile } from '../WorkerTile';
import type { LiveUser } from '../../../types/models.types';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

const minutesAgo = (m: number): string => new Date(Date.now() - m * 60_000).toISOString();

const createUser = (overrides?: Partial<LiveUser>): LiveUser => ({
  id: 'user-1',
  full_name: 'Ahmad Satgas',
  role: 'satgas',
  phone: '08123456789',
  status: 'active',
  location_id: 'area-1',
  location_name: 'Taman Bungkul',
  district_id: 'district-1',
  district_name: 'Rayon 1',
  latitude: -7.25,
  longitude: 112.76,
  accuracy: 8,
  battery_level: 90,
  last_update: minutesAgo(2),
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  shift_definition_id: null,
  clock_in_time: '2026-06-04T07:00:00Z',
  current_task_status: null,
  current_task_title: null,
  ...overrides,
});

describe('WorkerTile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders name, role label, and area', () => {
    const { getByText } = render(<WorkerTile user={createUser()} onPress={jest.fn()} />);
    expect(getByText('Ahmad Satgas')).toBeTruthy();
    expect(getByText('Satgas · Taman Bungkul')).toBeTruthy();
  });

  it('renders the activity pill label for the status', () => {
    const { getByText } = render(
      <WorkerTile user={createUser({ status: 'absent' })} onPress={jest.fn()} />,
    );
    expect(getByText('Tidak Hadir')).toBeTruthy();
  });

  it('shows the "Luar area" chip for an outside worker (CP6)', () => {
    // active + outside area = fresh fix outside → activity "Aktif" + a "Luar area" chip.
    const { getByText } = render(
      <WorkerTile user={createUser({ status: 'active', is_within_area: false })} onPress={jest.fn()} />,
    );
    expect(getByText('Aktif')).toBeTruthy();
    expect(getByText('Luar area')).toBeTruthy();
  });

  it('does not show the "Luar area" chip when inside the area', () => {
    const { queryByText } = render(
      <WorkerTile user={createUser({ status: 'active' })} onPress={jest.fn()} />,
    );
    expect(queryByText('Luar area')).toBeNull();
  });

  it('shows the GPS-stale chip when the last update is older than 10 minutes', () => {
    const { getByText } = render(
      <WorkerTile user={createUser({ last_update: minutesAgo(15) })} onPress={jest.fn()} />,
    );
    expect(getByText('GPS mati')).toBeTruthy();
  });

  it('does not show the GPS-stale chip for a recent update', () => {
    const { queryByText } = render(
      <WorkerTile user={createUser({ last_update: minutesAgo(2) })} onPress={jest.fn()} />,
    );
    expect(queryByText('GPS mati')).toBeNull();
  });

  it('calls onPress with the user when tapped', () => {
    const onPress = jest.fn();
    const user = createUser();
    const { getByTestId } = render(<WorkerTile user={user} onPress={onPress} />);
    fireEvent.press(getByTestId('worker-tile-user-1'));
    expect(onPress).toHaveBeenCalledWith(user);
  });

  it('is disabled (no chevron, no press) when onPress is omitted', () => {
    const { getByTestId, queryByTestId } = render(<WorkerTile user={createUser()} />);
    expect(getByTestId('worker-tile-user-1').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(queryByTestId('icon-chevron-right')).toBeNull();
  });
});
