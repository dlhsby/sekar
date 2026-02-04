import {
  HomeIcon,
  MapIcon,
  UsersIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { ComponentType } from 'react';

/**
 * Navigation Item Interface
 * 
 * Defines the structure for sidebar navigation items
 */
export interface NavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Icon component from Heroicons */
  icon: ComponentType<{ className?: string }>;
  /** Roles that can access this route */
  roles: string[];
  /** Nested navigation items */
  children?: NavItem[];
}

/**
 * Navigation Items Configuration
 * 
 * Role-based navigation structure for the dashboard sidebar.
 * Items are filtered based on the current user's role.
 * 
 * Roles:
 * - admin: Full access to all features
 * - top_management: Monitoring, reports, analytics
 * - kepala_rayon: Rayon-level monitoring, reports, tasks
 * - koordinator_lapangan: Area-level monitoring, schedules, tasks
 *
 * @example
 * ```tsx
 * const userRole = 'admin';
 * const filteredNav = navigationItems.filter(item =>
 *   item.roles.includes('*') || item.roles.includes(userRole)
 * );
 * ```
 */
export const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    roles: ['admin', 'top_management', 'kepala_rayon', 'koordinator_lapangan'],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    href: '/monitoring',
    icon: MapIcon,
    roles: ['admin', 'top_management', 'kepala_rayon', 'koordinator_lapangan'],
  },
  {
    id: 'users',
    label: 'Users',
    href: '/users',
    icon: UsersIcon,
    roles: ['admin'], // Admin only
  },
  {
    id: 'areas',
    label: 'Areas',
    href: '/areas',
    icon: MapPinIcon,
    roles: ['admin', 'top_management'],
  },
  {
    id: 'rayons',
    label: 'Rayons',
    href: '/rayons',
    icon: BuildingOfficeIcon,
    roles: ['admin', 'top_management'],
  },
  {
    id: 'schedules',
    label: 'Schedules',
    href: '/schedules',
    icon: CalendarIcon,
    roles: ['admin', 'koordinator_lapangan'],
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: DocumentTextIcon,
    roles: ['admin', 'top_management', 'kepala_rayon', 'koordinator_lapangan'],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: ClipboardDocumentListIcon,
    roles: ['admin', 'kepala_rayon', 'koordinator_lapangan'],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Cog6ToothIcon,
    roles: ['admin'],
  },
];

/**
 * Filter Navigation Items by Role
 * 
 * Utility function to filter navigation items based on user role.
 * 
 * @param items - Navigation items to filter
 * @param userRole - Current user's role
 * @returns Filtered navigation items
 */
export const filterNavigationByRole = (
  items: NavItem[],
  userRole: string
): NavItem[] => {
  return items.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (item.roles.includes('*')) return true;
    return item.roles.includes(userRole);
  });
};

/**
 * Get Breadcrumb Path
 * 
 * Converts a route path to breadcrumb segments.
 * 
 * @param pathname - Current route path
 * @returns Array of breadcrumb segments
 * 
 * @example
 * ```tsx
 * getBreadcrumbPath('/dashboard/users/123')
 * // Returns: [
 * //   { label: 'Dashboard', href: '/dashboard' },
 * //   { label: 'Users', href: '/dashboard/users' },
 * //   { label: '123', href: '/dashboard/users/123' }
 * // ]
 * ```
 */
export const getBreadcrumbPath = (pathname: string): { label: string; href: string }[] => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  segments.forEach((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    
    // Try to find label from navigation items
    const navItem = navigationItems.find((item) => item.href === href);
    const label = navItem?.label || segment.charAt(0).toUpperCase() + segment.slice(1);

    breadcrumbs.push({ label, href });
  });

  return breadcrumbs;
};
