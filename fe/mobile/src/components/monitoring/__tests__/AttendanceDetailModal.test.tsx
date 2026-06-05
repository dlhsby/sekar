/**
 * AttendanceDetailModal tests — Phase 4 M3 (CP3).
 *
 * Covers: fetch on open, both lists shown when no filter, the toggle tiles
 * (clocked-in / not-clocked-in) narrowing + clearing the list like the status
 * chips, and drilling into a row → UserAttendanceModal.
 *
 * NBDatePicker is stubbed (not under test); the supervisor API is mocked;
 * gorhom bottom-sheet is stubbed globally.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AttendanceDetailModal } from '../AttendanceDetailModal';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

// Date picker isn't under test — stub it to a no-op.
jest.mock('../../nb/NBDatePicker', () => ({ NBDatePicker: () => null }));

jest.mock('../../../services/api/monitoringApi');
import { getAttendance, getUserAttendanceDetail } from '../../../services/api/monitoringApi';
const mockGetAttendance = getAttendance as jest.MockedFunction<typeof getAttendance>;
const mockGetUserDetail = getUserAttendanceDetail as jest.MockedFunction<typeof getUserAttendanceDetail>;

const meta = (total: number) => ({ total, page: 1, limit: 50, totalPages: 1 });

const response = {
  date: '2026-06-04',
  total_workers: 2,
  clocked_in_count: 1,
  clocked_in: {
    data: [
      {
        id: 'c1',
        username: 'satgas1',
        full_name: 'Clocked One',
        area: { id: 'a1', name: 'Area C' },
        clock_in_time: '2026-06-04T08:00:00Z',
        clock_out_time: null,
      },
    ],
    meta: meta(1),
  },
  not_clocked_in: {
    data: [{ id: 'n1', username: 'satgas2', full_name: 'Belum One', area: { id: 'a2', name: 'Area N' } }],
    meta: meta(1),
  },
};

describe('AttendanceDetailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAttendance.mockResolvedValue({ data: response } as any);
    mockGetUserDetail.mockResolvedValue({
      data: { date: '2026-06-04', user: { id: 'n1', username: 'satgas2', full_name: 'Belum One', role: 'satgas', area: null }, clocked_in: false, shift: null },
    } as any);
  });

  it('fetches today on open and shows both lists when no filter is active', async () => {
    const { getByTestId } = render(
      <AttendanceDetailModal visible onClose={jest.fn()} />,
    );
    await waitFor(() => expect(getByTestId('attendance-row-c1')).toBeTruthy());
    // both lists present by default
    expect(getByTestId('attendance-row-n1')).toBeTruthy();
    expect(mockGetAttendance).toHaveBeenCalled();
  });

  it('narrows to clocked-in when that tile is tapped, and clears on second tap', async () => {
    const { getByTestId, queryByTestId } = render(
      <AttendanceDetailModal visible onClose={jest.fn()} />,
    );
    await waitFor(() => expect(getByTestId('attendance-row-c1')).toBeTruthy());

    fireEvent.press(getByTestId('attendance-tab-clocked_in'));
    expect(getByTestId('attendance-row-c1')).toBeTruthy();
    expect(queryByTestId('attendance-row-n1')).toBeNull();

    // tap again → back to all
    fireEvent.press(getByTestId('attendance-tab-clocked_in'));
    expect(getByTestId('attendance-row-c1')).toBeTruthy();
    expect(getByTestId('attendance-row-n1')).toBeTruthy();
  });

  it('narrows to not-clocked-in when that tile is tapped', async () => {
    const { getByTestId, queryByTestId } = render(
      <AttendanceDetailModal visible onClose={jest.fn()} />,
    );
    await waitFor(() => expect(getByTestId('attendance-row-n1')).toBeTruthy());

    fireEvent.press(getByTestId('attendance-tab-not_clocked_in'));
    expect(getByTestId('attendance-row-n1')).toBeTruthy();
    expect(queryByTestId('attendance-row-c1')).toBeNull();
  });

  it('opens the per-user detail modal when a row is tapped', async () => {
    const { getByTestId } = render(
      <AttendanceDetailModal visible onClose={jest.fn()} />,
    );
    await waitFor(() => expect(getByTestId('attendance-row-n1')).toBeTruthy());

    fireEvent.press(getByTestId('attendance-row-n1'));

    await waitFor(() => expect(getByTestId('user-attendance-modal')).toBeTruthy());
    // date is the picker's current value (today) — assert the user id + a date string.
    expect(mockGetUserDetail).toHaveBeenCalledWith('n1', expect.any(String));
  });

  it('seeds from initialAttendance', async () => {
    const { getByTestId } = render(
      <AttendanceDetailModal visible onClose={jest.fn()} initialAttendance={response as any} />,
    );
    // rows present immediately from the seed (before/independent of the refetch)
    await waitFor(() => expect(getByTestId('attendance-row-c1')).toBeTruthy());
  });
});
