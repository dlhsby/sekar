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
  FolderIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { ComponentType } from 'react';
import { ADMIN_ROLES, MONITORING_ROLES, TASK_MANAGER_ROLES } from '@/lib/constants/roles';

/**
 * Navigation Item Interface
 */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles: string[];
  children?: NavItem[];
}

/**
 * Navigation Items Configuration (Phase 2C)
 */
export const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    roles: [...MONITORING_ROLES],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    href: '/monitoring',
    icon: MapIcon,
    roles: [...MONITORING_ROLES],
  },
  {
    id: 'tasks',
    label: 'Tugas',
    href: '/tasks',
    icon: ClipboardDocumentListIcon,
    roles: [...TASK_MANAGER_ROLES],
  },
  {
    id: 'activities',
    label: 'Aktivitas',
    href: '/activities',
    icon: DocumentTextIcon,
    roles: [...MONITORING_ROLES],
  },
  {
    id: 'overtime',
    label: 'Lembur',
    href: '/overtime',
    icon: ClockIcon,
    roles: [...MONITORING_ROLES],
  },
  {
    id: 'data',
    label: 'Data',
    href: '#',
    icon: FolderIcon,
    roles: [...ADMIN_ROLES, 'top_management', 'korlap', 'admin_data'],
    children: [
      {
        id: 'users',
        label: 'Users',
        href: '/users',
        icon: UsersIcon,
        roles: [...ADMIN_ROLES, 'admin_data'],
      },
      {
        id: 'areas',
        label: 'Areas',
        href: '/areas',
        icon: MapPinIcon,
        roles: [...ADMIN_ROLES, 'top_management'],
      },
      {
        id: 'rayons',
        label: 'Rayons',
        href: '/rayons',
        icon: BuildingOfficeIcon,
        roles: [...ADMIN_ROLES, 'top_management'],
      },
      {
        id: 'schedules',
        label: 'Jadwal',
        href: '/schedules',
        icon: CalendarIcon,
        roles: [...ADMIN_ROLES, 'korlap', 'admin_data'],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    roles: [...ADMIN_ROLES],
  },
];

/**
 * Filter Navigation Items by Role
 */
export const filterNavigationByRole = (items: NavItem[], userRole: string): NavItem[] => {
  return items
    .filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      if (item.roles.includes('*')) return true;
      return item.roles.includes(userRole);
    })
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: filterNavigationByRole(item.children, userRole),
        };
      }
      return item;
    })
    .filter((item) => {
      if (item.children) {
        return item.children.length > 0;
      }
      return true;
    });
};

/**
 * Get Breadcrumb Path
 */
export const getBreadcrumbPath = (pathname: string): { label: string; href: string }[] => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  segments.forEach((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const navItem = navigationItems.find((item) => item.href === href);
    const label = navItem?.label || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, href });
  });

  return breadcrumbs;
};
