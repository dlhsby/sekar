import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthCalendar } from '../MonthCalendar';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockOccurrence: ScheduleOccurrence = {
  id: '1',
  user_id: 'user-1',
  schedule_date: '2026-07-15',
  shift_definition_id: 'shift-1',
  scope: 'static',
  location_id: 'loc-1',
  is_detached: false,
  user: {
    id: 'user-1',
    full_name: 'John Doe',
    username: 'johndoe',
    role: 'satgas',
  },
  shift_definition: {
    id: 'shift-1',
    name: 'Shift 1',
    start_time: '06:00',
    end_time: '15:00',
  },
  location: {
    id: 'loc-1',
    name: 'Location 1',
  },
};

describe('MonthCalendar', () => {
  const defaultProps = {
    year: 2026,
    month: 6,
    occurrences: [mockOccurrence],
    onMonthChange: jest.fn(),
    onDayClick: jest.fn(),
    onOccurrenceClick: jest.fn(),
    today: '2026-07-12',
  };

  it('renders month calendar', () => {
    render(<MonthCalendar {...defaultProps} />);
    const cells = screen.getAllByText(/\d+/);
    expect(cells.length).toBeGreaterThan(0);
  });

  it('calls onMonthChange when prev button clicked', async () => {
    const user = userEvent.setup();
    render(<MonthCalendar {...defaultProps} />);
    const prevButton = screen.getByRole('button', { name: /schedules:calendar.navigation.prevMonth/i });
    await user.click(prevButton);
    expect(defaultProps.onMonthChange).toHaveBeenCalled();
  });

  it('calls onDayClick when day cell clicked', async () => {
    const user = userEvent.setup();
    render(<MonthCalendar {...defaultProps} />);
    const dayCell = screen.getAllByText('15')[0];
    await user.click(dayCell);
    expect(defaultProps.onDayClick).toHaveBeenCalledWith('2026-07-15');
  });

  it('displays occurrence chips', () => {
    render(<MonthCalendar {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
