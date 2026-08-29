/**
 * Unit Tests: AttendanceDetailDialog (parity W3)
 *
 * The web half of the attendance drill-down mobile has had since Phase 4.
 * Covers the two levels (list → one worker's sessions), the side toggle, and
 * the day stepper's one rule: never forward past today.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AttendanceDetailDialog } from '../AttendanceDetailDialog';

const mockUseAttendance = jest.fn();
const mockUseUserAttendance = jest.fn();

jest.mock('@/lib/api/monitoring', () => ({
  useMonitoringAttendance: (...args: unknown[]) => mockUseAttendance(...args),
  useUserAttendance: (...args: unknown[]) => mockUseUserAttendance(...args),
}));

const ATTENDANCE = {
  date: '2026-03-05',
  total_workers: 3,
  clocked_in_count: 2,
  clocked_in: {
    data: [
      {
        id: 'u1',
        username: 'satgas1',
        full_name: 'Budi Santoso',
        role: 'satgas',
        area: { id: 'a1', name: 'Taman Bungkul' },
        clock_in_time: '2026-03-05T01:00:00.000Z',
        clock_out_time: null,
      },
      {
        id: 'u2',
        username: 'linmas1',
        full_name: 'Siti Aminah',
        role: 'linmas',
        area: null,
        clock_in_time: '2026-03-05T02:00:00.000Z',
        clock_out_time: '2026-03-05T09:00:00.000Z',
      },
    ],
    meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
  },
  not_clocked_in: {
    data: [
      {
        id: 'u3',
        username: 'satgas9',
        full_name: 'Joko Absent',
        role: 'satgas',
        area: { id: 'a2', name: 'Taman Flora' },
      },
    ],
    meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
  },
};

function setup(over?: { attendance?: unknown; detail?: unknown }) {
  mockUseAttendance.mockReturnValue(
    over?.attendance ?? { data: ATTENDANCE, isLoading: false, isError: false },
  );
  mockUseUserAttendance.mockReturnValue(
    over?.detail ?? { data: undefined, isLoading: false, isError: false },
  );
  return render(<AttendanceDetailDialog open onOpenChange={jest.fn()} />);
}

describe('AttendanceDetailDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-05T03:00:00Z')); // 10:00 WIB
  });
  afterEach(() => jest.useRealTimers());

  it('lists the clocked-in workers by default', () => {
    setup();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
    expect(screen.queryByText('Joko Absent')).not.toBeInTheDocument();
  });

  it('shows both counts, deriving the absent side from the roster', () => {
    setup();
    expect(screen.getByTestId('attendance-tile-clocked_in')).toHaveTextContent('2');
    // 3 on the roster - 2 present = 1 absent.
    expect(screen.getByTestId('attendance-tile-not_clocked_in')).toHaveTextContent('1');
  });

  it('switches to the not-clocked-in side', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setup();

    await user.click(screen.getByTestId('attendance-tile-not_clocked_in'));

    expect(screen.getByText('Joko Absent')).toBeInTheDocument();
    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
  });

  it('opens one worker and asks for their sessions', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setup({
      detail: {
        data: {
          date: '2026-03-05',
          user: {
            id: 'u1',
            username: 'satgas1',
            full_name: 'Budi Santoso',
            role: 'satgas',
            area: { id: 'a1', name: 'Taman Bungkul' },
          },
          clocked_in: true,
          shifts: [
            {
              id: 's1',
              clock_in_time: '2026-03-05T01:00:00.000Z',
              clock_out_time: '2026-03-05T04:00:00.000Z',
              duration_minutes: 180,
              clock_in_outside_boundary: false,
              clock_out_outside_boundary: false,
            },
          ],
        },
        isLoading: false,
      },
    });

    await user.click(screen.getByTestId('attendance-row-u1'));

    await waitFor(() => expect(screen.getByTestId('attendance-back')).toBeInTheDocument());
    expect(mockUseUserAttendance).toHaveBeenCalledWith('u1', '2026-03-05');
  });

  it('flags a session recorded outside the area boundary', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setup({
      detail: {
        data: {
          date: '2026-03-05',
          user: { id: 'u1', username: 'satgas1', full_name: 'Budi', role: 'satgas', area: null },
          clocked_in: true,
          shifts: [
            {
              id: 's1',
              clock_in_time: '2026-03-05T01:00:00.000Z',
              clock_out_time: null,
              duration_minutes: null,
              clock_in_outside_boundary: true,
              clock_out_outside_boundary: false,
            },
          ],
        },
        isLoading: false,
      },
    });

    await user.click(screen.getByTestId('attendance-row-u1'));

    expect(screen.getByText(/di luar batas area/i)).toBeInTheDocument();
  });

  describe('day stepping', () => {
    it('cannot step past today', () => {
      setup();
      expect(screen.getByTestId('attendance-next-day')).toBeDisabled();
    });

    it('steps back and refetches for the earlier day', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      setup();

      await user.click(screen.getByTestId('attendance-prev-day'));

      await waitFor(() =>
        expect(mockUseAttendance).toHaveBeenLastCalledWith('2026-03-04', 1, true),
      );
      expect(screen.getByTestId('attendance-next-day')).not.toBeDisabled();
    });
  });

  it('renders an error state when the fetch fails', () => {
    setup({ attendance: { data: undefined, isLoading: false, isError: true } });
    expect(screen.queryByTestId('attendance-tile-clocked_in')).not.toBeInTheDocument();
  });
});
