'use client';

import { HTMLAttributes, useState } from 'react';
import {
  BellIcon,
  Bars3Icon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';
import { useUIStore } from '@/stores/ui';
import { useAuth } from '@/lib/auth/hooks';
import { NBDropdown } from '@/components/nb/NBDropdown';
import { NBBadge } from '@/components/nb/NBBadge';
import { NBModal } from '@/components/nb/NBModal';
import { NBButton } from '@/components/nb/NBButton';
import { Breadcrumb } from './Breadcrumb';

export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  /** Show breadcrumb navigation */
  showBreadcrumb?: boolean;
}

/**
 * Dashboard Header Component
 * 
 * Features:
 * - Breadcrumb navigation
 * - Notification bell with badge count
 * - User menu dropdown (Profile, Settings, Logout)
 * - Mobile hamburger menu button
 * - Responsive design
 * - Accessible (ARIA labels, keyboard navigation)
 * 
 * @example
 * ```tsx
 * <Header />
 * ```
 */
export function Header({ className, showBreadcrumb = true, ...props }: HeaderProps) {
  const { toggleSidebar, toggleMobileMenu } = useUIStore();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notification count (TODO: fetch from backend in Phase 2E)
  const notificationCount = 3;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setShowLogoutModal(false);
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const userMenuItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <UserCircleIcon className="h-5 w-5" />,
      onClick: () => {
        console.log('Navigate to profile');
        // TODO: Navigate to profile page in Phase 2D-5
      },
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: <Cog6ToothIcon className="h-5 w-5" />,
      onClick: () => {
        console.log('Navigate to settings');
        // TODO: Navigate to settings page in Phase 2D-5
      },
      divider: true,
    },
    {
      id: 'logout',
      label: 'Keluar',
      icon: <ArrowRightOnRectangleIcon className="h-5 w-5" />,
      onClick: () => {
        setShowLogoutModal(true);
      },
      danger: true,
    },
  ];

  return (
    <header
      className={cn(
        'bg-nb-white border-b-3 border-nb-black',
        'sticky top-0 z-30',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left section: Mobile menu + Breadcrumb */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile hamburger menu */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={cn(
              'lg:hidden p-2 hover:bg-nb-gray-100 active:bg-nb-gray-200',
              'border-2 border-nb-black transition-colors duration-100',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-primary focus-visible:outline-offset-2'
            )}
            aria-label="Open navigation menu"
            aria-expanded={false}
          >
            <Bars3Icon className="h-6 w-6 text-nb-black" />
          </button>

          {/* Desktop sidebar toggle (optional, can be removed if sidebar is always visible) */}
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'hidden lg:flex p-2 hover:bg-nb-gray-100 active:bg-nb-gray-200',
              'border-2 border-nb-black transition-colors duration-100',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-primary focus-visible:outline-offset-2'
            )}
            aria-label="Toggle sidebar"
          >
            <Bars3Icon className="h-6 w-6 text-nb-black" />
          </button>

          {/* Breadcrumb */}
          {showBreadcrumb && (
            <div className="hidden md:block flex-1 min-w-0">
              <Breadcrumb />
            </div>
          )}
        </div>

        {/* Right section: Notifications + User menu */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            type="button"
            className={cn(
              'relative p-2 hover:bg-nb-gray-100 active:bg-nb-gray-200',
              'border-2 border-nb-black transition-colors duration-100',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-primary focus-visible:outline-offset-2'
            )}
            aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ''}`}
            onClick={() => {
              console.log('Open notifications');
              // TODO: Open notifications panel in Phase 2D-4
            }}
          >
            <BellIcon className="h-6 w-6 text-nb-black" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1">
                <NBBadge variant="danger" size="sm">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </NBBadge>
              </span>
            )}
          </button>

          {/* User menu dropdown */}
          {user && (
            <NBDropdown
              trigger={
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-2 px-3 py-2',
                    'border-2 border-nb-black bg-nb-white',
                    'hover:bg-nb-gray-100 active:bg-nb-gray-200',
                    'transition-colors duration-100',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-nb-primary focus-visible:outline-offset-2'
                  )}
                  aria-label="User menu"
                >
                  {/* Avatar */}
                  <div className="h-8 w-8 rounded-full bg-nb-navy text-nb-white font-bold flex items-center justify-center text-sm border-2 border-nb-black">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  {/* User name (desktop only) */}
                  <span className="hidden lg:block font-bold text-sm text-nb-black">
                    {user.full_name}
                  </span>
                </button>
              }
              items={userMenuItems}
              position="bottom-right"
            />
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <NBModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Konfirmasi Keluar"
      >
        <div className="space-y-4">
          <p className="text-nb-gray-700">Apakah Anda yakin ingin keluar dari aplikasi?</p>
          <div className="flex gap-3 justify-end">
            <NBButton
              variant="secondary"
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
            >
              Batal
            </NBButton>
            <NBButton
              variant="danger"
              onClick={handleLogout}
              loading={isLoggingOut}
              disabled={isLoggingOut}
            >
              Keluar
            </NBButton>
          </div>
        </div>
      </NBModal>
    </header>
  );
}
