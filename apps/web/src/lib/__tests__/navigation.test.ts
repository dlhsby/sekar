/**
 * Unit Tests: Navigation Utilities
 * Tests navigation helpers, role-based filtering, and breadcrumb generation
 */

import {
  navigationItems,
  filterNavigationByRole,
  getBreadcrumbPath,
  getBreadcrumbTrail,
  type NavItem,
} from '../navigation';

describe('Navigation Utilities', () => {
  describe('navigationItems', () => {
    it('should contain all expected navigation items', () => {
      // Top-level entries: dashboard, monitoring, work(group), access(group),
      // data(group), reports(group), settings + 2 staff_kecamatan items + the
      // external 'docs' (Panduan) link = 10. Analitik and Operasional are
      // archived (commented out in navigation.ts, hidden from the sidebar).
      // Pengguna lives in its own 'Pengguna & Hak Akses' group; Pengaturan is
      // on the sidebar.
      expect(navigationItems).toHaveLength(10);

      const navIds = navigationItems.map((item) => item.id);
      expect(navIds).toContain('dashboard');
      expect(navIds).toContain('monitoring');
      expect(navIds).toContain('work');
      expect(navIds).toContain('access');
      expect(navIds).toContain('data');
      expect(navIds).toContain('reports');
      expect(navIds).toContain('settings');
      // External public docs link, visible to every role.
      expect(navIds).toContain('docs');
      // Archived groups no longer appear in the sidebar.
      expect(navIds).not.toContain('analytics');
      expect(navIds).not.toContain('operations');
      // pruning-requests is not top-level (nested under 'work').
      expect(navIds).not.toContain('pruning-requests');

      // 'Pekerjaan' group: tasks / activities / overtime / schedules
      // (Jadwal — the daily roster, now the single schedule concept) / pruning.
      const workItem = navigationItems.find((item) => item.id === 'work');
      expect(workItem?.children?.map((c) => c.id)).toEqual([
        'tasks',
        'activities',
        'overtime',
        'schedules',
        'pruning-requests',
      ]);

      // 'Pengguna & Hak Akses' group holds user accounts + role management (ADR-044).
      const accessItem = navigationItems.find((item) => item.id === 'access');
      expect(accessItem?.children?.map((c) => c.id)).toEqual(['users', 'roles']);

      // 'Data Master' group: areas / rayons / plants + the 'Data Base' embed
      // page. Seeds and assets are archived (commented out) per request.
      const dataItem = navigationItems.find((item) => item.id === 'data');
      expect(dataItem?.children?.map((c) => c.id)).toEqual([
        'areas',
        'rayons',
        'plants',
        'database',
      ]);

      // 'Laporan' group: only the general Reporting embed page remains — the
      // old Daftar/Buat/Jadwal Laporan children are archived per request.
      const reportsItem = navigationItems.find((item) => item.id === 'reports');
      expect(reportsItem?.children?.map((c) => c.id)).toEqual(['reports-reporting']);
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
      // Users management is admin/admin_data only — nested under 'Pengguna & Hak Akses'.
      const accessItem = navigationItems.find((item) => item.id === 'access');
      const usersItem = accessItem?.children?.find((child) => child.id === 'users');
      expect(usersItem?.roles).toContain('admin_system');
      expect(usersItem?.roles).toContain('superadmin');
      expect(usersItem?.roles).toContain('admin_data');
    });
  });

  describe('filterNavigationByRole', () => {
    it('should return all groups for superadmin role', () => {
      const filtered = filterNavigationByRole(navigationItems, 'superadmin');

      // superadmin sees all admin groups; the 2 staff_kecamatan-only items stay
      // hidden. The external 'docs' link (roles ['*']) is appended for everyone.
      // Analitik/Operasional are archived (commented out), so they don't appear.
      expect(filtered.map((i) => i.id)).toEqual([
        'dashboard',
        'monitoring',
        'work',
        'access',
        'data',
        'reports',
        'settings',
        'docs',
      ]);

      const workItem = filtered.find((item) => item.id === 'work');
      expect(workItem?.children?.map((c) => c.id)).toEqual([
        'tasks',
        'activities',
        'overtime',
        'schedules',
        'pruning-requests',
      ]);
      const accessItem = filtered.find((item) => item.id === 'access');
      expect(accessItem?.children?.find((child) => child.id === 'users')).toBeDefined();
    });

    it('should filter out admin-only children for top_management', () => {
      const filtered = filterNavigationByRole(navigationItems, 'top_management');

      const workItem = filtered.find((item) => item.id === 'work');
      expect(workItem).toBeDefined();
      // top_management sees tasks/activities/overtime + schedule (view) + pruning.
      expect(workItem?.children?.map((c) => c.id)).toEqual([
        'tasks',
        'activities',
        'overtime',
        'schedules',
        'pruning-requests',
      ]);

      const dataItem = filtered.find((item) => item.id === 'data');
      expect(dataItem?.children?.find((child) => child.id === 'areas')).toBeDefined();
      expect(dataItem?.children?.find((child) => child.id === 'rayons')).toBeDefined();
      // Users is admin/admin_data only — hidden from top_management.
      expect(dataItem?.children?.find((child) => child.id === 'users')).toBeUndefined();
      // Pengaturan is visible to all monitoring roles (incl. top_management).
      expect(filtered.find((item) => item.id === 'settings')).toBeDefined();
    });

    it('should return appropriate items for kepala_rayon', () => {
      const filtered = filterNavigationByRole(navigationItems, 'kepala_rayon');

      expect(filtered.find((item) => item.id === 'dashboard')).toBeDefined();
      expect(filtered.find((item) => item.id === 'monitoring')).toBeDefined();

      // kepala_rayon sees tasks/activities/overtime + Jadwal Harian (schedules)
      // + pruning, but NOT the advanced 'schedules' (Jadwal Lanjutan).
      const workItem = filtered.find((item) => item.id === 'work');
      expect(workItem?.children?.map((c) => c.id)).toEqual([
        'tasks',
        'activities',
        'overtime',
        'schedules',
        'pruning-requests',
      ]);

      // No 'Data Master' access.
      expect(filtered.find((item) => item.id === 'data')).toBeUndefined();
      // Pengaturan is visible to all monitoring roles (incl. kepala_rayon).
      expect(filtered.find((item) => item.id === 'settings')).toBeDefined();
    });

    it('should return appropriate items for korlap', () => {
      const filtered = filterNavigationByRole(navigationItems, 'korlap');

      expect(filtered.find((item) => item.id === 'dashboard')).toBeDefined();
      expect(filtered.find((item) => item.id === 'monitoring')).toBeDefined();

      // korlap sees tasks/activities/overtime + the schedule (view access). No
      // pruning-requests (that's admin_data/kepala_rayon/management only).
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

    it('should only expose the public docs link for satgas role', () => {
      const filtered = filterNavigationByRole(navigationItems, 'satgas');

      // satgas has no dashboard surfaces of its own; the only visible item is the
      // external 'docs' (Panduan) link, which is open to every role.
      expect(filtered.map((i) => i.id)).toEqual(['docs']);
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

  describe('getBreadcrumbTrail', () => {
    it('returns the group → page trail for a known route', () => {
      expect(getBreadcrumbTrail('/tasks')).toEqual(['Pekerjaan', 'Tugas']);
      expect(getBreadcrumbTrail('/overtime')).toEqual(['Pekerjaan', 'Lembur']);
      expect(getBreadcrumbTrail('/users')).toEqual(['Pengguna & Hak Akses', 'Pengguna']);
      expect(getBreadcrumbTrail('/pruning-requests')).toEqual(['Pekerjaan', 'Permohonan Perantingan']);
    });

    it('returns a single-segment trail for top-level routes', () => {
      expect(getBreadcrumbTrail('/')).toEqual(['Dashboard']);
      expect(getBreadcrumbTrail('/monitoring')).toEqual(['Monitoring']);
    });

    it('appends a dynamic leaf for new / edit / detail routes', () => {
      expect(getBreadcrumbTrail('/tasks/new')).toEqual(['Pekerjaan', 'Tugas', 'Baru']);
      expect(getBreadcrumbTrail('/tasks/abc-123')).toEqual(['Pekerjaan', 'Tugas', 'Detail']);
      expect(getBreadcrumbTrail('/schedules/abc/edit')).toEqual([
        'Pekerjaan',
        'Jadwal',
        'Ubah',
      ]);
      expect(getBreadcrumbTrail('/users/u1')).toEqual(['Pengguna & Hak Akses', 'Pengguna', 'Detail']);
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
        label: 'common:nav.monitoring',
        href: '/monitoring',
      });
    });

    it('should handle reports path', () => {
      const breadcrumbs = getBreadcrumbPath('/reports');

      // The 'reports' nav item's href is now '#' (pure group — its only visible
      // child lives at /reports/reporting), so no nav item's href
      // matches '/reports' anymore and the lookup falls back to the
      // capitalized segment.
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
