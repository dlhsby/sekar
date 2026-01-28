'use client';

import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export interface NBSidebarItem {
  /** Unique item ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: ReactNode;
  /** Navigation href */
  href?: string;
  /** Click handler (alternative to href) */
  onClick?: () => void;
  /** Nested menu items */
  children?: NBSidebarItem[];
  /** Required roles to see this item */
  roles?: string[];
}

export interface NBSidebarProps extends HTMLAttributes<HTMLElement> {
  /** Navigation items */
  items: NBSidebarItem[];
  /** Whether sidebar is open (mobile) */
  isOpen?: boolean;
  /** Close handler (mobile) */
  onClose?: () => void;
  /** Current path for active state */
  currentPath?: string;
  /** Current user role for filtering */
  userRole?: string;
  /** User info to display */
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
}

/**
 * Neo Brutalism Sidebar Component
 *
 * Features:
 * - Fixed width (256px / w-64)
 * - Navy background with white text
 * - Active state highlighting
 * - Nested menu support
 * - Role-based menu filtering
 * - User info display
 * - Mobile responsive (collapsible)
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * const navigation = [
 *   { id: 'dashboard', label: 'Dashboard', href: '/', icon: <HomeIcon />, roles: ['*'] },
 *   { id: 'users', label: 'Users', href: '/users', icon: <UsersIcon />, roles: ['Admin'] },
 * ];
 *
 * <NBSidebar
 *   items={navigation}
 *   user={{ name: 'Admin', role: 'Administrator' }}
 *   userRole="Admin"
 * />
 * ```
 */
export const NBSidebar = forwardRef<HTMLElement, NBSidebarProps>(
  (
    {
      className,
      items,
      isOpen = true,
      onClose,
      currentPath,
      userRole = '',
      user,
      ...props
    },
    ref
  ) => {
    const pathname = usePathname();
    const activePath = currentPath || pathname;

    // Filter items by role
    const filteredItems = items.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      if (item.roles.includes('*')) return true;
      return item.roles.includes(userRole);
    });

    // Render navigation item
    const renderItem = (item: NBSidebarItem) => {
      const isActive =
        activePath === item.href || activePath?.startsWith(item.href + '/');

      const content = (
        <>
          {item.icon && (
            <span className="w-5 h-5 flex-shrink-0 inline-flex items-center justify-center">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </>
      );

      const baseClasses = cn(
        'flex items-center gap-3 px-4 py-3 font-medium transition-colors duration-100',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2',
        isActive
          ? 'bg-nb-white text-nb-navy'
          : 'text-white/80 hover:bg-white/10 active:bg-white/20'
      );

      if (item.href) {
        return (
          <Link key={item.id} href={item.href} className={baseClasses}>
            {content}
          </Link>
        );
      }

      if (item.onClick) {
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={cn(baseClasses, 'w-full text-left')}
          >
            {content}
          </button>
        );
      }

      return (
        <div key={item.id} className={baseClasses}>
          {content}
        </div>
      );
    };

    return (
      <aside
        ref={ref}
        className={cn(
          'w-64 bg-nb-navy text-nb-white flex flex-col border-r-3 border-nb-black',
          'fixed lg:static inset-y-0 left-0 z-40',
          'transition-transform duration-300 lg:translate-x-0',
          !isOpen && '-translate-x-full',
          className
        )}
        {...props}
      >
        {/* Logo/Header */}
        <div className="p-6 border-b-2 border-white/20 flex-shrink-0">
          <h1 className="text-2xl font-extrabold">SEKAR</h1>
          <p className="text-white/60 text-sm mt-1">Dashboard Admin</p>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 p-4 space-y-1 overflow-y-auto"
          role="navigation"
          aria-label="Main navigation"
        >
          {filteredItems.map((item) => renderItem(item))}
        </nav>

        {/* User info */}
        {user && (
          <div className="p-4 border-t-2 border-white/20 flex-shrink-0">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border-2 border-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-nb-white text-nb-navy font-bold flex items-center justify-center border-2 border-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{user.name}</p>
                <p className="text-white/80 text-xs truncate">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-none"
            aria-label="Close sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </aside>
    );
  }
);

NBSidebar.displayName = 'NBSidebar';
