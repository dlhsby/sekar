/**
 * Role Constants Tests
 * Phase 2C: 8-role system helper functions
 */

import type { UserRole } from '../../types/models.types';
import {
  ROLE_LABELS,
  CLOCKABLE_ROLES,
  ACTIVITY_SUBMITTERS,
  TASK_CREATORS,
  TASK_RECEIVERS,
  OVERTIME_SUBMITTERS,
  OVERTIME_APPROVERS,
  MONITORING_ROLES,
  VALID_TASK_ASSIGNMENTS,
  FILTER_SUBORDINATE_ROLES,
  isClockableRole,
  canSubmitActivities,
  canCreateTasks,
  canReceiveTasks,
  canSubmitOvertime,
  canApproveOvertime,
  canMonitor,
  getMonitoringScope,
} from '../roles';

describe('Role Constants', () => {
  describe('ROLE_LABELS', () => {
    it('should have labels for all 9 roles (8 internal + staff_kecamatan public-intake)', () => {
      expect(Object.keys(ROLE_LABELS)).toHaveLength(9);
      expect(ROLE_LABELS.satgas).toBe('Satgas');
      expect(ROLE_LABELS.linmas).toBe('Linmas');
      expect(ROLE_LABELS.korlap).toBe('Korlap');
      expect(ROLE_LABELS.admin_rayon).toBe('Admin Rayon');
      expect(ROLE_LABELS.kepala_rayon).toBe('Kepala Rayon');
      expect(ROLE_LABELS.management).toBe('Management');
      expect(ROLE_LABELS.admin_system).toBe('Admin Sistem');
      expect(ROLE_LABELS.superadmin).toBe('Superadmin');
      expect(ROLE_LABELS.staff_kecamatan).toBe('Staff Kecamatan');
    });
  });

  describe('CLOCKABLE_ROLES', () => {
    it('should include all 5 clockable roles matching backend', () => {
      expect(CLOCKABLE_ROLES).toEqual([
        'satgas',
        'linmas',
        'korlap',
        'admin_rayon',
        'kepala_rayon',
      ]);
      expect(CLOCKABLE_ROLES).toHaveLength(5);
    });

    it('should not include management/system roles', () => {
      expect(CLOCKABLE_ROLES).not.toContain('management');
      expect(CLOCKABLE_ROLES).not.toContain('admin_system');
      expect(CLOCKABLE_ROLES).not.toContain('superadmin');
    });
  });

  describe('ACTIVITY_SUBMITTERS', () => {
    it('should include satgas, linmas, korlap, admin_rayon, and kepala_rayon', () => {
      expect(ACTIVITY_SUBMITTERS).toEqual([
        'satgas',
        'linmas',
        'korlap',
        'admin_rayon',
        'kepala_rayon',
      ]);
      expect(ACTIVITY_SUBMITTERS).toHaveLength(5);
    });
  });

  describe('TASK_CREATORS', () => {
    it('should include management and admin roles (incl. admin_rayon, May 11 2026)', () => {
      expect(TASK_CREATORS).toEqual([
        'korlap',
        'kepala_rayon',
        'admin_rayon',
        'management',
        'admin_system',
        'superadmin',
      ]);
      expect(TASK_CREATORS).toHaveLength(6);
    });
  });

  describe('TASK_RECEIVERS', () => {
    it('should include field roles that can receive tasks (incl. admin_rayon, May 11 2026)', () => {
      expect(TASK_RECEIVERS).toEqual([
        'satgas',
        'linmas',
        'korlap',
        'kepala_rayon',
        'admin_rayon',
      ]);
      expect(TASK_RECEIVERS).toHaveLength(5);
    });
  });

  describe('OVERTIME_SUBMITTERS', () => {
    it('should include satgas, linmas, korlap, admin_rayon, and kepala_rayon', () => {
      expect(OVERTIME_SUBMITTERS).toEqual(['satgas', 'linmas', 'korlap', 'admin_rayon', 'kepala_rayon']);
      expect(OVERTIME_SUBMITTERS).toHaveLength(5);
    });
  });

  describe('OVERTIME_APPROVERS', () => {
    it('should include korlap, kepala_rayon, and management', () => {
      expect(OVERTIME_APPROVERS).toEqual(['korlap', 'kepala_rayon', 'management']);
      expect(OVERTIME_APPROVERS).toHaveLength(3);
    });
  });

  describe('MONITORING_ROLES', () => {
    it('should have correct city-level monitoring roles', () => {
      expect(MONITORING_ROLES.city).toEqual([
        'management',
        'admin_system',
        'superadmin',
      ]);
    });

    it('should have correct district-level monitoring roles', () => {
      expect(MONITORING_ROLES.district).toEqual(['kepala_rayon', 'admin_rayon']);
    });

    it('should have correct area-level monitoring roles', () => {
      expect(MONITORING_ROLES.area).toEqual(['korlap']);
    });
  });

  describe('VALID_TASK_ASSIGNMENTS', () => {
    it('should define correct task assignment hierarchy (May 11, 2026 expansion)', () => {
      expect(VALID_TASK_ASSIGNMENTS.korlap).toEqual(['korlap', 'satgas', 'linmas']);
      expect(VALID_TASK_ASSIGNMENTS.kepala_rayon).toEqual([
        'kepala_rayon', 'admin_rayon', 'korlap', 'satgas', 'linmas',
      ]);
      expect(VALID_TASK_ASSIGNMENTS.admin_rayon).toEqual([
        'kepala_rayon', 'admin_rayon', 'korlap', 'satgas', 'linmas',
      ]);
      expect(VALID_TASK_ASSIGNMENTS.management).toEqual([
        'kepala_rayon', 'admin_rayon', 'korlap', 'satgas', 'linmas',
      ]);
      expect(VALID_TASK_ASSIGNMENTS.admin_system).toEqual(['kepala_rayon', 'korlap']);
      expect(VALID_TASK_ASSIGNMENTS.superadmin).toEqual(['kepala_rayon', 'korlap']);
    });
  });

  describe('isClockableRole', () => {
    it('should return true for clockable roles', () => {
      expect(isClockableRole('satgas')).toBe(true);
      expect(isClockableRole('linmas')).toBe(true);
      expect(isClockableRole('korlap')).toBe(true);
      expect(isClockableRole('admin_rayon')).toBe(true);
      expect(isClockableRole('kepala_rayon')).toBe(true);
    });

    it('should return false for non-clockable roles', () => {
      expect(isClockableRole('management')).toBe(false);
      expect(isClockableRole('admin_system')).toBe(false);
      expect(isClockableRole('superadmin')).toBe(false);
    });
  });

  describe('canSubmitActivities', () => {
    it('should return true for activity submitter roles', () => {
      expect(canSubmitActivities('satgas')).toBe(true);
      expect(canSubmitActivities('linmas')).toBe(true);
      expect(canSubmitActivities('korlap')).toBe(true);
      expect(canSubmitActivities('admin_rayon')).toBe(true);
      expect(canSubmitActivities('kepala_rayon')).toBe(true);
    });

    it('should return false for non-submitter roles', () => {
      expect(canSubmitActivities('management')).toBe(false);
      expect(canSubmitActivities('admin_system')).toBe(false);
      expect(canSubmitActivities('superadmin')).toBe(false);
    });
  });

  describe('canCreateTasks', () => {
    it('should return true for task creator roles', () => {
      expect(canCreateTasks('korlap')).toBe(true);
      expect(canCreateTasks('kepala_rayon')).toBe(true);
      expect(canCreateTasks('management')).toBe(true);
      expect(canCreateTasks('admin_system')).toBe(true);
      expect(canCreateTasks('superadmin')).toBe(true);
    });

    it('should return true for admin_rayon (May 11, 2026)', () => {
      expect(canCreateTasks('admin_rayon')).toBe(true);
    });

    it('should return false for non-creator roles', () => {
      expect(canCreateTasks('satgas')).toBe(false);
      expect(canCreateTasks('linmas')).toBe(false);
    });
  });

  describe('canReceiveTasks', () => {
    it('should return true for task receiver roles', () => {
      expect(canReceiveTasks('satgas')).toBe(true);
      expect(canReceiveTasks('linmas')).toBe(true);
      expect(canReceiveTasks('korlap')).toBe(true);
      expect(canReceiveTasks('kepala_rayon')).toBe(true);
      // May 11, 2026 — admin_rayon may take pruning tasks themselves.
      expect(canReceiveTasks('admin_rayon')).toBe(true);
    });

    it('should return false for non-receiver roles', () => {
      expect(canReceiveTasks('management')).toBe(false);
      expect(canReceiveTasks('admin_system')).toBe(false);
      expect(canReceiveTasks('superadmin')).toBe(false);
    });
  });

  describe('canSubmitOvertime', () => {
    it('should return true for overtime submitter roles', () => {
      expect(canSubmitOvertime('satgas')).toBe(true);
      expect(canSubmitOvertime('linmas')).toBe(true);
      expect(canSubmitOvertime('korlap')).toBe(true);
      expect(canSubmitOvertime('admin_rayon')).toBe(true);
      expect(canSubmitOvertime('kepala_rayon')).toBe(true);
    });

    it('should return false for non-submitter roles', () => {
      expect(canSubmitOvertime('management')).toBe(false);
      expect(canSubmitOvertime('admin_system')).toBe(false);
      expect(canSubmitOvertime('superadmin')).toBe(false);
    });
  });

  describe('canApproveOvertime', () => {
    it('should return true for korlap, kepala_rayon, and management', () => {
      expect(canApproveOvertime('korlap')).toBe(true);
      expect(canApproveOvertime('kepala_rayon')).toBe(true);
      expect(canApproveOvertime('management')).toBe(true);
    });

    it('should return false for all other roles', () => {
      expect(canApproveOvertime('satgas')).toBe(false);
      expect(canApproveOvertime('linmas')).toBe(false);
      expect(canApproveOvertime('admin_rayon')).toBe(false);
      expect(canApproveOvertime('admin_system')).toBe(false);
      expect(canApproveOvertime('superadmin')).toBe(false);
    });
  });

  describe('canMonitor', () => {
    it('should return true for all monitoring roles', () => {
      expect(canMonitor('management')).toBe(true);
      expect(canMonitor('admin_system')).toBe(true);
      expect(canMonitor('superadmin')).toBe(true);
      expect(canMonitor('kepala_rayon')).toBe(true);
      expect(canMonitor('korlap')).toBe(true);
    });

    it('should return false for non-monitoring roles', () => {
      expect(canMonitor('satgas')).toBe(false);
      expect(canMonitor('linmas')).toBe(false);
    });

    it('should return true for admin_rayon (district monitoring)', () => {
      expect(canMonitor('admin_rayon')).toBe(true);
    });
  });

  describe('getMonitoringScope', () => {
    it('should return city for city-level monitoring roles', () => {
      expect(getMonitoringScope('management')).toBe('city');
      expect(getMonitoringScope('admin_system')).toBe('city');
      expect(getMonitoringScope('superadmin')).toBe('city');
    });

    it('should return district for district-level monitoring roles', () => {
      expect(getMonitoringScope('kepala_rayon')).toBe('district');
    });

    it('should return area for area-level monitoring roles', () => {
      expect(getMonitoringScope('korlap')).toBe('area');
    });

    it('should return district for admin_rayon', () => {
      expect(getMonitoringScope('admin_rayon')).toBe('district');
    });

    it('should return null for non-monitoring roles', () => {
      expect(getMonitoringScope('satgas')).toBeNull();
      expect(getMonitoringScope('linmas')).toBeNull();
    });
  });

  describe('FILTER_SUBORDINATE_ROLES', () => {
    it('korlap subordinates are satgas and linmas', () => {
      expect(FILTER_SUBORDINATE_ROLES['korlap']).toEqual(['satgas', 'linmas']);
    });

    it('kepala_rayon subordinates include full district roster (May 11, 2026)', () => {
      expect(FILTER_SUBORDINATE_ROLES['kepala_rayon']).toEqual([
        'korlap', 'admin_rayon', 'satgas', 'linmas',
      ]);
    });

    it('management subordinates include full chain (May 11, 2026)', () => {
      expect(FILTER_SUBORDINATE_ROLES['management']).toEqual([
        'kepala_rayon', 'admin_rayon', 'korlap', 'satgas', 'linmas',
      ]);
    });

    it('admin_rayon subordinates are korlap/satgas/linmas (May 11, 2026)', () => {
      expect(FILTER_SUBORDINATE_ROLES['admin_rayon']).toEqual([
        'korlap', 'satgas', 'linmas',
      ]);
    });

    it('admin_system subordinates include all field and management roles', () => {
      expect(FILTER_SUBORDINATE_ROLES['admin_system']).toEqual([
        'kepala_rayon',
        'korlap',
        'admin_rayon',
        'satgas',
        'linmas',
      ]);
    });

    it('superadmin subordinates include all roles', () => {
      expect(FILTER_SUBORDINATE_ROLES['superadmin']).toEqual([
        'kepala_rayon',
        'korlap',
        'admin_rayon',
        'satgas',
        'linmas',
        'management',
        'admin_system',
      ]);
    });

    // Removed May 11, 2026 — admin_rayon now has a subordinate roster
    // (asserted above). Earlier "empty array" test is obsolete.

    it('satgas has no entry (undefined — no subordinates)', () => {
      expect(FILTER_SUBORDINATE_ROLES['satgas']).toBeUndefined();
    });

    it('linmas has no entry (undefined — no subordinates)', () => {
      expect(FILTER_SUBORDINATE_ROLES['linmas']).toBeUndefined();
    });
  });
});
