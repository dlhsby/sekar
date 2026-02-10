/**
 * Unit Tests: Sidebar Component
 * Tests sidebar navigation, context state, role-based filtering, and mobile behavior
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar, SidebarProvider, SidebarTrigger, useSidebar, type SidebarItem } from '../sidebar';
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}));

const mockItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <span data-testid="dashboard-icon">📊</span>,
  },
  {
    id: 'users',
    label: 'Pengguna',
    href: '/users',
    icon: <span data-testid="users-icon">👥</span>,
    roles: ['admin'],
  },
  {
    id: 'tasks',
    label: 'Tugas',
    href: '/tasks',
    icon: <span data-testid="tasks-icon">📋</span>,
    roles: ['*'],
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    onClick: jest.fn(),
    icon: <span data-testid="settings-icon">⚙️</span>,
  },
];

const mockUser = {
  name: 'Admin User',
  role: 'Administrator',
  avatar: 'https://example.com/avatar.jpg',
};

describe('Sidebar Component', () => {
  describe('Rendering', () => {
    it('should render sidebar with default title and subtitle', () => {
      render(<Sidebar items={mockItems} />);

      expect(screen.getByText('SEKAR')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Admin')).toBeInTheDocument();
    });

    it('should render with custom title and subtitle', () => {
      render(<Sidebar items={mockItems} title="Custom Title" subtitle="Custom Subtitle" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
    });

    it('should render custom logo when provided', () => {
      const customLogo = <div data-testid="custom-logo">Custom Logo</div>;
      render(<Sidebar items={mockItems} logo={customLogo} />);

      expect(screen.getByTestId('custom-logo')).toBeInTheDocument();
      expect(screen.queryByText('SEKAR')).not.toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<Sidebar items={mockItems} userRole="admin" />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Pengguna')).toBeInTheDocument();
      expect(screen.getByText('Tugas')).toBeInTheDocument();
      expect(screen.getByText('Pengaturan')).toBeInTheDocument();
    });

    it('should render navigation items with icons', () => {
      render(<Sidebar items={mockItems} userRole="admin" />);

      expect(screen.getByTestId('dashboard-icon')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      expect(screen.getByTestId('tasks-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('should render user info when user prop is provided', () => {
      render(<Sidebar items={mockItems} user={mockUser} />);

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByAltText('Admin User')).toHaveAttribute('src', mockUser.avatar);
    });

    it('should render user initials when no avatar provided', () => {
      const userWithoutAvatar = { name: 'John Doe', role: 'User' };
      render(<Sidebar items={mockItems} user={userWithoutAvatar} />);

      expect(screen.getByText('J')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Role-based Filtering', () => {
    it('should show all items when no role restrictions', () => {
      const items: SidebarItem[] = [
        { id: '1', label: 'Item 1', href: '/1' },
        { id: '2', label: 'Item 2', href: '/2' },
      ];

      render(<Sidebar items={items} userRole="user" />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should filter items based on user role', () => {
      render(<Sidebar items={mockItems} userRole="user" />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Pengguna')).not.toBeInTheDocument(); // admin only
      expect(screen.getByText('Tugas')).toBeInTheDocument(); // * = all roles
    });

    it('should show admin-only items to admin users', () => {
      render(<Sidebar items={mockItems} userRole="admin" />);

      expect(screen.getByText('Pengguna')).toBeInTheDocument();
    });

    it('should show items with wildcard role to all users', () => {
      render(<Sidebar items={mockItems} userRole="worker" />);

      expect(screen.getByText('Tugas')).toBeInTheDocument();
    });

    it('should show items with empty roles array to all users', () => {
      const items: SidebarItem[] = [{ id: '1', label: 'Public Item', href: '/public', roles: [] }];

      render(<Sidebar items={items} userRole="user" />);

      expect(screen.getByText('Public Item')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight active item based on current path', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { usePathname } = require('next/navigation');
      usePathname.mockReturnValue('/users');

      render(<Sidebar items={mockItems} userRole="admin" />);

      const usersLink = screen.getByText('Pengguna').closest('a');
      expect(usersLink).toHaveClass('bg-nb-white', 'text-nb-navy');
    });

    it('should highlight active item with custom currentPath prop', () => {
      render(<Sidebar items={mockItems} currentPath="/tasks" />);

      const tasksLink = screen.getByText('Tugas').closest('a');
      expect(tasksLink).toHaveClass('bg-nb-white', 'text-nb-navy');
    });

    it('should highlight active item for nested paths', () => {
      render(<Sidebar items={mockItems} currentPath="/users/123" userRole="admin" />);

      const usersLink = screen.getByText('Pengguna').closest('a');
      expect(usersLink).toHaveClass('bg-nb-white', 'text-nb-navy');
    });
  });

  describe('Navigation', () => {
    it('should render items with href as links', () => {
      render(<Sidebar items={mockItems} />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('should render items with onClick as buttons', () => {
      render(<Sidebar items={mockItems} />);

      const settingsButton = screen.getByText('Pengaturan').closest('button');
      expect(settingsButton).toBeInTheDocument();
      expect(settingsButton).toHaveAttribute('type', 'button');
    });

    it('should call onClick handler when button item clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      const items: SidebarItem[] = [{ id: 'action', label: 'Action Item', onClick: handleClick }];

      render(<Sidebar items={items} />);

      await user.click(screen.getByText('Action Item'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should render static items without href or onClick', () => {
      const items: SidebarItem[] = [{ id: 'static', label: 'Static Item' }];

      render(<Sidebar items={items} />);

      const staticItem = screen.getByText('Static Item');
      expect(staticItem.closest('a')).not.toBeInTheDocument();
      expect(staticItem.closest('button')).not.toBeInTheDocument();
      expect(staticItem.closest('div')).toBeInTheDocument();
    });
  });

  describe('Mobile Behavior', () => {
    it('should show close button when onClose prop provided', () => {
      const handleClose = jest.fn();
      render(<Sidebar items={mockItems} onClose={handleClose} />);

      expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
    });

    it('should not show close button when onClose not provided', () => {
      render(<Sidebar items={mockItems} />);

      expect(screen.queryByLabelText('Close sidebar')).not.toBeInTheDocument();
    });

    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      const handleClose = jest.fn();
      render(<Sidebar items={mockItems} onClose={handleClose} />);

      await user.click(screen.getByLabelText('Close sidebar'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should show overlay when open on mobile', () => {
      const handleClose = jest.fn();
      const { container } = render(
        <Sidebar items={mockItems} isOpen={true} onClose={handleClose} />
      );

      const overlay = container.querySelector('.fixed.inset-0.bg-nb-black\\/50');
      expect(overlay).toBeInTheDocument();
    });

    it('should call onClose when overlay clicked', async () => {
      const user = userEvent.setup();
      const handleClose = jest.fn();
      const { container } = render(
        <Sidebar items={mockItems} isOpen={true} onClose={handleClose} />
      );

      const overlay = container.querySelector('.fixed.inset-0.bg-nb-black\\/50') as HTMLElement;
      await user.click(overlay);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should hide sidebar when isOpen is false', () => {
      const { container } = render(<Sidebar items={mockItems} isOpen={false} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('max-lg:-translate-x-full');
    });

    it('should show sidebar when isOpen is true', () => {
      const { container } = render(<Sidebar items={mockItems} isOpen={true} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).not.toHaveClass('max-lg:-translate-x-full');
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation landmark', () => {
      render(<Sidebar items={mockItems} />);

      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    });

    it('should have accessible close button', () => {
      render(<Sidebar items={mockItems} onClose={jest.fn()} />);

      const closeButton = screen.getByLabelText('Close sidebar');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have keyboard accessible links', async () => {
      const user = userEvent.setup();
      render(<Sidebar items={mockItems} />);

      const dashboardLink = screen.getByText('Dashboard').closest('a') as HTMLElement;
      dashboardLink.focus();

      expect(dashboardLink).toHaveFocus();
    });

    it('should have focus-visible styles on navigation items', () => {
      render(<Sidebar items={mockItems} />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).toContain('focus-visible:outline');
    });
  });

  describe('Neo Brutalism Styles', () => {
    it('should have 3px border', () => {
      const { container } = render(<Sidebar items={mockItems} />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('border-r-3', 'border-nb-black');
    });

    it('should have proper section borders', () => {
      const { container } = render(<Sidebar items={mockItems} user={mockUser} />);

      // Header border
      const header = container.querySelector('.border-b-2.border-nb-navy-light');
      expect(header).toBeInTheDocument();

      // User section border
      const userSection = container.querySelector('.border-t-2.border-nb-navy-light');
      expect(userSection).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      const { container } = render(<Sidebar items={mockItems} className="custom-sidebar" />);

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('custom-sidebar');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLElement>();
      render(<Sidebar ref={ref} items={mockItems} />);

      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName).toBe('ASIDE');
    });
  });
});

describe('SidebarProvider', () => {
  describe('Context Management', () => {
    it('should provide sidebar state to children', () => {
      const TestComponent = () => {
        const { isOpen } = useSidebar();
        return <div data-testid="sidebar-state">{isOpen ? 'open' : 'closed'}</div>;
      };

      render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');
    });

    it('should respect defaultOpen prop', () => {
      const TestComponent = () => {
        const { isOpen } = useSidebar();
        return <div data-testid="sidebar-state">{isOpen ? 'open' : 'closed'}</div>;
      };

      render(
        <SidebarProvider defaultOpen={false}>
          <TestComponent />
        </SidebarProvider>
      );

      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');
    });

    it('should allow toggling sidebar state', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { isOpen, setIsOpen } = useSidebar();
        return (
          <>
            <div data-testid="sidebar-state">{isOpen ? 'open' : 'closed'}</div>
            <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
          </>
        );
      };

      render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');

      await user.click(screen.getByText('Toggle'));
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');

      await user.click(screen.getByText('Toggle'));
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');
    });

    it('should throw error when useSidebar used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const TestComponent = () => {
        useSidebar();
        return <div>Test</div>;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useSidebar must be used within a SidebarProvider'
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('SidebarTrigger', () => {
  describe('Rendering', () => {
    it('should render trigger button', () => {
      render(
        <SidebarProvider>
          <SidebarTrigger />
        </SidebarProvider>
      );

      expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
    });

    it('should show correct label based on sidebar state', () => {
      render(
        <SidebarProvider defaultOpen={false}>
          <SidebarTrigger />
        </SidebarProvider>
      );

      expect(screen.getByLabelText('Open sidebar')).toBeInTheDocument();
    });

    it('should render menu icon', () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarTrigger />
        </SidebarProvider>
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('h-5', 'w-5');
    });
  });

  describe('Interactions', () => {
    it('should toggle sidebar when clicked', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const { isOpen } = useSidebar();
        return (
          <>
            <SidebarTrigger />
            <div data-testid="sidebar-state">{isOpen ? 'open' : 'closed'}</div>
          </>
        );
      };

      render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');

      await user.click(screen.getByLabelText('Close sidebar'));
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');

      await user.click(screen.getByLabelText('Open sidebar'));
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <SidebarProvider>
          <SidebarTrigger />
        </SidebarProvider>
      );

      const button = screen.getByLabelText('Close sidebar');
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByLabelText('Open sidebar')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(
        <SidebarProvider>
          <SidebarTrigger className="custom-trigger" />
        </SidebarProvider>
      );

      const button = screen.getByLabelText('Close sidebar');
      expect(button).toHaveClass('custom-trigger');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <SidebarProvider>
          <SidebarTrigger ref={ref} />
        </SidebarProvider>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
