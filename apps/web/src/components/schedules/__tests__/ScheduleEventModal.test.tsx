import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScheduleEventModal } from '../ScheduleEventModal';
import { useRayons } from '@/lib/api/rayons';
import { useRegions } from '@/lib/api/regions';
import { useLocations } from '@/lib/api/locations';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/api/schedule-events', () => ({
  useCreateScheduleEvent: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useUpdateScheduleEvent: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('@/lib/auth/usePermissions', () => ({
  usePermissions: () => ({
    permissions: ['schedule:create', 'schedule:update'],
    can: () => true,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('@/lib/api/shift-definitions', () => ({
  useShiftDefinitions: () => ({ data: [] }),
}));

jest.mock('@/lib/api/users', () => ({
  useUsers: () => ({ data: { data: [] } }),
}));

jest.mock('@/lib/api/teams', () => ({
  useTeamCategories: () => ({ data: [] }),
}));

// Capture the worker combobox's props: the load-bearing contract is WHICH roles
// it is asked to fetch, which no amount of DOM assertion can see.
const userComboboxProps: Array<{ roles?: string[] }> = [];
jest.mock('@/components/forms/AsyncUserCombobox', () => ({
  AsyncUserCombobox: (props: { roles?: string[]; label: string }) => {
    userComboboxProps.push(props);
    return <div data-testid="user-combobox">{props.label}</div>;
  },
}));

jest.mock('@/lib/api/rayons', () => ({ useRayons: jest.fn(() => ({ data: [] })) }));
jest.mock('@/lib/api/locations', () => ({ useLocations: jest.fn(() => ({ data: { data: [] } })) }));
jest.mock('@/lib/api/regions', () => ({ useRegions: jest.fn(() => ({ data: [] })) }));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

/**
 * Rayon Taman Aktif is the shape that broke: a kawasan is an OPTIONAL parent
 * (ADR-045), so its lokasi hang straight off the rayon with region_id null.
 */
const RAYONS = [{ id: 'ry-aktif', name: 'Rayon Taman Aktif' }];
const REGIONS = [{ id: 'kw1', name: 'Kawasan Pusat', rayon_id: 'ry-other' }];
const LOCATIONS = [
  { id: 'loc-direct', name: 'Taman Bungkul', rayon_id: 'ry-aktif', region_id: null },
];

function withGeography() {
  (useRayons as jest.Mock).mockReturnValue({ data: RAYONS });
  (useRegions as jest.Mock).mockReturnValue({ data: REGIONS });
  (useLocations as jest.Mock).mockReturnValue({ data: { data: LOCATIONS } });
}

describe('ScheduleEventModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  it('renders modal dialog when open', () => {
    render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(2);
  });

  it('accepts modal props', () => {
    const onOpenChange = jest.fn();
    const { container } = render(
      <ScheduleEventModal {...defaultProps} onOpenChange={onOpenChange} />,
      { wrapper: Wrapper }
    );
    expect(container).toBeInTheDocument();
  });

  it('renders the scope ("Ruang Lingkup") selector', () => {
    render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });
    // t() is mocked to echo keys, so the label text is the i18n key.
    expect(screen.getByText('schedules:calendar.event.scopeLabel')).toBeInTheDocument();
  });

  it('asks for Ruang Lingkup before Jenis (where -> who -> when)', () => {
    // Scope frames every other answer — it decides which geography fields exist
    // and which are required — so it leads. DOM order is the reading order.
    render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });

    const scope = screen.getByText('schedules:calendar.event.scopeLabel');
    const kind = screen.getByText('schedules:calendar.event.kindLabel');

    expect(scope.compareDocumentPosition(kind) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Nothing is preselected. Jenis / Ruang Lingkup / Pengulangan used to arrive
  // pre-filled ("Individu", "Rayon", "Sekali"), so an operator could save three
  // decisions they never actually made.
  describe('preselects nothing on a fresh event', () => {
    it('shows no geography field, because no scope has been chosen', () => {
      render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });

      expect(screen.queryByText('schedules:calendar.event.rayonLabel')).not.toBeInTheDocument();
      expect(screen.queryByText('schedules:calendar.event.locationLabel')).not.toBeInTheDocument();
    });

    it('shows no worker or team field, because no kind has been chosen', () => {
      render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });

      expect(screen.queryByText('schedules:calendar.event.workerLabel')).not.toBeInTheDocument();
      expect(
        screen.queryByText('schedules:calendar.event.teamCategoryLabel')
      ).not.toBeInTheDocument();
    });
  });

  // Assigning from a board cell already answers where/when/what — those are
  // facts, not defaults. Leaving them editable invites a silent mismatch between
  // the cell clicked and the schedule saved.
  describe('prefilled from a board "+ Tugaskan"', () => {
    const comboboxNamed = (key: string) =>
      screen.getByText(key).closest('div')!.querySelector('button, select, [role="combobox"]');

    it('pins the kind to Individu and shows the role, both locked', () => {
      render(<ScheduleEventModal {...defaultProps} initialRole="satgas" initialShiftId="s1" />, {
        wrapper: Wrapper,
      });

      // Kind resolved to individual → the worker field is the one on show.
      expect(screen.getByText('schedules:calendar.event.workerLabel')).toBeInTheDocument();
      expect(screen.getByText('schedules:calendar.event.roleLabel')).toBeInTheDocument();
      expect(comboboxNamed('schedules:calendar.event.roleLabel')).toBeDisabled();
    });

    it('pins the kind to Tim when assigned from the Tim column', () => {
      render(<ScheduleEventModal {...defaultProps} initialTeam initialShiftId="s1" />, {
        wrapper: Wrapper,
      });

      expect(screen.getByText('schedules:calendar.event.teamCategoryLabel')).toBeInTheDocument();
      expect(comboboxNamed('schedules:calendar.event.kindLabel')).toBeDisabled();
    });

    it('locks the shift it was assigned from', () => {
      render(<ScheduleEventModal {...defaultProps} initialShiftId="s1" />, { wrapper: Wrapper });

      expect(comboboxNamed('schedules:calendar.event.shiftLabel')).toBeDisabled();
    });

    it('locks the scope and the geography it was assigned from', () => {
      render(<ScheduleEventModal {...defaultProps} initialRayonId="ry1" />, { wrapper: Wrapper });

      expect(comboboxNamed('schedules:calendar.event.scopeLabel')).toBeDisabled();
      // Rayon prefill resolves the scope to 'rayon', so the rayon field shows.
      expect(screen.getByText('schedules:calendar.event.rayonLabel')).toBeInTheDocument();
    });

    it('leaves the shift open when it was NOT prefilled', () => {
      render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });

      expect(comboboxNamed('schedules:calendar.event.shiftLabel')).not.toBeDisabled();
    });
  });
});

// ---------------------------------------------------------------------------
// A kawasan is an OPTIONAL parent (ADR-045). Rayon Taman Aktif hangs its lokasi
// straight off the rayon (region_id null), and the form demanded a kawasan
// before showing any lokasi — so those lokasi were unreachable, on create AND
// on edit. The board always rendered them (`looseLocations`); only this form
// couldn't.
// ---------------------------------------------------------------------------

describe('ScheduleEventModal — rayon-direct lokasi (no kawasan)', () => {
  const props = { open: true, onOpenChange: jest.fn() };

  beforeEach(() => withGeography());

  it('offers a lokasi that has no kawasan, without one being chosen', () => {
    render(<ScheduleEventModal {...props} initialRayonId="ry-aktif" initialLocationId="loc-direct" />, {
      wrapper: Wrapper,
    });

    // Lokasi scope resolves from the prefill and the field renders off the
    // RAYON — it used to be gated on a kawasan that will never exist here.
    expect(screen.getByText('schedules:calendar.event.locationLabel')).toBeInTheDocument();
  });

  it('treats kawasan as an optional filter under a lokasi scope', () => {
    render(<ScheduleEventModal {...props} initialRayonId="ry-aktif" initialLocationId="loc-direct" />, {
      wrapper: Wrapper,
    });

    // The optional-filter copy, not the mobile-scope copy.
    expect(screen.getByText('schedules:calendar.event.regionFilterHint')).toBeInTheDocument();
    expect(screen.queryByText('schedules:calendar.event.regionScopeHint')).not.toBeInTheDocument();
  });

  it('still calls kawasan a required step under the mobile (kawasan) scope', () => {
    render(<ScheduleEventModal {...props} initialRayonId="ry-aktif" initialRegionId="kw1" />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('schedules:calendar.event.regionScopeHint')).toBeInTheDocument();
  });
});

// A role must be chosen before any worker is fetched — "Semua peran" pulled the
// whole schedulable list before the operator had said what they wanted.
describe('ScheduleEventModal — Peran gates Pekerja', () => {
  const props = { open: true, onOpenChange: jest.fn() };

  beforeEach(() => {
    userComboboxProps.length = 0;
  });

  it('does not mount the worker combobox at all before a role is picked', () => {
    render(<ScheduleEventModal {...props} />, { wrapper: Wrapper });

    expect(screen.queryByTestId('user-combobox')).not.toBeInTheDocument();
    expect(userComboboxProps).toHaveLength(0);
  });

  it('fetches ONLY the chosen role, never the whole schedulable list', () => {
    render(<ScheduleEventModal {...props} initialRole="satgas" />, { wrapper: Wrapper });

    expect(screen.getByTestId('user-combobox')).toBeInTheDocument();
    expect(userComboboxProps.at(-1)?.roles).toEqual(['satgas']);
  });

  it('puts Peran and Pekerja on one row — they are one decision', () => {
    render(<ScheduleEventModal {...props} initialRole="satgas" />, { wrapper: Wrapper });

    const role = screen.getByText('schedules:calendar.event.roleLabel');
    const worker = screen.getByTestId('user-combobox');
    const row = role.closest('div.grid');

    expect(row).not.toBeNull();
    expect(row).toContainElement(worker);
  });
});

// ---------------------------------------------------------------------------
// Team side. The member picker was a checkbox list of EVERY schedulable user —
// fine at 20, unusable at 3000, and it preloaded the whole roster (useUsers with
// limit 1000) just to render labels. Members are now added one at a time, role
// first, exactly like the PIC and an individual.
// ---------------------------------------------------------------------------

describe('ScheduleEventModal — team', () => {
  const props = { open: true, onOpenChange: jest.fn(), initialTeam: true };

  beforeEach(() => {
    userComboboxProps.length = 0;
  });

  it('marks Kategori Tim as required', () => {
    render(<ScheduleEventModal {...props} />, { wrapper: Wrapper });

    const label = screen.getByText('schedules:calendar.event.teamCategoryLabel');
    expect(label.textContent).toContain('*');
  });

  it('asks for the PIC role before the PIC, like an individual', () => {
    render(<ScheduleEventModal {...props} />, { wrapper: Wrapper });

    expect(screen.getByText('schedules:calendar.event.picRoleLabel')).toBeInTheDocument();
    // No PIC combobox until a role narrows it — nothing to fetch yet.
    expect(screen.queryByText('schedules:calendar.event.picLabel')).not.toBeInTheDocument();
  });

  it('never renders the old "every schedulable user" checkbox list', () => {
    render(<ScheduleEventModal {...props} />, { wrapper: Wrapper });

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByText('schedules:calendar.event.memberEmpty')).toBeInTheDocument();
  });

  it('gates the member worker picker behind a role, so no roster loads up front', () => {
    render(<ScheduleEventModal {...props} />, { wrapper: Wrapper });

    // Neither the PIC nor the member combobox is mounted before a role is chosen.
    expect(userComboboxProps).toHaveLength(0);
  });

  it('seeds member names from the event being edited, not from a roster fetch', () => {
    const event = {
      id: 'ev1',
      is_team: true,
      team_category_id: 'tc1',
      pic_user_id: 'u-pic',
      pic_user: { id: 'u-pic', full_name: 'Budi PIC', username: 'budi', role: 'korlap' },
      members: [{ id: 'm1', user_id: 'u-1', full_name: 'Sari Dewi', username: 'sari', role: 'satgas' }],
      scope: 'city',
      recurrence_type: 'none',
      start_date: '2026-07-16',
      shift_definition_id: 's1',
    } as never;

    render(<ScheduleEventModal open onOpenChange={jest.fn()} event={event} />, {
      wrapper: Wrapper,
    });

    // The name comes off the event; nothing else in the form knows it.
    expect(screen.getByText('Sari Dewi')).toBeInTheDocument();
  });
});
