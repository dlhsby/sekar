import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MyScheduleScreen } from '../MyScheduleScreen';
import * as schedulesApi from '../../../services/api/schedulesApi';

jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children ?? null,
}));

const mockAuthState: { user: { id: string } } = {
  user: { id: 'user-1' },
};
jest.mock('../../../store/hooks', () => ({
  useAppSelector: (selector: any) => selector({ auth: mockAuthState }),
}));

const todayRoster: any = {
  id: 'roster-today',
  user_id: 'user-1',
  schedule_date: '2020-01-01',
  status: 'present',
  shift_definition: {
    id: 'shift-1',
    name: 'Shift Pagi',
    start_time: '06:00:00',
    end_time: '15:00:00',
  },
  rayon: { id: 'rayon-1', name: 'Rayon 1' },
  schedule_areas: [
    { id: 'sa-1', area_id: 'area-2', area: { id: 'area-2', name: 'Taman Roster' } },
  ],
};

describe('MyScheduleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(schedulesApi, 'getMyRoster').mockResolvedValue({ data: null } as any);
  });

  it('displays the daily roster (status, shift window, areas, rayon)', async () => {
    jest.spyOn(schedulesApi, 'getMyRoster').mockResolvedValue({ data: todayRoster } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Jadwal Hari Ini')).toBeTruthy());
    expect(getByText('Hadir')).toBeTruthy();
    // Shift window is normalised to HH:MM.
    expect(getByText('Shift Pagi · 06:00–15:00')).toBeTruthy();
    expect(getByText('Taman Roster')).toBeTruthy();
    expect(getByText('Rayon 1')).toBeTruthy();
    expect(schedulesApi.getMyRoster).toHaveBeenCalled();
  });

  it('shows an empty state when there is no roster for today', async () => {
    jest.spyOn(schedulesApi, 'getMyRoster').mockResolvedValue({ data: null } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Belum ada jadwal hari ini')).toBeTruthy());
  });

  it('surfaces an error state when the request fails', async () => {
    jest.spyOn(schedulesApi, 'getMyRoster').mockResolvedValue({ error: 'Gagal memuat' } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Gagal memuat jadwal')).toBeTruthy());
  });
});
