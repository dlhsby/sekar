/**
 * FilterAndSearchModals — reassign wiring (parity M9).
 *
 * This host is where reassignment went dark. `BoundaryDetailModal` has always
 * rendered a reassign button behind `is_understaffed && onReassign`, and nothing
 * ever passed `onReassign` — so the button never appeared, and both reassign
 * modals sat fully built and unreachable. The trigger was stripped by the
 * 2026-06-10 map rebuild (49026d85) and, unlike filters and boundaries, never
 * layered back on.
 *
 * These tests pin the wiring itself, because the failure mode was not a broken
 * modal — it was a prop nobody passed.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterAndSearchModals } from '../FilterAndSearchModals';
import type { AreaBoundary, LiveUser, User } from '../../../../types/models.types';

const AREA = {
  id: 'loc-1',
  name: 'Taman Bungkul',
  is_understaffed: true,
} as unknown as AreaBoundary;

// Stand-ins that expose the wiring: the boundary modal surfaces whether it was
// GIVEN a handler, and the reassign modal reports its visibility + target.
jest.mock('../../../../components/modals/BoundaryDetailModal', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    BoundaryDetailModal: ({ onReassign, data }: any) =>
      React.createElement(
        TouchableOpacity,
        { testID: 'boundary-reassign', disabled: !onReassign, onPress: () => onReassign?.(data) },
        React.createElement(Text, null, onReassign ? 'has-handler' : 'no-handler'),
      ),
  };
});

jest.mock('../../../../components/modals/ReassignWorkerModal', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ReassignWorkerModal: ({ visible, targetArea }: any) =>
      React.createElement(
        Text,
        { testID: 'reassign-modal' },
        visible ? `open:${targetArea?.name ?? 'none'}` : 'closed',
      ),
  };
});

jest.mock('../../../../components/modals/MonitoringFilterModal', () => ({
  MonitoringFilterModal: () => null,
}));
jest.mock('../../../../components/monitoring/MonitoringSearchModal', () => ({
  MonitoringSearchModal: () => null,
}));

const props = {
  currentUser: { id: 'u1' } as User,
  filterModalVisible: false,
  setFilterModalVisible: jest.fn(),
  filters: {} as any,
  users: [] as LiveUser[],
  onApplyFilters: jest.fn(),
  searchModalVisible: false,
  setSearchModalVisible: jest.fn(),
  liveUsers: [] as LiveUser[],
  onSearchSelect: jest.fn(),
  boundaryDetailVisible: true,
  setBoundaryDetailVisible: jest.fn(),
  boundaryDetailType: 'location' as const,
  boundaryDetailData: AREA,
};

describe('FilterAndSearchModals — reassign wiring', () => {
  beforeEach(() => jest.clearAllMocks());

  it('supplies onReassign to the boundary modal', () => {
    const { getByText } = render(<FilterAndSearchModals {...props} />);
    // The whole defect in one assertion: for ~11 weeks this read "no-handler".
    expect(getByText('has-handler')).toBeTruthy();
  });

  it('keeps the reassign modal closed until the button fires', () => {
    const { getByTestId } = render(<FilterAndSearchModals {...props} />);
    expect(getByTestId('reassign-modal').props.children).toBe('closed');
  });

  it('opens the reassign modal on the tapped lokasi', () => {
    const { getByTestId } = render(<FilterAndSearchModals {...props} />);

    fireEvent.press(getByTestId('boundary-reassign'));

    expect(getByTestId('reassign-modal').props.children).toBe('open:Taman Bungkul');
  });

  it('closes the boundary sheet when reassign opens, so the two do not stack', () => {
    const { getByTestId } = render(<FilterAndSearchModals {...props} />);

    fireEvent.press(getByTestId('boundary-reassign'));

    expect(props.setBoundaryDetailVisible).toHaveBeenCalledWith(false);
  });
});
