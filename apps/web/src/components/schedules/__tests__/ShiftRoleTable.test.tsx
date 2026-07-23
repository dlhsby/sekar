/**
 * Unit tests: ShiftRoleTable — the shared roster layout every board container
 * renders (district assignment, kawasan assignment, location).
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
    countableByRole: {},
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
    expect(screen.getByText('Korlap')).toBeInTheDocument();
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

  // A team is a COMBINATION of roles, so it can't be filed under satgas or
  // linmas — it gets a column of its own, always present like the core roles.
  // Rendering it only once populated meant a team had nowhere to be assigned
  // FROM, so the column never appeared: the same chicken-and-egg the district and
  // kawasan assign tables had.
  // A lokasi is handed roleTargets but NO roleCounts (its own group is the whole
  // subject). Before the fix the column counted its own rows — individuals only —
  // so a team-staffed lokasi read 0/10 while the pill above it read 5/10.
  describe('team members count toward a role target', () => {
    it('counts team members at a lokasi, which is handed no roleCounts', () => {
      render(
        <ShiftRoleTable
          shifts={[
            group({
              byRole: {},
              countableByRole: { satgas: 5 },
              teams: [
                { eventId: 'e1', name: 'Tim Patroli', count: 5, markerColor: null, occurrences: [] },
              ],
              countable: 5,
              total: 5,
            }),
          ]}
          onOccurrenceClick={jest.fn()}
          roleTargets={new Map([['s1:satgas', 10]])}
        />
      );

      expect(within(column(/satgas/i)).getByText('5/10')).toBeInTheDocument();
    });

    it('still lets a subtree roleCounts win, for a kawasan/district', () => {
      render(
        <ShiftRoleTable
          shifts={[group({ countableByRole: { satgas: 2 } })]}
          onOccurrenceClick={jest.fn()}
          roleTargets={new Map([['s1:satgas', 10]])}
          roleCounts={new Map([['s1:satgas', 8]])}
        />
      );

      // 8 (the subtree) — not 2 (this container's own).
      expect(within(column(/satgas/i)).getByText('8/10')).toBeInTheDocument();
    });
  });

  describe('Tim column', () => {
    const team = (o = {}) => ({
      eventId: 'e1',
      name: 'Tim Patroli',
      count: 4,
      markerColor: null,
      occurrences: [],
      ...o,
    });

    it('renders even when the shift has no teams yet', () => {
      render(<ShiftRoleTable shifts={[group()]} onOccurrenceClick={jest.fn()} />);

      expect(screen.getByText('Tim')).toBeInTheDocument();
    });

    it('lists a team with its member count', () => {
      render(<ShiftRoleTable shifts={[group({ teams: [team()] })]} onOccurrenceClick={jest.fn()} />);

      expect(screen.getByText('Tim Patroli')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('offers "+ Tugaskan" so a team can be assigned into an empty shift', async () => {
      const onAssignTeam = jest.fn();
      const user = userEvent.setup();
      render(
        <ShiftRoleTable
          shifts={[group()]}
          onOccurrenceClick={jest.fn()}
          canAssign
          onAssignTeam={onAssignTeam}
        />
      );

      const timCard = screen.getByText('Tim').closest('div')!.parentElement as HTMLElement;
      await user.click(within(timCard).getByRole('button', { name: /tugaskan/i }));

      expect(onAssignTeam).toHaveBeenCalledWith('s1');
    });

    it('opens the detail modal when a team row is clicked', async () => {
      // This row used to be a dead button — individuals opened a detail, teams
      // did nothing. Any member resolves the same team event.
      const member = { id: 'occ-1', user: { full_name: 'Budi' } } as never;
      const onOccurrenceClick = jest.fn();
      const user = userEvent.setup();
      render(
        <ShiftRoleTable
          shifts={[group({ teams: [team({ occurrences: [member] })] })]}
          onOccurrenceClick={onOccurrenceClick}
        />
      );

      await user.click(screen.getByText('Tim Patroli'));

      expect(onOccurrenceClick).toHaveBeenCalledWith(member);
    });
  });
});
