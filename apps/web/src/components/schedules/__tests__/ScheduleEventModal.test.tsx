import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScheduleEventModal } from '../ScheduleEventModal';

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

jest.mock('@/lib/api/rayons', () => ({
  useRayons: () => ({ data: [] }),
}));

jest.mock('@/lib/api/locations', () => ({
  useLocations: () => ({ data: { data: [] } }),
}));

jest.mock('@/lib/api/regions', () => ({
  useRegions: () => ({ data: [] }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

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
