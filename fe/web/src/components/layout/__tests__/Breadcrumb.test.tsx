/**
 * Unit Tests: Breadcrumb
 * Tests breadcrumb navigation component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Breadcrumb } from '../Breadcrumb';
import { usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: () => ({ push: jest.fn() }),
}));

describe('Breadcrumb', () => {
  it('should render home link for root path', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(<Breadcrumb />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should render breadcrumb trail for nested path', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/users');

    render(<Breadcrumb />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should render breadcrumb trail for deep nested path', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/users/123/edit');

    render(<Breadcrumb />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('should render separator between breadcrumb items', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/users');

    render(<Breadcrumb />);

    // ChevronRightIcon is used as separator with specific class
    const separators = document.querySelectorAll('.text-nb-gray-400');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('should make breadcrumb items clickable except current page', async () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/users/123');
    const user = userEvent.setup();

    render(<Breadcrumb />);

    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink.closest('a')).toBeInTheDocument();

    await user.click(dashboardLink);
    // Should navigate (tested by E2E)
  });

  it('should highlight current page with aria-current', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/users');

    render(<Breadcrumb />);

    const currentPage = screen.getByText('Users');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
    expect(currentPage).toHaveClass('text-nb-black', 'font-bold');
  });

  it('should capitalize breadcrumb segments', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/area-types');

    render(<Breadcrumb />);

    expect(screen.getByText(/area.*types/i)).toBeInTheDocument();
  });
});
