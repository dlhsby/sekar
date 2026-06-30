import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MyScheduleScreen } from '../MyScheduleScreen';
import * as schedulesApi from '../../../services/api/schedulesApi';

jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children ?? null,
}));

// Mutable auth slice mirror so individual tests can vary the assigned areas.
const mockAuthState: { user: { id: string }; assignedAreas: any[] } = {
  user: { id: 'user-1' },
  assignedAreas: [],
};
jest.mock('../../../store/hooks', () => ({
  useAppSelector: (selector: any) => selector({ auth: mockAuthState }),
}));

const activeSchedule: any = {
  id: 'sch-active',
  user_id: 'user-1',
  area_id: 'area-1',
  shift_definition_id: 'shift-1',
  effective_date: '2020-01-01',
  end_date: undefined,
  area: { name: 'Taman Bungkul' },
  shift_definition: { name: 'Shift Pagi', start_time: '06:00:00', end_time: '15:00:00' },
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
};

const endedSchedule: any = {
  id: 'sch-ended',
  user_id: 'user-1',
  area_id: 'area-2',
  shift_definition_id: 'shift-2',
  effective_date: '2020-01-01',
  end_date: '2020-02-01',
  area: { name: 'Taman Flora' },
  shift_definition: { name: 'Shift Siang', start_time: '15:00:00', end_time: '23:00:00' },
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
};

describe('MyScheduleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.assignedAreas = [];
    // Default: no derived current schedule (explicit rows drive the tests).
    jest.spyOn(schedulesApi, 'getMySchedule').mockResolvedValue({ data: null } as any);
    // Default: no roster for today
    jest.spyOn(schedulesApi, 'getMyRoster').mockResolvedValue({ data: null } as any);
  });

  it('renders the worker schedules with area, shift window and status', async () => {
    jest
      .spyOn(schedulesApi, 'getMySchedules')
      .mockResolvedValue({ data: [endedSchedule, activeSchedule] } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Taman Bungkul')).toBeTruthy());
    expect(schedulesApi.getMySchedules).toHaveBeenCalledWith('user-1');
    // Shift window is normalised to HH:MM.
    expect(getByText('Shift Pagi · 06:00–15:00')).toBeTruthy();
    expect(getByText('Taman Flora')).toBeTruthy();
    // The ongoing schedule is flagged active; the past one is done.
    expect(getByText('Aktif')).toBeTruthy();
    expect(getByText('Selesai')).toBeTruthy();
  });

  it('shows an ad-hoc empty state when the worker has no areas or schedules', async () => {
    jest.spyOn(schedulesApi, 'getMySchedules').mockResolvedValue({ data: [] } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Tanpa area tetap')).toBeTruthy());
  });

  it('derives schedule cards from assigned areas + the worker shift', async () => {
    jest.spyOn(schedulesApi, 'getMySchedules').mockResolvedValue({ data: [] } as any);
    jest.spyOn(schedulesApi, 'getMySchedule').mockResolvedValue({
      data: { shift_definition: { id: 's1', name: 'Shift Pagi', start_time: '06:00:00', end_time: '15:00:00' } },
    } as any);
    mockAuthState.assignedAreas = [
      { id: 'area-1', name: 'Taman Bungkul' },
      { id: 'area-2', name: 'Taman Flora' },
    ];

    const { getByText, getAllByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Taman Bungkul')).toBeTruthy());
    expect(getByText('Taman Flora')).toBeTruthy();
    // Both area cards show the worker's single shift.
    expect(getAllByText('Shift Pagi · 06:00–15:00').length).toBe(2);
  });

  it('surfaces an error state when the request fails', async () => {
    jest
      .spyOn(schedulesApi, 'getMySchedules')
      .mockResolvedValue({ error: 'Gagal memuat' } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Gagal memuat jadwal')).toBeTruthy());
  });

  it('displays the daily roster when available (Phase 3)', async () => {
    const todayRoster: any = {
      id: 'roster-today',
      user_id: 'user-1',
      schedule_date: '2020-01-01',
      status: 'present',
      shift_definition: {
        id: 'shift-1',
        name: 'Shift Pagi Roster',
        start_time: '06:00',
        end_time: '15:00',
      },
      rayon: { id: 'rayon-1', name: 'Rayon 1' },
      daily_schedule_areas: [
        {
          id: 'dsa-1',
          area_id: 'area-2',
          area: { id: 'area-2', name: 'Taman Roster', code: 'TR' },
        },
      ],
    };

    jest
      .spyOn(schedulesApi, 'getMySchedules')
      .mockResolvedValue({ data: [activeSchedule] } as any);
    jest
      .spyOn(schedulesApi, 'getMyRoster')
      .mockResolvedValue({ data: todayRoster } as any);

    const { getByText, queryByTestId } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Jadwal Hari Ini')).toBeTruthy());
    expect(getByText('Hadir')).toBeTruthy();
    // Verify the roster was fetched
    expect(schedulesApi.getMyRoster).toHaveBeenCalled();
  });

  it('falls back to explicit schedules when no roster is available', async () => {
    jest
      .spyOn(schedulesApi, 'getMySchedules')
      .mockResolvedValue({ data: [activeSchedule] } as any);
    jest
      .spyOn(schedulesApi, 'getMyRoster')
      .mockResolvedValue({ data: null } as any);

    const { getByText, queryByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Taman Bungkul')).toBeTruthy());
    expect(queryByText('Jadwal Hari Ini')).toBeNull();
    expect(getByText('Aktif')).toBeTruthy();
  });
});
