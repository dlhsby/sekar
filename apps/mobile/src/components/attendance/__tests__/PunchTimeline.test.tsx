import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PunchTimeline } from '../PunchTimeline';
import * as shiftsApi from '../../../services/api/shiftsApi';
import type { PunchLogDay } from '../../../types/api.types';

const day: PunchLogDay = {
  date: '2026-07-24',
  sessions: [
    {
      shift_definition_id: 'sd-1',
      is_overtime: false,
      jam_masuk: '2026-07-24T01:00:00.000Z',
      jam_keluar: '2026-07-24T09:00:00.000Z',
      worked_minutes: 480,
      is_open: false,
      punches: [
        {
          id: 'p1',
          label: 'clock_in',
          punched_at: '2026-07-24T01:00:00.000Z',
          gps_lat: -7.29,
          gps_lng: 112.73,
          accuracy_m: 10,
          outside_boundary: false,
          photo_url: null,
        },
        {
          id: 'p2',
          label: 'clock_out',
          punched_at: '2026-07-24T09:00:00.000Z',
          gps_lat: -7.29,
          gps_lng: 112.73,
          accuracy_m: 10,
          outside_boundary: true,
          photo_url: null,
        },
      ],
    },
  ],
};

describe('PunchTimeline', () => {
  it('renders a session with its clock-in and clock-out punches', async () => {
    jest
      .spyOn(shiftsApi, 'getPunchLog')
      .mockResolvedValue({ data: day, error: null } as any);

    const { getByTestId, getAllByTestId } = render(<PunchTimeline date="2026-07-24" />);

    await waitFor(() => expect(getByTestId('punch-session')).toBeTruthy());
    expect(getAllByTestId('punch-row-clock_in')).toHaveLength(1);
    expect(getAllByTestId('punch-row-clock_out')).toHaveLength(1);
  });

  it('renders nothing when the day has no punches', async () => {
    jest
      .spyOn(shiftsApi, 'getPunchLog')
      .mockResolvedValue({ data: { date: '2026-07-24', sessions: [] }, error: null } as any);

    const { queryByTestId } = render(<PunchTimeline date="2026-07-24" />);
    await waitFor(() => expect(queryByTestId('punch-session')).toBeNull());
  });
});
