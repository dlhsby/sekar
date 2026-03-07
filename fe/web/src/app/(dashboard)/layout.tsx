'use client';

import { useEffect, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useUIStore } from '@/stores/ui';
import { Sidebar, SidebarItem } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { PageLoadingIndicator } from '@/components/layout/PageLoadingIndicator';
import { navigationItems, filterNavigationByRole } from '@/lib/navigation';
import { useAuth } from '@/lib/auth/hooks';
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary';
import { Toaster } from 'sonner';

export interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard Layout
 *
 * Main authenticated dashboard layout with:
 * - Fixed sidebar (256px width) on desktop
 * - Collapsible sidebar on tablet
 * - Mobile overlay sidebar
 * - Header bar with breadcrumbs, notifications, user menu
 * - Role-based navigation filtering
 * - Responsive breakpoints (md: 768px, lg: 1024px)
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { sidebarOpen, mobileMenuOpen, toggleSidebar, closeAllMenus } = useUIStore();
  const { user, loading } = useAuth();

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      closeAllMenus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Filter navigation items by user role and convert to sidebar format
  // Memoized to prevent unnecessary re-renders
  const sidebarItems = useMemo(() => {
    if (!user) return [];

    const filteredNavigation = filterNavigationByRole(navigationItems, user.role);

    // Convert NavItem[] to SidebarItem[] format (recursively for children)
    const convertToSidebarItems = (items: typeof navigationItems): SidebarItem[] => {
      return items.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: <item.icon className="h-5 w-5" />,
        roles: item.roles,
        children: item.children ? convertToSidebarItems(item.children) : undefined,
      }));
    };

    return convertToSidebarItems(filteredNavigation);
  }, [user]); // Only recreate when user changes

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-nb-gray-50 flex items-center justify-center">
        <div className="text-nb-gray-600">Memuat dashboard...</div>
      </div>
    );
  }

  // If no user after loading, show nothing (middleware will redirect to login)
  if (!user) {
    return null;
  }

  return (
    <AuthErrorBoundary>
      <Toaster position="top-right" richColors closeButton />
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-nb-primary focus:text-white focus:font-bold focus:border-2 focus:border-nb-black focus:shadow-nb-lg focus:rounded-nb-base"
      >
        Skip to main content
      </a>

      {/* Page Loading Indicator */}
      <PageLoadingIndicator />

      <div className="min-h-screen bg-nb-gray-50 flex">
        {/* Sidebar - Desktop (toggleable on lg+) */}
        {sidebarOpen && (
          <Sidebar
            items={sidebarItems}
            isOpen={sidebarOpen}
            onClose={() => toggleSidebar()}
            userRole={user?.role || ''}
            user={{
              name: user.full_name,
              role: user.role,
            }}
            className="hidden lg:flex"
            aria-expanded={sidebarOpen}
          />
        )}

        {/* Sidebar - Mobile/Tablet (overlay) */}
        {mobileMenuOpen && (
          <Sidebar
            items={sidebarItems}
            isOpen={mobileMenuOpen}
            onClose={closeAllMenus}
            userRole={user?.role || ''}
            user={{
              name: user.full_name,
              role: user.role,
            }}
            className="lg:hidden"
          />
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header />

          {/* Page content with fade transition */}
          <main id="main-content" className="flex-1 overflow-auto">
            <div
              key={pathname}
              className="p-4 lg:p-6 max-w-[1440px] mx-auto w-full animate-fade-in"
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthErrorBoundary>
  );
}
