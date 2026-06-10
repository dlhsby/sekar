'use client';

import { HTMLAttributes, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useUIStore } from '@/stores/ui';
import { useAuth } from '@/lib/auth/hooks';
import { NotificationBell } from '@/components/ui/notification-bell';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { RoleAvatar } from '@/components/ui/role-avatar';
import { getPageTitle } from '@/lib/navigation';
import { ADMIN_ROLES, hasRole } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';

export type HeaderProps = HTMLAttributes<HTMLElement>;

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
export function Header({ className, ...props }: HeaderProps) {
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const canOpenSettings = !!user && hasRole(user.role as UserRole, ADMIN_ROLES);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      className={cn('bg-nb-white border-b-2 border-nb-black', 'sticky top-0 z-30', className)}
      {...props}
    >
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left section: Mobile menu + Breadcrumb */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile hamburger menu */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
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

          {/* Page title — lives in the header so pages don't repeat a large
              in-body title (frees vertical space in the content area). */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-lg font-bold leading-tight text-nb-black">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Right section: Notifications + User menu */}
        <div className="flex items-center gap-3">
          {/* Light/dark toggle */}
          <ThemeToggle />

          {/* Notification bell (real unread count + popover) */}
          <NotificationBell />

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
                  <RoleAvatar
                    name={user.full_name}
                    role={user.role as UserRole}
                    src={user.profile_picture_url}
                    size="md"
                  />
                  <span className="hidden lg:block font-bold text-sm text-nb-black">
                    {user.full_name}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                {canOpenSettings && (
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Pengaturan
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={() => setShowLogoutModal(true)}>
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
            <DialogDescription>
              Apakah Anda yakin ingin keluar dari aplikasi?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
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
