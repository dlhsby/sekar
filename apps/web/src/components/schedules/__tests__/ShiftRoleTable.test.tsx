/**
 * Unit tests: ShiftRoleTable — the shared roster layout every board container
 * renders (rayon placement, kawasan placement, location).
 *
 * The contract: every shift renders even when empty, the core role columns
 * always exist so an empty one can be filled, and "+ Tugaskan" reports the
 * (shiftId, role) it was clicked in — DayBoard binds the geography onto that.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShiftRoleTable } from '../ShiftRoleTable';
import type { BoardShiftGroup } from '@/lib/schedules/dayBoard';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

const occ = (o: Partial<ScheduleOccurrence> & { name: string }): ScheduleOccurrence =>
  ({
    id: `occ-${o.name}`,
    user_id: `u-${o.name}`,
    schedule_date: '2026-07-13',
    shift_definition_id: 's1',
    scope: 'static',
    status: 'planned',
    is_detached: false,
    user: { id: `u-${o.name}`, full_name: o.name, username: o.name, role: 'satgas' },
    shift_definition: null,
    ...o,
  }) as ScheduleOccurrence;

const group = (o: Partial<BoardShiftGroup> = {}): BoardShiftGroup =>
  ({
    shift: { id: 's1', name: 'Shift 1', start_time: '06:00:00', end_time: '15:00:00' },
    byRole: {},
    teams: [],
    total: 0,
    countable: 0,
    ...o,
  }) as BoardShiftGroup;

/** The column card for a role — find its header then walk to the card. */
const column = (label: RegExp) => screen.getByText(label).closest('div')!.parentElement!;

describe('ShiftRoleTable', () => {
  it('renders a block per shift with its time window, even when empty', () => {
    render(
      <ShiftRoleTable
        shifts={[
          group(),
          group({
            shift: { id: 's2', name: 'Shift 2', start_time: '15:00:00', end_time: '23:00:00' },
          }),
        ]}
        onOccurrenceClick={jest.fn()}
      />
    );

    expect(screen.getByText(/Shift 1 · 06:00–15:00/)).toBeInTheDocument();
    expect(screen.getByText(/Shift 2 · 15:00–23:00/)).toBeInTheDocument();
  });

  it('always renders the core role columns so an empty one can be filled', () => {
    render(<ShiftRoleTable shifts={[group()]} onOccurrenceClick={jest.fn()} />);

    expect(screen.getByText('Satgas')).toBeInTheDocument();
    expect(screen.getByText('Linmas')).toBeInTheDocument();
    expect(screen.getByText('Koordinator Lapangan')).toBeInTheDocument();
  });

  it('appends a column for a non-core role that is present', () => {
    render(
      <ShiftRoleTable
        shifts={[group({ byRole: { linmas_khusus: [occ({ name: 'Dewi' })] } })]}
        onOccurrenceClick={jest.fn()}
      />
    );
    expect(screen.getByText('linmas_khusus')).toBeInTheDocument();
    expect(screen.getByText('Dewi')).toBeInTheDocument();
  });

  it('sorts people alphabetically within a column and shows the count', () => {
    render(
      <ShiftRoleTable
        shifts={[
          group({
            byRole: {
              satgas: [occ({ name: 'Zainal' }), occ({ name: 'Adi' }), occ({ name: 'Made' })],
            },
          }),
        ]}
        onOccurrenceClick={jest.fn()}
      />
    );

    const col = column(/^Satgas$/);
    expect(within(col).getByText('3')).toBeInTheDocument();
    const names = within(col)
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(names).toEqual(['Adi', 'Made', 'Zainal']);
  });

  it('clicking a person reports that occurrence', async () => {
    const user = userEvent.setup();
    const onOccurrenceClick = jest.fn();
    const budi = occ({ name: 'Budi' });
    render(
      <ShiftRoleTable shifts={[group({ byRole: { satgas: [budi] } })]} onOccurrenceClick={onOccurrenceClick} />
    );

    await user.click(screen.getByRole('button', { name: 'Budi' }));
    expect(onOccurrenceClick).toHaveBeenCalledWith(budi);
  });

  it('marks a detached (edited-once) occurrence', () => {
    render(
      <ShiftRoleTable
        shifts={[group({ byRole: { satgas: [occ({ name: 'Budi', is_detached: true })] } })]}
        onOccurrenceClick={jest.fn()}
      />
    );
    expect(screen.getByText('✎')).toBeInTheDocument();
  });

  it('"+ Tugaskan" reports the shift and role it was clicked in', async () => {
    const user = userEvent.setup();
    const onAssign = jest.fn();
    render(
      <ShiftRoleTable shifts={[group()]} onOccurrenceClick={jest.fn()} canAssign onAssign={onAssign} />
    );

    // One per role column; the second is Linmas.
    await user.click(within(column(/^Linmas$/)).getByRole('button', { name: /tugaskan/i }));
    expect(onAssign).toHaveBeenCalledWith('s1', 'linmas');
  });

  it('renders no assign affordance when canAssign is false', () => {
    render(<ShiftRoleTable shifts={[group()]} onOccurrenceClick={jest.fn()} onAssign={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /tugaskan/i })).not.toBeInTheDocument();
  });

  it('renders the team column only when the shift has teams', () => {
    const { rerender } = render(
      <ShiftRoleTable shifts={[group()]} onOccurrenceClick={jest.fn()} />
    );
    expect(screen.queryByText('Tim')).not.toBeInTheDocument();

    rerender(
      <ShiftRoleTable
        shifts={[
          group({
            teams: [{ eventId: 'e1', name: 'Tim Patroli', count: 4, markerColor: null }],
          }),
        ]}
        onOccurrenceClick={jest.fn()}
      />
    );
    expect(screen.getByText('Tim')).toBeInTheDocument();
    expect(screen.getByText('Tim Patroli')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
