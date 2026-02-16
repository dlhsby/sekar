/**
 * Unit Tests: Overtime Constants
 * Tests overtime status labels and badge variants (Phase 2C)
 */

import type { OvertimeStatus } from '@/types/models';
import { OVERTIME_STATUS_LABELS, OVERTIME_STATUS_BADGES } from '../overtime';

describe('Overtime Constants', () => {
  describe('OVERTIME_STATUS_LABELS', () => {
    it('should have labels for all 3 overtime statuses', () => {
      expect(Object.keys(OVERTIME_STATUS_LABELS)).toHaveLength(3);
    });

    it('should have correct Indonesian label for pending', () => {
      expect(OVERTIME_STATUS_LABELS.pending).toBe('Menunggu');
    });

    it('should have correct Indonesian label for approved', () => {
      expect(OVERTIME_STATUS_LABELS.approved).toBe('Disetujui');
    });

    it('should have correct Indonesian label for rejected', () => {
      expect(OVERTIME_STATUS_LABELS.rejected).toBe('Ditolak');
    });

    it('should cover all OvertimeStatus values', () => {
      const statuses: OvertimeStatus[] = ['pending', 'approved', 'rejected'];
      statuses.forEach((status) => {
        expect(OVERTIME_STATUS_LABELS[status]).toBeDefined();
        expect(typeof OVERTIME_STATUS_LABELS[status]).toBe('string');
      });
    });

    it('should have non-empty labels', () => {
      Object.values(OVERTIME_STATUS_LABELS).forEach((label) => {
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('OVERTIME_STATUS_BADGES', () => {
    it('should have badge variants for all 3 overtime statuses', () => {
      expect(Object.keys(OVERTIME_STATUS_BADGES)).toHaveLength(3);
    });

    it('should use warning variant for pending status', () => {
      expect(OVERTIME_STATUS_BADGES.pending).toBe('warning');
    });

    it('should use success variant for approved status', () => {
      expect(OVERTIME_STATUS_BADGES.approved).toBe('success');
    });

    it('should use destructive variant for rejected status', () => {
      expect(OVERTIME_STATUS_BADGES.rejected).toBe('destructive');
    });

    it('should only use valid badge variants', () => {
      const validVariants = ['warning', 'success', 'destructive'];
      Object.values(OVERTIME_STATUS_BADGES).forEach((variant) => {
        expect(validVariants).toContain(variant);
      });
    });

    it('should cover all OvertimeStatus values', () => {
      const statuses: OvertimeStatus[] = ['pending', 'approved', 'rejected'];
      statuses.forEach((status) => {
        expect(OVERTIME_STATUS_BADGES[status]).toBeDefined();
      });
    });
  });

  describe('Label and Badge Consistency', () => {
    it('should have matching keys between labels and badges', () => {
      const labelKeys = Object.keys(OVERTIME_STATUS_LABELS);
      const badgeKeys = Object.keys(OVERTIME_STATUS_BADGES);
      expect(labelKeys.sort()).toEqual(badgeKeys.sort());
    });

    it('should provide both label and badge for each status', () => {
      const statuses: OvertimeStatus[] = ['pending', 'approved', 'rejected'];
      statuses.forEach((status) => {
        expect(OVERTIME_STATUS_LABELS[status]).toBeDefined();
        expect(OVERTIME_STATUS_BADGES[status]).toBeDefined();
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce OvertimeStatus type for labels', () => {
      const status: OvertimeStatus = 'pending';
      const label = OVERTIME_STATUS_LABELS[status];
      expect(typeof label).toBe('string');
    });

    it('should enforce OvertimeStatus type for badges', () => {
      const status: OvertimeStatus = 'approved';
      const variant = OVERTIME_STATUS_BADGES[status];
      expect(['warning', 'success', 'destructive']).toContain(variant);
    });
  });
});
