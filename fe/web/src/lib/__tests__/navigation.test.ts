/**
 * Unit Tests: Navigation Utilities
 * Tests navigation helpers, role-based filtering, and breadcrumb generation
 */

import {
  navigationItems,
  filterNavigationByRole,
  getBreadcrumbPath,
  type NavItem,
} from '../navigation';

describe('Navigation Utilities', () => {
  describe('navigationItems', () => {
    it('should contain all expected navigation items', () => {
      expect(navigationItems).toHaveLength(6);

      const navIds = navigationItems.map((item) => item.id);
      expect(navIds).toContain('dashboard');
      expect(navIds).toContain('monitoring');
      expect(navIds).toContain('tasks');
      expect(navIds).toContain('reports');
      expect(navIds).toContain('data');
      expect(navIds).toContain('settings');

      // Check nested items under 'data'
      const dataItem = navigationItems.find(item => item.id === 'data');
      expect(dataItem?.children).toBeDefined();
      expect(dataItem?.children?.length).toBe(4);
      const childIds = dataItem?.children?.map(child => child.id);
      expect(childIds).toContain('users');
      expect(childIds).toContain('areas');
      expect(childIds).toContain('rayons');
      expect(childIds).toContain('schedules');
    });

    it('should have correct structure for each navigation item', () => {
      navigationItems.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('href');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('roles');
        expect(typeof item.id).toBe('string');
        expect(typeof item.label).toBe('string');
        expect(typeof item.href).toBe('string');
        // Icon is a React component (object in test environment)
        expect(item.icon).toBeDefined();
        expect(Array.isArray(item.roles)).toBe(true);
      });
    });

    it('should have admin-only routes', () => {
      const adminOnlyItems = navigationItems.filter(
        (item) => item.roles.length === 1 && item.roles[0] === 'admin'
      );

      expect(adminOnlyItems.length).toBeGreaterThan(0);
      expect(adminOnlyItems.find((item) => item.id === 'settings')).toBeDefined();

      // Check nested admin-only routes under 'data'
      const dataItem = navigationItems.find(item => item.id === 'data');
      const usersItem = dataItem?.children?.find(child => child.id === 'users');
      expect(usersItem?.roles).toEqual(['admin']);
    });
  });

  describe('filterNavigationByRole', () => {
    it('should return all items for admin role', () => {
      const filtered = filterNavigationByRole(navigationItems, 'admin');

      expect(filtered).toHaveLength(navigationItems.length);
      expect(filtered.find((item) => item.id === 'dashboard')).toBeDefined();
      expect(filtered.find((item) => item.id === 'settings')).toBeDefined();

      // Check nested users item under 'data'
      const dataItem = filtered.find((item) => item.id === 'data');
      expect(dataItem).toBeDefined();
      expect(dataItem?.children?.find(child => child.id === 'users')).toBeDefined();
    });

    it('should filter out admin-only items for top_management', () => {
      const filtered = filterNavigationByRole(navigationItems, 'top_management');

      expect(filtered.find((item) => item.id === 'dashboard')).toBeDefined();
      expect(filtered.find((item) => item.id === 'monitoring')).toBeDefined();
      expect(filtered.find((item) => item.id === 'reports')).toBeDefined();

      // Check nested items under 'data'
      const dataItem = filtered.find((item) => item.id === 'data');
      expect(dataItem).toBeDefined();
      expect(dataItem?.children?.find(child => child.id === 'areas')).toBeDefined();
      expect(dataItem?.children?.find(child => child.id === 'rayons')).toBeDefined();

      // Should NOT include admin-only routes
      expect(dataItem?.children?.find(child => child.id === 'users')).toBeUndefined();
      expect(filtered.find((item) => item.id === 'settings')).toBeUndefined();
      expect(dataItem?.children?.find(child => child.id === 'schedules')).toBeUndefined();
    });

    it('should return appropriate items for kepala_rayon', () => {
      const filtered = filterNavigationByRole(navigationItems, 'kepala_rayon');

      expect(filtered.find((item) => item.id === 'dashboard')).toBeDefined();
      expect(filtered.find((item) => item.id === 'monitoring')).toBeDefined();
      expect(filtered.find((item) => item.id === 'reports')).toBeDefined();
      expect(filtered.find((item) => item.id === 'tasks')).toBeDefined();

      // Should NOT include 'data' submenu (no accessible children)
      expect(filtered.find((item) => item.id === 'data')).toBeUndefined();
      // Settings is admin-only
      expect(filtered.find((item) => item.id === 'settings')).toBeUndefined();
    });

    it('should return appropriate items for koordinator_lapangan', () => {
      const filtered = filterNavigationByRole(
        navigationItems,
        'koordinator_lapangan'
      );

      expect(filtered.find((item) => item.id === 'dashboard')).toBeDefined();
      expect(filtered.find((item) => item.id === 'monitoring')).toBeDefined();
      expect(filtered.find((item) => item.id === 'reports')).toBeDefined();
      expect(filtered.find((item) => item.id === 'tasks')).toBeDefined();

      // Check nested items under 'data'
      const dataItem = filtered.find((item) => item.id === 'data');
      expect(dataItem).toBeDefined();
      expect(dataItem?.children?.find(child => child.id === 'schedules')).toBeDefined();

      // Should NOT include
      expect(dataItem?.children?.find(child => child.id === 'users')).toBeUndefined();
      expect(dataItem?.children?.find(child => child.id === 'areas')).toBeUndefined();
      expect(dataItem?.children?.find(child => child.id === 'rayons')).toBeUndefined();
    });

    it('should return empty array for worker role', () => {
      const filtered = filterNavigationByRole(navigationItems, 'worker');

      expect(filtered).toHaveLength(0);
    });

    it('should include items with wildcard role', () => {
      const testItems: NavItem[] = [
        {
          id: 'public',
          label: 'Public',
          href: '/public',
          icon: () => null,
          roles: ['*'],
        },
        {
          id: 'admin-only',
          label: 'Admin',
          href: '/admin',
          icon: () => null,
          roles: ['admin'],
        },
      ];

      const filtered = filterNavigationByRole(testItems, 'worker');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('public');
    });

    it('should include items with empty roles array', () => {
      const testItems: NavItem[] = [
        {
          id: 'open',
          label: 'Open',
          href: '/open',
          icon: () => null,
          roles: [],
        },
      ];

      const filtered = filterNavigationByRole(testItems, 'worker');

      expect(filtered).toHaveLength(1);
    });
  });

  describe('getBreadcrumbPath', () => {
    it('should generate breadcrumbs for root path', () => {
      const breadcrumbs = getBreadcrumbPath('/dashboard');

      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({
        label: 'Dashboard',
        href: '/dashboard',
      });
    });

    it('should generate breadcrumbs for nested path', () => {
      const breadcrumbs = getBreadcrumbPath('/dashboard/users');

      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0]).toEqual({
        label: 'Dashboard',
        href: '/dashboard',
      });
      expect(breadcrumbs[1]).toEqual({
        label: 'Users',
        href: '/dashboard/users',
      });
    });

    it('should generate breadcrumbs for deep nested path', () => {
      const breadcrumbs = getBreadcrumbPath('/dashboard/users/123/edit');

      expect(breadcrumbs).toHaveLength(4);
      expect(breadcrumbs[0].href).toBe('/dashboard');
      expect(breadcrumbs[1].href).toBe('/dashboard/users');
      expect(breadcrumbs[2].href).toBe('/dashboard/users/123');
      expect(breadcrumbs[3].href).toBe('/dashboard/users/123/edit');
    });

    it('should use navigation item labels when available', () => {
      const breadcrumbs = getBreadcrumbPath('/areas');

      expect(breadcrumbs[0].label).toBe('Areas');
    });

    it('should capitalize segment names when nav item not found', () => {
      const breadcrumbs = getBreadcrumbPath('/dashboard/custom-page');

      expect(breadcrumbs[1].label).toBe('Custom-page');
    });

    it('should handle path with trailing slash', () => {
      const breadcrumbs = getBreadcrumbPath('/dashboard/users/');

      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[1]).toEqual({
        label: 'Users',
        href: '/dashboard/users',
      });
    });

    it('should handle root path correctly', () => {
      const breadcrumbs = getBreadcrumbPath('/');

      expect(breadcrumbs).toHaveLength(0);
    });

    it('should handle path with ID segments', () => {
      const breadcrumbs = getBreadcrumbPath('/users/abc-123-def');

      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0].label).toBe('Users');
      expect(breadcrumbs[1].label).toBe('Abc-123-def');
      expect(breadcrumbs[1].href).toBe('/users/abc-123-def');
    });

    it('should handle monitoring path', () => {
      const breadcrumbs = getBreadcrumbPath('/monitoring');

      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({
        label: 'Monitoring',
        href: '/monitoring',
      });
    });

    it('should handle reports path', () => {
      const breadcrumbs = getBreadcrumbPath('/reports');

      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({
        label: 'Reports',
        href: '/reports',
      });
    });

    it('should handle tasks path with ID', () => {
      const breadcrumbs = getBreadcrumbPath('/tasks/task-123');

      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0].label).toBe('Tasks');
      expect(breadcrumbs[1].label).toBe('Task-123');
    });
  });
});
