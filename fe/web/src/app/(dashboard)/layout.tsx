'use client';

import { useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useUIStore } from '@/stores/ui';
import { NBSidebar } from '@/components/nb/NBSidebar';
import { Header } from '@/components/layout/Header';
import { navigationItems, filterNavigationByRole } from '@/lib/navigation';
import { useAuth } from '@/lib/auth/hooks';

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
 * 
 * Layout Structure:
 * ┌─────────────────────────────────────────────────────┐
 * │ Sidebar (256px)  │  Header (top bar)                │
 * │                  ├──────────────────────────────────┤
 * │ - Logo           │  Main Content Area               │
 * │ - Nav Items      │  - Breadcrumbs                   │
 * │ - Role-based     │  - Page content                  │
 * │ - Active state   │  - Proper padding                │
 * │                  │                                   │
 * └─────────────────────────────────────────────────────┘
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { sidebarOpen, mobileMenuOpen, closeAllMenus } = useUIStore();
  const { user, loading } = useAuth();

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      closeAllMenus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Filter navigation items by user role
  const filteredNavigation = user
    ? filterNavigationByRole(navigationItems, user.role)
    : [];

  // Convert NavItem[] to NBSidebarItem[] format
  const sidebarItems = filteredNavigation.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    icon: <item.icon className="h-5 w-5" />,
    roles: item.roles,
  }));

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
    <div className="min-h-screen bg-nb-gray-50 flex">
      {/* Sidebar - Desktop (fixed) */}
      <div
        className={cn(
          'hidden lg:block flex-shrink-0',
          'transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        <NBSidebar
          items={sidebarItems}
          isOpen={sidebarOpen}
          userRole={user?.role || ''}
          user={{
            name: user.full_name,
            role: user.role,
          }}
          className="h-screen fixed top-0 left-0"
        />
      </div>

      {/* Sidebar - Mobile/Tablet (overlay) */}
      {mobileMenuOpen && (
        <>
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-nb-black/50 z-30 lg:hidden"
            onClick={closeAllMenus}
            aria-hidden="true"
          />
          
          {/* Sidebar drawer */}
          <NBSidebar
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
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-[1440px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
