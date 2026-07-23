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

// The day view defaults to "today", so the roster must be dated today to render.
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const todayRoster: any = {
  id: 'roster-today',
  user_id: 'user-1',
  schedule_date: todayKey(),
  status: 'present',
  shift_definition: {
    id: 'shift-1',
    name: 'Shift Pagi',
    start_time: '06:00:00',
    end_time: '15:00:00',
  },
  district: { id: 'district-1', name: 'Rayon 1' },
  location_id: 'area-2',
  location: { id: 'area-2', name: 'Taman Roster' },
};

describe('MyScheduleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(schedulesApi, 'getMyRange').mockResolvedValue({ data: [] } as any);
  });

  it("displays today's roster (status, shift, time, areas, district)", async () => {
    jest.spyOn(schedulesApi, 'getMyRange').mockResolvedValue({ data: [todayRoster] } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Shift Pagi')).toBeTruthy());
    expect(getByText('Hadir')).toBeTruthy();
    // Shift window is normalised to HH:MM.
    expect(getByText('06:00–15:00')).toBeTruthy();
    expect(getByText('Taman Roster')).toBeTruthy();
    expect(getByText('Rayon 1')).toBeTruthy();
    expect(schedulesApi.getMyRange).toHaveBeenCalled();
  });

  it('shows team context and a projected tag when present', async () => {
    const teamProjected = {
      ...todayRoster,
      id: 'roster-team',
      is_projected: true,
      team_category: { id: 'tc-1', name: 'Perawatan' },
    };
    jest.spyOn(schedulesApi, 'getMyRange').mockResolvedValue({ data: [teamProjected] } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Tim: Perawatan')).toBeTruthy());
    expect(getByText('Rencana')).toBeTruthy();
  });

  it('shows an empty state when there is no roster for today', async () => {
    jest.spyOn(schedulesApi, 'getMyRange').mockResolvedValue({ data: [] } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Belum ada jadwal hari ini')).toBeTruthy());
  });

  it('surfaces an error state when the request fails', async () => {
    jest.spyOn(schedulesApi, 'getMyRange').mockResolvedValue({ error: 'Gagal memuat' } as any);

    const { getByText } = render(<MyScheduleScreen />);

    await waitFor(() => expect(getByText('Gagal memuat jadwal')).toBeTruthy());
  });
});
