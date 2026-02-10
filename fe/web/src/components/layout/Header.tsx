'use client';

import { HTMLAttributes, useState } from 'react';
import { Bell, Menu, User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useUIStore } from '@/stores/ui';
import { useAuth } from '@/lib/auth/hooks';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { Breadcrumb } from './Breadcrumb';

export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  showBreadcrumb?: boolean;
}

/**
 * Dashboard Header Component
 *
 * Neo Brutalism styled header with:
 * - Mobile hamburger menu trigger
 * - Desktop sidebar toggle
 * - Breadcrumb navigation
 * - Notification bell with badge
 * - User dropdown menu
 */
export function Header({
  className,
  showBreadcrumb = true,
  ...props
}: HeaderProps) {
  const { toggleSidebar, toggleMobileMenu } = useUIStore();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notification count (TODO: fetch from backend)
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

  return (
    <header
      className={cn(
        'bg-nb-white border-b-2 border-nb-black',
        'sticky top-0 z-30',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left section: Mobile menu + Breadcrumb */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile hamburger menu */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMobileMenu}
            className="lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop sidebar toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className="hidden lg:flex"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb */}
          {showBreadcrumb && (
            <div className="hidden md:block flex-1 min-w-0">
              <Breadcrumb aria-label="Navigasi breadcrumb" />
            </div>
          )}
        </div>

        {/* Right section: Notifications + User menu */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ''}`}
              onClick={() => {
                console.log('Open notifications');
              }}
            >
              <Bell className="h-5 w-5" />
            </Button>
            {notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 pointer-events-none">
                <Badge variant="destructive" size="sm">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              </span>
            )}
          </div>

          {/* User menu dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 min-h-touch',
                    'border-2 border-nb-black bg-nb-white shadow-nb-sm rounded-nb-base',
                    'hover:bg-nb-gray-50 active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5',
                    'transition-all duration-100',
                    'focus-visible:outline focus-visible:outline-4 focus-visible:outline-nb-primary/50 focus-visible:outline-offset-2'
                  )}
                  aria-label="User menu"
                >
                  <div className="h-8 w-8 bg-nb-sidebar text-nb-white font-bold flex items-center justify-center text-sm border-2 border-nb-black">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden lg:block font-bold text-sm text-nb-black">
                    {user.full_name}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onClick={() => setShowLogoutModal(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Keluar</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-nb-gray-700">
              Apakah Anda yakin ingin keluar dari aplikasi?
            </p>
          </div>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              loading={isLoggingOut}
              disabled={isLoggingOut}
            >
              Keluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
