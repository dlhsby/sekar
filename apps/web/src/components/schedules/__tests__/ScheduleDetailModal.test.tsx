/**
 * Unit tests: ScheduleDetailModal — the read-only detail shown when a schedule
 * is clicked (Ubah/Hapus route onward from here).
 *
 * The interesting logic is the placement line, which must resolve to the
 * DEEPEST geography the occurrence carries (lokasi → kawasan → district), and the
 * permission gating on Ubah/Hapus.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleDetailModal } from '../ScheduleDetailModal';
import { useDistricts } from '@/lib/api/districts';
import type { ScheduleOccurrence, ScheduleEvent } from '@/lib/api/schedule-events';

jest.mock('@/lib/api/districts', () => ({ useDistricts: jest.fn() }));

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
    shift_definition: { id: 's1', name: 'Shift 1', start_time: '06:00:00', end_time: '15:00:00' },
    ...o,
  }) as ScheduleOccurrence;

function setup(
  o: Partial<ScheduleOccurrence> = {},
  opts: { event?: Partial<ScheduleEvent> | null; canEdit?: boolean; canDelete?: boolean } = {}
) {
  const { event = null, canEdit = true, canDelete = true } = opts;
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  render(
    <ScheduleDetailModal
      open
      onOpenChange={jest.fn()}
      occurrence={occ(o)}
      event={event as ScheduleEvent | null}
      onEdit={onEdit}
      onDelete={onDelete}
      canEdit={canEdit}
      canDelete={canDelete}
      localeCode="id-ID"
    />
  );
  return { onEdit, onDelete };
}

beforeEach(() => {
  (useDistricts as jest.Mock).mockReturnValue({
    data: [{ id: 'ry1', name: 'Rayon Pusat' }],
  });
});

describe('ScheduleDetailModal', () => {
  it('renders nothing without an occurrence', () => {
    const { container } = render(
      <ScheduleDetailModal
        open
        onOpenChange={jest.fn()}
        occurrence={null}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        canEdit
        canDelete
        localeCode="id-ID"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the worker name, role and shift window', () => {
    setup();
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('Satgas')).toBeInTheDocument();
    expect(screen.getByText(/Shift 1 · 06:00–15:00/)).toBeInTheDocument();
  });

  it('titles a team schedule by its team category', () => {
    setup({ team_category: { id: 't1', name: 'Tim Patroli', marker_color: null } });
    expect(screen.getByText(/Tim · Tim Patroli/)).toBeInTheDocument();
  });

  describe('placement resolves to the deepest geography', () => {
    it('prefers lokasi', () => {
      setup({
        location: { id: 'loc1', name: 'Taman Bungkul' },
        region: { id: 'kw1', name: 'Kawasan Pusat' },
        district_id: 'ry1',
      } as Partial<ScheduleOccurrence>);
      expect(screen.getByText(/Taman Bungkul/)).toBeInTheDocument();
      expect(screen.queryByText(/Kawasan Pusat/)).not.toBeInTheDocument();
    });

    it('falls back to kawasan when there is no lokasi', () => {
      setup({
        region: { id: 'kw1', name: 'Kawasan Pusat' },
        district_id: 'ry1',
      } as Partial<ScheduleOccurrence>);
      expect(screen.getByText(/Kawasan Pusat/)).toBeInTheDocument();
      expect(screen.queryByText(/Rayon Pusat/)).not.toBeInTheDocument();
    });

    it('falls back to the district name, resolved from the district list', () => {
      setup({ district_id: 'ry1' } as Partial<ScheduleOccurrence>);
      expect(screen.getByText(/Rayon Pusat/)).toBeInTheDocument();
    });

    it('shows a dash for a city-wide schedule (no geography)', () => {
      setup({ scope: 'city' } as Partial<ScheduleOccurrence>);
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
  });

  it('flags a projected occurrence', () => {
    setup({ is_projected: true });
    expect(screen.getByText(/Proyeksi \(belum digenerate\)/)).toBeInTheDocument();
  });

  it('describes the recurrence from the backing event', () => {
    setup({}, { event: { recurrence_type: 'weekly' } });
    expect(screen.getByText(/Mingguan|Weekly/i)).toBeInTheDocument();
  });

  it('routes to edit and delete', async () => {
    const user = userEvent.setup();
    const { onEdit, onDelete } = setup();

    await user.click(screen.getByRole('button', { name: /^ubah$/i }));
    expect(onEdit).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^hapus$/i }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('hides edit/delete without permission', () => {
    setup({}, { canEdit: false, canDelete: false });
    expect(screen.queryByRole('button', { name: /^ubah$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^hapus$/i })).not.toBeInTheDocument();
    // Closing stays available (both the footer button and the dialog's ✕ are "Tutup").
    expect(screen.getAllByRole('button', { name: 'Tutup' }).length).toBeGreaterThan(0);
  });
});
