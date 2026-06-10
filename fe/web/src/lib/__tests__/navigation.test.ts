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
      // Phase 4-R grouping: dashboard, monitoring, work(group), data(group),
      // pruning-requests + 2 staff_kecamatan items = 7 top-level entries.
      // Settings moved to the avatar dropdown (no longer in the sidebar).
      expect(navigationItems).toHaveLength(7);

      const navIds = navigationItems.map((item) => item.id);
      expect(navIds).toContain('dashboard');
      expect(navIds).toContain('monitoring');
      expect(navIds).toContain('work');
      expect(navIds).toContain('data');
      expect(navIds).toContain('pruning-requests');
      expect(navIds).not.toContain('settings');

      // 'Pekerjaan' group holds tasks / activities / overtime / schedules.
      const workItem = navigationItems.find((item) => item.id === 'work');
      expect(workItem?.children?.map((c) => c.id)).toEqual([
        'tasks',
        'activities',
        'overtime',
        'schedules',
      ]);

      // 'Data Master' group holds users / areas / rayons.
      const dataItem = navigationItems.find((item) => item.id === 'data');
      expect(dataItem?.children?.map((c) => c.id)).toEqual(['users', 'areas', 'rayons']);
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

    it('should restrict the Users route to admin roles', () => {
      // Users management is admin/admin_data only — nested under 'Data Master'.
      const dataItem = navigationItems.find((item) => item.id === 'data');
      const usersItem = dataItem?.children?.find((child) => child.id === 'users');
      expect(usersItem?.roles).toContain('admin_system');
      expect(usersItem?.roles).toContain('superadmin');
      expect(usersItem?.roles).toContain('admin_data');
    });
  });

  describe('filterNavigationByRole', () => {
    it('should return all groups for superadmin role', () => {
      const filtered = filterNavigationByRole(navigationItems, 'superadmin');

      // superadmin sees: dashboard, monitoring, work, data, pruning-requests
      // (the 2 staff_kecamatan-only items remain hidden).
      expect(filtered.map((i) => i.id)).toEqual([
        'dashboard',
        'monitoring',
        'work',
        'data',
        'pruning-requests',
      ]);

      const workItem = filtered.find((item) => item.id === 'work');
      expect(workItem?.children?.map((c) => c.id)).toEqual([
        'tasks',
        'activities',
        'overtime',
        'schedules',
      ]);
      const dataItem = filtered.find((item) => item.id === 'data');
      expect(dataItem?.children?.find((child) => child.id === 'users')).toBeDefined();
    });

    it('should filter out admin-only children for top_management', () => {
      const filtered = filterNavigationByRole(navigationItems, 'top_management');

      const workItem = filtered.find((item) => item.id === 'work');
      expect(workItem).toBeDefined();
      // top_management can see tasks/activities/overtime but NOT schedules.
      expect(workItem?.children?.map((c) => c.id)).toEqual(['tasks', 'activities', 'overtime']);

      const dataItem = filtered.find((item) => item.id === 'data');
      expect(dataItem?.children?.find((child) => child.id === 'areas')).toBeDefined();
      expect(dataItem?.children?.find((child) => child.id === 'rayons')).toBeDefined();
      // Users is admin/admin_data only.
      expect(dataItem?.children?.find((child) => child.id === 'users')).toBeUndefined();
      expect(filtered.find((item) => item.id === 'settings')).toBeUndefined();
    });

    it('should return appropriate items for kepala_rayon', () => {
      const filtered = filterNavigationByRole(navigationItems, 'kepala_rayon');

      expect(filtered.find((item) => item.id === 'dashboard')).toBeDefined();
      expect(filtered.find((item) => item.id === 'monitoring')).toBeDefined();

      // kepala_rayon sees the work group (tasks/activities/overtime), no schedules.
      const workItem = filtered.find((item) => item.id === 'work');
      expect(workItem?.children?.map((c) => c.id)).toEqual(['tasks', 'activities', 'overtime']);

      // No 'Data Master' access.
      expect(filtered.find((item) => item.id === 'data')).toBeUndefined();
      expect(filtered.find((item) => item.id === 'settings')).toBeUndefined();
    });

    it('should return appropriate items for korlap', () => {
      const filtered = filterNavigationByRole(navigationItems, 'korlap');

      expect(filtered.find((item) => item.id === 'dashboard')).toBeDefined();
      expect(filtered.find((item) => item.id === 'monitoring')).toBeDefined();

      // korlap sees the full work group, including schedules.
      const workItem = filtered.find((item) => item.id === 'work');
      expect(workItem?.children?.map((c) => c.id)).toEqual([
        'tasks',
        'activities',
        'overtime',
        'schedules',
      ]);

      // korlap has no Data Master access.
      expect(filtered.find((item) => item.id === 'data')).toBeUndefined();
    });

    it('should return empty array for satgas role', () => {
      const filtered = filterNavigationByRole(navigationItems, 'satgas');

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
      // 'tasks' is now nested under the 'Pekerjaan' group, so the top-level
      // breadcrumb lookup falls back to the capitalised segment.
      expect(breadcrumbs[0].label).toBe('Tasks');
      expect(breadcrumbs[1].label).toBe('Task-123');
    });
  });
});
