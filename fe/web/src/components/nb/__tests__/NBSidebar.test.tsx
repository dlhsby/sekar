import { render, screen } from '@testing-library/react';
import { NBSidebar } from '../NBSidebar';

const mockItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: <span data-testid="icon">🏠</span>,
    roles: ['*'],
  },
  {
    id: 'users',
    label: 'Users',
    href: '/users',
    roles: ['Admin'],
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    roles: ['Admin', 'Supervisor'],
  },
];

const mockUser = {
  name: 'John Doe',
  role: 'Administrator',
};

describe('NBSidebar', () => {
  it('renders sidebar with items', () => {
    render(<NBSidebar items={mockItems} userRole="Admin" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('renders SEKAR branding', () => {
    render(<NBSidebar items={mockItems} userRole="Admin" />);
    expect(screen.getByText('SEKAR')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Admin')).toBeInTheDocument();
  });

  it('filters items by role', () => {
    render(<NBSidebar items={mockItems} userRole="Worker" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument(); // * role
    expect(screen.queryByText('Users')).not.toBeInTheDocument(); // Admin only
    expect(screen.queryByText('Reports')).not.toBeInTheDocument(); // Admin/Supervisor
  });

  it('shows items for Admin role', () => {
    render(<NBSidebar items={mockItems} userRole="Admin" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('shows items for Supervisor role', () => {
    render(<NBSidebar items={mockItems} userRole="Supervisor" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument(); // Admin only
    expect(screen.getByText('Reports')).toBeInTheDocument(); // Supervisor allowed
  });

  it('renders user info when provided', () => {
    render(<NBSidebar items={mockItems} user={mockUser} userRole="Admin" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('renders user avatar initial when no avatar', () => {
    render(<NBSidebar items={mockItems} user={mockUser} userRole="Admin" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders icons for navigation items', () => {
    render(<NBSidebar items={mockItems} userRole="Admin" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies navy background', () => {
    const { container } = render(
      <NBSidebar items={mockItems} userRole="Admin" />
    );
    expect(container.querySelector('.bg-nb-navy')).toBeInTheDocument();
  });

  it('has correct navigation role', () => {
    render(<NBSidebar items={mockItems} userRole="Admin" />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
