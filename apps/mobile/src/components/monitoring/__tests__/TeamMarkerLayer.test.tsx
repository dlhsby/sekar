/**
 * TeamMarkerLayer tests — one bubble per team; forwards the tapped team; skips
 * teams with non-finite coords.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TeamMarkerLayer } from '../TeamMarkerLayer';
import type { TeamGroup } from '../../../utils/teamGrouping';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Marker: ({ children, testID, onPress }: any) =>
      React.createElement(View, { testID, onPress }, children),
  };
});

function team(over: Partial<TeamGroup>): TeamGroup {
  return {
    kind: 'team',
    team_id: 't1',
    team_name: 'Tim Sapu',
    team_color: '#FF0000',
    team_icon: null,
    latitude: -7.25,
    longitude: 112.75,
    member_ids: ['a', 'b'],
    member_count: 2,
    ...over,
  };
}

describe('TeamMarkerLayer', () => {
  it('renders one marker per team', () => {
    const { getByTestId } = render(
      <TeamMarkerLayer teams={[team({ team_id: 't1' }), team({ team_id: 't2' })]} onTeamPress={jest.fn()} />,
    );
    expect(getByTestId('team-marker-t1')).toBeTruthy();
    expect(getByTestId('team-marker-t2')).toBeTruthy();
  });

  it('forwards the tapped team', () => {
    const onTeamPress = jest.fn();
    const t = team({ team_id: 't1' });
    const { getByTestId } = render(<TeamMarkerLayer teams={[t]} onTeamPress={onTeamPress} />);
    fireEvent(getByTestId('team-marker-t1'), 'press');
    expect(onTeamPress).toHaveBeenCalledWith(t);
  });

  it('skips a team with non-finite coordinates', () => {
    const { queryByTestId } = render(
      <TeamMarkerLayer teams={[team({ team_id: 't1', latitude: NaN, longitude: NaN })]} onTeamPress={jest.fn()} />,
    );
    expect(queryByTestId('team-marker-t1')).toBeNull();
  });
});
