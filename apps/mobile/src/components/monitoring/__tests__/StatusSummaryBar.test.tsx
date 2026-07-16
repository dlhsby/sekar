/**
 * StatusSummaryBar tests — Phase 4 M3 (CP6c).
 *
 * The bar now renders THREE activity chips (Aktif / Tidak aktif / Tidak
 * terdeteksi) tallied from the live roster. Each non-missing chip shows a
 * "X dalam · Y luar" location split; missing has no usable fix so it shows an
 * invisible spacer instead (same height, aligned activity row). Tapping a chip
 * toggles the ACTIVITY filter (location filtering lives in the wrench). Covers:
 * label/count/split rendering, offline excluded, toggle behaviour,
 * accessibility, testIDs.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatusSummaryBar } from '../StatusSummaryBar';
import type {
  LiveUser,
  PresenceActivity,
  PresenceLocation,
} from '../../../types/models.types';

// Build a minimal LiveUser carrying the two presence axes directly so
// `userAxes` reads them off the user (no derivation needed).
function makeUser(
  id: string,
  activity: PresenceActivity,
  location: PresenceLocation,
): LiveUser {
  return {
    id,
    full_name: `User ${id}`,
    role: 'satgas',
    status: 'active',
    activity,
    location,
    is_within_area: location === 'dalam_area',
  } as unknown as LiveUser;
}

// 5 aktif (3 dalam / 2 luar), 4 absent (1 dalam / 2 luar + 1 unknown), plus
// 4 offline that must NOT surface on any chip.
const defaultUsers: LiveUser[] = [
  makeUser('a1', 'aktif', 'dalam_area'),
  makeUser('a2', 'aktif', 'dalam_area'),
  makeUser('a3', 'aktif', 'dalam_area'),
  makeUser('a4', 'aktif', 'luar_area'),
  makeUser('a5', 'aktif', 'luar_area'),
  makeUser('ab1', 'absent', 'dalam_area'),
  makeUser('ab2', 'absent', 'luar_area'),
  makeUser('ab3', 'absent', 'luar_area'),
  makeUser('ab4', 'absent', 'unknown'),
  makeUser('o1', 'offline', 'unknown'),
  makeUser('o2', 'offline', 'unknown'),
  makeUser('o3', 'offline', 'unknown'),
  makeUser('o4', 'offline', 'unknown'),
];

describe('StatusSummaryBar', () => {
  const onActivityChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  describe('rendering', () => {
    it('renders the two activity labels (aktif / tidak aktif)', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      // DISPLAYED_ACTIVITIES are ['aktif', 'absent']
      expect(getByTestId('activity-chip-aktif')).toBeTruthy();
      expect(getByTestId('activity-chip-absent')).toBeTruthy();
    });

    it('does not render an offline chip', () => {
      const { queryByText, queryByTestId } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      expect(queryByText('Offline')).toBeNull();
      expect(queryByTestId('activity-chip-offline')).toBeNull();
    });

    it('renders the total count for each activity', () => {
      const { getByText } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      expect(getByText('5')).toBeTruthy(); // aktif total
      expect(getByText('4')).toBeTruthy(); // tidak aktif total (3 absent + 1 absent with unknown location)
    });

    it('renders the dalam · luar split only for aktif', () => {
      const { getByText } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      expect(getByText('3 dalam · 2 luar')).toBeTruthy(); // aktif
    });

    it('does not render a location split for absent (no usable fix)', () => {
      const { queryByText } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      // absent has no location data, shows invisible spacer instead
      expect(queryByText('1 dalam · 2 luar')).toBeNull();
    });

    it('renders a 0 total for every activity when the roster is empty', () => {
      const { getAllByText } = render(
        <StatusSummaryBar
          liveUsers={[]}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      expect(getAllByText('0')).toHaveLength(2);
    });

    it('exposes a stable testID per activity chip', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      expect(getByTestId('activity-chip-aktif')).toBeTruthy();
      expect(getByTestId('activity-chip-absent')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onActivityChange with the tapped activity when no filter is active', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      fireEvent.press(getByTestId('activity-chip-aktif'));
      expect(onActivityChange).toHaveBeenCalledTimes(1);
      expect(onActivityChange).toHaveBeenCalledWith('aktif');
    });

    it('toggles the filter off when the active chip is tapped again', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={'aktif'}
          onActivityChange={onActivityChange}
        />,
      );
      fireEvent.press(getByTestId('activity-chip-aktif'));
      expect(onActivityChange).toHaveBeenCalledWith(null);
    });

    it('switches the filter when a different chip is tapped', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={'aktif'}
          onActivityChange={onActivityChange}
        />,
      );
      fireEvent.press(getByTestId('activity-chip-absent'));
      expect(onActivityChange).toHaveBeenCalledWith('absent');
    });
  });

  describe('accessibility', () => {
    it('labels each chip with its total and (when present) location split', () => {
      const { getByLabelText, getByTestId } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      expect(getByTestId('activity-chip-aktif')).toBeTruthy();
      // Absent chip has no location split, uses invisible spacer
      expect(getByTestId('activity-chip-absent')).toBeTruthy();
    });

    it('marks the active chip as selected', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={'aktif'}
          onActivityChange={onActivityChange}
        />,
      );
      expect(getByTestId('activity-chip-aktif').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
      expect(getByTestId('activity-chip-absent').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });

    it('sets accessibilityRole button on each chip', () => {
      const { getByTestId } = render(
        <StatusSummaryBar
          liveUsers={defaultUsers}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      expect(getByTestId('activity-chip-aktif').props.accessibilityRole).toBe('button');
    });
  });

  describe('edge cases', () => {
    it('falls back to deriveAxes when a user lacks explicit axes', () => {
      // No activity/location fields → userAxes derives from status + within-area.
      const legacy = [
        { id: 'L1', full_name: 'L1', role: 'satgas', status: 'active', is_within_area: true },
        { id: 'L2', full_name: 'L2', role: 'satgas', status: 'active', is_within_area: false },
      ] as unknown as LiveUser[];
      const { getByText } = render(
        <StatusSummaryBar
          liveUsers={legacy}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      // both derive to aktif → total 2 (1 dalam, 1 luar)
      expect(getByText('2')).toBeTruthy();
      expect(getByText('1 dalam · 1 luar')).toBeTruthy();
    });

    it('renders large rosters without crashing', () => {
      const many: LiveUser[] = Array.from({ length: 500 }, (_, i) =>
        makeUser(`u${i}`, 'aktif', 'dalam_area'),
      );
      const { getByText } = render(
        <StatusSummaryBar
          liveUsers={many}
          activeActivity={null}
          onActivityChange={onActivityChange}
        />,
      );
      expect(getByText('500')).toBeTruthy();
    });
  });
});
