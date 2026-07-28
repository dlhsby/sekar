/**
 * Unit tests: OccurrenceChip.
 *
 * Two contracts worth pinning: a chip lives inside a clickable day cell, so its
 * click must NOT bubble up and also fire the cell's "create on this day"
 * handler; and a projected occurrence (not yet materialized) must be
 * non-actionable when `hideProjectedAction` is set.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OccurrenceChip } from '../OccurrenceChip';
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

const occ = (o: Partial<ScheduleOccurrence> = {}): ScheduleOccurrence =>
  ({
    id: 'occ-1',
    user_id: 'u1',
    schedule_date: '2026-07-13',
    shift_definition_id: 's1',
    scope: 'static',
    status: 'planned',
    is_detached: false,
    user: { id: 'u1', full_name: 'Budi', username: 'budi', role: 'satgas' },
    shift_definition: { id: 's1', name: 'Shift 1' },
    ...o,
  }) as ScheduleOccurrence;

describe('OccurrenceChip', () => {
  it('shows the worker name and calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<OccurrenceChip occurrence={occ()} onClick={onClick} />);

    expect(screen.getByText('Budi')).toBeInTheDocument();
    await user.click(screen.getByText('Budi'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows "team (n)" in team mode', () => {
    render(<OccurrenceChip occurrence={occ()} isTeam teamName="Tim Patroli" memberCount={4} />);
    expect(screen.getByText('Tim Patroli (4)')).toBeInTheDocument();
  });

  it('does not bubble its click to the surrounding day cell', async () => {
    const user = userEvent.setup();
    const onCellClick = jest.fn();
    const onChipClick = jest.fn();
    render(
       
      <div onClick={onCellClick}>
        <OccurrenceChip occurrence={occ()} onClick={onChipClick} />
      </div>
    );

    await user.click(screen.getByText('Budi'));

    expect(onChipClick).toHaveBeenCalled();
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it('marks a projected occurrence in its tooltip', () => {
    render(<OccurrenceChip occurrence={occ({ is_projected: true })} onClick={jest.fn()} />);
    expect(screen.getByTitle(/Proyeksi \(belum digenerate\)/)).toBeInTheDocument();
  });

  it('ignores clicks on a projected chip when the action is hidden', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <OccurrenceChip occurrence={occ({ is_projected: true })} onClick={onClick} hideProjectedAction />
    );

    await user.click(screen.getByText('Budi'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('still acts on a materialized chip when hideProjectedAction is set', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <OccurrenceChip occurrence={occ({ is_projected: false })} onClick={onClick} hideProjectedAction />
    );

    await user.click(screen.getByText('Budi'));
    expect(onClick).toHaveBeenCalled();
  });

  it('disables the compact chip when projected and the action is hidden', () => {
    render(
      <OccurrenceChip
        occurrence={occ({ is_projected: true })}
        onClick={jest.fn()}
        hideProjectedAction
        compact
      />
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('marks a detached occurrence', () => {
    render(<OccurrenceChip occurrence={occ({ is_detached: true })} onClick={jest.fn()} />);
    expect(screen.getByText('✎')).toBeInTheDocument();
  });
  // ---------------------------------------------------------------------------
  // Presence (ADR-050). The chip used to colour ONLY by shift, so the same worker
  // read red on the day board (which used occurrenceTone) and shift-coloured
  // here — one person, two readings, depending on the view.
  // ---------------------------------------------------------------------------

  describe('presence dot', () => {
    const dotIn = (el: HTMLElement) => el.querySelector('span[aria-hidden]');
    /** Exact token match: `bg-nb-warning` (amber) also SUBSTRING-matches
     *  `bg-nb-warning-light` (yellow), so `toContain` would pass on the wrong tone. */
    const toneClass = (el: HTMLElement, cls: string) =>
      (dotIn(el)?.className ?? '').split(/\s+/).includes(cls);

    it('shows a red dot for a worker who never turned up', () => {
      const { container } = render(
        <OccurrenceChip occurrence={occ({ status: 'absent', lifecycle_state: 'tidak_hadir' })} />
      );
      expect(toneClass(container, 'bg-nb-danger')).toBe(true);
    });

    it('shows AMBER for a worker on duty but outside their area', () => {
      // The tone that was unreachable before the backend started sending the
      // axes: green and amber both mean "bertugas", and only is_within_area
      // separates them.
      const { container } = render(
        <OccurrenceChip
          occurrence={occ({
            status: 'present',
            lifecycle_state: 'bertugas',
            is_within_area: false,
          })}
        />
      );
      expect(toneClass(container, 'bg-nb-warning')).toBe(true);
      // Not the yellow (belum_hadir) tone, which shares the warning family.
      expect(toneClass(container, 'bg-nb-warning-light')).toBe(false);
    });

    it('shows green for a worker on duty inside their area', () => {
      const { container } = render(
        <OccurrenceChip
          occurrence={occ({ status: 'present', lifecycle_state: 'bertugas', is_within_area: true })}
        />
      );
      expect(toneClass(container, 'bg-nb-success')).toBe(true);
    });

    it('renders NO dot for a future planned row — nothing has happened yet', () => {
      const { container } = render(
        <OccurrenceChip occurrence={occ({ status: 'planned', lifecycle_state: null })} />
      );
      expect(dotIn(container)).toBeNull();
    });

    it('keeps the shift fill, so shift identity survives the presence dot', () => {
      const { container } = render(
        <OccurrenceChip occurrence={occ({ status: 'present', lifecycle_state: 'bertugas' })} />
      );
      // Shift 1 → primary fill, regardless of how the worker is doing.
      expect(container.querySelector('.bg-nb-primary')).not.toBeNull();
    });

    it('shows the dot in compact mode too (the month view)', () => {
      const { container } = render(
        <OccurrenceChip compact occurrence={occ({ status: 'absent', lifecycle_state: 'tidak_hadir' })} />
      );
      expect(toneClass(container, 'bg-nb-danger')).toBe(true);
    });
  });
});
