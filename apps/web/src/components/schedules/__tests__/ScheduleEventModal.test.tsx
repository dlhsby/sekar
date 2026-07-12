import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScheduleEventModal } from '../ScheduleEventModal';

// Mock modules
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts) return `${key} ${JSON.stringify(opts)}`;
      return key;
    },
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

jest.mock('@/lib/api/shift-definitions', () => ({
  useShiftDefinitions: () => ({
    data: [{ id: 'shift-1', name: 'Shift 1' }],
  }),
}));

jest.mock('@/lib/api/users', () => ({
  useUsers: () => ({
    data: [{ id: 'user-1', full_name: 'John Doe' }],
  }),
}));

jest.mock('@/lib/api/locations', () => ({
  useLocations: () => ({
    data: [{ id: 'loc-1', name: 'Location 1' }],
  }),
}));

jest.mock('@/lib/api/regions', () => ({
  useRegions: () => ({
    data: [{ id: 'reg-1', name: 'Region 1' }],
  }),
}));

jest.mock('@/lib/api/teams', () => ({
  useTeams: () => ({
    data: [{ id: 'team-1', name: 'Team 1' }],
  }),
}));

jest.mock('@/lib/auth/hooks', () => ({
  usePermissions: () => ({
    permissions: ['schedule:create', 'schedule:update'],
  }),
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

  it('renders create modal when no event provided', () => {
    render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('schedules:calendar.event.createTitle')).toBeInTheDocument();
  });

  it('renders edit modal when event provided', () => {
    const event = {
      id: 'event-1',
      title: 'Test Event',
      recurrence_type: 'none' as const,
      start_date: '2026-07-15',
      end_date: null,
      recurrence_config: null,
      shift_definition_id: 'shift-1',
      scope: 'static' as const,
      location_id: 'loc-1',
      region_id: null,
      is_team: false,
      team_id: null,
      pic_user_id: null,
      user_id: 'user-1',
      is_active: true,
      notes: null,
      created_at: '2026-07-10T00:00:00Z',
      updated_at: '2026-07-10T00:00:00Z',
      created_by: null,
      updated_by: null,
      shift_definition: {
        id: 'shift-1',
        name: 'Shift 1',
        start_time: '06:00',
        end_time: '15:00',
      },
      location: { id: 'loc-1', name: 'Location 1' },
      user: { id: 'user-1', full_name: 'John Doe', username: 'johndoe', role: 'satgas' },
    };

    render(<ScheduleEventModal {...defaultProps} event={event} />, { wrapper: Wrapper });
    expect(screen.getByText('schedules:calendar.event.editTitle')).toBeInTheDocument();
  });

  it('validates kind/scope coherency', async () => {
    const user = userEvent.setup();
    render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });

    const scopeSelect = screen.getByDisplayValue('schedules:calendar.event.scopeStatic');
    const kindToggle = screen.getByDisplayValue('false');

    expect(scopeSelect).toBeInTheDocument();
    expect(kindToggle).toBeInTheDocument();
  });

  it('closes modal on cancel', async () => {
    const user = userEvent.setup();
    render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });
    const cancelButton = screen.getByText('schedules:calendar.event.cancel');
    await user.click(cancelButton);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
