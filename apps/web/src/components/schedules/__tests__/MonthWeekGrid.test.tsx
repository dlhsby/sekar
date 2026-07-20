/**
 * Unit tests: MonthGrid + WeekGrid.
 *
 * Both switch body rendering on `subjectFiltered` (a personal chip calendar vs a
 * per-district coverage summary), and MonthGrid must NOT let you create on a
 * spill-over day belonging to the neighbouring month.
 *
 * "Today" is the WIB (Jakarta) day, not the browser's local day — mocked here so
 * the assertion is deterministic wherever the suite runs.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthGrid } from '../MonthGrid';
import { WeekGrid } from '../WeekGrid';
import { todayJakartaISODate } from '@/lib/utils/formatters';
import type { BoardMasterData } from '@/lib/schedules/dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

jest.mock('@/lib/utils/formatters', () => ({
  ...jest.requireActual('@/lib/utils/formatters'),
  todayJakartaISODate: jest.fn(),
}));

const master: BoardMasterData = {
  districts: [{ id: 'ry1', name: 'Rayon Pusat' }],
  regions: [],
  locations: [{ id: 'loc1', name: 'Taman Bungkul', district_id: 'ry1', region_id: null }],
  shifts: [{ id: 's1', name: 'Shift 1', start_time: '06:00:00', end_time: '15:00:00' }],
};

const occ = (date: string, name = 'Budi'): ScheduleOccurrence =>
  ({
    id: `occ-${date}-${name}`,
    user_id: 'u1',
    schedule_date: date,
    shift_definition_id: 's1',
    scope: 'static',
    status: 'planned',
    is_detached: false,
    location_id: 'loc1',
    district_id: 'ry1',
    user: { id: 'u1', full_name: name, username: 'budi', role: 'satgas' },
    shift_definition: { id: 's1', name: 'Shift 1' },
  }) as ScheduleOccurrence;

beforeEach(() => {
  (todayJakartaISODate as jest.Mock).mockReturnValue('2026-07-15');
});

describe('MonthGrid', () => {
  const JULY = new Date(2026, 6, 1);

  const setup = (props: Partial<React.ComponentProps<typeof MonthGrid>> = {}) => {
    const onDayClick = jest.fn();
    const onOccurrenceClick = jest.fn();
    render(
      <MonthGrid
        occurrences={[]}
        currentMonth={JULY}
        master={master}
        onDayClick={onDayClick}
        onOccurrenceClick={onOccurrenceClick}
        {...props}
      />
    );
    return { onDayClick, onOccurrenceClick };
  };

  it('opens a day inside the month', async () => {
    const user = userEvent.setup();
    const { onDayClick } = setup();

    await user.click(screen.getByText('13'));

    expect(onDayClick).toHaveBeenCalledTimes(1);
    expect(onDayClick.mock.calls[0][0].getDate()).toBe(13);
  });

  it('does not open a spill-over day from the neighbouring month', async () => {
    const user = userEvent.setup();
    const { onDayClick } = setup();

    // July 2026 starts on a Wednesday, so the grid leads with Jun 29/30 — the
    // first of the two "29"s. It is muted, which confirms we picked that one.
    const spill = screen.getAllByText('29')[0];
    expect(spill.className).toContain('text-nb-gray-400');

    await user.click(spill);

    expect(onDayClick).not.toHaveBeenCalled();
  });

  it('highlights the WIB today, not the browser local day', () => {
    setup();
    // The mocked Jakarta today is 2026-07-15.
    expect(screen.getByText('15').className).toContain('text-nb-primary');
    expect(screen.getByText('14').className).not.toContain('text-nb-primary');
  });

  it('shows worker chips when a single subject is filtered', async () => {
    const user = userEvent.setup();
    const { onOccurrenceClick } = setup({
      occurrences: [occ('2026-07-13')],
      subjectFiltered: true,
    });

    expect(screen.getByText('Budi')).toBeInTheDocument();
    await user.click(screen.getByText('Budi'));
    expect(onOccurrenceClick).toHaveBeenCalled();
  });

  it('shows a per-district coverage summary instead of chips by default', () => {
    setup({ occurrences: [occ('2026-07-13')], subjectFiltered: false });

    // Coverage mode names the district, not the individual worker.
    expect(screen.queryByText('Budi')).not.toBeInTheDocument();
    expect(screen.getByText(/Rayon Pusat/)).toBeInTheDocument();
  });
});

describe('WeekGrid', () => {
  const IN_WEEK = new Date(2026, 6, 15); // Wed 15 Jul 2026

  const setup = (props: Partial<React.ComponentProps<typeof WeekGrid>> = {}) => {
    const onDayClick = jest.fn();
    const onOccurrenceClick = jest.fn();
    render(
      <WeekGrid
        occurrences={[]}
        currentDate={IN_WEEK}
        master={master}
        onDayClick={onDayClick}
        onOccurrenceClick={onOccurrenceClick}
        {...props}
      />
    );
    return { onDayClick, onOccurrenceClick };
  };

  /** The coverage row for a district; cell 0 is its label, cells 1–7 are Mon–Sun. */
  const districtRow = (name: string) => screen.getByText(name).closest('tr')!;

  describe('coverage grid (no subject filter)', () => {
    it('renders the Monday-first week containing the date', () => {
      setup();
      // Mon 13 → Sun 19 July.
      for (const d of ['13', '14', '15', '16', '17', '18', '19']) {
        expect(screen.getByText(d)).toBeInTheDocument();
      }
    });

    it('lists a district even when it has no schedule at all, so gaps are visible', () => {
      setup();
      const row = districtRow('Rayon Pusat');
      // Every day cell reads as empty rather than the row being dropped.
      expect(within(row).getAllByText('–')).toHaveLength(7);
    });

    it('opens the day belonging to the cell that was clicked', async () => {
      const user = userEvent.setup();
      const { onDayClick } = setup();

      // Cell index 3 = the 3rd day column (Wed 15), since cell 0 is the label.
      await user.click(within(districtRow('Rayon Pusat')).getAllByRole('cell')[3]);

      expect(onDayClick).toHaveBeenCalledTimes(1);
      expect(onDayClick.mock.calls[0][0].getDate()).toBe(15);
    });

    it('summarizes a cell by shift and role rather than naming people', () => {
      setup({ occurrences: [occ('2026-07-15')] });
      const row = districtRow('Rayon Pusat');

      expect(within(row).getByText('S1')).toBeInTheDocument();
      expect(within(row).getByText(/Satgas/i)).toBeInTheDocument();
      expect(within(row).queryByText('Budi')).not.toBeInTheDocument();
    });
  });

  describe('chip strip (single subject filtered)', () => {
    it('names the people scheduled on a day', () => {
      setup({ occurrences: [occ('2026-07-15')], subjectFiltered: true });
      expect(screen.getByText('Budi')).toBeInTheDocument();
    });

    it('opens a day', async () => {
      const user = userEvent.setup();
      const { onDayClick } = setup({ subjectFiltered: true });

      await user.click(screen.getByRole('button', { name: /16/ }));

      expect(onDayClick).toHaveBeenCalledTimes(1);
      expect(onDayClick.mock.calls[0][0].getDate()).toBe(16);
    });

    it('caps a day at three chips and counts the overflow', () => {
      setup({
        occurrences: ['Adi', 'Budi', 'Citra', 'Dewi', 'Eka'].map((n) => occ('2026-07-15', n)),
        subjectFiltered: true,
      });

      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.queryByText('Eka')).not.toBeInTheDocument();
    });
  });
});
