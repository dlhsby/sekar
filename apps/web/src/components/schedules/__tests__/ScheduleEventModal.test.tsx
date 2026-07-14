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

  it('defaults to rayon scope and shows the rayon field (no city prefill)', () => {
    render(<ScheduleEventModal {...defaultProps} />, { wrapper: Wrapper });
    // Rayon scope is the default → the rayon placement field is visible.
    expect(screen.getByText('schedules:calendar.event.rayonLabel')).toBeInTheDocument();
    // No kawasan/lokasi fields until the scope is widened to region/location.
    expect(screen.queryByText('schedules:calendar.event.locationLabel')).not.toBeInTheDocument();
  });
});
