/**
 * Unit Tests: Role Constants
 * Tests role definitions and helper functions (Phase 2C - ADR-009)
 */

import type { UserRole } from '@/types/models';
import {
  WEB_ROLES,
  ADMIN_ROLES,
  roleAssignmentScope,
  MONITORING_ROLES,
  TASK_MANAGER_ROLES,
  CLOCKABLE_ROLES,
  OVERTIME_APPROVER_ROLES,
  ROLE_LABELS,
  ROLE_BADGE_VARIANTS,
  ALL_ROLES,
  VALID_TASK_ASSIGNMENTS,
  hasRole,
} from '../roles';

describe('Role Constants', () => {
  describe('WEB_ROLES', () => {
    it('should contain all 6 web-accessible roles', () => {
      expect(WEB_ROLES).toHaveLength(6);
    });

    it('should include korlap in WEB_ROLES', () => {
      expect(WEB_ROLES).toContain('korlap');
    });

    it('should include admin_rayon in WEB_ROLES', () => {
      expect(WEB_ROLES).toContain('admin_rayon');
    });

    it('should include kepala_rayon in WEB_ROLES', () => {
      expect(WEB_ROLES).toContain('kepala_rayon');
    });

    it('should include management in WEB_ROLES', () => {
      expect(WEB_ROLES).toContain('management');
    });

    it('should include admin_system in WEB_ROLES', () => {
      expect(WEB_ROLES).toContain('admin_system');
    });

    it('should include superadmin in WEB_ROLES', () => {
      expect(WEB_ROLES).toContain('superadmin');
    });

    it('should not include satgas or linmas in WEB_ROLES', () => {
      expect(WEB_ROLES).not.toContain('satgas');
      expect(WEB_ROLES).not.toContain('linmas');
    });
  });

  describe('ADMIN_ROLES', () => {
    it('should contain exactly 3 admin roles', () => {
      expect(ADMIN_ROLES).toHaveLength(3);
    });

    it('should include admin_system', () => {
      expect(ADMIN_ROLES).toContain('admin_system');
    });

    it('should include superadmin', () => {
      expect(ADMIN_ROLES).toContain('superadmin');
    });

    it('should include management (full admin_system parity)', () => {
      expect(ADMIN_ROLES).toContain('management');
    });

    it('should not include other roles', () => {
      expect(ADMIN_ROLES).not.toContain('korlap');
      expect(ADMIN_ROLES).not.toContain('admin_rayon');
      expect(ADMIN_ROLES).not.toContain('kepala_rayon');
    });
  });

  describe('MONITORING_ROLES', () => {
    it('should contain all 6 monitoring roles', () => {
      expect(MONITORING_ROLES).toHaveLength(6);
    });

    it('should include admin_rayon for monitoring', () => {
      expect(MONITORING_ROLES).toContain('admin_rayon');
    });

    it('should include all admin and management roles', () => {
      expect(MONITORING_ROLES).toContain('korlap');
      expect(MONITORING_ROLES).toContain('kepala_rayon');
      expect(MONITORING_ROLES).toContain('management');
      expect(MONITORING_ROLES).toContain('admin_system');
      expect(MONITORING_ROLES).toContain('superadmin');
    });
  });

  describe('TASK_MANAGER_ROLES', () => {
    it('should contain task management roles', () => {
      expect(TASK_MANAGER_ROLES.length).toBeGreaterThan(0);
    });

    it('should include korlap as task manager', () => {
      expect(TASK_MANAGER_ROLES).toContain('korlap');
    });

    it('should include kepala_rayon as task manager', () => {
      expect(TASK_MANAGER_ROLES).toContain('kepala_rayon');
    });

    it('should not include satgas or linmas', () => {
      expect(TASK_MANAGER_ROLES).not.toContain('satgas');
      expect(TASK_MANAGER_ROLES).not.toContain('linmas');
    });
  });

  describe('CLOCKABLE_ROLES', () => {
    it('should include only field roles with area assignments', () => {
      expect(CLOCKABLE_ROLES).toContain('satgas');
      expect(CLOCKABLE_ROLES).toContain('linmas');
      expect(CLOCKABLE_ROLES).toContain('korlap');
      expect(CLOCKABLE_ROLES).toHaveLength(3);
    });

    it('should not include admin_rayon or kepala_rayon', () => {
      expect(CLOCKABLE_ROLES).not.toContain('admin_rayon');
      expect(CLOCKABLE_ROLES).not.toContain('kepala_rayon');
    });
  });

  describe('OVERTIME_APPROVER_ROLES', () => {
    it('should include korlap and kepala_rayon as approvers', () => {
      expect(OVERTIME_APPROVER_ROLES).toHaveLength(2);
      expect(OVERTIME_APPROVER_ROLES).toContain('korlap');
      expect(OVERTIME_APPROVER_ROLES).toContain('kepala_rayon');
    });
  });

  describe('ROLE_LABELS', () => {
    it('should have Indonesian labels for all 9 roles', () => {
      expect(Object.keys(ROLE_LABELS)).toHaveLength(9);
    });

    it('should have correct Indonesian labels', () => {
      expect(ROLE_LABELS.satgas).toBe('Satgas');
      expect(ROLE_LABELS.linmas).toBe('Linmas');
      expect(ROLE_LABELS.korlap).toBe('Korlap');
      expect(ROLE_LABELS.admin_rayon).toBe('Admin Rayon');
      expect(ROLE_LABELS.kepala_rayon).toBe('Kepala Rayon');
      expect(ROLE_LABELS.management).toBe('Management');
      expect(ROLE_LABELS.admin_system).toBe('Admin Sistem');
      expect(ROLE_LABELS.superadmin).toBe('Superadmin');
    });
  });

  describe('ROLE_BADGE_VARIANTS', () => {
    it('should have badge variants for all 9 roles', () => {
      expect(Object.keys(ROLE_BADGE_VARIANTS)).toHaveLength(9);
    });

    it('should use appropriate variants for field roles', () => {
      expect(ROLE_BADGE_VARIANTS.satgas).toBe('secondary');
      expect(ROLE_BADGE_VARIANTS.linmas).toBe('secondary');
    });

    it('should use success variant for korlap', () => {
      expect(ROLE_BADGE_VARIANTS.korlap).toBe('success');
    });

    it('should use destructive variant for admin roles', () => {
      expect(ROLE_BADGE_VARIANTS.admin_system).toBe('destructive');
      expect(ROLE_BADGE_VARIANTS.superadmin).toBe('destructive');
    });
  });

  describe('ALL_ROLES', () => {
    it('should contain all 9 roles (Phase 2C + Phase 3 staff_kecamatan)', () => {
      expect(ALL_ROLES).toHaveLength(9);
    });

    it('should be in display order', () => {
      expect(ALL_ROLES[0]).toBe('satgas');
      expect(ALL_ROLES[1]).toBe('linmas');
      expect(ALL_ROLES[7]).toBe('superadmin');
    });

    it('should include all unique roles', () => {
      const uniqueRoles = new Set(ALL_ROLES);
      expect(uniqueRoles.size).toBe(9);
    });
  });

  describe('VALID_TASK_ASSIGNMENTS', () => {
    it('should define assignment rules for korlap', () => {
      expect(VALID_TASK_ASSIGNMENTS.korlap).toEqual(['satgas', 'linmas']);
    });

    it('should define assignment rules for kepala_rayon', () => {
      expect(VALID_TASK_ASSIGNMENTS.kepala_rayon).toEqual(['korlap']);
    });

    it('should define assignment rules for management', () => {
      expect(VALID_TASK_ASSIGNMENTS.management).toContain('kepala_rayon');
      expect(VALID_TASK_ASSIGNMENTS.management).toContain('korlap');
    });

    it('should define assignment rules for admin roles', () => {
      expect(VALID_TASK_ASSIGNMENTS.admin_system).toContain('kepala_rayon');
      expect(VALID_TASK_ASSIGNMENTS.superadmin).toContain('kepala_rayon');
    });

    it('should not define rules for field roles', () => {
      expect(VALID_TASK_ASSIGNMENTS.satgas).toBeUndefined();
      expect(VALID_TASK_ASSIGNMENTS.linmas).toBeUndefined();
    });
  });

  describe('hasRole() helper', () => {
    it('should return true when role is in allowed list', () => {
      expect(hasRole('admin_system', ADMIN_ROLES)).toBe(true);
      expect(hasRole('superadmin', ADMIN_ROLES)).toBe(true);
    });

    it('should return false when role is not in allowed list', () => {
      expect(hasRole('korlap', ADMIN_ROLES)).toBe(false);
      expect(hasRole('satgas', ADMIN_ROLES)).toBe(false);
    });

    it('should work with WEB_ROLES', () => {
      expect(hasRole('korlap', WEB_ROLES)).toBe(true);
      expect(hasRole('admin_rayon', WEB_ROLES)).toBe(true);
      expect(hasRole('satgas', WEB_ROLES)).toBe(false);
    });

    it('should work with custom role arrays', () => {
      const customRoles: UserRole[] = ['satgas', 'linmas', 'korlap'];
      expect(hasRole('satgas', customRoles)).toBe(true);
      expect(hasRole('admin_system', customRoles)).toBe(false);
    });

    it('should return false for empty allowed list', () => {
      expect(hasRole('admin_system', [])).toBe(false);
    });
  });

  describe('roleAssignmentScope (ADR-044/045 role-driven inputs)', () => {
    it('hides all scope inputs for system + management roles', () => {
      for (const role of ['superadmin', 'admin_system', 'management'] as UserRole[]) {
        expect(roleAssignmentScope(role)).toEqual({ rayon: false, region: false, location: false });
      }
    });

    it('shows rayon only for kepala_rayon + admin_rayon (district)', () => {
      for (const role of ['kepala_rayon', 'admin_rayon'] as UserRole[]) {
        expect(roleAssignmentScope(role)).toEqual({ rayon: true, region: false, location: false });
      }
    });

    it('shows rayon + region + optional location for korlap (region)', () => {
      expect(roleAssignmentScope('korlap')).toEqual({ rayon: true, region: true, location: true });
    });

    it('hides all scope inputs for satgas/linmas (area+shift come from schedules)', () => {
      for (const role of ['satgas', 'linmas', 'staff_kecamatan'] as UserRole[]) {
        expect(roleAssignmentScope(role)).toEqual({ rayon: false, region: false, location: false });
      }
    });

    it('shows nothing for an unset role', () => {
      expect(roleAssignmentScope('')).toEqual({ rayon: false, region: false, location: false });
    });
  });

  describe('Type Safety', () => {
    it('should enforce UserRole type for hasRole', () => {
      const role: UserRole = 'admin_system';
      expect(hasRole(role, ADMIN_ROLES)).toBe(true);
    });

    it('should type check role arrays', () => {
      const roles: UserRole[] = WEB_ROLES;
      expect(Array.isArray(roles)).toBe(true);
    });
  });
});
