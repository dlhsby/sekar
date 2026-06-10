/**
 * Unit Tests: ScheduleWeeklyGrid (SCH-1)
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScheduleWeeklyGrid } from '../ScheduleWeeklyGrid';
import type { WorkerSchedule } from '@/types/models';

// Week of Mon 2026-05-18 .. Sun 2026-05-24
const weekStart = new Date(2026, 4, 18);

const shift = {
  id: 'sh1',
  name: 'Pagi',
  code: 'SHIFT1',
  start_time: '06:00:00',
  end_time: '14:00:00',
  crosses_midnight: false,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const schedule: WorkerSchedule = {
  id: 'sc1',
  user_id: 'u1',
  user: {
    id: 'u1',
    username: 'budi',
    full_name: 'Budi Santoso',
    role: 'satgas',
    created_at: '2026-01-01T00:00:00Z',
  } as WorkerSchedule['user'],
  area_id: 'a1',
  shift_definition_id: 'sh1',
  shift_definition: shift,
  effective_date: '2026-05-01',
  end_date: '2026-05-20', // covers Mon..Wed of the test week, not Thu+
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
};

describe('ScheduleWeeklyGrid', () => {
  it('shows a loading skeleton', () => {
    const { container } = render(
      <ScheduleWeeklyGrid schedules={[]} weekStart={weekStart} loading />,
    );
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });

  it('shows an empty message when there are no schedules', () => {
    render(<ScheduleWeeklyGrid schedules={[]} weekStart={weekStart} />);
    expect(screen.getByText(/tidak ada jadwal untuk minggu ini/i)).toBeInTheDocument();
  });

  it('renders a worker row with the shift chip on covered days and libur otherwise', () => {
    render(<ScheduleWeeklyGrid schedules={[schedule]} weekStart={weekStart} />);
    // Worker name appears (desktop + mobile render → multiple)
    expect(screen.getAllByText('Budi Santoso').length).toBeGreaterThan(0);
    // Covered days (Mon 18, Tue 19, Wed 20) show the 06:00–14:00 chip.
    expect(screen.getAllByText('06:00–14:00').length).toBeGreaterThan(0);
    // Days past end_date (Thu 21 onward) read "libur".
    expect(screen.getAllByText(/libur/i).length).toBeGreaterThan(0);
  });

  it('renders the seven day-of-week headers', () => {
    render(<ScheduleWeeklyGrid schedules={[schedule]} weekStart={weekStart} />);
    ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'].forEach((d) => {
      expect(screen.getAllByText(d).length).toBeGreaterThan(0);
    });
  });
});
