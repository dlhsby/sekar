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
 * - Admin: Full access to all features
 * - TopManagement: Monitoring, reports, analytics
 * - KepalaRayon: Rayon-level monitoring, reports, tasks
 * - KoordinatorLapangan: Area-level monitoring, schedules, tasks
 * 
 * @example
 * ```tsx
 * const userRole = 'Admin';
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
    roles: ['Admin', 'TopManagement', 'KepalaRayon', 'KoordinatorLapangan'],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    href: '/monitoring',
    icon: MapIcon,
    roles: ['Admin', 'TopManagement', 'KepalaRayon', 'KoordinatorLapangan'],
  },
  {
    id: 'users',
    label: 'Users',
    href: '/users',
    icon: UsersIcon,
    roles: ['Admin'], // Admin only
  },
  {
    id: 'areas',
    label: 'Areas',
    href: '/areas',
    icon: MapPinIcon,
    roles: ['Admin', 'TopManagement'],
  },
  {
    id: 'rayons',
    label: 'Rayons',
    href: '/rayons',
    icon: BuildingOfficeIcon,
    roles: ['Admin', 'TopManagement'],
  },
  {
    id: 'schedules',
    label: 'Schedules',
    href: '/schedules',
    icon: CalendarIcon,
    roles: ['Admin', 'KoordinatorLapangan'],
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: DocumentTextIcon,
    roles: ['Admin', 'TopManagement', 'KepalaRayon', 'KoordinatorLapangan'],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: ClipboardDocumentListIcon,
    roles: ['Admin', 'KepalaRayon', 'KoordinatorLapangan'],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Cog6ToothIcon,
    roles: ['Admin'],
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
