/**
 * PersonnelGroupCard tests — Phase 4 M3 (CP2).
 *
 * Role-grouped personnel summary card for the monitoring peek sheet. Covers:
 * role label, headcount + "total" caption, the per-status breakdown (all four
 * statuses surfaced including zeros), and press → onPress(group).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PersonnelGroupCard, type PersonnelGroup } from '../PersonnelGroupCard';
import type { LiveUser } from '../../../types/models.types';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

const user = (id: string, status: LiveUser['status']): LiveUser => ({
  id,
  full_name: `User ${id}`,
  role: 'satgas',
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

// 3 active, 1 inactive, 0 outside_area, 0 missing → headcount 4.
const group: PersonnelGroup = {
  role: 'satgas',
  users: [
    user('1', 'active'),
    user('2', 'active'),
    user('3', 'active'),
    user('4', 'absent'),
  ],
};

describe('PersonnelGroupCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the role label and headcount with a "total" caption', () => {
    const { getByText } = render(<PersonnelGroupCard group={group} onPress={jest.fn()} />);
    expect(getByText('Satgas')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(getByText('total')).toBeTruthy();
  });

  it('surfaces the 3 activity buckets in the breakdown, including zeros', () => {
    const { getByText, getAllByText } = render(
      <PersonnelGroupCard group={group} onPress={jest.fn()} />,
    );
    // CP6 activity buckets: 3 active → aktif 3, 1 inactive → idle 1, missing 0.
    expect(getByText('3')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    // one zero bucket (missing)
    expect(getAllByText('0')).toHaveLength(1);
  });

  it('falls back to the raw role string for an unknown role', () => {
    const odd: PersonnelGroup = { role: 'mystery_role', users: [] };
    const { getByText } = render(<PersonnelGroupCard group={odd} onPress={jest.fn()} />);
    expect(getByText('mystery_role')).toBeTruthy();
  });

  it('renders all 3 activity buckets even when the group is empty', () => {
    const empty: PersonnelGroup = { role: 'satgas', users: [] };
    const { getAllByText } = render(<PersonnelGroupCard group={empty} onPress={jest.fn()} />);
    // 3 activity buckets all at 0, plus the headcount 0 → 4 occurrences of "0".
    expect(getAllByText('0')).toHaveLength(4);
  });

  it('calls onPress with the group when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<PersonnelGroupCard group={group} onPress={onPress} />);
    fireEvent.press(getByTestId('personnel-group-satgas'));
    expect(onPress).toHaveBeenCalledWith(group);
  });
});
