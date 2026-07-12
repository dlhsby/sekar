/**
 * UserAttendanceModal tests — Phase 4 M3 (CP3).
 *
 * Per-user attendance detail modal. Covers: fetch on open, clocked-in detail
 * (pill + clock-in/out + duration), not-clocked-in state, and error fallback.
 * The supervisor API is mocked; gorhom bottom-sheet is stubbed globally.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { UserAttendanceModal } from '../UserAttendanceModal';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

jest.mock('../../../services/api/monitoringApi');
import { getUserAttendanceDetail } from '../../../services/api/monitoringApi';
const mockGet = getUserAttendanceDetail as jest.MockedFunction<typeof getUserAttendanceDetail>;

const clockedInDetail = {
  date: '2026-06-04',
  user: {
    id: 'u1',
    username: 'satgas1',
    full_name: 'Ahmad Satgas',
    role: 'satgas',
    location: { id: 'a1', name: 'Taman Bungkul' },
  },
  clocked_in: true,
  shift: {
    id: 's1',
    clock_in_time: '2026-06-04T08:00:00Z',
    clock_out_time: '2026-06-04T16:00:00Z',
    duration_minutes: 480,
    clock_in_outside_boundary: false,
    clock_out_outside_boundary: false,
  },
};

describe('UserAttendanceModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches and renders clocked-in detail', async () => {
    mockGet.mockResolvedValue({ data: clockedInDetail } as any);

    const { getByText } = render(
      <UserAttendanceModal visible userId="u1" userName="Ahmad Satgas" date="2026-06-04" onClose={jest.fn()} />,
    );

    await waitFor(() => expect(getByText('Sudah Clock In')).toBeTruthy());
    expect(mockGet).toHaveBeenCalledWith('u1', '2026-06-04');
    expect(getByText('Clock In')).toBeTruthy();
    expect(getByText('Durasi')).toBeTruthy();
    expect(getByText('8j 0m')).toBeTruthy();
  });

  it('renders the not-clocked-in state', async () => {
    mockGet.mockResolvedValue({
      data: { ...clockedInDetail, clocked_in: false, shift: null },
    } as any);

    const { getByText } = render(
      <UserAttendanceModal visible userId="u2" date="2026-06-04" onClose={jest.fn()} />,
    );

    await waitFor(() => expect(getByText('Belum Clock In')).toBeTruthy());
    expect(getByText('Belum clock in pada tanggal ini.')).toBeTruthy();
  });

  it('shows an error fallback when the fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('boom'));

    const { getByText } = render(
      <UserAttendanceModal visible userId="u3" date="2026-06-04" onClose={jest.fn()} />,
    );

    await waitFor(() => expect(getByText('Gagal memuat detail kehadiran.')).toBeTruthy());
  });

  it('does not fetch when no user is selected', () => {
    render(<UserAttendanceModal visible userId={null} date="2026-06-04" onClose={jest.fn()} />);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
